import { useState, useEffect, useCallback } from 'react'
import { Editor as CoreEditor } from '@tiptap/core'
import { useEditor, Editor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Level } from '@tiptap/extension-heading'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import classNames from 'classnames'

import IVSelect from '~/components/IVSelect'

import QuoteLeftIcon from '~/icons/compiled/QuoteLeft'
import BulletedListIcon from '~/icons/compiled/BulletedList'
import NumberedListIcon from '~/icons/compiled/NumberedList'
import LinkIcon from '~/icons/compiled/Link'
import RedoIcon from '~/icons/compiled/Redo'
import UndoIcon from '~/icons/compiled/Undo'
import ClearFormattingIcon from '~/icons/compiled/ClearFormatting'
import ImageIcon from '~/icons/compiled/Image'
import { ShortcutMap, getShortcuts } from '~/utils/usePlatform'

const CustomLink = Link.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-K': ({ editor }) => linkButtonHandler(editor),
      'Mod-O': ({ editor }) => imageButtonHandler(editor),
      'Mod-C': ({ editor }) => clearFormattingButtonHandler(editor),
      // Swallow Cmd+Enter
      'Mod-Enter': () => true,
    }
  },
})

function linkButtonHandler(editor: CoreEditor) {
  const existing = editor.getAttributes('link').href

  // TODO: Use a better dialog
  const href = window.prompt('Link destination', existing ?? undefined)

  if (href === '') {
    editor.chain().focus().unsetLink().run()
    return false
  }

  if (!href) return false

  return editor.chain().focus().setLink({ href }).run()
}

function imageButtonHandler(editor: CoreEditor) {
  const existing = editor.getAttributes('image').src

  // TODO: Use a better dialog
  // TODO: Handle image uploads
  const src = window.prompt('Image URL', existing ?? undefined)

  if (!src) return false

  return editor.chain().focus().setImage({ src }).run()
}

function clearFormattingButtonHandler(editor: CoreEditor) {
  return editor
    .chain()
    .focus()
    .clearNodes()
    .unsetBold()
    .unsetItalic()
    .unsetUnderline()
    .unsetStrike()
    .unsetLink()
    .run()
}

export interface IVRichTextEditorProps {
  id?: string
  defaultValue?: string
  onChange: (content: string, textContent: string) => void
  onBlur?: () => void
  disabled?: boolean
  placeholder?: string
  className?: string
  autoFocus?: boolean
  hasError?: boolean
}

export default function IVRichTextEditor({
  id,
  defaultValue,
  onChange,
  onBlur = () => {
    /* */
  },
  disabled,
  placeholder = 'Write something ...',
  className,
  autoFocus = false,
  hasError,
}: IVRichTextEditorProps) {
  const editor = useEditor({
    content: defaultValue,
    editable: !disabled,
    extensions: [
      StarterKit,
      Underline,
      CustomLink.configure({
        openOnClick: true, // TODO: Disable this after adding custom handler
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image,
    ],
    onUpdate({ editor }) {
      // This might be wastefully expensive to do both always but it's a nice
      // way for the parent to ensure that text is entered and not just empty
      // blocks.

      onChange(editor.getHTML(), editor.getText())
    },
    editorProps: {
      attributes: autoFocus ? { 'data-autofocus-target': 'true' } : undefined,
    },
    onBlur,
    // TODO: Add custom ctrl/cmd+click handler for links
    // editorProps: {
    //   handleClickOn(_view, pos, node, nodePos, event, direct) {
    //     if (event.ctrlKey) {
    //       console.log({ node, nodePos, pos })
    //     }
    //
    //     return true
    //   },
    // },
  })

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  return (
    <div
      className={classNames(
        className,
        'p-2 bg-white border rounded-md overflow-hidden w-full min-w-[300px]',
        {
          'border-amber-500': hasError,
          'border-gray-300': !hasError,
          'bg-gray-50': disabled,
          'focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 ':
            !disabled,
        }
      )}
    >
      <MenuBar editor={editor} disabled={!!disabled} />
      <EditorContent
        editor={editor}
        className="prose max-w-none p-2 pt-4"
        disabled={disabled}
        id={id}
      />
    </div>
  )
}

function MenuBar({
  editor,
  disabled,
}: {
  editor: Editor | null
  disabled: boolean
}) {
  const [headingLevel, setHeadingLevel] = useState(0)

  const setHeading = useCallback(({ editor }: { editor: any }) => {
    setHeadingLevel(editor.getAttributes('heading')?.level ?? 0)
  }, [])

  useEffect(() => {
    if (editor) {
      editor.on('selectionUpdate', setHeading)
      editor.on('update', setHeading)

      return () => {
        editor.off('selectionUpdate', setHeading)
        editor.off('update', setHeading)
      }
    }
  }, [editor, setHeading])

  if (!editor) return null

  return (
    <div
      className="border-b border-solid border-gray-300 flex items-start gap-x-2"
      role="menu"
    >
      <div className="pb-2 flex flex-wrap gap-2">
        <IVSelect
          title="Heading level"
          aria-label="Heading level"
          className={classNames(
            'w-32 bg-white py-1.5 px-2 text-xs rounded text-gray-800 iv-rte-select',
            {
              'hover:bg-gray-100': !disabled,
            }
          )}
          tabIndex={-1}
          role="menuitem"
          value={headingLevel}
          disabled={disabled}
          options={[
            {
              label: 'Normal',
              value: '0',
              shortcuts: {
                mac: 'Meta+Alt+0',
                pc: 'Control+Alt+0',
              },
            },
            {
              label: 'Heading 1',
              value: '1',
              shortcuts: {
                mac: 'Meta+Alt+1',
                pc: 'Control+Alt+1',
              },
            },
            {
              label: 'Heading 2',
              value: '2',
              shortcuts: {
                mac: 'Meta+Alt+2',
                pc: 'Control+Alt+2',
              },
            },
            {
              label: 'Heading 3',
              value: '3',
              shortcuts: {
                mac: 'Meta+Alt+3',
                pc: 'Control+Alt+3',
              },
            },
          ]}
          onChange={(event: any) => {
            const level = Number(event.target.value)
            if (Number.isNaN(level) || level > 6) return

            setHeadingLevel(level)
            if (level === 0) {
              editor.chain().focus().clearNodes().run()
            } else {
              editor
                .chain()
                .focus()
                .toggleHeading({ level: level as Level })
                .run()
            }
          }}
        />

        <MenuBarButtonGroup
          buttons={[
            {
              title: 'Toggle bold',
              label: (
                <span className="font-bold inline-block w-3 text-center">
                  B
                </span>
              ),
              disabled: disabled || !editor.can().toggleBold(),
              isActive: editor.isActive('bold'),
              onClick() {
                editor.chain().focus().toggleBold().run()
              },
              shortcuts: {
                mac: 'Meta+B',
                pc: 'Control+B',
              },
            },
            {
              title: 'Toggle italic',
              label: (
                <span className="italic inline-block w-3 text-center">I</span>
              ),
              disabled: disabled || !editor.can().toggleItalic(),
              isActive: editor.isActive('italic'),
              onClick() {
                editor.chain().focus().toggleItalic().run()
              },
              shortcuts: {
                mac: 'Meta+I',
                pc: 'Control+I',
              },
            },
            {
              title: 'Toggle underline',
              label: (
                <span className="underline underline-offset-2 inline-block w-3 text-center">
                  U
                </span>
              ),
              disabled: disabled || !editor.can().toggleUnderline(),
              isActive: editor.isActive('underline'),
              onClick() {
                editor.chain().focus().toggleUnderline().run()
              },
              shortcuts: {
                mac: 'Meta+U',
                pc: 'Control+U',
              },
            },
            {
              title: 'Toggle strikethrough',
              label: (
                <span className="relative underline-offset-2 inline-block w-3 text-center">
                  <span className="absolute top-0 left-0 w-full h-1/2 border-b border-primary-700"></span>
                  S
                </span>
              ),
              disabled: disabled || !editor.can().toggleStrike(),
              isActive: editor.isActive('strikethrough'),
              onClick() {
                editor.chain().focus().toggleStrike().run()
              },
              shortcuts: {
                mac: 'Meta+Shift+X',
                pc: 'Control+Shift+X',
              },
            },
          ]}
        />
        <MenuBarButtonGroup
          buttons={[
            {
              title: 'Toggle bulleted list',
              label: <BulletedListIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().toggleBulletList(),
              isActive: editor.isActive('bulletList'),
              onClick() {
                editor.chain().focus().toggleBulletList().run()
              },
              shortcuts: {
                mac: 'Meta+Shift+8',
                pc: 'Control+Shift+8',
              },
            },
            {
              title: 'Toggle ordered list',
              label: <NumberedListIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().toggleOrderedList(),
              isActive: editor.isActive('orderedList'),
              onClick() {
                editor.chain().focus().toggleOrderedList().run()
              },
              shortcuts: {
                mac: 'Meta+Shift+7',
                pc: 'Control+Shift+7',
              },
            },
            {
              title: 'Toggle blockquote',
              label: <QuoteLeftIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().toggleBlockquote(),
              isActive: editor.isActive('blockquote'),
              onClick() {
                editor.chain().focus().toggleBlockquote().run()
              },
              shortcuts: {
                mac: 'Meta+Shift+B',
                pc: 'Control+Shift+B',
              },
            },
          ]}
        />
        <MenuBarButtonGroup
          buttons={[
            {
              title: 'Add link...',
              label: <LinkIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().setLink({ href: '' }),
              onClick: () => linkButtonHandler(editor),
              shortcuts: {
                mac: 'Meta+Shift+K',
                pc: 'Control+Shift+K',
              },
            },
          ]}
        />

        <MenuBarButtonGroup
          buttons={[
            {
              title: 'Undo',
              label: <UndoIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().undo(),
              onClick() {
                editor.chain().focus().undo().run()
              },
              shortcuts: {
                mac: 'Meta+U',
                pc: 'Control+U',
              },
            },
            {
              title: 'Redo',
              label: <RedoIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().redo(),
              onClick() {
                editor.chain().focus().redo().run()
              },
              shortcuts: {
                mac: 'Meta+R',
                pc: 'Control+R',
              },
            },
          ]}
        />

        <MenuBarButtonGroup
          buttons={[
            {
              title: 'Add image...',
              label: <ImageIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().setImage({ src: '' }),
              onClick: () => imageButtonHandler(editor),
              shortcuts: {
                mac: 'Meta+Shift+I',
                pc: 'Control+Shift+I',
              },
            },
          ]}
        />

        <MenuBarButtonGroup
          buttons={[
            {
              title: 'Clear formatting',
              label: <ClearFormattingIcon className="w-4 h-4" />,
              disabled: disabled || !editor.can().clearNodes(),
              onClick: () => clearFormattingButtonHandler(editor),
              shortcuts: {
                mac: 'Meta+Shift+C',
                pc: 'Control+Shift+C',
              },
            },
          ]}
        />
      </div>
    </div>
  )
}

function MenuBarButtonGroup({ buttons }: { buttons: MenuBarButtonProps[] }) {
  return (
    <div className="relative inline-flex rounded-md" role="group">
      {buttons.map(({ className, ...button }, i) => {
        return (
          <MenuBarButton
            key={i}
            {...button}
            className={classNames(
              className,
              'relative inline-flex items-center first:rounded-l -ml-px first:-ml-px last:rounded-r'
            )}
          />
        )
      })}
    </div>
  )
}

interface MenuBarButtonProps {
  label: React.ReactNode
  title?: string
  onClick: () => void
  disabled?: boolean
  className?: string
  isActive?: boolean
  shortcuts?: string | ShortcutMap
}

function MenuBarButton({
  label,
  title,
  onClick,
  disabled,
  isActive,
  shortcuts,
  className = 'rounded-sm',
}: MenuBarButtonProps) {
  const deviceShortcuts = getShortcuts(shortcuts)
  return (
    <button
      type="button"
      title={[title, deviceShortcuts ? `(${deviceShortcuts})` : undefined].join(
        ' '
      )}
      role="menuitem"
      aria-label={title}
      aria-disabled={disabled}
      aria-keyshortcuts={deviceShortcuts}
      tabIndex={-1}
      className={classNames(
        className,
        'px-2 py-1 text-sm transition-all duration-100 ease-in relative ring-0 font-medium border border-solid focus:z-10',
        {
          'cursor-not-allowed bg-gray-50 opacity-50': disabled,
          'hover:bg-gray-100': !disabled && !isActive,
          'bg-gray-800 text-white border-gray-800': isActive,
          'bg-white text-gray-800 border-gray-300': !isActive,
        }
      )}
      onClick={
        disabled
          ? () => {
              return
            }
          : onClick
      }
    >
      {label}
    </button>
  )
}
