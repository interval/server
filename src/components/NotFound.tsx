import EmptyState from '~/components/EmptyState'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <EmptyState
        title="Sorry, page not found."
        actions={[
          {
            label: 'Return home',
            href: '/dashboard',
          },
        ]}
      >
        <p>
          Please double check the address and try again.
          <br />
          Let us know if you continue to experience issues.
        </p>
      </EmptyState>
    </div>
  )
}
