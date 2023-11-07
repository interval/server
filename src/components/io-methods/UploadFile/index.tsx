import { T_IO_RETURNS } from '@interval/sdk/dist/ioSchema'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import FileUploadButton, { UploadStep } from '~/components/FileUploadButton'
import IVInputField from '~/components/IVInputField'
import { RCTResponderProps } from '~/components/RenderIOCall'
import useInput from '~/utils/useInput'
import useRenderContext from '~/components/RenderContext'

export default function UploadFile(
  props: RCTResponderProps<'UPLOAD_FILE', boolean>
) {
  const { errorMessage } = useInput(props)
  const [uploaded, setUploaded] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const returnRef =
    useRef<
      (
        value:
          | T_IO_RETURNS<'UPLOAD_FILE'>
          | T_IO_RETURNS<'UPLOAD_FILE'>[]
          | undefined
      ) => void
    >()
  const [currentStep, setCurrentStep] = useState<UploadStep>('default')
  const [inputDescription, setInputDescription] = useState<string | undefined>()
  const [urls, setUrls] = useState<
    { uploadUrl: string; downloadUrl: string }[] | null
  >(null)
  const { getUploadUrls } = useRenderContext()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    onUpdatePendingReturnValue,
    allowedExtensions,
    onStateChange,
    setExtraLoadingMessage,
  } = props

  const userFileUrls = useMemo(() => {
    if (props.fileUrls !== undefined) return props.fileUrls

    if (props.uploadUrl && props.downloadUrl) {
      return [{ uploadUrl: props.uploadUrl, downloadUrl: props.downloadUrl }]
    }

    if (props.uploadUrl === null && props.downloadUrl === null) {
      return null
    }

    return undefined
  }, [props.uploadUrl, props.downloadUrl, props.fileUrls])

  // these will be undefined if the user didn't define a custom generator function, null if they did
  const isUsingIntervalUrls = userFileUrls === undefined

  const normalizedExtensions = useMemo(
    () =>
      allowedExtensions?.map(ext => (ext.startsWith('.') ? ext : `.${ext}`)),
    [allowedExtensions]
  )

  const accept = useMemo(() => {
    return normalizedExtensions?.join(',')
  }, [normalizedExtensions])

  // fetch custom URLs from the host when a file is selected
  useEffect(() => {
    if (files.length === 0) return

    if (isUsingIntervalUrls) return

    onStateChange({
      files: files.map(f => ({
        name: f.name,
        type: f.type,
      })),

      // for older SDKs
      name: !props.isMultiple ? files[0].name : undefined,
      type: !props.isMultiple ? files[0].type : undefined,
    })
  }, [isUsingIntervalUrls, files, onStateChange, props.isMultiple])

  useEffect(() => {
    setServerError(null)

    if (files.length === 0) return

    if (!getUploadUrls) return

    if (isUsingIntervalUrls) {
      getUploadUrls({
        transactionId: props.transaction?.id as string,
        inputGroupKey: props.inputGroupKey,
        objectKeys: files.map((_, i) => `${props.id}-${i}`),
      })
        .then(urls => {
          setUrls(urls ?? null)
        })
        .catch(err => {
          console.error(err)
          setServerError(err.message)
          setCurrentStep('error')
        })
    } else if (userFileUrls?.length) {
      setUrls(userFileUrls)
    }
  }, [
    files,
    getUploadUrls,
    isUsingIntervalUrls,
    props.id,
    props.inputGroupKey,
    props.transaction?.id,
    userFileUrls,
  ])

  useEffect(() => {
    if (urls && files.length !== urls.length) {
      setCurrentStep('error')
    }
  }, [files, urls])

  const upload = useCallback(() => {
    if (files.length === 0 || !urls) return

    // change to upload step while waiting for uploadUrl
    setCurrentStep('uploading')
    setExtraLoadingMessage(`Uploading files`)

    if (urls.some(({ uploadUrl }) => uploadUrl === 'error')) {
      setCurrentStep('error')
      return
    }

    Promise.all(
      files.map(async (file, i) => {
        const fileUrls = urls[i]
        const res = await fetch(fileUrls.uploadUrl, {
          method: 'PUT',
          body: file,
        })
        if (!res.ok) {
          throw new Error(res.statusText)
        }
      })
    )
      .then(() => {
        setUploaded(true)
      })
      .catch(err => {
        console.error('Failed uploading files', err)
        setCurrentStep('error')
      })
  }, [files, urls, setExtraLoadingMessage])

  useEffect(() => {
    if (props.isSubmitting && currentStep === 'default') {
      upload()
    }
  }, [props.isSubmitting, currentStep, upload])

  // initiate the upload when a file is selected and the uploadUrl is available
  useEffect(() => {
    if (isUsingIntervalUrls) {
      upload()
    }
  }, [urls, files, isUsingIntervalUrls, upload])

  useEffect(() => {
    if (
      files.length > 0 &&
      uploaded &&
      urls?.every(({ downloadUrl }) => downloadUrl)
    ) {
      setCurrentStep('success')
      const returnValues = files.map((file, i) => ({
        type: file.type,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        url: urls[i].downloadUrl,
      }))
      const returnValue = props.isMultiple ? returnValues : returnValues[0]
      returnRef.current?.(returnValue)
      // TODO confirm we still unset where appropriate
      // onUpdatePendingReturnValue(undefined)
    }
  }, [files, uploaded, urls, onUpdatePendingReturnValue, props.isMultiple])

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let files = Array.from(event.target.files ?? [])
      setInputDescription(undefined)

      if (files.length === 0) {
        setFiles(files)
        return
      }

      if (files.length > 1 && !props.isMultiple) {
        setInputDescription('Please select only one file.')
        return
      }

      if (normalizedExtensions) {
        files = files.filter(f =>
          normalizedExtensions.some(ext => f.name.endsWith(ext))
        )
      }

      if (files.length === 0) {
        setInputDescription(
          'Sorry, that file does not meet the requirements. Please select another and try again.'
        )
      }

      setFiles(files)
      const promise = new Promise<
        T_IO_RETURNS<'UPLOAD_FILE'> | T_IO_RETURNS<'UPLOAD_FILE'>[] | undefined
      >(resolve => {
        returnRef.current = resolve
      })
      onUpdatePendingReturnValue(promise)
    },
    [normalizedExtensions, props.isMultiple, onUpdatePendingReturnValue]
  )

  const handleReset = useCallback(() => {
    setFiles([])
    setUploaded(false)
    setCurrentStep('default')
    setUrls(null)
    setServerError(null)
  }, [])

  const constraints = useMemo(() => {
    if (normalizedExtensions) {
      return `Must have one of the following file extensions: ${normalizedExtensions.join(
        ', '
      )}.`
    }
  }, [normalizedExtensions])

  return (
    <IVInputField
      label={props.label}
      id={props.id}
      helpText={props.helpText}
      optional={props.isOptional}
      errorMessage={errorMessage}
      constraints={constraints}
    >
      <FileUploadButton
        dropZoneClassName={
          errorMessage
            ? 'bg-amber-50 hover:bg-amber-100 hover:bg-opacity-60 border-amber-300'
            : undefined
        }
        id={props.id}
        currentStep={currentStep}
        showUploadStatus={false}
        value={files}
        disabled={props.disabled}
        onChange={handleChange}
        accept={accept}
        onReset={props.isCurrentCall ? handleReset : undefined}
        description={serverError ?? inputDescription}
        multiple={props.isMultiple}
      />
    </IVInputField>
  )
}
