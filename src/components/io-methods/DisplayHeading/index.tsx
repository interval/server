import SectionHeading from '~/components/SectionHeading'
import usePageMenuItems from '~/utils/usePageMenuItems'
import { RCTResponderProps } from '~/components/RenderIOCall'

export default function DisplayHeading(
  props: RCTResponderProps<'DISPLAY_HEADING'>
) {
  let headingLevel: keyof JSX.IntrinsicElements = 'h2'
  switch (props.level) {
    case 2:
      headingLevel = 'h2'
      break
    case 3:
      headingLevel = 'h3'
      break
    case 4:
      headingLevel = 'h4'
      break
  }

  let actions = usePageMenuItems(props.menuItems ?? [], {
    defaultButtonTheme: 'secondary',
  })

  if (props.context === 'docs') {
    actions = actions?.map(({ href, ...a }) => ({
      ...a,
      onClick: () => {
        /* */
      },
      absolute: true,
    }))
  }

  return (
    <div className="pt-4 first:pt-0">
      <SectionHeading
        HeadingComponent={headingLevel}
        title={props.label}
        description={props.description}
        actions={actions}
      />
    </div>
  )
}
