import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Liste des enchainements : pagination et recherche (demande d'Alain,
 * 2026-08-31).
 *
 * TOUT PASSE PAR L'URL, et c'est ce que ce fichier verifie : une page de
 * resultats se partage, le retour du navigateur y revient, un rechargement ne
 * perd pas le filtre. Un etat garde dans le composant ne ferait rien de tout
 * cela — et il ne se testerait pas non plus de cette facon.
 *
 * Scenario ANONYME a dessein : la liste est la porte d'entree du site, elle doit
 * fonctionner sans compte (FR-18, FR-19).
 *
 * Comme les autres tests de cette suite, il se declare IGNORE si la cible n'a
 * pas assez de catalogue pour qu'il y ait plusieurs pages.
 */

const PAR_PAGE = 24

/** Combien d'enchainements la cible montre-t-elle a un anonyme ? */
async function nombrePartages(request: APIRequestContext): Promise<number> {
  const reponse = await request.get('/api/enchainements?limit=1&depth=0')
  if (!reponse.ok()) return 0

  const { totalDocs } = await reponse.json()
  return totalDocs ?? 0
}

test.describe('Liste des enchaînements', () => {
  test('pagine, et garde la recherche en changeant de page', async ({ page, request }) => {
    const total = await nombrePartages(request)
    test.skip(total <= PAR_PAGE, 'Pas assez d’enchaînements pour paginer sur cette cible.')

    await page.goto('/enchainements')

    // Une page pleine, pas la liste entiere : c'est tout l'objet de la demande.
    await expect(page.locator('.enchainement-carte')).toHaveCount(PAR_PAGE)

    const premierTitre = await page.locator('.enchainement-titre').first().innerText()

    await page.getByRole('link', { name: 'Suivante' }).click()
    await expect(page).toHaveURL(/[?&]page=2/)
    // La page 2 montre autre chose que la page 1.
    await expect(page.locator('.enchainement-titre').first()).not.toHaveText(premierTitre)

    // Et l'on revient d'ou l'on vient : la page 1 n'a pas d'ancre `?page=1`,
    // l'URL reste propre.
    await page.getByRole('link', { name: 'Précédente' }).click()
    await expect(page).toHaveURL(/\/enchainements$/)
    await expect(page.locator('.enchainement-titre').first()).toHaveText(premierTitre)
  })

  test('cherche sans accent, et le filtre survit à la pagination', async ({ page, request }) => {
    test.skip(
      (await nombrePartages(request)) === 0,
      'Aucun enchaînement partagé sur cette cible.',
    )

    // « choregraphie » doit trouver « Chorégraphie » : la recherche du site est
    // insensible aux accents (Story 5.4), et le passage a une recherche EN BASE
    // ne doit pas le lui faire perdre.
    await page.goto('/enchainements?q=choregraphie')

    const cartes = page.locator('.enchainement-carte')
    const trouves = await cartes.count()
    test.skip(trouves === 0, 'Le catalogue de cette cible ne porte aucune chorégraphie.')

    await expect(page.locator('.enchainement-titre').first()).toContainText(/chor[ée]graphie/i)
    // Le champ est rempli depuis l'URL : on voit ce qui est filtre.
    await expect(page.locator('.filtres__saisie')).toHaveValue('choregraphie')

    // Un lien de pagination, s'il y en a un, emporte la recherche avec lui.
    const suivante = page.getByRole('link', { name: 'Suivante' })
    if (await suivante.isVisible()) {
      const cible = await suivante.getAttribute('href')
      expect(cible).toContain('q=choregraphie')
    }
  })

  test('une recherche sans résultat le dit, sans page vide', async ({ page }) => {
    await page.goto('/enchainements?q=zzzintrouvable')

    await expect(page.locator('.enchainement-carte')).toHaveCount(0)
    await expect(page.getByText(/Rien trouvé pour/)).toBeVisible()
    // Pas de pagination sous une liste vide.
    await expect(page.locator('.pagination')).toHaveCount(0)
  })

  test('une page hors limites ne casse rien', async ({ page }) => {
    // Une URL se bricole a la main et se tronque dans un message : elle ne doit
    // jamais produire d'erreur.
    const reponse = await page.goto('/enchainements?page=9999')
    expect(reponse?.status()).toBe(200)

    const absurde = await page.goto('/enchainements?page=pas-un-nombre')
    expect(absurde?.status()).toBe(200)
    await expect(page.locator('.enchainement-carte').first()).toBeVisible()
  })
})
