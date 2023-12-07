import prisma from '~/server/prisma'
export default async function findUsers(query: string) {
  return prisma.user.findMany({
    where: {
      OR: [
        {
          firstName: {
            mode: 'insensitive',
            contains: query,
          },
        },
        {
          lastName: {
            mode: 'insensitive',
            contains: query,
          },
        },
      ],
    },
  })
}
