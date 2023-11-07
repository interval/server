import PageHeading from '~/components/PageHeading'
import AccountSettings from '~/components/AccountSettings'

export default function AccountSettingsPage() {
  return (
    <div className="dashboard-container space-y-4">
      <PageHeading title="Account settings" />
      <AccountSettings />
    </div>
  )
}
