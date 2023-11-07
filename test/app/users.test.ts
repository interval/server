import { UserAccessGroup } from '@prisma/client'
import { test } from '../_fixtures'
import { config, dashboardUrl, prisma, sleep } from '../_setup'
import { expect } from '@playwright/test'
import { generateTestEmail } from '../classes/Signup'

test.skip(!!process.env.SDK_VERSION && process.env.SDK_VERSION !== 'main')
test.skip(!!process.env.GHOST_MODE)

test.describe('Users settings', () => {
  let userGroup: UserAccessGroup

  test.beforeAll(async () => {
    await cleanup()

    const org = await prisma.organization.findUnique({
      where: { slug: config.orgSlug },
      include: { userAccessGroups: true },
    })

    if (!org) throw new Error('Could not find organization')

    userGroup =
      org.userAccessGroups.find(g => g.name === 'Engineers') ??
      (await prisma.userAccessGroup.create({
        data: {
          organization: { connect: { id: org.id } },
          name: 'Engineers',
          slug: 'engineers',
        },
      }))
  })

  test.afterAll(async () => {
    await cleanup()
  })

  test('invites a new user', async ({ page }) => {
    const email = generateTestEmail()

    await page.goto(await dashboardUrl('/organization/users'))
    await page.locator('button:has-text("Add user")').click()
    await page.fill('input[name="email"]', email)
    await page.selectOption('select[name="role"]', 'DEVELOPER')
    await page.getByLabel(userGroup.name).check()
    await page.click('button[type="submit"]:has-text("Add user")')
    await page.locator(`text="An invitation was sent to ${email}"`).isVisible()

    // unsure why but the prisma lookup fails if the test runs too quickly
    await sleep(100)

    const invitation = await prisma.userOrganizationInvitation.findFirstOrThrow(
      {
        where: { email },
      }
    )

    expect(invitation.permissions).toEqual(['DEVELOPER'])
    expect(invitation.groupIds).toEqual([userGroup.id])
  })
})

async function cleanup() {
  await prisma.userOrganizationInvitation.deleteMany({
    where: {
      organization: { slug: config.orgSlug },
    },
  })
}
