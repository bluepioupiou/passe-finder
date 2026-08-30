import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Logs the user into the admin panel via the login page.
 */
export async function login({
  page,
  serverURL = 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin/login`)

  await page.fill('#field-email', user.email)
  await page.fill('#field-password', user.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(`${serverURL}/admin`)

  // Preuve de session : le lien de deconnexion de la barre laterale. On
  // s'appuyait auparavant sur `.step-nav__first`, un detail de mise en page du
  // back-office que Payload a depuis renomme — l'assertion tombait alors que la
  // connexion, elle, avait bien reussi.
  await expect(page.getByRole('link', { name: 'Se déconnecter' })).toBeVisible()
}
