import { Form, Formik } from 'formik'
import { useSearchParams, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { inferMutationInput, trpc } from '~/utils/trpc'
import IVButton from '~/components/IVButton'
import IVSpinner from '~/components/IVSpinner'
import { MeProvider, useMe } from '~/components/MeContext'
import IVAPIError from '~/components/IVAPIError'
import { logout } from '~/utils/auth'

function Container(props) {
  return (
    <div className="flex items-center justify-center min-h-screen-ios">
      <Helmet>
        <title>Join organization | Interval</title>
      </Helmet>
      {props.children}
    </div>
  )
}

function LoadingState(props) {
  return (
    <Container>
      <div className="py-12 text-center">
        {props.children ?? <IVSpinner />}
        {props.children && (
          <IVButton
            href="/"
            theme="secondary"
            label="Go back"
            className="mt-4"
          />
        )}
      </div>
    </Container>
  )
}

function AcceptInvitationPage() {
  const { me } = useMe()
  const joinOrg = trpc.useMutation('organization.join')
  const [searchParams] = useSearchParams()
  const invitationId = searchParams.get('token')
  const signupCheck = trpc.useQuery(['auth.signup.check', { invitationId }], {
    retry: false,
    refetchOnWindowFocus: false,
  })

  if (!invitationId) {
    return <Navigate to="/signup" />
  }

  const onLogout = async () => {
    await logout()
    window.location.reload()
  }

  if (signupCheck.isError) {
    if (
      signupCheck.error.message?.includes(
        'this invitation is for another email address'
      )
    ) {
      return (
        <Container>
          <div className="py-12 text-center">
            <p>{signupCheck.error.message}</p>
            <div className="inline-flex space-x-2 mt-4">
              <IVButton
                theme="secondary"
                label="Log out and retry"
                onClick={onLogout}
              />
              <IVButton href="/dashboard" theme="secondary" label="Go back" />
            </div>
          </div>
        </Container>
      )
    }

    return (
      <LoadingState>
        <IVAPIError error={signupCheck.error} />
      </LoadingState>
    )
  }

  if (!signupCheck.data) {
    return <LoadingState />
  }

  if (signupCheck.data.isSignupRequired) {
    return <Navigate to={`/signup?token=${invitationId}`} />
  }

  if (signupCheck.data.isLoginRequired) {
    return (
      <Navigate
        to="/login"
        state={{ loginRedirect: `/accept-invitation?token=${invitationId}` }}
      />
    )
  }

  // unlikely; helps w/ type safety
  if (!signupCheck.data.invitation) {
    return (
      <LoadingState>
        <IVAPIError error={{ message: 'NOT_FOUND' }} />
      </LoadingState>
    )
  }

  const onDecline = () => {
    joinOrg.mutate(
      {
        invitationId,
        accept: false,
      },
      {
        async onSuccess() {
          window.location.assign(`/dashboard`)
        },
      }
    )
  }

  return (
    <Container>
      <div className="w-full max-w-lg p-8 mx-auto">
        <h2 className="my-6 text-center h1">Accept invitation</h2>
        <Formik<inferMutationInput<'organization.join'>>
          initialValues={{
            invitationId,
            accept: true,
          }}
          onSubmit={async values => {
            if (joinOrg.isLoading) return

            joinOrg.mutate(values, {
              async onSuccess(res) {
                window.location.assign(`/dashboard/${res?.organization.slug}`)
              },
            })
          }}
        >
          <Form className="max-w-sm mx-auto text-center">
            <div className="my-8 space-y-4">
              <p>
                <strong>{signupCheck.data.invitation.organization.name}</strong>{' '}
                has invited you to join their organization on Interval.
              </p>
              <IVAPIError error={joinOrg.error} />
            </div>

            <div className="inline-flex space-x-2">
              <IVButton
                type="submit"
                disabled={joinOrg.isLoading}
                loading={joinOrg.isLoading}
                autoFocus
                label={<span className="text-base">Join organization</span>}
              />
              <IVButton
                type="button"
                theme="secondary"
                disabled={joinOrg.isLoading}
                loading={joinOrg.isLoading}
                label={<span className="text-base">Decline</span>}
                onClick={onDecline}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Logged in as {me?.email}
            </p>
          </Form>
        </Formik>
      </div>
    </Container>
  )
}

export default function AcceptInvitationPageWrapper() {
  return (
    <MeProvider>
      <AcceptInvitationPage />
    </MeProvider>
  )
}
