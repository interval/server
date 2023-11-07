import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Field, Form, Formik, useFormikContext } from 'formik'
import { Link, Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { trpc, client } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { isEmail } from '~/utils/validate'
import { tryLogin } from '~/utils/auth'
import useHasSession from '~/utils/useHasSession'
import GoogleIcon from '~/icons/compiled/Google'
import AuthPageHeader from '~/components/AuthPageHeader'
import { useSetRecoilState } from 'recoil'
import { redirectAfterLogin } from '~/components/LoginRedirect'

export default function LoginPage() {
  const [shouldShowPassword, setShouldShowPassword] = useState(false)
  const [shouldShowMfaToken, setShouldShowMfaToken] = useState(false)
  const [hasError, setHasError] = useState(false)
  const navigate = useNavigate()
  const { hasSession, needsMfa } = useHasSession()
  const [searchParams] = useSearchParams()
  const prefilledEmail = searchParams.get('email')
  const integrations = trpc.useQuery(['dashboard.integrations'])

  {
    const externalRedirect = searchParams.get('redirect')
    const setRedirect = useSetRecoilState(redirectAfterLogin)

    useEffect(() => {
      if (externalRedirect) {
        setRedirect(externalRedirect)
      }
    }, [externalRedirect, setRedirect])
  }

  if (hasSession) {
    return <Navigate to="/dashboard" replace />
  }

  if (needsMfa) {
    return <Navigate to="/verify-mfa" replace />
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Helmet>
        <title>Log in | Interval</title>
      </Helmet>
      <div className="w-full max-w-sm p-8 mx-auto max">
        <div className="mb-6">
          <AuthPageHeader title="Welcome back" />
        </div>
        <Formik<{ email: string; password: string }>
          initialValues={{
            email: prefilledEmail || '',
            password: '',
          }}
          onSubmit={async (values, { setSubmitting }) => {
            setHasError(false)

            if (!shouldShowPassword) {
              // Check for SSO
              const { sso, needsMfa } = await client.query('auth.check', {
                email: values.email,
              })

              if (integrations.data?.workos && sso) {
                const { workosOrganizationId } = sso
                const params = new URLSearchParams({
                  workosOrganizationId,
                })
                window.location.assign(`/api/auth/sso/auth?${params}`)
              } else {
                setShouldShowPassword(true)
                setShouldShowMfaToken(!!integrations.data?.workos && needsMfa)
                setSubmitting(false)
              }

              return
            }

            try {
              const r = await tryLogin(values)

              if (r.ok) {
                if (shouldShowMfaToken) {
                  navigate('/verify-mfa')
                } else {
                  window.location.assign('/dashboard')
                }
              } else {
                setHasError(true)
              }
            } catch (err) {
              console.error(err)
              setHasError(true)
              setSubmitting(false)
            }
          }}
          validate={({ email, password }) => {
            if (!email.length) {
              return { email: 'Please enter your email address.' }
            }

            if (!isEmail(email)) {
              return { email: 'Please enter a valid email address.' }
            }

            if (shouldShowPassword && !password.length) {
              return { password: 'Please enter your password.' }
            }
          }}
        >
          {({ isSubmitting, isValid }) => (
            <Form>
              <div className="mb-6 space-y-4">
                {!shouldShowPassword && integrations.data?.workos && (
                  <>
                    <div>
                      <IVButton
                        href={`/api/auth/sso/sign-in-with-google`}
                        reloadDocument
                        theme="secondary"
                        label={
                          <span className="flex align-middle gap-2">
                            <GoogleIcon className="inline-block h-5 w-5" />
                            Sign in with Google
                          </span>
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="flex justify-center items-center">
                      <hr className="flex-1 h-1" />
                      <span className="px-2 mb-2 font-semibold text-gray-500 uppercase text-sm">
                        or
                      </span>
                      <hr className="flex-1 h-1" />
                    </div>
                  </>
                )}

                <IVInputField id="email" label="Email address">
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="form-input"
                    required
                    readOnly={isSubmitting || shouldShowPassword}
                    autoFocus={!shouldShowPassword}
                  />
                </IVInputField>
                <PasswordVisibleToken shouldShowPassword={shouldShowPassword} />
                {shouldShowPassword && (
                  <IVInputField id="password" label="Password">
                    <Field
                      type="password"
                      name="password"
                      id="password"
                      className="form-input"
                      required
                      readOnly={isSubmitting}
                      autoFocus={shouldShowPassword}
                    />
                  </IVInputField>
                )}
                {hasError && (
                  <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                    Invalid login, please try again.
                  </div>
                )}
              </div>
              <div>
                <IVButton
                  type="submit"
                  label="Log in"
                  loading={isSubmitting}
                  disabled={!isValid}
                  className="w-full"
                />
              </div>
              <div className="mt-4 text-center text-sm relative pb-12">
                {shouldShowPassword ? (
                  <>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-primary-500 hover:opacity-70"
                    >
                      Forgot password?
                    </Link>
                    <div className="absolute bottom-0 left-0 right-0 pt-4">
                      <IVButton
                        theme="plain"
                        label="Go back"
                        className="font-medium text-primary-500 hover:opacity-70"
                        onClick={() => {
                          setShouldShowPassword(false)
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <Link
                    to="/signup"
                    className="text-sm font-medium text-primary-500 hover:opacity-70"
                  >
                    Create an account &rsaquo;
                  </Link>
                )}
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  )
}

function PasswordVisibleToken({
  shouldShowPassword,
}: {
  shouldShowPassword: boolean
}) {
  const { touched, setFieldValue, setTouched } = useFormikContext<{
    email: string
    password: string
  }>()

  useEffect(() => {
    if (touched.email && touched.password && !shouldShowPassword) {
      setFieldValue('password', '')
      setTouched({ email: false, password: false }, true)
    }
  }, [shouldShowPassword, touched, setFieldValue, setTouched])

  return null
}
