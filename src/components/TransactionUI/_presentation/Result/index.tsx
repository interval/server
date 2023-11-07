import React from 'react'
import { ZodError, ZodIssue } from 'zod'
import { JSONValue } from 'superjson/dist/types'
import {
  JSONPrimitive,
  ParsedActionReturnData,
} from '@interval/sdk/dist/ioSchema'
import { TransactionResultStatus } from '@prisma/client'
import KeyValueTable from '~/components/KeyValueTable'
import RenderValue from '~/components/RenderValue'
import { pluralize } from '~/utils/text'
import { IORenderInstruction } from '~/components/RenderIOCall'
import IconExternalLink from '~/icons/compiled/ExternalLink'
import useCopyToClipboard from '~/utils/useCopyToClipboard'
import { notify } from '~/components/NotificationCenter'
import ObjectViewer from '~/components/ObjectViewer'

export default function ResultRenderer({
  status,
  result,
  shareLink,
}: {
  status: TransactionResultStatus | null
  result: JSONValue
  shareLink?: string
}) {
  const { onCopyClick } = useCopyToClipboard()
  if (result == null) return null

  return (
    <div
      data-test-id="transaction-result"
      className="sm:pl-12 text-gray-500 text-sm"
    >
      <h3 className="font-normal mb-2">Result:</h3>
      {status === 'FAILURE' ? (
        <div className="bg-red-50 rounded-md p-4 text-red-800">
          <TransactionError result={result} />
        </div>
      ) : typeof result === 'object' ? (
        Array.isArray(result) ? (
          <div className="font-mono">
            <ObjectViewer data={result} />
          </div>
        ) : (
          <KeyValueTable
            data={result as Exclude<ParsedActionReturnData, JSONPrimitive>}
          />
        )
      ) : (
        <div className="whitespace-pre-line">
          <RenderValue value={result} />
        </div>
      )}
      {shareLink && (
        <div className="pt-6">
          <a
            onClick={() => {
              onCopyClick(shareLink || '')
              notify.success('Link copied to clipboard.')
            }}
            className="cursor-pointer inline-flex text-sm items-center text-primary-400 hover:opacity-60 "
          >
            <IconExternalLink className="w-4 h-4 relative mr-1" />
            Share these results
          </a>
        </div>
      )}
    </div>
  )
}

interface ErrorLike {
  error?: any
  message: string
  cause?: string
}

function getError(result: JSONValue): ErrorLike | null {
  if (!result || typeof result !== 'object') return null
  if ('message' in result && typeof result.message === 'string') {
    let cause: string | undefined
    if ('cause' in result && typeof result.cause === 'string') {
      cause = result.cause
    }

    return {
      ...result,
      cause,
    } as ErrorLike
  }

  return null
}

export function TransactionError({ result }: { result: JSONValue }) {
  const errorResult = getError(result)
  if (!errorResult) {
    return <p>An unknown error occurred.</p>
  }

  const { error, message, cause } = errorResult

  if (error === 'ZodError') {
    try {
      const deserialized = JSON.parse(message)
      if (Array.isArray(deserialized)) {
        return (
          <ComponentError
            error={{
              issues: deserialized as ZodIssue[],
            }}
          />
        )
      }
    } catch (err) {
      // Probably not a ZodError, just render it normally below
    }
  }

  return (
    <div>
      <p className="mb-2 text-red-800">
        <span className="form-label text-red-800 inline-block">
          {error ?? 'Error'}
        </span>
        :<span className="ml-2">{message}</span>
      </p>
      {cause && (
        <div className="mb-2 ml-2">
          <p className="text-red-800 mb-2">Caused by:</p>
          <p className="ml-2 text-red-800 whitespace-pre">{cause}</p>
        </div>
      )}

      <p className="mt-4">Please check your host logs for more information.</p>
    </div>
  )
}

export function ComponentError({
  component,
  error,
}: {
  component?: IORenderInstruction<boolean>
  error: Pick<ZodError, 'issues'>
}) {
  return (
    <div>
      {component && (
        <p className="form-label mb-3 text-red-800">
          Label: {component.label ?? <em>No label</em>}
        </p>
      )}
      <p>
        This {component ? 'field' : 'action'} contains the following{' '}
        {pluralize(error.issues.length, 'error')}:
      </p>
      <ul className="list-outside ml-4 my-2">
        {error.issues.map((err, idx) => (
          <li key={idx}>
            <span className="font-mono">{pathToString(err.path)}:</span>{' '}
            {err.message}
          </li>
        ))}
      </ul>
      <p>Please correct your action code and try again.</p>
    </div>
  )
}

function pathToString(path: (string | number)[]) {
  if (path.length === 0) return ''

  return (
    path[0] +
    path
      .slice(1)
      .map(p => `[${p}]`)
      .join('')
  )
}
