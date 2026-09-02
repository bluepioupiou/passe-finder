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

/**
 * L'accueil (E1) — le fil des nouveautes (demande d'Alain, 2026-09-02).
 *
 * VOLONTAIREMENT AGNOSTIQUE DU CONTENU. Ce test tourne aussi bien contre la
 * base de developpement d'Alain que contre le conteneur de CI, dont la base est
 * vide : il verifie la FORME du fil (dix lignes au plus, chacune menant a une
 * fiche reelle), jamais quels elements y figurent. Le melange des trois types
 * et l'exclusion des enchainements non publics se testent la ou ils peuvent
 * l'etre sur des donnees maitrisees — dans `tests/int/nouveautes.int.spec.ts`.
 */
test.describe('Accueil — fil des nouveautes', () => {
  test('montre au plus dix entrees, chacune vers sa fiche', async ({ page }) => {
    await page.goto('/')

    const fil = page.locator('.accueil-fil')
    const vide = page.getByText("Rien de neuf pour l’instant.")

    // Base peuplee ou base neuve : l'un des deux, jamais les deux.
    if ((await fil.count()) === 0) {
      await expect(vide).toBeVisible()
      return
    }

    const lignes = fil.locator('a.nouveaute')
    const nombre = await lignes.count()

    expect(nombre).toBeGreaterThan(0)
    expect(nombre).toBeLessThanOrEqual(10)

    for (let index = 0; index < nombre; index += 1) {
      const ligne = lignes.nth(index)
      // Le type est ECRIT a cote de l'icone : l'icone seule ne dit rien a qui
      // arrive sur le site pour la premiere fois.
      await expect(ligne.locator('.nouveaute__meta')).toContainText(
        /Position|Passe|Enchaînement/,
      )
      await expect(ligne).toHaveAttribute('href', /^\/(positions|passes|enchainements)\/.+/)
    }

    // La premiere ligne mene vraiment quelque part : un fil qui rend des 404
    // serait pire qu'un accueil sans fil.
    await lignes.first().click()
    // `toHaveURL` et pas `page.url()` : la navigation est faite par le routeur
    // de Next, donc l'URL change APRES le clic. Lue tout de suite, elle est
    // encore celle de l'accueil et le test passe pour une mauvaise raison.
    await expect(page).toHaveURL(/\/(positions|passes|enchainements)\//)
    await expect(page.locator('h1').first()).toBeVisible()
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
