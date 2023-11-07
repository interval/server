import { Helmet } from 'react-helmet-async'
import IVButton from '~/components/IVButton'
import IVSpinner from '~/components/IVSpinner'

export default function AuthLoadingState({
  pageTitle,
  children,
  buttonLabel = 'Go back',
  buttonHref = '/login',
}: {
  pageTitle?: string
  children?: React.ReactNode
  buttonLabel?: string | null
  buttonHref?: string
}) {
  return (
    <div className="flex items-center justify-center min-h-screen-ios">
      {pageTitle && (
        <Helmet>
          <title>{pageTitle} | Interval</title>
        </Helmet>
      )}

      <div className="py-12 text-center">
        {children ?? <IVSpinner />}
        {children && (
          <IVButton
            href={buttonHref}
            label={buttonLabel}
            theme="secondary"
            className="mt-4"
          />
        )}
      </div>
    </div>
  )
}
