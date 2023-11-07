import { io, Action } from '@interval/sdk-latest'
import prisma from '~/server/prisma'
import findUsers from '../../helpers/findUsers'
import renderUserResult from '../../helpers/renderUserResult'
import requireOrg from '../../helpers/requireOrg'

export default new Action({
  unlisted: false,
  handler: async () => {
    const organization = await requireOrg()

    function notCurrentOwner(user: { id: string }): boolean {
      return user.id !== organization.ownerId
    }

    const initialUsers = await findUsers('')
    const newOwner = await io.search('Select new owner', {
      initialResults: initialUsers.filter(notCurrentOwner),
      onSearch: async q => (await findUsers(q)).filter(notCurrentOwner),
      renderResult: renderUserResult,
    })

    if (
      !(await io.confirm(
        `Are you sure you want to transfer ${organization.name} to ${newOwner.firstName} ${newOwner.lastName}?`
      ))
    ) {
      return
    }

    const org = await prisma.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        owner: { connect: { id: newOwner.id } },
      },
    })

    await prisma.userOrganizationAccess.upsert({
      where: {
        userId_organizationId: {
          userId: newOwner.id,
          organizationId: org.id,
        },
      },
      update: {
        permissions: ['ADMIN'],
      },
      create: {
        user: { connect: { id: newOwner.id } },
        organization: { connect: { id: org.id } },
        permissions: ['ADMIN'],
      },
    })

    return org
  },
  name: 'Transfer owner',
  description:
    'Transfer ownership of an existing organization to another user.',
})
