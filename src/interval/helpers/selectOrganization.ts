import prisma from '~/server/prisma'
import searchForOrganization from './searchForOrganization'

export default async function selectOrganization() {
  const selected = await searchForOrganization()

  const org = await prisma.organization.findUnique({
    where: {
      id: selected.id,
    },
    include: {
      sso: true,
      environments: true,
    },
  })

  if (!org) {
    throw new Error("Organization doesn't exist?")
  }

  return org
}
