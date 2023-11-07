import prisma from '~/server/prisma'
import { SdkAlert } from '@prisma/client'

export async function getSdkAlert(
  sdkName: string,
  sdkVersion: string
): Promise<SdkAlert | null> {
  return prisma.sdkAlert.findFirst({
    where: {
      sdkName,
      minSdkVersion: {
        gt: sdkVersion,
      },
    },
    orderBy: [
      {
        severity: 'desc',
      },
      {
        minSdkVersion: 'desc',
      },
    ],
  })
}
