import { io, Action } from '@interval/sdk-latest'
import prisma from '~/server/prisma'
import { dashboardL1Paths } from '~/server/utils/routes'
import { isOrgSlugValid } from '~/utils/validate'
import requireOrg from '../../helpers/requireOrg'

export default new Action({
  unlisted: true,
  handler: async () => {
    const org = await requireOrg()

    let newSlug: string = org.slug
    let exists = false

    do {
      newSlug = await io.input.text('New slug', {
        defaultValue: newSlug,
        helpText: !isOrgSlugValid(newSlug)
          ? "Sorry, that slug isn't valid."
          : exists
          ? 'Sorry, that slug is taken, please select another.'
          : undefined,
      })

      exists =
        !!(await prisma.organization.findUnique({
          where: {
            slug: newSlug,
          },
        })) || dashboardL1Paths.has(newSlug)
    } while (exists || !isOrgSlugValid(newSlug))

    const confirmed = await io.confirm(
      `Are you sure you want to change the slug for ${org.name} from "${org.slug}" to "${newSlug}"?`
    )

    if (!confirmed) {
      return {
        Status: 'Not confirmed, nothing changed.',
      }
    }

    const newOrg = await prisma.organization.update({
      where: {
        id: org.id,
      },
      data: {
        slug: newSlug,
      },
    })

    return {
      Status: 'Slug changed',
      'Previous slug': org.slug,
      'New slug': newOrg.slug,
    }
  },
  name: 'Change slug',
  description: 'Changes the slug for an organization',
})
