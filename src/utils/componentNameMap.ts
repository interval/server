import { ioSchema } from '@interval/sdk/dist/ioSchema'
import Confirm from '~/components/io-methods/Confirm'
import DisplayCode from '~/components/io-methods/DisplayCode'
import DisplayGrid from '~/components/io-methods/DisplayGrid'
import DisplayHeading from '~/components/io-methods/DisplayHeading'
import DisplayImage from '~/components/io-methods/DisplayImage'
import DisplayLink from '~/components/io-methods/DisplayLink'
import DisplayMarkdown from '~/components/io-methods/DisplayMarkdown'
import DisplayHTML from '~/components/io-methods/DisplayHTML'
import DisplayMetadata from '~/components/io-methods/DisplayMetadata'
import DisplayObject from '~/components/io-methods/DisplayObject'
import DisplayProgressIndeterminate from '~/components/io-methods/DisplayProgressIndeterminate'
import DisplayProgressSteps from '~/components/io-methods/DisplayProgressSteps'
import DisplayTable from '~/components/io-methods/DisplayTable'
import DisplayVideo from '~/components/io-methods/DisplayVideo'
import InputBoolean from '~/components/io-methods/InputBoolean'
import InputDate from '~/components/io-methods/InputDate'
import InputDateTime from '~/components/io-methods/InputDateTime'
import InputEmail from '~/components/io-methods/InputEmail'
import InputNumber from '~/components/io-methods/InputNumber'
import InputRichText from '~/components/io-methods/InputRichText'
import InputSlider from '~/components/io-methods/InputSlider'
import InputText from '~/components/io-methods/InputText'
import InputTime from '~/components/io-methods/InputTime'
import InputURL from '~/components/io-methods/InputURL'
import ListProgress from '~/components/io-methods/ListProgress'
import Search from '~/components/io-methods/Search'
import SelectMultiple from '~/components/io-methods/SelectMultiple'
import SelectSingle from '~/components/io-methods/SelectSingle'
import SelectTable from '~/components/io-methods/SelectTable'
import UploadFile from '~/components/io-methods/UploadFile'
import { RCTResponderProps } from '~/components/RenderIOCall'

export type ComponentNameMap = {
  [Property in keyof typeof ioSchema]?: (
    props: RCTResponderProps<Property>
  ) => React.ReactNode
}

export const ImplementedComponents = {
  DISPLAY_CODE: DisplayCode,
  DISPLAY_GRID: DisplayGrid,
  DISPLAY_HEADING: DisplayHeading,
  DISPLAY_MARKDOWN: DisplayMarkdown,
  DISPLAY_HTML: DisplayHTML,
  DISPLAY_IMAGE: DisplayImage,
  DISPLAY_LINK: DisplayLink,
  DISPLAY_OBJECT: DisplayObject,
  DISPLAY_METADATA: DisplayMetadata,
  DISPLAY_TABLE: DisplayTable,
  DISPLAY_PROGRESS_STEPS: DisplayProgressSteps,
  DISPLAY_PROGRESS_INDETERMINATE: DisplayProgressIndeterminate,
  DISPLAY_VIDEO: DisplayVideo,
  INPUT_TEXT: InputText,
  INPUT_NUMBER: InputNumber,
  INPUT_SLIDER: InputSlider,
  INPUT_RICH_TEXT: InputRichText,
  INPUT_DATE: InputDate,
  INPUT_TIME: InputTime,
  INPUT_DATETIME: InputDateTime,
  UPLOAD_FILE: UploadFile,
  DISPLAY_PROGRESS_THROUGH_LIST: ListProgress,
  INPUT_BOOLEAN: InputBoolean,
  INPUT_URL: InputURL,
  INPUT_EMAIL: InputEmail,
  SELECT_SINGLE: SelectSingle,
  SELECT_MULTIPLE: SelectMultiple,
  SELECT_TABLE: SelectTable,
  SEARCH: Search,
  CONFIRM: Confirm,
  // CONFIRM_IDENTITY is not implemented
  // INPUT_SPREADSHEET is not implemented
}
