import classNames from 'classnames'
import IVSpinner from '~/components/IVSpinner'
import { useState } from 'react'
import CheckIcon from '~/icons/compiled/Check'
import UploadsFolderIcon from '~/icons/compiled/UploadsFolder'
import { preventDefaultInputEnterKey } from '~/utils/preventDefaultInputEnter'

export type UploadStep = 'default' | 'uploading' | 'success' | 'error'

interface FileUploadButtonProps {
  id: string
  dropZoneClassName?: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  currentStep: UploadStep
  showUploadStatus: boolean
  accept?: string
  value?: File[]
  disabled?: boolean
  clickToSelectLabel?: React.ReactNode
  description?: React.ReactNode
  onReset?: () => void
  multiple?: boolean
}

function truncateFile(file: File, index: number) {
  const parts = file.name.split('.')
  const extension = parts.pop()
  const name = parts.join('.')
  return (
    <div key={index} className="flex items-center px-2">
      <span className="inline-block max-w-[200px] truncate">{name}</span>.
      {extension}
    </div>
  )
}

function selectedTitle(files: File[]) {
  if (files.length === 1) {
    return 'File selected'
  }

  return `${files.length} files selected`
}

export default function FileUploadButton({
  id,
  dropZoneClassName,
  currentStep,
  onChange,
  showUploadStatus,
  accept = '*',
  value,
  disabled,
  clickToSelectLabel,
  description,
  onReset,
  multiple = false,
}: FileUploadButtonProps) {
  const [isDragging, setIsDragging] = useState(false)

  let title: React.ReactNode =
    value && value.length > 0
      ? selectedTitle(value)
      : clickToSelectLabel ?? (
          <>
            <strong
              className={classNames('font-medium', {
                'text-primary-500': !disabled,
              })}
            >
              Select a file
            </strong>{' '}
            or drag and drop
          </>
        )

  switch (currentStep) {
    case 'uploading':
      if (showUploadStatus) {
        title = 'Uploading...'
        description =
          "Please don't close this window or navigate away from this page."
      }
      break
    case 'error':
      if (!description) {
        description =
          'Sorry, there was a problem uploading your file. Please try again.'
      }
      break
    case 'success':
      if (showUploadStatus) {
        title = 'Upload complete'
      }
      break
  }

  let icon = <UploadsFolderIcon className="w-8 h-8" />

  if (currentStep === 'success' && showUploadStatus) {
    icon = <CheckIcon className="w-8 h-8 text-green-600" />
  } else if (currentStep === 'uploading' && showUploadStatus) {
    icon = <IVSpinner className="w-6 h-6" />
  }

  return (
    <div
      className={classNames(
        'relative flex justify-center items-center px-6 bg-white border-2 border-dashed border-gray-200 rounded-lg text-sm py-8',
        dropZoneClassName,
        {
          'cursor-progress':
            currentStep === 'uploading' && !disabled && showUploadStatus,
          'cursor-pointer hover:bg-gray-50':
            (currentStep === 'default' || currentStep === 'error') && !disabled,
          'bg-gray-100 border-gray-300': isDragging && !disabled,
          'cursor-not-allowed': disabled,
        }
      )}
    >
      {/* approximates height of icon + title + description so UI doesn't change height */}
      <div
        className={classNames('text-center min-h-[110px] flex items-center', {
          'opacity-50': disabled,
        })}
      >
        <div className="flex flex-col">
          <div className="w-8 h-8 mx-auto flex items-center justify-center mb-2 text-gray-500 opacity-70">
            {icon}
          </div>

          <p
            className={classNames('text-gray-500 mb-1', {
              'font-medium': currentStep !== 'default',
            })}
          >
            {title}
          </p>
          <div
            className={classNames('flex flex-wrap justify-center', {
              'text-gray-500 opacity-70': currentStep !== 'error',
              'text-red-700': currentStep === 'error',
            })}
          >
            {description ?? value?.map(truncateFile) ?? ''}
          </div>
        </div>
      </div>

      {(currentStep === 'default' || currentStep === 'error') && (
        <input
          type="file"
          name={id}
          id={id}
          disabled={disabled}
          multiple={multiple}
          accept={accept}
          onChange={onChange}
          className={classNames('absolute top-0 w-full h-full opacity-0', {
            'cursor-pointer': !disabled,
            'cursor-not-allowed': disabled,
          })}
          onDragOver={() => setIsDragging(true)}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragEnd={() => setIsDragging(false)}
          onDrop={() => setIsDragging(false)}
          onKeyDown={preventDefaultInputEnterKey}
        />
      )}
      <div className="absolute bottom-0 right-0">
        {currentStep !== 'default' && onReset && (
          <button
            className="text-gray-500 opacity-70 mt-1 inline-block font-medium p-2 text-sm hover:opacity-50"
            children={multiple ? 'Select new files...' : 'Select a new file...'}
            onClick={onReset}
          />
        )}
      </div>
    </div>
  )
}
