import * as React from 'react'
import { useKBar, VisualState } from 'kbar'
import IVTextArea from '~/components/IVTextArea'

export const KBAR_LISTBOX = 'kbar-listbox'
export const getListboxItemId = (id: number) => `kbar-listbox-item-${id}`

export default function MultilineKBarSearch(
  props: React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> & {
    defaultPlaceholder?: string
  }
) {
  const {
    query,
    search,
    actions,
    currentRootActionId,
    activeIndex,
    showing,
    options,
  } = useKBar(state => ({
    search: state.searchQuery,
    currentRootActionId: state.currentRootActionId,
    actions: state.actions,
    activeIndex: state.activeIndex,
    showing: state.visualState === VisualState.showing,
  }))

  const ownRef = React.useRef<HTMLInputElement>(null)

  const { defaultPlaceholder, ...rest } = props

  React.useEffect(() => {
    query.setSearch('')
    if (ownRef.current) {
      ownRef.current.focus()
    }
    return () => query.setSearch('')
  }, [currentRootActionId, query])

  const placeholder = React.useMemo((): string => {
    const defaultText = defaultPlaceholder ?? 'Type a command or search…'
    return currentRootActionId && actions[currentRootActionId]
      ? actions[currentRootActionId].name
      : defaultText
  }, [actions, currentRootActionId, defaultPlaceholder])

  return (
    <IVTextArea
      rows={4}
      {...rest}
      className={`${rest.className} border-0 rounded-none resize-none`}
      autoFocus
      autoComplete="off"
      role="combobox"
      spellCheck="false"
      aria-expanded={showing}
      aria-controls={KBAR_LISTBOX}
      aria-activedescendant={getListboxItemId(activeIndex)}
      value={search}
      placeholder={placeholder}
      onChange={event => {
        props.onChange?.(event)
        query.setSearch(event.target.value)
        options?.callbacks?.onQueryChange?.(event.target.value)
      }}
      onKeyDown={event => {
        // shift + enter to create a new line
        if (event.shiftKey && event.key === 'Enter') {
          event.stopPropagation()
          return
        }
        // prevent submit if empty
        if (event.key === 'Enter' && !search) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        props.onKeyDown?.(event)
        if (currentRootActionId && !search && event.key === 'Backspace') {
          const parent = actions[currentRootActionId].parent
          query.setCurrentRootAction(parent)
        }
      }}
    />
  )
}
