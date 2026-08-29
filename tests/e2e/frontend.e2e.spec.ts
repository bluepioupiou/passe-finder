import { expect, test } from '@playwright/test'

const SELECTEUR_BEACON = 'script[src*="cloudflareinsights.com"]'

/**
 * Le jeton est FACULTATIF (story 1.7). L'attendu depend donc de la
 * configuration de la cible testee, et le test reste vrai dans les deux cas :
 *  - sans jeton (dev local, conteneur de CI)  -> aucun script, aucun appel tiers
 *  - avec jeton                                -> exactement UN script, jamais deux
 *    (Cloudflare n'accepte pas plusieurs snippets sur une meme page).
 */
const beaconsAttendus = process.env.CLOUDFLARE_ANALYTICS_TOKEN?.trim() ? 1 : 0

test.describe('Frontend', () => {
  test('can go on homepage', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Passe Finder/)

    const heading = page.locator('h1').first()

    await expect(heading).toHaveText('Passe Finder')
  })
})

test.describe('Mesure d audience', () => {
  test('la page publique porte le beacon si et seulement si un jeton est configure', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.locator(SELECTEUR_BEACON)).toHaveCount(beaconsAttendus)
  })

  test('le back-office reste hors mesure', async ({ page }) => {
    // Usage prive d'Alain : le compter fausserait la frequentation des eleves.
    // Attendu ZERO quoi qu'il arrive, jeton configure ou non.
    await page.goto('/admin')

    await expect(page.locator(SELECTEUR_BEACON)).toHaveCount(0)
  })
})
