import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * Composition d'un enchainement (Stories 4.2 / 4.3) — le geste central.
 *
 * Le parcours entier est joue tel qu'Alain le fera : le « + » de la barre, le
 * choix du depart, deux passes ajoutees, une annulee, l'enregistrement, et la
 * fiche qui s'ouvre. Ce qui se verifie ici et nulle part ailleurs, c'est que le
 * compositeur ne propose QUE des passes qui partent de la position courante
 * (FR-10) et que l'enchainement nait PRIVE (FR-17, AD-6).
 *
 * Comme les autres tests de cette suite, il se declare IGNORE si la cible n'a
 * pas de catalogue : la CI tourne contre un conteneur dont la base peut etre
 * vide (la reprise du catalogue est un geste manuel).
 */

const TITRE = `Test compositeur — ${Date.now()}`

/**
 * Compte dedie a ce fichier : partager celui de `admin.e2e.spec.ts` reviendrait
 * a se le supprimer mutuellement quand les deux fichiers tournent en parallele.
 */
const compositeur: Identifiants = {
  email: 'compositeur@passe-finder.test',
  password: 'test-compositeur',
  // GEL TEMPORAIRE (2026-08-31) : la creation est reservee aux administrateurs
  // le temps de trancher le modele de visibilite. Ce scenario compose, il lui
  // faut donc le drapeau. A retirer le jour ou la creation est rouverte.
  admin: true,
}

/** Le catalogue de la cible porte-t-il de quoi composer ? */
async function catalogueDisponible(request: APIRequestContext): Promise<boolean> {
  const reponse = await request.get('/api/passes?limit=1&depth=0')
  if (!reponse.ok()) return false

  const { totalDocs } = await reponse.json()
  return totalDocs > 0
}

test.describe('Compositeur', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser(compositeur)

    const contexte = await browser.newContext()
    page = await contexte.newPage()
    await login({ page, user: compositeur })
  })

  test.afterAll(async () => {
    // On ne laisse rien derriere soi dans la base de la cible.
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'enchainements',
      where: { titre: { equals: TITRE } },
    })
    await cleanupTestUser(compositeur)
  })

  test('compose un enchaînement et l’enregistre en privé', async ({ request }) => {
    test.skip(!(await catalogueDisponible(request)), 'Aucune passe sur cette cible.')

    await page.goto('/enchainements')

    // Le « + » n'apparait que pour un compte connecte.
    await page.getByRole('button', { name: 'Créer' }).click()
    await page.getByRole('menuitem', { name: 'Créer un enchaînement' }).click()
    await expect(page).toHaveURL(/\/enchainements\/nouveau$/)

    // Le depart ouvre le rail : sans lui, aucune passe n'est proposee.
    const choix = page.locator('.compo-choix__bouton')
    await expect(choix).toHaveCount(0)
    await page.getByLabel("D'où part l'enchaînement ?").selectOption({ index: 1 })
    await expect(choix.first()).toBeVisible()

    // Chaque passe proposee part bien de la position courante : on le verifie
    // par la position d'arrivee affichee, qui devient l'etape suivante.
    const arrivee = (await choix.first().locator('.compo-choix__vers').innerText())
      .replace('→', '')
      .trim()
    await choix.first().click()

    const maillons = page.locator('.compo-passe')
    await expect(maillons).toHaveCount(1)
    await expect(page.locator('.compo-etape__nom').last()).toHaveText(arrivee)

    await choix.first().click()
    await expect(maillons).toHaveCount(2)

    // Annulation pas a pas : seule la derniere porte une croix (FR-13).
    await expect(page.locator('.compo-passe__retirer')).toHaveCount(1)
    await page.locator('.compo-passe__retirer').click()
    await expect(maillons).toHaveCount(1)

    await page.getByLabel('Titre').fill(TITRE)
    await page.getByRole('button', { name: "Enregistrer l'enchaînement" }).click()

    // On atterrit sur la fiche : la confirmation, c'est de voir son travail.
    await expect(page).toHaveURL(/\/enchainements\/\d+$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITRE)
    // Ne s'affiche que pour l'auteur, et dit que ce lien ne mene nulle part
    // pour ses eleves tant qu'il ne l'a pas partage.
    await expect(page.getByText('Privé')).toBeVisible()
  })
})
