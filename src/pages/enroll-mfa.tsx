import { useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { Navigate, useSearchParams } from 'react-router-dom'
import { trpc } from '~/utils/trpc'
import IVButton from '~/components/IVButton'
import AuthPageHeader from '~/components/AuthPageHeader'
import EnrollMFAForm from '~/components/AccountSettings/EnrollMFAForm'
import { MeProvider, useMe } from '~/components/MeContext'
import { commaSeparatedList } from '~/utils/text'
import NotFound from '~/components/NotFound'

function EnrollMFAContent({ onSubmit }: { onSubmit: () => void }) {
  const session = trpc.useQuery(['auth.session.session'])
  const integrations = trpc.useQuery(['dashboard.integrations'])
  const [searchParams] = useSearchParams()
  const { me, isLoading } = useMe()

  const userOrganizationAccess = me?.userOrganizationAccess
  const orgsRequiringMfa = useMemo(() => {
    if (!userOrganizationAccess) return []

    return userOrganizationAccess
      .map(access => access.organization)
      .filter(org => org.requireMfa)
  }, [userOrganizationAccess])

  const orgsNotRequiringMfa = useMemo(() => {
    if (!userOrganizationAccess) return []

    return userOrganizationAccess
      .map(access => access.organization)
      .filter(org => !org.requireMfa)
  }, [userOrganizationAccess])

  if (!integrations.isLoading && !integrations.data?.workos) {
    return <NotFound />
  }

  if (!isLoading && !me) {
    return <Navigate to="/login" />
  }

  if (
    !isLoading &&
    me &&
    (orgsRequiringMfa.length === 0 || session.data?.hasMfa)
  ) {
    const orgSlug = searchParams.get('orgSlug')
    return <Navigate to={orgSlug ? `/dashboard/${orgSlug}` : '/dashboard'} />
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Helmet>
        <title>Set up multi-factor authentication | Interval</title>
      </Helmet>
      <div className="w-full max-w-md p-8 mx-auto text-sm">
        <div className="mb-6">
          <AuthPageHeader title="Please set up multi-factor authentication" />
        </div>
        <p className="mb-2">
          The{' '}
          {orgsRequiringMfa.length === 1 ? (
            <>organization {orgsRequiringMfa[0].name} requires</>
          ) : (
            <>
              organizations{' '}
              {commaSeparatedList(
                orgsRequiringMfa.map(org => org.name),
                'and'
              )}{' '}
              require
            </>
          )}{' '}
          <a
            className="font-medium text-primary-500 hover:opacity-60"
            href="https://interval.com/docs/writing-actions/authentication#multi-factor-authentication"
          >
            multi-factor authentication
          </a>{' '}
          to be enabled for all members.
        </p>
        <EnrollMFAForm onSubmit={onSubmit} />
        {orgsNotRequiringMfa.length > 0 && (
          <div className="mt-8">
            <span className="block mb-2">Switch to another organization:</span>
            <ul className="flex flex-col gap-2">
              {orgsNotRequiringMfa.map(org => (
                <li key={org.slug}>
                  <IVButton
                    theme="secondary"
                    className="w-full"
                    href={`/dashboard/${org.slug}`}
                    label={org.name}
                    reloadDocument
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function EnrollMFAPage() {
  const [searchParams] = useSearchParams()
  const { invalidateQueries } = trpc.useContext()

  const orgSlug = searchParams.get('orgSlug')

  const handleSubmit = useCallback(() => {
    invalidateQueries('auth.session.session')

    window.location.assign(orgSlug ? `/dashboard/${orgSlug}` : '/dashboard')
  }, [invalidateQueries, orgSlug])

  return (
    <MeProvider>
      <EnrollMFAContent onSubmit={handleSubmit} />
    </MeProvider>
  )
}
