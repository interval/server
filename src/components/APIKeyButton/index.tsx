import { trpc } from '~/utils/trpc'
import useCopyToClipboard from '~/utils/useCopyToClipboard'
import IVButton from '~/components/IVButton'
import { notify } from '~/components/NotificationCenter'
import { useEffect } from 'react'
import IconClipboard from '~/icons/compiled/Clipboard'

export default function ApiKeyButton() {
  const key = trpc.useQuery(['key.dev'])

  const { isCopied, onCopyClick } = useCopyToClipboard()

  useEffect(() => {
    if (isCopied) {
      notify.success('Copied token to clipboard')
    }
  }, [isCopied])

  return (
    <IVButton
      theme="secondary"
      onClick={() => onCopyClick(key?.data?.key || '')}
      label={
        <span className="font-mono flex items-center">
          <span className="w-48 truncate">{key?.data?.key}</span>
          <IconClipboard className="w-5 h-5 text-gray-500 ml-2 -mr-1" />
        </span>
      }
    />
  )
}
