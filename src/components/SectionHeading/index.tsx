import classNames from 'classnames'
import { ReactNode } from 'react'
import IVButton, { IVButtonProps } from '~/components/IVButton'

export default function SectionHeading({
  HeadingComponent = 'h3',
  title,
  description,
  children,
  actions,
}: {
  HeadingComponent?: keyof JSX.IntrinsicElements
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  actions?: IVButtonProps[]
}) {
  return (
    <div className="flex justify-between">
      <div>
        <HeadingComponent
          className={classNames('pt-0.5 text-gray-900', HeadingComponent)}
        >
          {title}
        </HeadingComponent>
        {description && (
          <p
            className={classNames('max-w-4xl text-sm text-gray-500', {
              'mt-2': HeadingComponent === 'h2',
              'mt-1': HeadingComponent === 'h3',
            })}
          >
            {description}
          </p>
        )}
      </div>
      <div>
        {actions && (
          <div className="flex md:ml-4 gap-2">
            {actions?.map((props, i) => (
              <IVButton key={i} {...props} />
            ))}
          </div>
        )}
      </div>
      {children ?? null}
    </div>
  )
}
