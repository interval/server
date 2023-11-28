import { io, Action } from '@interval/sdk'
import { PrismaPromise, User } from '@prisma/client'
import prisma from '~/server/prisma'
import findUsers from '../../helpers/findUsers'
import renderUserResult from '../../helpers/renderUserResult'
import requireParam from '../../helpers/requireParam'

export default new Action({
  unlisted: true,
  handler: async () => {
    const userId = requireParam('id')

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: true,
        apiKeys: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    await io.group([
      io.display.markdown(`
                          ## Delete this user
                          ${user.firstName} ${user.lastName} (${user.email})

                          ## This action completely deletes a user from our database
                          ${
                            user.organizations.length > 0
                              ? `- This user owns ${user.organizations.length} organizations. You'll be prompted to reassign ownership of those orgs on the next screen.`
                              : ''
                          }
                          ${
                            user.apiKeys.length > 0
                              ? `- This user has ${user.apiKeys.length} API keys. You'll be prompted to reassign ownership of those keys on the next screen.`
                              : ''
                          }
                          `),
    ])

    const userList = await prisma.user.findMany({
      where: { id: { not: userId } },
    })

    const notUser =
      (except: { id: string | number }) => (user: { id: string }) =>
        user.id !== String(except.id)

    async function pickNewOwner(
      objectId: string,
      objectName: string,
      user: User
    ) {
      const [, newOwner] = await io.group([
        io.display.markdown(
          `## ${user.firstName} ${user.lastName} owns ${objectName} (${objectId})`
        ),
        io.search(`Select a new owner for ${objectName}`, {
          initialResults: userList.filter(notUser(user)),
          onSearch: async q => {
            const l = await findUsers(q)
            return l.filter(notUser(user))
          },
          renderResult: renderUserResult,
        }),
      ])
      return newOwner
    }

    const updateOperations: PrismaPromise<any>[] = []

    for (const org of user.organizations) {
      const newOwner = await pickNewOwner(org.id, org.name, user)

      updateOperations.push(
        prisma.organization.update({
          where: { id: org.id },
          data: { owner: { connect: { id: String(newOwner.id) } } },
        })
      )
    }

    for (const key of user.apiKeys) {
      const newOwner = await pickNewOwner(
        key.id,
        `${key.label || ''} (${key.usageEnvironment})`,
        user
      )

      updateOperations.push(
        prisma.apiKey.update({
          where: { id: key.id },
          data: { user: { connect: { id: String(newOwner.id) } } },
        })
      )
    }

    const isConfirmed = await io.confirm(
      `Are you sure you want to delete ${user.firstName} ${user.lastName}?`
    )

    if (!isConfirmed) return

    await prisma.$transaction(updateOperations)

    await prisma.userAccessGroupMembership.deleteMany({
      where: { userOrganizationAccess: { userId } },
    })

    const toDelete = await prisma.userOrganizationAccess.findMany({
      where: { userId },
    })

    await prisma.userOrganizationAccess.deleteMany({
      where: { userId },
    })

    await prisma.userPasswordResetToken.deleteMany({
      where: { userId },
    })

    await prisma.userSession.deleteMany({
      where: { userId },
    })

    await prisma.transaction.deleteMany({
      where: { ownerId: userId },
    })

    await prisma.user.delete({ where: { id: userId } })
  },
  name: 'Delete',
  description: 'Deletes a user account and all linked records.',
})
