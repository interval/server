import { Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { trpc } from '~/utils/trpc'
import { logout } from '~/utils/auth'
import IVButton from '~/components/IVButton'
import { MeProvider, useMe } from '~/components/MeContext'
import IVAPIError from '~/components/IVAPIError'
import NotificationCenter, { notify } from '~/components/NotificationCenter'
import AuthLoadingState from '~/components/AuthLoadingState'
import AuthPageHeader from '~/components/AuthPageHeader'

function Container(props) {
  return (
    <div className="flex items-center justify-center min-h-screen-ios">
      <Helmet>
        <title>Confirm email | Interval</title>
      </Helmet>
      {props.children}
      <NotificationCenter />
    </div>
  )
}

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const seal = searchParams.get('seal')
  const confirmQuery = trpc.useQuery(['auth.confirm-email', { token: seal }], {
    refetchOnWindowFocus: false,
    retry: false,
  })

  if (confirmQuery.error) {
    if (confirmQuery.error.message === 'UNAUTHORIZED') {
      return (
        <Navigate
          to="/login"
          state={
            seal ? { loginRedirect: `/confirm-email?seal=${seal}` } : undefined
          }
        />
      )
    }

    return (
      <AuthLoadingState pageTitle="Confirm email | Interval">
        <IVAPIError error={confirmQuery.error} />
      </AuthLoadingState>
    )
  }

  if (!confirmQuery.data) {
    return <AuthLoadingState pageTitle="Confirm email | Interval" />
  }

  if (seal && confirmQuery.isSuccess) {
    // imporatant! perform a full reload to refresh the user object in MeContext.
    window.location.assign(`/dashboard/develop/actions?nc-email-confirmed`)
    return <AuthLoadingState pageTitle="Confirm email | Interval" />
  }

  if (confirmQuery.data.isConfirmRequired === false) {
    return <Navigate to="/dashboard/develop/actions" replace />
  }

  return (
    <MeProvider>
      <SentEmailNotice />
    </MeProvider>
  )
}

function SentEmailNotice() {
  const { me } = useMe()
  const navigate = useNavigate()
  const refreshToken = trpc.useMutation('auth.confirm-email.refresh')

  const onResend = () => {
    refreshToken.mutate(null, {
      onSuccess() {
        notify.success('We sent a new confirmation to your email.')
      },
    })
  }

  return (
    <Container>
      <div className="w-full max-w-lg p-8 mx-auto text-center">
        <AuthPageHeader title="Confirm email address" />
        <div className="space-y-4 mt-6 text-sm">
          <p>
            We sent an email to <strong>{me?.email}</strong>. Please click the
            link in the email to verify your email address and complete your
            signup.
          </p>
          <div className="pt-4 flex justify-center">
            <div className="flex flex-col gap-2">
              <IVButton
                theme="secondary"
                label="Resend verification email"
                onClick={onResend}
                loading={refreshToken.isLoading}
              />
              <p>
                <button
                  onClick={async () => {
                    try {
                      await logout()
                    } catch (err) {
                      console.error('Failed logging out', err)
                    }
                    navigate('/login')
                  }}
                  className="text-xs text-gray-500 font-medium hover:opacity-70"
                >
                  Sign in with another address
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}
