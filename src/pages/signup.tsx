import { useState } from 'react'
import { Field, Form, Formik } from 'formik'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { inferMutationInput, trpc } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { tryLogin } from '~/utils/auth'
import useHasSession from '~/utils/useHasSession'
import IVSpinner from '~/components/IVSpinner'
import classNames from 'classnames'
import { ReferralInfo, referralInfoSchema } from '~/utils/referralSchema'
import GoogleIcon from '~/icons/compiled/Google'
import { DateTime } from 'luxon'
import AuthPageHeader from '~/components/AuthPageHeader'
import { REFERRAL_LOCAL_STORAGE_KEY } from '~/utils/isomorphicConsts'

export default function SignupPage() {
  const [hasLoginError, setHasLoginError] = useState(false)
  const [hasPromoCode, setHasPromoCode] = useState(false)
  const createUser = trpc.useMutation('auth.signup')
  const checkEmail = trpc.useMutation('auth.signup.check-email')
  const [searchParams] = useSearchParams()
  const invitationId = searchParams.get('token')
  const exampleSlug = searchParams.get('example') || undefined
  const intendedPlanName = searchParams.get('plan') || undefined
  const integrations = trpc.useQuery(['dashboard.integrations'])
  const signupCheck = trpc.useQuery(['auth.signup.check', { invitationId }])
  const { hasSession } = useHasSession()
  const navigate = useNavigate()
  const location = useLocation()

  const isEmailValidated =
    location.state === 'confirm' || !!signupCheck.data?.invitation

  const mutation = isEmailValidated ? createUser : checkEmail

  if (hasSession) {
    return <Navigate to="/dashboard" replace />
  }

  if (invitationId) {
    if (
      signupCheck.error?.message?.includes(
        'this invitation is for another email address'
      )
    ) {
      // is logged in, should not be on the signup page
      return (
        <Navigate to={`/accept-invitation?token=${invitationId}`} replace />
      )
    }

    if (signupCheck.data?.isLoginRequired) {
      return (
        <Navigate
          to="/login"
          state={{ loginRedirect: `/signup?token=${invitationId}` }}
          replace
        />
      )
    }

    if (!signupCheck.data) {
      return (
        <div className="flex items-center justify-center min-h-screen-ios">
          <Helmet>
            <title>Sign up | Interval</title>
          </Helmet>
          <div className="py-12">
            <IVSpinner />
          </div>
        </div>
      )
    }
  }

  const accountDisabled = searchParams.has('ACCOUNT_DISABLED')

  const registrationDisabled =
    createUser.error?.data?.code === 'FORBIDDEN' ||
    searchParams.has('REGISTRATION_DISABLED')

  const fallbackError =
    "Sorry, we failed to create your account. Are you sure an account doesn't already exist with that email address?"

  return (
    <div className="flex items-center justify-center min-h-screen-ios">
      <Helmet>
        <title>Sign up | Interval</title>
      </Helmet>
      <div className="w-full max-w-lg p-8 mx-auto">
        {accountDisabled ? (
          <>
            <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              <p>
                Sorry, we were unable to sign you in because the account with
                that email address has been disabled.
              </p>
              <p className="mt-2">
                Please reach out to
                <a
                  href="mailto:help@interval.com"
                  className="font-medium hover:opacity-70"
                >
                  help@interval.com
                </a>
                with any questions or if you think this is a mistake.
              </p>
            </div>
            <div className="mt-8 text-center">
              <IVButton label="Return to home page" href="/" />
            </div>
          </>
        ) : registrationDisabled ? (
          <>
            <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              <p>
                Sorry, we are not currently accepting new user registrations.
              </p>
              <p className="mt-2">
                We've added your information to our waitlist and will reach out
                as soon as registrations are available again. Thank you for your
                interest!
              </p>
            </div>
            <div className="mt-8 text-center">
              <IVButton label="Return to home page" href="/" />
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <AuthPageHeader title="Create an account" />
            </div>
            <Formik<inferMutationInput<'auth.signup'>>
              initialValues={{
                email: signupCheck.data?.invitation?.email || '',
                firstName: '',
                lastName: '',
                password: '',
                organizationName: '',
                invitationId,
                timeZoneName: DateTime.now().zoneName,
                onboardingExampleSlug: exampleSlug,
                intendedPlanName,
              }}
              onSubmit={async (values, formikHelpers) => {
                if (createUser.isLoading) return

                if (!isEmailValidated) {
                  checkEmail.mutate(
                    { email: values.email },
                    {
                      async onSuccess() {
                        // resets submitCount to 0 so validation warnings aren't shown while typing
                        formikHelpers.resetForm({ values })
                        navigate(location.pathname + location.search, {
                          state: 'confirm',
                        })
                      },
                    }
                  )

                  return
                }

                let referralInfo: ReferralInfo | undefined
                if (typeof window !== undefined) {
                  const savedData = window.sessionStorage.getItem(
                    REFERRAL_LOCAL_STORAGE_KEY
                  )
                  if (savedData) {
                    try {
                      referralInfo = referralInfoSchema.parse(
                        JSON.parse(savedData)
                      )
                    } catch (err) {
                      console.error('Invalid referral info', err)
                    }
                  }
                }

                createUser.mutate(
                  { ...values, referralInfo },
                  {
                    async onSuccess(user) {
                      // We could probably combine these into a single endpoint but I think this is fine
                      const r = await tryLogin({
                        email: user.email,
                        password: values.password,
                      })

                      if (r.ok) {
                        window.location.assign('/dashboard/develop/actions')
                      } else {
                        setHasLoginError(true)
                      }
                    },
                  }
                )
              }}
              validate={values => {
                if (values.password.length && values.password.length < 6) {
                  return {
                    password: 'Password must be at least 6 characters',
                  }
                }

                return {}
              }}
            >
              {({ values, setFieldValue, errors, touched }) => {
                const googleParams = new URLSearchParams()
                if (invitationId) googleParams.set('token', invitationId)
                if (intendedPlanName) googleParams.set('plan', intendedPlanName)

                return (
                  <Form className="max-w-sm mx-auto px-8">
                    <div className="mb-6 space-y-4">
                      {signupCheck.data?.invitation && (
                        <div className="bg-blue-50 rounded-md text-sm text-blue-900 py-3 px-4">
                          <strong>
                            {signupCheck.data?.invitation.organization.name}
                          </strong>{' '}
                          is inviting you to join Interval.
                        </div>
                      )}

                      {integrations.data?.workos &&
                        !isEmailValidated &&
                        !signupCheck.data?.invitation && (
                          <>
                            <div>
                              <IVButton
                                href={`/api/auth/sso/sign-in-with-google?${googleParams.toString()}`}
                                reloadDocument
                                theme="secondary"
                                label={
                                  <span className="flex align-middle gap-2">
                                    <GoogleIcon className="inline-block h-5 w-5" />
                                    Continue with Google
                                  </span>
                                }
                                className="w-full"
                              />
                            </div>

                            <div className="flex justify-center items-center mb-0">
                              <hr className="flex-1 h-1" />
                              <span className="px-2 mb-2 font-semibold text-gray-500 uppercase text-sm">
                                or
                              </span>
                              <hr className="flex-1 h-1" />
                            </div>
                          </>
                        )}

                      <IVInputField label="Email address" id="email">
                        <Field
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className={classNames('form-input', {
                            'select-none': !!signupCheck.data?.invitation,
                          })}
                          readOnly={!!signupCheck.data?.invitation}
                          disabled={!!signupCheck.data?.invitation}
                        />
                      </IVInputField>

                      {isEmailValidated && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <IVInputField label="First name" id="firstName">
                              <Field
                                type="text"
                                name="firstName"
                                id="firstName"
                                className="form-input"
                                autoFocus
                                required
                              />
                            </IVInputField>
                            <IVInputField label="Last name" id="lastName">
                              <Field
                                type="text"
                                name="lastName"
                                id="lastName"
                                className="form-input"
                                required
                              />
                            </IVInputField>
                          </div>

                          {(!invitationId || signupCheck.isError) && (
                            <IVInputField
                              label="Organization name"
                              id="organizationName"
                              optional
                            >
                              <Field
                                type="text"
                                name="organizationName"
                                id="organizationName"
                                className="form-input"
                              />
                            </IVInputField>
                          )}

                          <IVInputField
                            label="Choose a password"
                            id="password"
                            errorMessage={errors.password && touched.password}
                          >
                            <Field
                              type="password"
                              name="password"
                              id="password"
                              className="form-input"
                              required
                            />
                          </IVInputField>

                          {!signupCheck.data?.invitation && (
                            <>
                              {hasPromoCode ? (
                                <IVInputField
                                  label="Promo code"
                                  id="organizationPromoCode"
                                  optional
                                >
                                  <Field
                                    autoFocus
                                    type="text"
                                    name="organizationPromoCode"
                                    id="organizationPromoCode"
                                    className="form-input"
                                  />
                                </IVInputField>
                              ) : (
                                <div className="mt-4">
                                  <a
                                    onClick={() => {
                                      setHasPromoCode(true)
                                    }}
                                    className="form-label cursor-pointer hover:opacity-70 text-primary-500"
                                  >
                                    Have a promo code?
                                  </a>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                      {mutation.isError && (
                        <div className="px-4 py-3 text-sm text-red-800 rounded-md bg-red-50">
                          <p>{mutation.error.message || fallbackError}</p>
                          {mutation.error.message?.includes(
                            'already exists'
                          ) && (
                            <p className="mt-2">
                              Want to{' '}
                              <Link
                                to={`/login?email=${values.email}`}
                                className="font-semibold hover:opacity-70"
                              >
                                log in
                              </Link>
                              ?
                            </p>
                          )}
                        </div>
                      )}
                      {hasLoginError && (
                        <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                          Your account was created, but there was a problem
                          logging in. Please contact us for support.
                        </div>
                      )}
                    </div>
                    <div className="pt-2">
                      <IVButton
                        type="submit"
                        disabled={mutation.isLoading || createUser.isSuccess}
                        loading={mutation.isLoading || createUser.isSuccess}
                        label={isEmailValidated ? 'Create account' : 'Continue'}
                        className="w-full"
                      />
                    </div>
                    {!signupCheck.data?.invitation && (
                      <div className="mt-4 text-center relative pb-12">
                        <Link
                          to="/login"
                          className="text-sm font-medium text-primary-500 hover:opacity-70"
                        >
                          Already have an Interval account?
                        </Link>
                      </div>
                    )}
                  </Form>
                )
              }}
            </Formik>
          </>
        )}
      </div>
    </div>
  )
}
