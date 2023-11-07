import { MenuItem } from '@interval/sdk-latest/dist/types'
import { Organization, OrganizationSSO } from '@prisma/client'

export default function orgRowMenuItems(
  row: Organization & { sso?: Pick<OrganizationSSO, 'id'> | null }
): MenuItem[] {
  return [
    {
      label: 'Browse app structure',
      action: 'organizations/app_structure',
      params: { org: row.slug },
    },
    {
      label: 'Change slug',
      action: 'organizations/change_slug',
      params: { org: row.slug },
    },
    {
      label: 'Enable SSO',
      action: 'organizations/create_org_sso',
      params: { org: row.slug },
    },
    {
      label: 'Disable SSO',
      action: 'organizations/disable_org_sso',
      params: { org: row.slug },
      disabled: row.sso === null,
    },
    {
      label: 'Toggle feature flag',
      action: 'organizations/org_feature_flag',
      params: { org: row.slug },
    },
    {
      label: 'Transfer owner',
      action: 'organizations/transfer_ownership',
      params: { org: row.slug },
    },
    {
      label: 'Create transaction history export',
      action: 'organizations/create_transaction_history_export',
      params: { org: row.slug },
    },
  ]
}
