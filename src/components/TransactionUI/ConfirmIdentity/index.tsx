import { useEffect, useState, useCallback } from 'react'
import { trpc } from '~/utils/trpc'
import { RCTResponderProps } from '~/components/RenderIOCall'
import { Field, Form, Formik } from 'formik'
import IVButton from '~/components/IVButton'
import IVDialog, { useDialogState } from '~/components/IVDialog'
import IVInputField from '~/components/IVInputField'
import MFAInput from '~/components/MFAInput'
import { tryLogin } from '~/utils/auth'
import GoogleIcon from '~/icons/compiled/Google'
import CheckCircleIcon from '~/icons/compiled/CheckCircleOutline'
import XCircleIcon from '~/icons/compiled/XCircle'

function InlineConfirmNotice(props: RCTResponderProps<'CONFIRM'>) {
  const Icon = props.value ? CheckCircleIcon : XCircleIcon

  return (
    <div>
      <div className="text-sm text-gray-700 font-medium flex items-center cursor-default">
        <Icon className="w-5 h-5 mr-1.5" />
        <span>
          {props.value ? 'Identity confirmed' : 'Identity not confirmed'}
        </span>
      </div>
    </div>
  )
}

function ConfirmMFA({ onRespond, transactionId, context }) {
  const challenge = trpc.useMutation(['auth.mfa.challenge'])
  const verify = trpc.useMutation(['auth.mfa.verify'], {
    onSuccess() {
      onRespond(true)
    },
  })

  const { mutate: challengeMfa } = challenge
  useEffect(() => {
    challengeMfa()
  }, [challengeMfa])

  return (
    <Formik<{ code: string }>
      initialValues={{
        code: '',
      }}
      onSubmit={async ({ code }) => {
        if (!challenge.data || context === 'docs') return

        verify.mutate({
          code,
          challengeId: challenge.data,
          transactionId,
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
            <p>
              Your Interval account is enrolled in multi-factor authentication.
              Enter a verification code from your authenticator app to continue.
            </p>
            <MFAInput label="Verification code" isLoading={verify.isLoading} />
            {verify.isError && (
              <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                Sorry, that code is invalid. Please try again.
              </div>
            )}
          </div>
          <div className="grid gap-2 grid-cols-2 mt-6">
            <IVButton
              type="submit"
              label="Verify"
              loading={verify.isLoading}
              disabled={!isValid || !challenge.data}
              className="w-full"
            />
            <IVButton
              theme="secondary"
              label="Cancel"
              onClick={() => onRespond(false)}
            />
          </div>
        </Form>
      )}
    </Formik>
  )
}

function ConfirmPassword({
  onRespond,
  email,
  transactionId,
}: {
  onRespond: (response: boolean) => void
  email: string
  transactionId?: string
}) {
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

  return (
    <Formik<{ password: string }>
      initialValues={{
        password: '',
      }}
      onSubmit={async ({ password }) => {
        setHasError(false)
        setLoading(true)

        try {
          const r = await tryLogin({
            email,
            password,
            transactionId,
          })

          setLoading(false)

          if (r.ok) {
            onRespond(true)
          } else {
            setHasError(true)
          }
        } catch (error) {
          console.error('Error confirming password', { error })
          setHasError(true)
        }
      }}
      validate={({ password }) => {
        if (!password.length) {
          return { password: 'Please enter your password.' }
        }
      }}
    >
      {({ isValid }) => (
        <Form>
          <div className="mb-6 space-y-4">
            <p>Enter your Interval password to continue.</p>
            <IVInputField id="email" label="Email address">
              <Field
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="form-input"
                value={email}
                readOnly
              />
            </IVInputField>
            <IVInputField id="password" label="Password">
              <Field
                type="password"
                name="password"
                id="password"
                className="form-input"
                required
                autoFocus={true}
              />
            </IVInputField>
            {hasError && (
              <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                Invalid password, please try again.
              </div>
            )}
          </div>
          <div className="grid gap-2 grid-cols-2 mt-6">
            <IVButton
              type="submit"
              label="Verify"
              loading={loading}
              disabled={!isValid}
              className="w-full"
            />
            <IVButton
              theme="secondary"
              label="Cancel"
              onClick={() => onRespond(false)}
            />
          </div>
        </Form>
      )}
    </Formik>
  )
}

function ConfirmViaRedirect({
  href,
  label,
  onRespond,
  theme,
}: {
  href: string
  label: React.ReactNode
  onRespond: (ok: boolean) => void
  theme?: 'primary' | 'secondary' | 'danger' | 'plain'
}) {
  return (
    <div className="space-y-4">
      <IVButton
        theme={theme}
        label={label}
        className="w-full"
        onClick={() => {
          window.open(href, '_blank', 'popup,width=800,height=600')
        }}
      />
      <IVButton
        theme="secondary"
        label="Cancel"
        className="w-full"
        onClick={() => onRespond(false)}
      />
    </div>
  )
}

export default function ConfirmIdentity(
  props: RCTResponderProps<'CONFIRM_IDENTITY'>
) {
  const session = trpc.useQuery(['auth.session.user'])
  const authCheck = trpc.useQuery([
    'auth.check',
    {
      email: session.data?.email || '',
      transactionId: props.transaction?.id,
    },
  ])
  const confirm = trpc.useMutation(['auth.identity.confirm'])
  const hasMfa = trpc.useQuery(['auth.mfa.has'])
  const hasPassword = trpc.useQuery(['auth.password.has'])
  const { onUpdatePendingReturnValue } = props

  const dialog = useDialogState({
    visible: true,
    // non-modals are rendered within their parent component, not a <Portal>
    modal: props.context === 'transaction',
  })

  const { hide } = dialog
  const onRespond = useCallback(
    (value: boolean) => {
      onUpdatePendingReturnValue(value)
      if (props.context !== 'docs') hide()
    },
    [onUpdatePendingReturnValue, props.context, hide]
  )

  const { mutate: doConfirm } = confirm
  const { refetch: refetchAuth } = authCheck
  useEffect(() => {
    if (authCheck.data?.identityConfirmed && props.transaction) {
      doConfirm(
        { transactionId: props.transaction?.id },
        {
          onSuccess(response) {
            if (response === true) {
              onUpdatePendingReturnValue(true)
            } else {
              refetchAuth()
            }
          },
        }
      )
    }
  }, [
    authCheck.data,
    onUpdatePendingReturnValue,
    props.transaction,
    doConfirm,
    refetchAuth,
  ])

  // show inline result of the confirmation process
  if (props.shouldUseAppendUi && typeof props.value === 'boolean') {
    return <InlineConfirmNotice {...props} />
  }
  if (props.context !== 'docs') {
    if (
      !props.transaction ||
      authCheck.isLoading ||
      confirm.isLoading ||
      authCheck.data?.identityConfirmed
    ) {
      // avoid flash of modal until we know we need a confirmation
      return null
    }
  }

  let confirmComponent: React.ReactNode

  if (props.context === 'docs' || hasMfa.data) {
    confirmComponent = (
      <ConfirmMFA
        transactionId={props.transaction?.id || undefined}
        onRespond={onRespond}
        context={props.context}
      />
    )
  } else if (authCheck.data?.sso) {
    const { workosOrganizationId } = authCheck.data.sso
    const paramObj = {
      workosOrganizationId,
    }
    if (props.transaction?.id) {
      paramObj['transactionId'] = props.transaction.id
    }
    const params = new URLSearchParams(paramObj)
    confirmComponent = (
      <ConfirmViaRedirect
        href={`/api/auth/sso/auth?${params}`}
        label="Log in again"
        onRespond={onRespond}
      />
    )
  } else if (hasPassword.data) {
    confirmComponent = (
      <ConfirmPassword
        email={session.data?.email || ''}
        onRespond={onRespond}
        transactionId={props.transaction?.id}
      />
    )
  } else {
    let href = `/api/auth/sso/sign-in-with-google`
    if (props.transaction?.id) {
      const params = new URLSearchParams({
        transactionId: props.transaction?.id || '',
      })
      href += `?${params}`
    }
    confirmComponent = (
      <ConfirmViaRedirect
        href={href}
        theme="secondary"
        label={
          <span className="flex align-middle gap-2">
            <GoogleIcon className="inline-block h-5 w-5" />
            Continue with Google
          </span>
        }
        onRespond={onRespond}
      />
    )
  }

  return (
    <IVDialog
      canClose={false}
      dialog={dialog}
      aria-label={props.label}
      widthClassName="sm:max-w-md sm:w-full"
      backdropClassName={props.context === 'docs' ? '' : undefined}
    >
      <h3 className="h3 mb-4 font-semibold">
        Please confirm your identity to continue
      </h3>
      {props.label && <div className="mb-4">{props.label}</div>}
      {confirmComponent}
    </IVDialog>
  )
}
