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
 * Connexion par l'ECRAN PUBLIC (/connexion, Story 3.2).
 *
 * C'est desormais la porte des comptes ordinaires : depuis la Story 3.4 et la
 * decision du 2026-08-31, `/admin` est reserve aux administrateurs, et un
 * eleve ne peut plus s'y connecter du tout. Les scenarios qui exercent
 * l'application passent donc par ici — ce qui a l'avantage de tester le chemin
 * que les vraies personnes empruntent.
 */
export async function login({
  page,
  serverURL = 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/connexion`)

  await page.fill('#email', user.email)
  await page.fill('#motDePasse', user.password)
  await page.getByRole('button', { name: 'Se connecter' }).click()

  // Preuve de session : le menu de compte remplace « Se connecter » dans la
  // barre. On attend l'ETAT et non l'URL : la destination depend de `suite`.
  await expect(page.getByRole('button', { name: 'Mon compte' })).toBeVisible()
}

/**
 * Connexion au BACK-OFFICE Payload (/admin/login).
 *
 * Reservee aux comptes portant le drapeau `admin` : depuis la Story 3.4,
 * `access.admin` de la collection users refuse les autres. Un compte ordinaire
 * qui tenterait cette porte serait refuse — c'est le comportement voulu, et le
 * scenario d'administration doit donc semer un compte administrateur.
 */
export async function loginBackOffice({
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
