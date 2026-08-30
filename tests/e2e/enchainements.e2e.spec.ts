import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Parcours de revision (Stories 4.4 / 5.4) : la nav mene a la liste, la liste
 * se filtre par titre, la fiche deroule la chaine et renvoie vers les passes.
 *
 * Concu pour tourner contre N'IMPORTE QUELLE cible, y compris un conteneur de
 * CI dont la base est vide : la reprise du catalogue est desormais un geste
 * manuel (voir sprint-status). Les tests qui ont besoin de donnees se declarent
 * donc IGNORES plutot que de faire echouer le pipeline sur une base vide — le
 * premier test, lui, tient sans aucune donnee.
 */

/** Un enchainement visible d'un anonyme, ou `null` si la cible n'en a aucun. */
async function premierEnchainement(
  request: APIRequestContext,
): Promise<{ id: number; titre: string } | null> {
  const reponse = await request.get('/api/enchainements?limit=1&depth=0&sort=-date')
  if (!reponse.ok()) return null

  const { docs } = await reponse.json()
  return docs?.length ? { id: docs[0].id, titre: docs[0].titre } : null
}

test.describe('Enchaînements', () => {
  test('la barre de navigation mène à la liste', async ({ page }) => {
    await page.goto('/')

    await page
      .getByRole('navigation', { name: 'Navigation principale' })
      .getByRole('link', { name: 'Enchaînements' })
      .click()

    await expect(page).toHaveURL(/\/enchainements$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Enchaînements')
  })

  test('la liste se filtre par titre', async ({ page, request }) => {
    const enchainement = await premierEnchainement(request)
    test.skip(!enchainement, 'Aucun enchaînement partagé sur cette cible.')

    await page.goto('/enchainements')
    await page.getByLabel('Rechercher un enchaînement').fill(enchainement!.titre)

    // Le compteur n'apparait qu'une fois un filtre actif : sa presence dit que
    // la grille a bien ete reduite, pas seulement affichee en entier.
    await expect(page.getByRole('status')).toContainText(/sur \d+/)
    await expect(page.locator('.enchainement-titre').first()).toHaveText(enchainement!.titre)
  })

  test('la fiche déroule la chaîne et mène aux passes', async ({ page, request }) => {
    const enchainement = await premierEnchainement(request)
    test.skip(!enchainement, 'Aucun enchaînement partagé sur cette cible.')

    await page.goto(`/enchainements/${enchainement!.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(enchainement!.titre)

    // FR-20 : chaque passe de la chaine mene a sa fiche.
    const passe = page.locator('.pas__etiquette').first()
    await expect(passe).toBeVisible()
    await passe.click()
    await expect(page).toHaveURL(/\/passes\/\d+$/)
  })

  test('la création est invisible et fermée pour un visiteur anonyme', async ({ page }) => {
    // Le « + » n'est pas rendu du tout : montrer une porte fermee se lit comme
    // une panne, pas comme une fonction a venir (meme regle que la zone de
    // compte de la barre).
    await page.goto('/enchainements')
    await expect(page.getByRole('button', { name: 'Créer' })).toHaveCount(0)

    // La porte reelle est cote serveur : connaitre l'URL ne suffit pas.
    await page.goto('/enchainements/nouveau')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Composer un enchaînement')
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()
    await expect(page.getByLabel("D'où part l'enchaînement ?")).toHaveCount(0)
  })

  test("un enchaînement inexistant répond 404, sans fuite d'information", async ({ request }) => {
    // Meme reponse qu'un enchainement prive (FR-17) : rien ne distingue
    // « n'existe pas » de « ne vous est pas destine ».
    const reponse = await request.get('/enchainements/999999', { failOnStatusCode: false })

    expect(reponse.status()).toBe(404)
  })
})
