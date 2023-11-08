import { io, Action } from '@interval/sdk'
import prisma from '~/server/prisma'
import { UX_FEATURE_FLAGS } from '~/utils/featureFlags'
import { featureFlagToString } from '~/utils/text'
import requireOrg from '../../helpers/requireOrg'

export default new Action({
  unlisted: false,
  handler: async () => {
    const organization = await requireOrg()

    const organizationFeatureFlags =
      await prisma.organizationFeatureFlag.findMany({
        where: {
          organizationId: organization.id,
        },
      })

    const options = UX_FEATURE_FLAGS.map(flag => ({
      label: featureFlagToString(flag),
      value: flag,
    }))

    const defaultValue = options.filter(opt =>
      organizationFeatureFlags.some(
        off => off.flag === opt.value && off.enabled
      )
    )

    const selected = await io.select.multiple('Enabled feature flags', {
      options,
      defaultValue,
    })

    const flags = {}
    for (const flag of UX_FEATURE_FLAGS) {
      const enabled = selected.some(opt => opt.value === flag)
      await prisma.organizationFeatureFlag.upsert({
        where: {
          organizationId_flag: {
            organizationId: organization.id,
            flag,
          },
        },
        update: {
          enabled,
        },
        create: {
          organizationId: organization.id,
          flag,
          enabled,
        },
      })
      flags[flag] = enabled ? '✅' : '❌'
    }

    return flags
  },
  name: 'Toggle feature flag',
  description: 'Toggles features flag for an organization.',
})
