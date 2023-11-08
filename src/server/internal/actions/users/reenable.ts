import { io, ctx, Action } from '@interval/sdk'
import prisma from '~/server/prisma'

export default new Action({
  name: 'Reenable user account',
  unlisted: true,
  handler: async () => {
    if (!ctx.params.id || typeof ctx.params.id !== 'string') {
      throw new Error('Invalid user id param.')
    }

    const identityConfirmed = await io.confirmIdentity(
      'Confirm you can do this'
    )

    if (!identityConfirmed) {
      throw new Error('Unauthorized.')
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.params.id,
      },
    })

    if (!user.deletedAt) {
      throw new Error('User is already enabled.')
    }

    const confirmed = await io.confirm(
      `Reenable user ${user.firstName} ${user.lastName} (${user.email})?`
    )

    if (!confirmed) {
      return 'Not confirmed, nothing to do.'
    }

    const { password, mfaId, ...rest } = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        deletedAt: null,
      },
    })

    return rest
  },
})
