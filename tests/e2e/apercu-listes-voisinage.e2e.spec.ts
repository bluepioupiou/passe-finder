import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * L'APERCU DES LISTES DE VOISINAGE (demande d'Alain, 2026-09-07).
 *
 * Les fiches passe et position servaient leurs listes entieres — jusqu'a 44
 * entrees, qui poussaient le bas de la fiche hors d'atteinte. Elles n'en
 * montrent plus que cinq et replient le reste SUR PLACE.
 *
 * CE QUI EST VERIFIE ICI, c'est la promesse rendue au lecteur : le titre annonce
 * le total, la liste n'en montre que cinq, le pli dit combien il cache, et ce
 * qu'il cache revient d'un clic. Le seuil aussi, dans l'autre sens : une liste
 * courte ne doit pas gagner un controle qui ne servirait a rien.
 *
 * SCENARIO ANONYME : le catalogue est en lecture publique (FR-21).
 *
 * Comme les autres tests de cette suite, il se declare IGNORE si la cible n'a
 * pas de position assez frequentee pour que le pli existe.
 */

const APERCU = 5
const SEUIL = 8

/** Combien de passes partent de chaque position, d'apres l'API publique. */
async function sortantesParPosition(request: APIRequestContext): Promise<Map<number, number>> {
  const compte = new Map<number, number>()
  const reponse = await request.get('/api/passes?limit=500&depth=0')
  if (!reponse.ok()) return compte

  const { docs } = await reponse.json()
  for (const passe of docs ?? []) {
    const debut = passe.positionDebut
    if (typeof debut === 'number') compte.set(debut, (compte.get(debut) ?? 0) + 1)
  }

  return compte
}

test.describe('Aperçu des listes de voisinage', () => {
  test('montre cinq passes, dit combien il en reste, et déplie sur place', async ({
    page,
    request,
  }) => {
    const compte = await sortantesParPosition(request)
    const debordante = [...compte.entries()].find(([, n]) => n > SEUIL)
    test.skip(!debordante, 'Aucune position n’a plus de 8 passes sortantes sur cette cible.')

    const [position, total] = debordante!
    await page.goto(`/positions/${position}`)

    const section = page
      .locator('section.fiche-section')
      .filter({ hasText: "Passes qui partent d'ici" })

    // LE TITRE ANNONCE LE TOTAL, pas le nombre montre : sinon le pli mentirait
    // sur ce qu'il cache.
    await expect(section.locator('.fiche-section__titre')).toContainText(`(${total})`)
    await expect(section.locator('ul.fiche-passes').first().locator('li')).toHaveCount(APERCU)

    // « Afficher tout » sans compter : le titre porte deja le total, et cinq
    // lignes sont sous les yeux (demande d'Alain, 2026-09-08).
    const bascule = section.locator('summary.fiche-reste__bascule')
    await expect(bascule).toContainText('Afficher tout')

    // La derniere entree est bien SERVIE (elle est dans le HTML, donc lisible
    // sans JavaScript) mais cachee tant que le pli est ferme.
    const derniere = section.locator('ul.fiche-passes--suite li').last()
    await expect(derniere).toBeHidden()

    await bascule.click()

    await expect(derniere).toBeVisible()
    await expect(bascule).toContainText('Réduire la liste')

    // OUVERT, LE CONTROLE EST EN BAS : la liste se lit d'un trait, sans rien
    // planté entre la cinquieme et la sixieme entree. C'est `order` qui le
    // place, un `<summary>` etant toujours le premier enfant de son `<details>`.
    const basBascule = await bascule.boundingBox()
    const basDerniere = await derniere.boundingBox()
    expect(basBascule!.y).toBeGreaterThan(basDerniere!.y)

    // Et le pli se referme : c'est un aller-retour, pas un aller simple.
    await bascule.click()
    await expect(derniere).toBeHidden()
  })

  test('laisse une liste courte entière, sans contrôle de dépli', async ({ page, request }) => {
    const compte = await sortantesParPosition(request)
    const courte = [...compte.entries()].find(([, n]) => n > 0 && n <= SEUIL)
    test.skip(!courte, 'Aucune position ne tient sous le seuil sur cette cible.')

    const [position, total] = courte!
    await page.goto(`/positions/${position}`)

    const section = page
      .locator('section.fiche-section')
      .filter({ hasText: "Passes qui partent d'ici" })

    await expect(section.locator('ul.fiche-passes li')).toHaveCount(total)
    await expect(section.locator('summary.fiche-reste__bascule')).toHaveCount(0)
  })
})
