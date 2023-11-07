import { ctx } from '@interval/sdk-latest/dist/experimental'
import prisma from '~/server/prisma'
import selectOrganization from './selectOrganization'

export default async function requireOrg(paramName = 'org') {
  if (paramName in ctx.params) {
    const org = await prisma.organization.findFirst({
      where: { slug: String(ctx.params[paramName]) },
      include: {
        sso: true,
        environments: true,
      },
    })

    if (!org) throw new Error('Org not found')

    return org
  }

  return selectOrganization()
}
