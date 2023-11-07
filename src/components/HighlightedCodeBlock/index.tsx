import React, { useState, useMemo, useEffect, useCallback } from 'react'
import download from 'downloadjs'
import classNames from 'classnames'
import { toast as notify } from 'react-hot-toast'
import type Hljs from 'highlight.js/lib/common'
import useCopyToClipboard from '~/utils/useCopyToClipboard'
import { atom, useRecoilState } from 'recoil'
import { localStorageRecoilEffect } from '~/utils/localStorage'
import CheckIcon from '~/icons/compiled/Check'
import CopyIcon from '~/icons/compiled/Copy'
import DownloadIcon from '~/icons/compiled/DownloadsFolder'

const packageManagerState = atom<'npm' | 'yarn'>({
  key: 'packageManager',
  default: 'npm',
  effects: [localStorageRecoilEffect('iv_packageManager')],
})

export interface HighlightedCodeBlockProps {
  code: string
  language?: string
  canCopy?: boolean
  canDownload?: boolean
  fileName?: string
  extension?: string
  className?: string
  shouldReplacePackageManager?: boolean
  shouldDisplayFileName?: boolean
  theme?: 'dark' | 'light'
}

function guessExtension(language?: string) {
  // based on documented languages accepted for io.display.code
  switch (language) {
    case undefined:
      return 'txt'
    case 'csharp':
      return 'cs'
    case 'javascript':
      return 'js'
    case 'typescript':
      return 'ts'
    case 'rust':
      return 'rs'
    case 'python':
    case 'python-repl':
      return 'py'
    case 'markdown':
      return 'md'
    case 'kotlin':
      return 'kt'
    case 'plaintext':
      return 'txt'
    case 'ruby':
      return 'rb'
    case 'shell':
      return 'sh'
    case 'swift':
      return 'swe'
    case 'php-template':
      return 'php'
    case 'makefile':
      return 'Makefile'

    default:
      return language
  }
}

export default function HighlightedCodeBlock({
  code,
  language,
  shouldReplacePackageManager = true,
  shouldDisplayFileName = true,
  canCopy = true,
  canDownload = true,
  fileName,
  extension,
  className,
  theme = 'dark',
}: HighlightedCodeBlockProps) {
  const [packageManager, setPackageManager] =
    useRecoilState(packageManagerState)

  const doesIncludePackageManager = useMemo(
    () => new RegExp(/(npm |npx )/).test(code),
    [code]
  )

  const formattedCode = useMemo(() => {
    let formatted = code

    if (shouldReplacePackageManager && packageManager === 'yarn') {
      // order is important!

      // global install:
      formatted = formatted.replace(/npm install -g/, 'yarn global add')
      formatted = formatted.replace(/npm i -g/, 'yarn global add')

      // install all:
      formatted = formatted.replace(/npm install &&/, 'yarn &&')
      formatted = formatted.replace(/npm i &&/, 'yarn &&')
      formatted = formatted.replace(/^npm install$/, 'yarn')

      // install specific:
      formatted = formatted.replace(/npm install /, 'yarn add ')
      formatted = formatted.replace(/npm i /, 'yarn add ')

      // yarn implied run:
      formatted = formatted.replace(/npm run/, 'yarn')

      // create
      formatted = formatted.replace(/npx create-/, 'yarn create ')
    }

    return formatted
  }, [code, shouldReplacePackageManager, packageManager])

  const { onCopyClick, isCopied } = useCopyToClipboard()

  const handleDownload = useCallback(() => {
    try {
      download(
        formattedCode,
        `${fileName ?? 'code'}.${extension ?? guessExtension(language)}`,
        'text/plain'
      )
    } catch (err) {
      console.error('Failed generating download', err)
      notify.error('Failed generating the download.')
    }
  }, [formattedCode, fileName, extension, language])

  return (
    <div>
      <div
        className={classNames(
          'not-prose text-[13px] rounded-md relative text-left mt-0 iv-code-block',
          className,
          canCopy && canDownload
            ? 'pr-20'
            : canCopy || canDownload
            ? 'pr-12'
            : ''
        )}
      >
        {shouldDisplayFileName && fileName && (
          <div className="w-full border-b">
            <div className=" py-3 px-4">{fileName}</div>
          </div>
        )}
        <div className="w-full overflow-x-auto">
          <pre className="leading-[1.4] mx-4 my-3">
            <HighlightedCodeElement
              theme={theme}
              code={formattedCode}
              language={language}
            />
          </pre>
        </div>
        <div className="absolute top-0 right-0 p-1.5 flex justify-end gap-1.5">
          {canCopy && (
            <div className="bg-[#F6F8FA]">
              <button
                type="button"
                aria-label="Copy"
                title="Copy"
                onClick={() => onCopyClick(formattedCode)}
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
          )}
          {canDownload && (
            <div className="bg-[#F6F8FA]">
              <button
                type="button"
                aria-label="Download"
                title="Download"
                onClick={handleDownload}
                children={<DownloadIcon className="w-4 h-4" />}
                className="p-1.5 text-gray-400 hover:border-gray-300 bg-[#F6F8FA] border border-gray-200 rounded-md z-[1] relative"
              />
            </div>
          )}
        </div>
      </div>
      {shouldReplacePackageManager && doesIncludePackageManager && (
        <button
          className="py-1 text-gray-500 text-xs hover:opacity-60"
          onClick={() =>
            setPackageManager(prev => (prev === 'npm' ? 'yarn' : 'npm'))
          }
        >
          Use {packageManager === 'npm' ? 'yarn' : 'npm'} instead
        </button>
      )}
    </div>
  )
}

interface HighlightedCodeElements extends React.HTMLAttributes<HTMLElement> {
  code: string
  language?: string
  theme: 'dark' | 'light'
}

interface CodeTheme {
  '--mono1': string
  '--hue2': string
  '--hue3': string
  '--hue4': string
  '--entity': string
  '--substr': string
  '--constant': string
}

interface CodeThemes {
  dark: CodeTheme
  light: CodeTheme
}

const themes: CodeThemes = {
  dark: {
    '--mono1': '#abb2bf',
    '--hue2': '#c792ea',
    '--hue3': '#f78c6c',
    '--hue4': '#a5d6ff',

    '--constant': '#79c0ff',
    '--entity': '#79c0ff',
    '--substr': '#c9d1d9',
  },
  light: {
    '--mono1': '#383a42',
    '--hue2': '#D94856',
    '--hue3': '#2F30B0',
    '--hue4': '#E52D7D',

    '--constant': '#3B3C36',
    '--entity': '#38ADAB',
    '--substr': '#3B3C36',
  },
}

export function HighlightedCodeElement({
  code,
  language,
  className,
  theme,
  ...rest
}: HighlightedCodeElements) {
  const [hljs, setHljs] = useState<typeof Hljs | null>(null)

  useEffect(() => {
    import('highlight.js/lib/common')
      .then(r => {
        setHljs(r.default)
      })
      .catch(err => {
        console.error('Failed loading highlight.js', err)
      })
  }, [])

  const __html = useMemo(() => {
    if (hljs) {
      if (language) {
        try {
          return hljs.highlight(code, { language }).value
        } catch (err) {
          console.error(
            `Failed highlighting with given language "${language}", falling back to auto`,
            err
          )
        }
      }

      return hljs.highlightAuto(code).value
    }

    return code
  }, [hljs, code, language])

  return (
    <span style={themes[theme] as React.CSSProperties}>
      <code
        {...rest}
        className={classNames(className, 'hljs')}
        dangerouslySetInnerHTML={{ __html }}
      ></code>
    </span>
  )
}
