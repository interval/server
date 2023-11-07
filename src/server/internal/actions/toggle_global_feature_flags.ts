import { io, Action } from '@interval/sdk-latest'
import { ConfiguredFeatureFlag } from '@prisma/client'
import prisma from '~/server/prisma'
import { FEATURE_FLAG_DEFAULTS } from '~/utils/featureFlags'
import { featureFlagToString } from '~/utils/text'

export default new Action({
  handler: async () => {
    const flags: Partial<Record<ConfiguredFeatureFlag, boolean>> = {
      ...FEATURE_FLAG_DEFAULTS,
    }
    {
      const globalFlags = await prisma.globalFeatureFlag.findMany()
      for (const ff of globalFlags) {
        flags[ff.flag] = ff.enabled
      }
    }
    const enabledFlags = flags as Record<ConfiguredFeatureFlag, boolean>

    const options = Object.keys(enabledFlags).map(flag => ({
      label: featureFlagToString(flag as ConfiguredFeatureFlag),
      value: flag,
    }))
    options.sort((a, b) => {
      if (a.label < b.label) return -1
      if (a.label > b.label) return 1
      return 0
    })

    const selected = await io.select.multiple('Enabled feature flags', {
      options,
      defaultValue: options.filter(
        o => enabledFlags[o.value as ConfiguredFeatureFlag]
      ),
    })

    const changes: Partial<Record<ConfiguredFeatureFlag, boolean>> = {}
    for (const opt of selected) {
      const flag = opt.value as ConfiguredFeatureFlag
      if (!enabledFlags[flag]) {
        changes[flag] = true
      }
    }

    for (const [flag, enabled] of Object.entries(enabledFlags)) {
      if (enabled && !selected.find(ff => ff.value === flag)) {
        changes[flag] = false
      }
    }

    if (Object.keys(changes).length === 0) return

    const confirmed = await io.confirm(
      'Are you sure you want to change the following flags?',
      {
        helpText: Object.entries(changes)
          .map(([flag, enabled]) => `${enabled ? '✅' : '❌'} ${flag}`)
          .join('; '),
      }
    )

    if (!confirmed) return

    for (const [flag, enabled] of Object.entries(changes)) {
      await prisma.globalFeatureFlag.upsert({
        create: {
          flag: flag as ConfiguredFeatureFlag,
          enabled,
        },
        update: {
          enabled,
        },
        where: {
          flag: flag as ConfiguredFeatureFlag,
        },
      })
    }

    const ret = {}
    for (const [flag, enabled] of Object.entries(enabledFlags)) {
      ret[flag] = enabled ? '✅' : '❌'
    }
    for (const [flag, enabled] of Object.entries(changes)) {
      ret[flag] = enabled ? '✅' : '❌'
    }

    return ret
  },
  name: '🇺🇳 Toggle global feature flags',
})
