import { io, Action } from '@interval/sdk'
import prisma from '~/server/prisma'
import { createOrganization } from '~/server/utils/organizations'
import { isOrgSlugValid } from '~/utils/validate'
import findUsers from '../../helpers/findUsers'
import renderUserResult from '../../helpers/renderUserResult'

export default new Action({
  unlisted: false,
  handler: async () => {
    const initialUsers = await findUsers('')
    const [selectedOwner, name, initialSlug] = await io.group([
      io.search('Select owner', {
        initialResults: initialUsers,
        onSearch: async q => findUsers(q),
        renderResult: renderUserResult,
      }),
      io.input.text('Organization name'),
      io.input.text('Organization slug'),
    ])

    let slug: string | undefined
    let exists = false

    do {
      if (slug) {
        slug = await io.input.text('Organization slug', {
          helpText: `${
            exists
              ? 'Sorry, that slug already exists'
              : 'Please enter a valid slug'
          }. You entered "${slug}".`,
        })
      } else {
        slug = initialSlug
      }

      exists = !!(await prisma.organization.findFirst({
        where: {
          slug,
        },
      }))
    } while (!isOrgSlugValid(slug) || exists)

    return createOrganization({
      name,
      slug,
      ownerId: selectedOwner.id,
    })
  },
  name: 'Create organization',
  description: 'Create a new organization with an arbitrary owner.',
})
