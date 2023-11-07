import { useEffect } from 'react'
import { Form, Formik } from 'formik'
import { trpc } from '~/utils/trpc'
import IVButton from '~/components/IVButton'
import IVSpinner from '~/components/IVSpinner'
import MFAInput from '../MFAInput'

export default function EnrollMFAForm({ onSubmit }: { onSubmit: () => void }) {
  const start = trpc.useMutation(['auth.mfa.enroll.start'])
  const complete = trpc.useMutation(['auth.mfa.enroll.complete'], {
    onSuccess() {
      onSubmit()
    },
  })

  const { mutate: startEnrollment } = start
  useEffect(() => {
    startEnrollment()
  }, [startEnrollment])

  return (
    <Formik<{ code: string }>
      key={start.data?.challengeId}
      initialValues={{
        code: '',
      }}
      onSubmit={({ code }, { setFieldValue }) => {
        if (!start.data?.challengeId) return

        complete.mutate(
          {
            code,
            challengeId: start.data.challengeId,
          },
          {
            onError: () => {
              setFieldValue('code', '')
            },
          }
        )
      }}
    >
      <Form>
        <div className="space-y-4">
          <p className="not-sr-only">
            Scan this QR code or use the secret below with your authenticator
            app of choice. Enter the verification code it gives you to complete
            enrollment.
          </p>
          <div className="flex flex-col justify-center items-center py-6 bg-gray-50 gap-2">
            {start.data ? (
              <>
                <img
                  src={start.data.qrCode}
                  className="w-40 h-40 p-2 bg-white rounded-md"
                  alt="QR code to enroll in MFA, alternatively use secret below"
                />
                <p className="text-md font-mono bg-gray-50">
                  {start.data.secret}
                </p>
              </>
            ) : (
              <IVSpinner />
            )}
          </div>
          <MFAInput
            isLoading={start.isLoading || complete.isLoading}
            label="Verification code"
          />
          {complete.isError && (
            <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
              Sorry, that code is invalid. Please try again.
            </div>
          )}
        </div>

        <div className="mt-6">
          <IVButton
            disabled={start.isLoading || complete.isLoading}
            type="submit"
            label="Confirm"
          />
        </div>
      </Form>
    </Formik>
  )
}
