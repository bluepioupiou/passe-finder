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
): Promise<{ lien: string; titre: string } | null> {
  const reponse = await request.get('/api/enchainements?limit=1&depth=0&sort=-date')
  if (!reponse.ok()) return null

  const { docs } = await reponse.json()
  return docs?.length ? { lien: docs[0].idPublic, titre: docs[0].titre } : null
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
    // ATTENDRE QUE LA PAGE SOIT VIVANTE AVANT DE TAPER. La recherche est un
    // composant client : tant qu'il n'est pas hydrate, une frappe programmee
    // pose bien le texte dans le champ, mais React n'a pas encore branche son
    // `onChange` — la pause de 300 ms ne demarre jamais, et l'URL ne bouge pas.
    // Un humain ne le voit pas (sa frappe suivante repart), un test si : c'est
    // exactement ce qui rendait cette suite rouge une fois sur trois.
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Rechercher un enchaînement').fill(enchainement!.titre)

    // La recherche est desormais une contrainte de REQUETE : la frappe part
    // dans l'URL (apres une pause de 300 ms), et la page revient filtree. C'est
    // ce qui permet de paginer sans mentir — un filtre cote client n'aurait
    // filtre que la page affichee.
    //
    // Delai allonge A DESSEIN : on attend une pause volontaire PUIS un rendu
    // serveur, et en developpement la route peut se compiler a la demande. Les
    // 5 secondes par defaut suffisent presque toujours — « presque » etant
    // exactement ce qui rend une suite peu fiable.
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 15_000 })
    // Le compteur n'apparait qu'une fois un filtre actif : sa presence dit que
    // la liste a bien ete reduite, pas seulement affichee en entier.
    await expect(page.getByRole('status')).toContainText(/enchaînement/)
    await expect(page.locator('.enchainement-titre').first()).toHaveText(enchainement!.titre)
  })

  test('la fiche déroule la chaîne et mène aux passes', async ({ page, request }) => {
    const enchainement = await premierEnchainement(request)
    test.skip(!enchainement, 'Aucun enchaînement partagé sur cette cible.')

    await page.goto(`/enchainements/${enchainement!.lien}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(enchainement!.titre)

    // FR-20 : chaque passe de la chaine mene a sa fiche.
    const passe = page.locator('.pas__etiquette').first()
    await expect(passe).toBeVisible()
    await passe.click()
    await expect(page).toHaveURL(/\/passes\/\d+$/)
  })

  test("la fiche passe renvoie vers les enchaînements qui l'utilisent", async ({
    page,
    request,
  }) => {
    // FR-24, et le RETOUR du trajet teste juste au-dessus : on descend d'un
    // enchaînement vers une de ses passes, la fiche de cette passe doit
    // reproposer l'enchaînement d'où l'on vient. C'est la boucle qui fait de la
    // fiche un point de passage plutot qu'un cul-de-sac, et elle ne se verifie
    // qu'en la parcourant.
    const enchainement = await premierEnchainement(request)
    test.skip(!enchainement, 'Aucun enchaînement partagé sur cette cible.')

    await page.goto(`/enchainements/${enchainement!.lien}`)
    await page.locator('.pas__etiquette').first().click()
    await expect(page).toHaveURL(/\/passes\/\d+$/)

    // Le plus recent est en tete, et `premierEnchainement` demande justement le
    // plus recent des enchainements partages : c'est donc la premiere ligne.
    const exemples = page.locator('.fiche-exemple')
    await expect(exemples.first()).toContainText(enchainement!.titre)
    // La place de la passe dans la chaine : c'est elle qui fait de la ligne un
    // exemple d'utilisation plutot qu'un titre de plus.
    await expect(exemples.first()).toContainText(/passes? sur \d+/)

    // Jamais plus de dix, quel que soit le nombre reel (74 pour le pas de base).
    expect(await exemples.count()).toBeLessThanOrEqual(10)

    // Et le lien ramene bien la ou l'on etait.
    await exemples.first().click()
    await expect(page).toHaveURL(`/enchainements/${enchainement!.lien}`)
  })

  test('la création est invisible et fermée pour un visiteur anonyme', async ({ page }) => {
    // Le « + » n'est pas rendu du tout : montrer une porte fermee se lit comme
    // une panne, pas comme une fonction a venir (meme regle que la zone de
    // compte de la barre).
    await page.goto('/enchainements')
    await expect(page.getByRole('button', { name: 'Créer' })).toHaveCount(0)

    // La porte reelle est cote serveur : connaitre l'URL ne suffit pas. Depuis
    // la Story 3.5 elle EMMENE vers la connexion au lieu d afficher une
    // invitation, en emportant le chemin d origine.
    await page.goto('/enchainements/nouveau')
    await expect(page).toHaveURL(/\/connexion\?suite=%2Fenchainements%2Fnouveau$/)
    await expect(page.getByLabel("D'où part l'enchaînement ?")).toHaveCount(0)
  })

  test("un enchaînement inexistant répond 404, sans fuite d'information", async ({ request }) => {
    // Meme reponse qu'un enchainement prive (FR-17) : rien ne distingue
    // « n'existe pas » de « ne vous est pas destine ».
    const reponse = await request.get('/enchainements/999999', { failOnStatusCode: false })

    expect(reponse.status()).toBe(404)
  })
})
