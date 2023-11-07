import { Field, Form, Formik } from 'formik'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { inferMutationInput, trpc } from '~/utils/trpc'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'

export default function ForgotPasswordPage() {
  const forgotPassword = trpc.useMutation('auth.forgot-password')

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Helmet>
        <title>Forgot password | Interval</title>
      </Helmet>
      <div className="w-full max-w-sm p-8 mx-auto max">
        <h2 className="my-6 text-3xl font-extrabold text-center text-gray-900">
          Forgot password
        </h2>
        <Formik<inferMutationInput<'auth.forgot-password'>>
          initialValues={{
            email: '',
          }}
          onSubmit={async values => {
            if (forgotPassword.isLoading) return

            forgotPassword.mutate(values)
          }}
        >
          <Form>
            <div className="mb-6 space-y-4">
              <IVInputField label="Email address" id="email">
                <Field
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input"
                />
              </IVInputField>
              {forgotPassword.isError && (
                <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                  Sorry, there was a problem sending a reset request. Please
                  contact us.
                </div>
              )}
            </div>
            <div>
              <IVButton
                type="submit"
                disabled={forgotPassword.isLoading || forgotPassword.isSuccess}
                loading={forgotPassword.isLoading}
                label="Submit reset request"
                className="w-full"
              />
            </div>
            {forgotPassword.isSuccess && (
              <p className="mt-4 px-4 py-3 text-gray-900 rounded-md bg-green-50">
                Your request was successful. Please check your email for the
                reset link.
              </p>
            )}
            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-primary-500 hover:opacity-70"
              >
                Log in instead
              </Link>
            </div>
          </Form>
        </Formik>
      </div>
    </div>
  )
}
