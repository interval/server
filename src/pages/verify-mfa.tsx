import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Field, Form, Formik } from 'formik'
import { Navigate } from 'react-router-dom'
import { trpc } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { logout } from '~/utils/auth'
import useHasSession from '~/utils/useHasSession'
import AuthPageHeader from '~/components/AuthPageHeader'
import MFAInput from '~/components/MFAInput'

export default function ValidateMfaPage() {
  const session = trpc.useQuery(['auth.session.user'])
  const { hasSession, isLoading: isSessionLoading, needsMfa } = useHasSession()
  const challenge = trpc.useMutation(['auth.mfa.challenge'])
  const verify = trpc.useMutation(['auth.mfa.verify'], {
    onSuccess() {
      window.location.assign('/dashboard')
    },
  })

  const { mutate: challengeMfa } = challenge
  useEffect(() => {
    if (!hasSession && needsMfa && !isSessionLoading) {
      challengeMfa()
    }
  }, [challengeMfa, hasSession, needsMfa, isSessionLoading])

  if (hasSession) {
    return <Navigate to="/dashboard" replace />
  }

  if (!needsMfa && !isSessionLoading) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Helmet>
        <title>Log in | Interval</title>
      </Helmet>
      <div className="w-full max-w-sm p-8 mx-auto max">
        <div className="mb-6">
          <AuthPageHeader title="Please enter your MFA code" />
        </div>
        <Formik<{ code: string }>
          initialValues={{
            code: '',
          }}
          onSubmit={async ({ code }) => {
            if (!challenge.data) return

            verify.mutate({
              code,
              challengeId: challenge.data,
            })
          }}
          validate={({ code }) => {
            if (!code) {
              return {
                code: 'Please enter a code.',
              }
            }
          }}
        >
          {({ isValid }) => (
            <Form>
              <div className="mb-6 space-y-4">
                <IVInputField id="email" label="Email address">
                  <Field
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="form-input"
                    value={session.data?.email}
                    readOnly
                  />
                </IVInputField>
                <MFAInput isLoading={verify.isLoading} />
                {verify.isError && (
                  <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                    Sorry, that code is invalid. Please try again.
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <IVButton
                  type="submit"
                  label="Verify"
                  loading={verify.isLoading}
                  disabled={!isValid || !challenge.data}
                  className="w-full"
                />
                <IVButton
                  theme="secondary"
                  label="Sign in with another account"
                  className="w-full"
                  onClick={async () => {
                    await logout()
                    window.location.assign('/login')
                  }}
                />
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  )
}
