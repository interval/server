import { useEffect } from 'react'
import { Toaster, ToastBar, toast, ToastPosition } from 'react-hot-toast'
import { ToastType } from 'react-hot-toast/src/core/types'
import { useSearchParams } from 'react-router-dom'
import IconCancel from '~/icons/compiled/Cancel'

export { toast as notify }

interface Notifications {
  [key: string]: NotificationHandler
}

interface NotificationReturnValue {
  kind?: ToastType
  body: string
}

type NotificationHandler = (value?: string) => NotificationReturnValue

/**
 * List notifications here that need to be triggered remotely, e.g. via callbacks or redirects.
 */
const notifications: Notifications = {
  'nc-email-confirmed': () => ({
    kind: 'success',
    body: 'Your email address was confirmed.',
  }),
  'nc-new-organization': name => ({
    kind: 'success',
    body: `New organization ${name} created.`,
  }),
  'nc-save-success': () => ({
    kind: 'success',
    body: `Your changes were saved.`,
  }),
  'nc-subscribe-success': () => ({
    kind: 'success',
    body: 'Your subscription was successful. It may take a few moments before the change is reflected in the dashboard.',
  }),
}

export default function NotificationCenter(props: { className?: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const POSITION: ToastPosition = 'top-center'
  const {
    className = 'fixed top-0 left-0 z-50 w-full mx-auto sm:w-96 sm:left-1/2 sm:-ml-48',
  } = props

  useEffect(() => {
    const entries = searchParams.entries()

    for (const [key, value] of entries) {
      if (notifications[key]) {
        const n = notifications[key](decodeURIComponent(value))
        const toaster = n.kind && n.kind in toast ? toast[n.kind] : toast
        toaster(n.body)

        const filtered = Array.from(entries).filter(([k]) => k !== key)
        setSearchParams(filtered, { replace: true })
      }
    }
  }, [searchParams, setSearchParams])

  return (
    <div className={className}>
      <Toaster
        position={POSITION}
        toastOptions={{
          duration: 3000,
          // We use styles here instead of Tailwind classes because ToastBar overrides them with its own css-in-js classname.
          // We could replace ToastBar entirely, but we would need to provide our own animations in that case.
          // For now, these values are just copied from Tailwind docs: https://tailwindcss.com/docs/customizing-colors
          style: {
            padding: '0',
            backgroundColor: 'rgb(62,77,230)', // Indigo 500
            color: '#fff',
          },
          success: {
            style: {
              backgroundColor: 'rgb(5,150,105)', // Green 600
            },
          },
          error: {
            style: {
              backgroundColor: 'rgb(220,38,38)', // Red 600
            },
          },
        }}
      >
        {t => {
          return (
            <ToastBar
              toast={t}
              position={POSITION}
              style={{
                ...t.style,
                animation: t.visible
                  ? 'toast-enter 0.35s cubic-bezier(.21,1.02,.73,1) forwards'
                  : 'toast-leave 0.4s forwards cubic-bezier(.06,.71,.55,1)',
              }}
            >
              {({ message }) => (
                <div className="flex items-start">
                  <div className="flex-1 py-2 pl-2 text-sm">{message}</div>
                  {t.type !== 'loading' && (
                    <button
                      type="button"
                      className="relative flex-none p-3 pl-1 top-px hover:opacity-70"
                      onClick={() => {
                        toast.dismiss(t.id)
                      }}
                    >
                      <IconCancel className="w-4 h-4 translate translate-y-px" />
                    </button>
                  )}
                </div>
              )}
            </ToastBar>
          )
        }}
      </Toaster>
    </div>
  )
}
