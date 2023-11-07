import { useState, useEffect } from 'react'
import IVSpinner from '~/components/IVSpinner'
import PageHeading from '~/components/PageHeading'
import TransactionsList from '~/components/TransactionsList'
import useDashboard, { useHasPermission } from '~/components/DashboardContext'
import { trpc } from '~/utils/trpc'
import { Pagination, PaginationProps } from '~/components/IVTable'
import IVSelect from '~/components/IVSelect'
import useSearchParams from '~/utils/useSearchParams'
import useDebounce from '~/utils/useDebounce'
import CloseIcon from '~/icons/compiled/Close'
import usePrevious from '~/utils/usePrevious'

export function EnvSwitcher() {
  const { organization } = useDashboard()
  const [search, setSearch] = useSearchParams()
  const canAccessDev = useHasPermission('READ_DEV_TRANSACTIONS')

  const visibleEnvironments = organization.environments.filter(env => {
    if (env.slug === 'development' && !canAccessDev) return false
    return true
  })

  if (visibleEnvironments.length <= 1) {
    return null
  }

  const defaultValue =
    visibleEnvironments.find(env => env.slug === search.get('environment'))
      ?.slug ?? 'production'

  return (
    <IVSelect
      defaultValue={defaultValue}
      options={visibleEnvironments.map(env => ({
        label: env.name,
        value: env.slug ?? '',
      }))}
      className="py-1 pl-2 w-[150px]"
      onChange={e => {
        // intentionally clear `page`
        setSearch(prev => ({
          ...prev,
          page: undefined,
          environment: e.target.value,
        }))
      }}
    />
  )
}

export function Search() {
  const [search, setSearch] = useSearchParams()
  const [query, setQuery] = useState(() => search.get('s') ?? '')
  const debouncedQuery = useDebounce(query, 400)
  const prevDebounced = usePrevious(debouncedQuery)

  const searchQuery = search.get('s')
  useEffect(() => {
    setQuery(prev => {
      if (searchQuery !== prev) {
        return searchQuery ?? ''
      }

      return prev
    })
  }, [searchQuery])

  useEffect(() => {
    if (debouncedQuery !== prevDebounced) {
      setSearch(prev => {
        if (prev.s !== debouncedQuery) {
          return {
            ...prev,
            page: undefined,
            s: debouncedQuery,
          }
        } else {
          return prev
        }
      })
    }
  }, [debouncedQuery, prevDebounced, setSearch])

  const onClearSearch = () => setQuery('')

  return (
    <div className="relative">
      <input
        type="text"
        className="form-input text-[14px] px-2 py-1 focus:iv-field-focus pr-10 w-[150px]"
        placeholder="Filter"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {!!searchQuery && (
        <button
          className="absolute top-0 right-0 w-[30px] h-[30px] flex items-center justify-center text-gray-300 hover:text-gray-400"
          type="button"
          aria-label="Clear filter"
          onClick={onClearSearch}
        >
          <CloseIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  useHasPermission('READ_PROD_TRANSACTIONS', { redirectToDashboardHome: true })
  const [pageSize] = useState(50)
  const [search, setSearch] = useSearchParams()

  const pageNum = Number(search.get('page') ?? 0)
  const slugFilter = search.get('slug') ?? undefined
  const searchFilter = search.get('s') ?? undefined
  const environment = search.get('environment') ?? undefined

  const { data } = trpc.useQuery([
    'transaction.index',
    {
      limit: pageSize,
      skip: pageNum * pageSize,
      environment,
      slugFilter,
      search: searchFilter,
    },
  ])

  const paginationProps: PaginationProps = {
    totalRecords: data?.totalTransactions ?? 0,
    currentPageStart: pageNum * pageSize + 1,
    currentPageEnd: pageNum * pageSize + (data?.transactions.length ?? 0),
    pageIndex: pageNum,
    totalPages: Math.ceil((data?.totalTransactions ?? 0) / pageSize),
    canPreviousPage: pageNum > 0,
    canNextPage: (pageNum + 1) * pageSize < (data?.totalTransactions ?? 0),
    previousPage: () =>
      setSearch(prev => ({
        ...prev,
        page: pageNum - 1 === 0 ? undefined : String(Math.max(0, pageNum - 1)),
      })),
    nextPage: () =>
      setSearch(prev => ({
        ...prev,
        page: String(pageNum + 1),
      })),
  }

  return (
    <div className="dashboard-container">
      <PageHeading title="History" />
      <div className="flex items-center space-x-2 mt-4 mb-2">
        <Search />
        <EnvSwitcher />
        <div className="flex-1 flex justify-end">
          <Pagination {...paginationProps} />
        </div>
      </div>
      {data ? (
        <>
          <TransactionsList transactions={data.transactions} />
          {data.transactions.length > 0 && (
            <div className="flex justify-end mt-4">
              <Pagination {...paginationProps} />
            </div>
          )}
        </>
      ) : (
        <div className="flex py-12 items-center justify-center">
          <IVSpinner />
        </div>
      )}
    </div>
  )
}
