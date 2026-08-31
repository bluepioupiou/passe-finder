import { test, expect, Page } from '@playwright/test'
import { loginBackOffice } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

// Le back-office est reserve aux administrateurs (Story 3.4) : ce scenario doit
// donc semer un compte qui porte le drapeau, sinon la porte se referme sur lui.
const administrateur = { ...testUser, admin: true }

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    await seedTestUser(administrateur)

    const context = await browser.newContext()
    page = await context.newPage()

    await loginBackOffice({ page, user: administrateur })
  })

  test.afterAll(async () => {
    await cleanupTestUser(administrateur)
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    // La barre laterale des collections, plutot que `.step-nav__first` : ce
    // dernier est un detail de mise en page que Payload a renomme, et le test
    // tombait alors que le tableau de bord s'affichait tres bien.
    const dashboardArtifact = page.getByRole('link', { name: 'Enchaînements' }).first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/users')
    // « Utilisateurs », pas « Users » : la collection porte desormais des
    // libelles francais comme les autres (NFR-7, back-office en francais).
    const listViewArtifact = page.locator('h1', { hasText: 'Utilisateurs' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
