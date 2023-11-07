import { isUrl, getCurrentPath } from '~/utils/url'
import { isEmail } from '~/utils/validate'
import { isValidElement } from 'react'
import { IVTableCellValue, IVTableCellValueObject } from '../IVTable/useTable'
import { imageSizeToPx } from '~/utils/number'
import { JSONPrimitive } from '@interval/sdk/dist/ioSchema'
import { dateTimeFormatter } from '~/utils/formatters'
import RenderMarkdown, { ALLOWED_INLINE_ELEMENTS } from '../RenderMarkdown'
import Skeleton from 'react-loading-skeleton'
import Truncate from '../Truncate'
import { useIsomorphicLink } from '~/utils/useIsomorphicLocation'

export type RenderableValue = JSONPrimitive | Date | bigint | undefined

export function valueToString(value: RenderableValue): string {
  if (typeof value === 'number') {
    return value.toLocaleString()
  }

  if (typeof value === 'bigint' || value instanceof BigInt) {
    return `${value.toString()}n`
  }

  if (value instanceof Date) {
    return dateTimeFormatter.format(value)
  }

  if (typeof value === 'string') {
    const date = new Date(value)

    if (date.toJSON() === value) {
      return dateTimeFormatter.format(date)
    }

    // JSON.stringify wraps strings in quotes
    return value
  }

  return JSON.stringify(value)
}

function RenderImage({
  image,
  children,
}: {
  image: NonNullable<IVTableCellValueObject['image']>
  children?: React.ReactNode
}) {
  const width = image.size ?? image.width

  return (
    <figure className="overflow-hidden">
      <img
        className="object-contain max-h-full max-w-full object-left-top"
        src={image.url}
        alt={image.alt}
        width={width ? imageSizeToPx(width) : undefined}
      />
      {children && <figcaption className="mt-1">{children}</figcaption>}
    </figure>
  )
}

function MarkdownWrapper({
  value,
  allowedElements,
}: {
  value: string
  allowedElements?: string[]
}) {
  return (
    <div className="whitespace-normal">
      <RenderMarkdown
        value={value}
        showCodeControls={false}
        allowedElements={allowedElements}
      />
    </div>
  )
}

const INLINE_ELEMENTS_EXCEPT_LINKS = ALLOWED_INLINE_ELEMENTS.filter(
  el => el !== 'a'
)

function MaybeTruncate({
  children,
  truncate,
}: {
  children: React.ReactNode
  truncate?: boolean
}) {
  if (truncate) {
    return <Truncate>{children}</Truncate>
  }

  return <>{children}</>
}

export default function RenderValue({
  value,
  renderMarkdown = false,
  showSkeleton = false,
  shouldTruncate = false,
}: {
  value: IVTableCellValue | RenderableValue
  renderMarkdown?: boolean
  showSkeleton?: boolean
  shouldTruncate?: boolean
}) {
  const Link = useIsomorphicLink()

  if (isValidElement(value)) {
    return <MaybeTruncate truncate={shouldTruncate}>{value}</MaybeTruncate>
  }

  let data = value as IVTableCellValueObject | RenderableValue

  // flatten label-only objects
  if (
    typeof data === 'object' &&
    data &&
    'label' in data &&
    Object.keys(data).length === 1
  ) {
    data = data.label
  }

  // handle plain links
  if (typeof data === 'string' && (isUrl(data) || isEmail(data))) {
    const href = isEmail(data) ? `mailto:${data}` : data

    return (
      <a
        href={href}
        className="prose-link"
        target="_blank"
        rel="noreferrer"
        // prevents the link click from selecting the row in a selectable table
        onClick={e => e.stopPropagation()}
      >
        <MarkdownWrapper
          value={data}
          allowedElements={INLINE_ELEMENTS_EXCEPT_LINKS}
        />
      </a>
    )
  }

  if (
    data instanceof Date ||
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean' ||
    typeof data === 'bigint'
  ) {
    const stringLabel = valueToString(data)

    // tables render a dash for empty cells; don't render markdown for those
    if (renderMarkdown && stringLabel !== '-') {
      return (
        <MaybeTruncate truncate={shouldTruncate}>
          <MarkdownWrapper value={stringLabel} />
        </MaybeTruncate>
      )
    }

    return <>{stringLabel}</>
  }

  // handle image and URL objects
  if (data && typeof data === 'object') {
    const stringLabel = valueToString(data.label)

    let image: IVTableCellValueObject['image']

    if (data.image && typeof data.image === 'object') {
      image = data['image']
    }

    if (data.url) {
      return data.isInternalActionUrl ? (
        <Link
          to={data.url}
          className="prose-link"
          state={{
            // Disables the confirmation dialog when exiting transactions
            shouldShowPrompt: false,
            // Create a new transaction if linking to current action
            shouldCreateNewTransaction: true,
            // For enhanced back button behavior
            backPath: getCurrentPath(),
          }}
          // prevents the link click from selecting the row in a selectable table
          onClick={e => e.stopPropagation()}
        >
          {image ? (
            <RenderImage image={image}>{stringLabel}</RenderImage>
          ) : (
            <MarkdownWrapper
              value={stringLabel}
              allowedElements={INLINE_ELEMENTS_EXCEPT_LINKS}
            />
          )}
        </Link>
      ) : (
        <a
          href={data.url}
          className="prose-link"
          target="_blank"
          rel="noreferrer"
          // prevents the link click from selecting the row in a selectable table
          onClick={e => e.stopPropagation()}
        >
          {image ? (
            <RenderImage image={image}>{stringLabel}</RenderImage>
          ) : (
            <MarkdownWrapper
              value={stringLabel}
              allowedElements={INLINE_ELEMENTS_EXCEPT_LINKS}
            />
          )}
        </a>
      )
    }

    if ('label' in data) {
      const label =
        data.label === undefined && showSkeleton ? (
          <Skeleton width={40} duration={1} />
        ) : renderMarkdown ? (
          <MaybeTruncate truncate={shouldTruncate}>
            <MarkdownWrapper value={stringLabel} />
          </MaybeTruncate>
        ) : (
          <>{stringLabel}</>
        )

      return image ? <RenderImage image={image}>{label}</RenderImage> : label
    } else if (image) {
      return <RenderImage image={image} />
    }
  }

  if (
    showSkeleton &&
    data === undefined &&
    value &&
    typeof value === 'object' &&
    'label' in value
  ) {
    return <Skeleton width={40} duration={1} />
  }

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <>&nbsp;</>
  }

  return (
    <MaybeTruncate truncate={shouldTruncate}>
      {JSON.stringify(data, null, 2)}
    </MaybeTruncate>
  )
}
