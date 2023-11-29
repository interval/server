import React from 'react'
import classNames from 'classnames'
import { GridItem, SerializableRecord } from '@interval/sdk/dist/ioSchema'
import DropdownMenu from '../DropdownMenu'
import useImageLoaded from '~/utils/useImageLoaded'
import MoreIcon from '~/icons/compiled/More'
import useRenderContext from '../RenderContext'
import { getCurrentPath } from '~/utils/url'
import { useIsomorphicLink } from '~/utils/useIsomorphicLocation'

interface GridItemProps {
  label?: string | null
  // @deprecated in favor of `label`
  title?: string | null
  description?: string | null
  image?: GridItem['image'] | null
  menu?: GridItem['menu'] | null
  route?: string
  params?: SerializableRecord
  url?: string
}

const LinkBlock = ({
  to,
  state,
  url,
  children,
  className = '',
}: {
  children: React.ReactNode
  state?: any
  to?: string | null
  url?: string
  className?: string
}) => {
  const baseClassName = 'flex group'
  const Link = useIsomorphicLink()

  if (to) {
    return (
      <Link
        to={to}
        state={state}
        className={classNames(baseClassName, className)}
      >
        {children}
      </Link>
    )
  }

  return (
    <a
      href={url ?? '#'}
      className={classNames(baseClassName, className)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  )
}

const TextBlock = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => {
  return <div className={classNames('flex', className)}>{children}</div>
}

const Image = (props: GridItemProps) => {
  const { imageLoaded, imgRef } = useImageLoaded()

  if (!props.image) return null

  const { fit = 'cover', aspectRatio = 16 / 9 } = props.image ?? {}

  if (!props.image.url) {
    return (
      <div
        className={classNames('block w-full group-hover:opacity-80', {
          'bg-gray-100': !imageLoaded,
        })}
        style={{ aspectRatio }}
      />
    )
  }

  return (
    <img
      ref={imgRef}
      src={props.image.url}
      alt={props.image.alt ?? ''}
      className={classNames('block w-full group-hover:opacity-80', {
        'object-contain': fit === 'contain',
        'object-cover object-center': fit === 'cover',
        'bg-gray-100': !imageLoaded,
      })}
      style={{ aspectRatio }}
    />
  )
}

const Metadata = (
  props: GridItemProps & {
    to?: string | null
    url?: string
  }
) => {
  const label = props.label ?? props.title
  const Link = useIsomorphicLink()

  return (
    <div className="flex w-full">
      <div className="flex-1">
        {label && (
          <h4 className="font-semibold text-gray-900 hyphenate">
            {props.to ? (
              <Link to={props.to} className="hover:opacity-70">
                {label}
              </Link>
            ) : props.url ? (
              <a
                href={props.url}
                className="hover:opacity-70"
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ) : (
              <>{label}</>
            )}
          </h4>
        )}
        {props.description && (
          <p className="text-gray-400 hyphenate">{props.description}</p>
        )}
      </div>
    </div>
  )
}

function Menu(props: GridItemProps) {
  const { getActionUrl } = useRenderContext()

  if (!props.menu) return null

  const options = props.menu.map(item => {
    if (!('route' in item)) {
      return item
    }

    return {
      ...item,
      path: getActionUrl({
        base: window.location.origin,
        slug: item.route,
        params: item.params,
      }),
    }
  })

  return (
    <DropdownMenu
      buttonClassName="focus:outline-none px-1 py-1 border border-transparent hover:border-gray-300 rounded-md bg-white"
      menuClassName="min-w-[120px] max-w-[240px]"
      placement="left-start"
      title="Open options"
      options={options}
      // `modal` mode prevents menu from interfering with table overflow behavior
      modal
    >
      <MoreIcon className="w-4 h-4 text-gray-500" />
    </DropdownMenu>
  )
}

const MediaGridItem = React.forwardRef(
  (props: GridItemProps, ref: React.Ref<HTMLDivElement>) => {
    const isLinked = props.url || props.route
    const hasTextContent = props.label || props.title || props.description

    const { getActionUrl } = useRenderContext()
    const actionUrl = props.route
      ? getActionUrl({
          base: window.location.origin,
          slug: props.route,
          params: props.params,
        })
      : null

    const Container = isLinked ? LinkBlock : TextBlock

    if (!props.image) {
      return (
        <div className="relative flex items-stretch" role="grid-cell" ref={ref}>
          <Container
            to={actionUrl}
            state={{
              backPath: getCurrentPath(),
            }}
            url={props.url}
            className={classNames(
              'w-full border border-gray-200 rounded-md px-4 py-3',
              {
                'hover:border-gray-300': isLinked,
                'pr-8': props.menu,
              }
            )}
          >
            <Metadata {...props} to={actionUrl} url={props.url} />
          </Container>
          {props.menu && (
            <div className="absolute top-0 right-0 p-1">
              <Menu {...props} />
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="relative" role="grid-cell" ref={ref}>
        <Container to={actionUrl} url={props.url}>
          <Image {...props} />
        </Container>
        {hasTextContent && (
          <div
            className={classNames('relative mt-3', {
              'hover:border-gray-300': isLinked,
              'pr-8': props.menu,
            })}
          >
            <Metadata {...props} />
            {props.menu && (
              <div className="absolute right-0 -top-0.5">
                <Menu {...props} />
              </div>
            )}
          </div>
        )}
        {!hasTextContent && props.menu && (
          <div className="absolute top-0 right-0 p-1">
            <Menu {...props} />
          </div>
        )}
      </div>
    )
  }
)
MediaGridItem.displayName = 'MediaGridItem'

export default MediaGridItem
