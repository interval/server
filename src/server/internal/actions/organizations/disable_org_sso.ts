import { io, Action } from '@interval/sdk-latest'
import prisma from '~/server/prisma'
import { getPrimaryRole, EXPOSED_ROLES } from '~/utils/permissions'
import { userAccessPermissionToString } from '~/utils/text'
import { isEmail } from '~/utils/validate'
import requireOrg from '../../helpers/requireOrg'

export default new Action({
  name: 'Disable SSO',
  description: 'Disables SSO for an organization.',
  handler: async () => {
    const identityConfirmed = await io.confirmIdentity(
      'Please confirm you are able to enable SSO for an organization.'
    )

    if (!identityConfirmed) {
      throw new Error('Identity not confirmed.')
    }

    const org = await requireOrg()

    if (!org.sso) {
      throw new Error('No SSO enabled for this organization.')
    }

    await io.display.metadata('SSO configuration', {
      layout: 'grid',
      data: [
        {
          label: 'Interval Organization ID',
          value: org.sso.organizationId,
        },
        {
          label: 'Domain',
          value: org.sso.domain,
        },
        {
          label: 'WorkOS Organization Id',
          value: org.sso.workosOrganizationId,
        },
        {
          label: 'Default user permissions',
          value: JSON.stringify(org.sso.defaultUserPermissions),
        },
      ],
    })

    const confirmed = await io.confirm(
      'Are you sure you want to delete SSO for this organization?',
      {
        helpText: 'This cannot be undone, it will have to be enabled again.',
      }
    )

    if (!confirmed) {
      return 'Not confirmed, nothing to do'
    }

    await prisma.organizationSSO.delete({
      where: {
        id: org.sso.id,
      },
    })

    return {
      'Deleted SSO Type': org.sso.workosOrganizationId
        ? 'Real (WorkOS)'
        : 'Fake (no WorkOS)',
      'Interval Organization ID': org.id,
      'Interval OrganizationSSO ID': org.sso.id,
      'WorkOS Organization ID': org.sso.workosOrganizationId,
      'Default user permissions': JSON.stringify(
        org.sso.defaultUserPermissions
      ),
    }
  },
})
