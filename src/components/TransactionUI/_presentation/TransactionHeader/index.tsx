import { Helmet } from 'react-helmet-async'
import PageHeading from '~/components/PageHeading'
import IconRefresh from '~/icons/compiled/Refresh'
import { ActionMode } from '~/utils/types'
import { UI_STATE } from '../../useTransaction'
import { IVButtonProps } from '~/components/IVButton'
import {
  NEW_TRANSACTION_MESSAGE,
  NEW_TRANSACTION_BACKGROUNDABLE_MESSAGE,
} from '~/utils/useTransactionNavigationWarning'

interface Props {
  title: string
  mode: ActionMode
  state?: UI_STATE | null
  onNewTransaction?: () => void
  cancelButton?: {
    href?: string
  }
  metadata?: {
    title: string
    value: string
    Icon?: (props: React.ComponentProps<'svg'>) => JSX.Element
  }[]
  breadcrumbs?: { name: string; slug: string }[]
  isBackgroundable?: boolean
  shouldWarnOnClose?: boolean
}

export default function TransactionHeader(props: Props) {
  const actions: IVButtonProps[] = [
    {
      theme: 'secondary',
      label:
        props.state === 'COMPLETED' || props.isBackgroundable
          ? 'Go back'
          : 'Cancel',
      href: props.cancelButton?.href,
      onClick: () => {
        /* empty onClick handler instructs Safari to give the <a> tab focus */
      },
    },
  ]

  const shouldWarnOnClose = props.shouldWarnOnClose ?? true

  if (props.onNewTransaction) {
    actions.unshift({
      theme: 'secondary',
      disabled:
        props.state !== 'IN_PROGRESS' &&
        props.state !== 'COMPLETED' &&
        props.state !== 'INVALID_MESSAGE',
      label: (
        <span>
          <IconRefresh className="inline-block w-4 h-4" />
          <span className="hidden sm:inline-block ml-2">New transaction</span>
        </span>
      ),
      onClick: () => {
        if (props.onNewTransaction) {
          if (props.mode === 'live' && shouldWarnOnClose) {
            const confirmed = window.confirm(
              props.isBackgroundable
                ? NEW_TRANSACTION_BACKGROUNDABLE_MESSAGE
                : NEW_TRANSACTION_MESSAGE
            )
            if (!confirmed) return
          }

          props.onNewTransaction()
        }
      },
    })
  }

  return (
    <div className="flex-none p-4 sm:px-6 sm:pt-6 pb-0">
      <Helmet>
        <title>{props.title} | Interval</title>
      </Helmet>
      <PageHeading
        title={props.title}
        breadcrumbs={props.breadcrumbs}
        actions={actions}
      />
    </div>
  )
}
