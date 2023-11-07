import { z } from 'zod'

export const referralInfoSchema = z
  .object({
    referrer: z.string().nullish(),
    utmSource: z.string().nullish(),
    utmMedium: z.string().nullish(),
    utmCampaign: z.string().nullish(),
    utmTerm: z.string().nullish(),
    utmContent: z.string().nullish(),
  })
  .optional()

export type ReferralInfo = z.infer<typeof referralInfoSchema>
