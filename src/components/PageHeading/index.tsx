import { Helmet } from 'react-helmet-async'
import Skeleton from 'react-loading-skeleton'
import IVButton, { IVButtonProps } from '~/components/IVButton'
import ActionsBreadcrumbs from '../ActionBreadcrumbs'
import IVConstraintsIndicator from '~/components/IVConstraintsIndicator'

export interface PageHeadingProps {
  title?: React.ReactNode | null
  subtitle?: string
  description?: React.ReactNode
  actions?: IVButtonProps[]
  showBackButton?: boolean
  breadcrumbs?: { name: string; slug: string }[]
  children?: React.ReactNode
  titleError?: React.ReactNode
  descriptionError?: React.ReactNode
}
export default function PageHeading({
  title,
  subtitle,
  description,
  actions,
  breadcrumbs,
  children,
  titleError,
  descriptionError,
}: PageHeadingProps) {
  const textTitle = typeof title === 'string' ? title : 'Loading...'

  return (
    <div className="md:flex md:items-start md:justify-between mb-4">
      <Helmet>
        <title>{textTitle} | Interval</title>
      </Helmet>
      <div className="flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="mb-2">
            <ActionsBreadcrumbs breadcrumbs={breadcrumbs} />
          </div>
        )}
        <div className="flex">
          <h2 className="text-2xl font-bold leading-6 text-gray-900 sm:text-3xl sm:leading-[38px] sm:truncate tracking-tight">
            {title ?? <Skeleton width={200} />}
            {subtitle && (
              <small className="font-normal ml-4 leading-7 text-gray-600">
                {subtitle}
              </small>
            )}
          </h2>
          {titleError && (
            <div className="ml-2">
              <IVConstraintsIndicator
                error={true}
                constraints={titleError}
                id="admin-explanation"
                placement="right"
              />
            </div>
          )}
        </div>
        {descriptionError ? (
          <div className="flex">
            <p className="mt-2 max-w-4xl text-base text-red-800 tracking-[-0.01em]">
              Error loading description
            </p>
            <div className="ml-2">
              <IVConstraintsIndicator
                error={true}
                constraints={descriptionError}
                id="admin-explanation"
                placement="right"
              />
            </div>
          </div>
        ) : (
          description && (
            <p className="mt-2 max-w-4xl text-base text-gray-700 tracking-[-0.01em]">
              {description}
            </p>
          )
        )}
      </div>
      {children ? (
        <div>{children}</div>
      ) : (
        <div className="mt-4 flex md:mt-0 md:ml-4 gap-2">
          {actions?.map((props, i) => (
            <IVButton key={i} {...props} />
          ))}
        </div>
      )}
    </div>
  )
}
