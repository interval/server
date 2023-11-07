import IVButton, { IVButtonProps } from '~/components/IVButton'

export default function EmptyState({
  title,
  children,
  actions = [],
  Icon,
}: {
  title: string
  children?: React.ReactNode
  actions?: IVButtonProps[]
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
}) {
  return (
    <div className="flex flex-col justify-center pb-16">
      <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:py-24 lg:px-8 text-center items-center flex flex-col">
        {Icon && <Icon className="mb-2 w-12 h-12" />}
        <h3 className="h2">{title}</h3>
        <div className="mt-3 mb-5 text-gray-500 space-y-2">{children}</div>
        <div className="space-x-2">
          {actions.map((button, key) => (
            <IVButton key={key} {...button} />
          ))}
        </div>
      </div>
    </div>
  )
}
