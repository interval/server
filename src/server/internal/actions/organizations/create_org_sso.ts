import { io, Action } from '@interval/sdk-latest'
import prisma from '~/server/prisma'
import { getPrimaryRole, EXPOSED_ROLES } from '~/utils/permissions'
import { userAccessPermissionToString } from '~/utils/text'
import { isEmail } from '~/utils/validate'
import requireOrg from '../../helpers/requireOrg'

export default new Action({
  name: 'Enable SSO',
  description:
    'Creates necessary record for an organization that wants to enable SSO (either full or "fake").',
  handler: async () => {
    const identityConfirmed = await io.confirmIdentity(
      'Please confirm you are able to enable SSO for an organization.'
    )

    if (!identityConfirmed) {
      throw new Error('Identity not confirmed.')
    }

    const org = await requireOrg()

    if (org.sso) {
      const shouldContinue = await io.confirm(
        `${org.name} already has SSO enabled, do you want to continue?`,
        {
          helpText:
            'Cancelling will not alter the existing configuration, continuing will allow you to update it.',
        }
      )

      if (!shouldContinue) return 'Canceled'
    }

    const [, domain] = await io.group([
      io.display.markdown(`
        As part of setting up SSO for an organization, we'll let **anyone** with an email the organization's domain access their Interval dashboard. 

        For example, for Interval employees, we have the email domain interval.com. 
      `),
      io.input
        .text('Enter the email domain', {
          defaultValue: org.sso?.domain,
          placeholder: 'company.com',
          helpText: 'Everything after, but not including, the @ symbol.',
        })
        .validate(pendingDomain => {
          if (
            pendingDomain.includes('@') ||
            !isEmail(`example@${pendingDomain}`)
          ) {
            return 'Please enter a valid domain. Note: this is not a complete URL.'
          }
        }),
    ])

    // TODO: Optional values?
    // https://github.com/interval/interval2/issues/85
    const [, hasWorkOSId] = await io.group([
      io.display.markdown(`
      We have two kinds of SSO: 
      - The "real" SSO works through WorkOS. This is for companies using Interval whose employees login through Okta, Google SAML, etc.
      - The "fake" SSO skips WorkOS and just allows anyone at the email domain to access the company's Interval dashboard.

      If you aren't sure which type of SSO to enable, reach out to our point of contact at the organization.

      `),
      io.input.boolean(`Do you want to enable "real" SSO for ${org.name}`, {
        helpText:
          'Enable this if they use Okta, SAML, etc. Leave this unchecked otherwise.',
      }),
    ])

    let workosOrganizationId: string | undefined

    if (hasWorkOSId) {
      ;[, workosOrganizationId] = await io.group([
        io.display.markdown(`
          In order to setup "real" SSO through WorkOS, we need to create an ID in their dashboard.

          1. Go to the [WorkOS dashboard](https://dashboard.workos.com).
          2. Make sure you have chosen the **Production** environment in their sidebar.
          3. Click "Organizations."
          4. Click "Create Organization."
          
          Use the following values for their Create Organization form:
          - Organization: **${org.name}**
          - User Email Domains: **${domain}**
          - Authentication settings: **Allow authentication only from Organization email domains**

          5. Submit the form by clicking "Create Organization."
          6. ${org.name} should now be visible in the WorkOS Organizations list. Click ${org.name}.
          7. Copy the Organization ID. This is a long string like "org_XYZ..."

          Once you have Organization ID on your clipboard, paste it below...

        `),
        io.input.text('WorkOS Organization ID', {
          defaultValue: org.sso?.workosOrganizationId ?? undefined,
        }),
      ])
    }

    const defaultRole =
      getPrimaryRole(org.sso?.defaultUserPermissions ?? ['ACTION_RUNNER']) ??
      'ACTION_RUNNER'

    const [role] = await io.group(
      [
        io.select.single('Default user access role', {
          defaultValue: {
            value: defaultRole,
            label: userAccessPermissionToString(defaultRole),
          },
          helpText:
            'When new users are added to the organization through SSO, this is the role they will be assigned in Interval. This may be overridden by WorkOS SSO roles, if present.',
          options: EXPOSED_ROLES.map(role => ({
            value: role,
            label: userAccessPermissionToString(role),
          })),
        }),
      ],
      {
        continueButton: {
          label: org.sso ? 'Update SSO settings' : `Enable SSO for ${org.name}`,
        },
      }
    )

    const createdSSO = await prisma.organizationSSO.upsert({
      where: {
        organizationId: org.id,
      },
      update: {
        domain,
        workosOrganizationId,
        defaultUserPermissions: [role.value],
      },
      create: {
        organizationId: org.id,
        domain,
        workosOrganizationId,
        defaultUserPermissions: [role.value],
      },
    })

    return {
      'Change type': org.sso ? 'SSO updated' : 'SSO enabled',
      'SSO Type': hasWorkOSId ? 'Real (WorkOS)' : 'Fake (no WorkOS)',
      'Interval Organization ID': org.id,
      'Interval OrganizationSSO ID': createdSSO.id,
      'WorkOS Organization ID': workosOrganizationId,
      'Default user permissions': JSON.stringify(
        createdSSO.defaultUserPermissions
      ),
    }
  },
})
