import { Field, Form, Formik } from 'formik'
import { Helmet } from 'react-helmet-async'
import { inferMutationInput, trpc } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { ReferralInfo, referralInfoSchema } from '~/utils/referralSchema'
import IVCheckbox from '~/components/IVCheckbox'
import AuthLoadingState from '~/components/AuthLoadingState'
import IVAPIError from '~/components/IVAPIError'
import {
  ORG_SLUG_CONSTRAINTS,
  validateOrgSlugChange,
} from '../dashboard/[orgSlug]/organization/settings'
import { useOrgParams } from '~/utils/organization'
import { useState } from 'react'
import AuthPageHeader from '~/components/AuthPageHeader'
import { REFERRAL_LOCAL_STORAGE_KEY } from '~/utils/isomorphicConsts'

export default function ConfirmSignupPage() {
  const { orgSlug } = useOrgParams()
  const updateOrg = trpc.useMutation('auth.confirm-sso')
  const orgCheck = trpc.useQuery([
    'auth.confirm-sso.check',
    { orgSlug: orgSlug as string },
  ])
  const [hasPromoCode, setHasPromoCode] = useState(false)

  if (orgCheck.error) {
    return (
      <AuthLoadingState pageTitle="Account setup | Interval">
        <IVAPIError error={orgCheck.error} />
      </AuthLoadingState>
    )
  }

  if (orgCheck.isLoading || !orgCheck.data) {
    return <AuthLoadingState pageTitle="Account setup | Interval" />
  }

  return (
    <div className="flex items-center justify-center min-h-screen-ios">
      <Helmet>
        <title>Account setup | Interval</title>
      </Helmet>
      <div className="w-full max-w-lg p-8 mx-auto">
        <div className="mb-6">
          <AuthPageHeader title="Account setup" />
        </div>
        <Formik<inferMutationInput<'auth.confirm-sso'>>
          initialValues={{
            firstName: orgCheck.data.firstName ?? '',
            lastName: orgCheck.data.lastName ?? '',
            orgSlug: orgSlug as string,
            orgName: orgCheck.data.orgName,
            orgId: orgCheck.data.orgId,
          }}
          onSubmit={async values => {
            if (updateOrg.isLoading) return

            let referralInfo: ReferralInfo | undefined
            if (typeof window !== undefined) {
              const savedData = window.sessionStorage.getItem(
                REFERRAL_LOCAL_STORAGE_KEY
              )
              if (savedData) {
                try {
                  referralInfo = referralInfoSchema.parse(JSON.parse(savedData))
                } catch (err) {
                  console.error('Invalid referral info', err)
                }
              }
            }

            updateOrg.mutate(
              { ...values, referralInfo },
              {
                async onSuccess() {
                  window.location.assign(
                    `/dashboard/${values.orgSlug}/develop/actions`
                  )
                },
              }
            )
          }}
        >
          {({ values, errors, touched, setFieldValue }) => {
            return (
              <Form className="max-w-sm mx-auto">
                <div className="mb-6 space-y-4">
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
                  {orgCheck.data?.canRenameOrg && (
                    <>
                      <IVInputField label="Organization name" id="orgName">
                        <Field
                          type="text"
                          name="orgName"
                          id="orgName"
                          className="form-input"
                        />
                      </IVInputField>
                      <IVInputField
                        label="Organization slug"
                        id="orgSlug"
                        constraints={ORG_SLUG_CONSTRAINTS}
                        errorMessage={
                          errors.orgSlug && touched.orgSlug
                            ? errors.orgSlug
                            : undefined
                        }
                      >
                        <Field
                          type="text"
                          name="orgSlug"
                          id="orgSlug"
                          className="form-input"
                          validate={async (slug: string) => {
                            // skip server-side checks if value has not changed from default
                            if (slug === orgSlug) return

                            return await validateOrgSlugChange(
                              orgCheck.data.orgId,
                              slug
                            )
                          }}
                        />
                      </IVInputField>
                    </>
                  )}
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
                  {updateOrg.isError && (
                    <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                      <p>
                        {updateOrg.error.message ?? (
                          <>
                            Sorry, we were unable to finish setting up your
                            account. Please reach out to{' '}
                            <a
                              href="mailto:help@interval.com"
                              className="font-medium hover:opacity-70"
                            >
                              help@interval.com
                            </a>
                            .
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <IVButton
                    type="submit"
                    disabled={updateOrg.isLoading || updateOrg.isSuccess}
                    loading={updateOrg.isLoading || updateOrg.isSuccess}
                    label="Go to Dashboard"
                    className="w-full"
                  />
                </div>
              </Form>
            )
          }}
        </Formik>
      </div>
    </div>
  )
}
