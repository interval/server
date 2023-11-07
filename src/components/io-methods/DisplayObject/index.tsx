import { useCallback } from 'react'
import download from 'downloadjs'
import { RCTResponderProps } from '~/components/RenderIOCall'
import ObjectViewer from '~/components/ObjectViewer'
import { toast as notify } from 'react-hot-toast'
import useCopyToClipboard from '~/utils/useCopyToClipboard'
import CheckIcon from '~/icons/compiled/Check'
import CopyIcon from '~/icons/compiled/Copy'
import DownloadIcon from '~/icons/compiled/DownloadsFolder'

export default function DisplayObject({
  label,
  data,
}: RCTResponderProps<'DISPLAY_OBJECT'>) {
  const { onCopyClick, isCopied } = useCopyToClipboard()

  const handleCopyJson = useCallback(() => {
    try {
      onCopyClick(JSON.stringify(data, null, 2))
    } catch (err) {
      console.error('Failed generating JSON', err)
      notify.error('Failed generating text to copy.')
    }
  }, [data, onCopyClick])

  const handleDownloadJson = useCallback(() => {
    try {
      download(
        JSON.stringify(data, null, 2),
        `${label ?? 'data'}.json`,
        'application/json'
      )
    } catch (err) {
      console.error('Failed generating download', err)
      notify.error('Failed generating the download.')
    }
  }, [data, label])

  return (
    <div>
      <span className="form-label mb-2 flex items-center">{label}</span>
      <div className="bg-gray-50 rounded-lg relative">
        <div className="absolute top-0 right-0 p-1 flex justify-end gap-2">
          <div className="bg-[#F6F8FA]">
            <button
              type="button"
              aria-label="Copy as JSON"
              title="Copy as JSON"
              onClick={handleCopyJson}
              children={
                isCopied ? (
                  <CheckIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )
              }
              className="p-1.5 text-gray-400 hover:border-gray-300 bg-[#F6F8FA] border border-gray-200 rounded-md z-[1] relative"
            />
          </div>

          <div className="bg-[#F6F8FA]">
            <button
              type="button"
              aria-label="Download as JSON"
              title="Download as JSON"
              onClick={handleDownloadJson}
              children={<DownloadIcon className="w-4 h-4" />}
              className="p-1.5 text-gray-400 hover:border-gray-300 bg-[#F6F8FA] border border-gray-200 rounded-md z-[1] relative"
            />
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto p-4 pr-20">
          <ObjectViewer data={data} />
        </div>
      </div>
    </div>
  )
}
