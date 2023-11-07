import { useState } from 'react'
import { Field, Form, Formik } from 'formik'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import IVInputField from '~/components/IVInputField'
import IVButton from '~/components/IVButton'
import { tryPasswordReset } from '~/utils/auth'

interface FormState {
  isError: boolean
  isLoading: boolean
  isExpired: boolean
}

export default function ResetPasswordPage() {
  const [state, setState] = useState<FormState>({
    isError: false,
    isLoading: false,
    isExpired: false,
  })
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const seal = searchParams.get('seal')
  if (!seal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Sorry, this link is invalid.</p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Helmet>
        <title>Reset password | Interval</title>
      </Helmet>
      <div className="w-full max-w-sm p-8 mx-auto max">
        <h2 className="my-6 text-3xl font-extrabold text-center text-gray-900">
          Reset password
        </h2>
        <p className="my-6 text-gray-900">
          Please enter your new password below. Please note, resetting your
          password will log you out of any existing sessions.
        </p>
        <Formik<{
          password: string
          passwordConfirm: string
        }>
          initialValues={{
            password: '',
            passwordConfirm: '',
          }}
          validate={values => {
            if (values.password !== values.passwordConfirm) {
              return {
                passwordConfirm: 'Passwords do not match',
              }
            }
            if (values.password.length && values.password.length < 6) {
              return {
                passwordConfirm: 'Password must be at least 6 characters',
              }
            }

            return {}
          }}
          onSubmit={async values => {
            setState({ isError: false, isLoading: true, isExpired: false })

            try {
              const r = await tryPasswordReset({ seal, ...values })

              if (r.ok) {
                navigate('/dashboard')
              } else {
                setState({
                  isError: true,
                  isLoading: false,
                  isExpired: r.status === 403,
                })
              }
            } catch (err) {
              setState({ isError: true, isLoading: false, isExpired: false })
            }
          }}
        >
          {({ errors, touched }) => (
            <Form>
              <div className="mb-6 space-y-4">
                <IVInputField label="Password" id="password">
                  <Field
                    type="password"
                    name="password"
                    id="password"
                    className="form-input"
                    required
                  />
                </IVInputField>
                <IVInputField
                  label="Confirm password"
                  id="passwordConfirm"
                  errorMessage={
                    errors.passwordConfirm && touched.passwordConfirm
                      ? errors.passwordConfirm
                      : undefined
                  }
                >
                  <Field
                    type="password"
                    name="passwordConfirm"
                    id="passwordConfirm"
                    className="form-input"
                    required
                  />
                </IVInputField>
                {state.isExpired ? (
                  <div className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                    Sorry, that token is no longer valid. Please{' '}
                    <Link to="/forgot-password">submit a new request</Link>.
                  </div>
                ) : (
                  state.isError && (
                    <p className="px-4 py-3 text-sm font-medium text-red-800 rounded-md bg-red-50">
                      Sorry, there was a problem resetting your password. Please
                      double check your reset link or contact us if you continue
                      experiencing issues.
                    </p>
                  )
                )}
              </div>
              <div>
                <IVButton
                  type="submit"
                  disabled={state.isLoading}
                  loading={state.isLoading}
                  label="Save password and log in"
                  className="w-full"
                />
              </div>
              <div className="mt-4 text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary-500 hover:opacity-70"
                >
                  Log in instead
                </Link>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  )
}
