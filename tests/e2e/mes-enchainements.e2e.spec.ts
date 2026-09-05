import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * « Mes enchaînements » (Story 5.2, FR-30 / UX-DR12).
 *
 * CE QUE CETTE PAGE DOIT PROUVER, et qu'aucune autre ne prouve : elle montre à
 * un auteur TOUT ce qu'il a écrit, y compris ce que le reste du site lui cache
 * — le privé et le non répertorié n'apparaissent ni dans la liste, ni dans la
 * recherche, ni dans l'API (voir visibilite.e2e.spec.ts). Sans cette page,
 * un brouillon privé serait introuvable pour son propre auteur dès qu'il aurait
 * perdu le lien.
 *
 * Le second point : elle ne montre QUE les miens. Un fixture d'un autre compte
 * est semé exprès pour que le test échoue si le filtre par auteur sautait.
 *
 * Compte dédié à ce fichier : le partager reviendrait à se le supprimer
 * mutuellement quand deux fichiers tournent en parallèle.
 */
const auteur: Identifiants = {
  email: 'mes-enchainements-auteur@passe-finder.test',
  password: 'test-mes-enchainements',
}

const voisin: Identifiants = {
  email: 'mes-enchainements-voisin@passe-finder.test',
  password: 'test-mes-enchainements-voisin',
}

const horodatage = Date.now()
const TITRE_PRIVE = `Test mien privé — ${horodatage}`
const TITRE_PUBLIC = `Test mien public — ${horodatage}`
const TITRE_VOISIN = `Test du voisin — ${horodatage}`

test.describe('Mes enchaînements', () => {
  let page: Page
  let seme = false

  test.beforeAll(async ({ browser }) => {
    await seedTestUser(auteur)
    await seedTestUser(voisin)

    const payload = await getPayload({ config })

    const passes = await payload.find({ collection: 'passes', limit: 1, depth: 0 })
    const comptes = await payload.find({
      collection: 'users',
      where: { email: { in: [auteur.email, voisin.email] } },
      limit: 2,
      depth: 0,
    })

    const idAuteur = comptes.docs.find((compte) => compte.email === auteur.email)?.id
    const idVoisin = comptes.docs.find((compte) => compte.email === voisin.email)?.id

    if (passes.docs[0] && idAuteur && idVoisin) {
      const passe = passes.docs[0].id

      await payload.create({
        collection: 'enchainements',
        data: {
          titre: TITRE_PRIVE,
          auteur: idAuteur,
          visibilite: 'prive',
          passes: [{ passe }],
        },
      })
      await payload.create({
        collection: 'enchainements',
        data: {
          titre: TITRE_PUBLIC,
          auteur: idAuteur,
          visibilite: 'public',
          passes: [{ passe }],
        },
      })
      await payload.create({
        collection: 'enchainements',
        data: {
          titre: TITRE_VOISIN,
          auteur: idVoisin,
          visibilite: 'public',
          passes: [{ passe }],
        },
      })
      seme = true
    }

    const contexte = await browser.newContext()
    page = await contexte.newPage()
    await login({ page, user: auteur })
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'enchainements',
      where: { titre: { in: [TITRE_PRIVE, TITRE_PUBLIC, TITRE_VOISIN] } },
    })
    await cleanupTestUser(auteur)
    await cleanupTestUser(voisin)
  })

  test('la page montre les miens, privés compris, et pas ceux des autres', async () => {
    test.skip(!seme, 'Aucune passe sur cette cible.')

    await page.goto('/mes-enchainements')

    await expect(page.locator('.enchainement-carte', { hasText: TITRE_PRIVE })).toHaveCount(1)
    await expect(page.locator('.enchainement-carte', { hasText: TITRE_PUBLIC })).toHaveCount(1)
    // Le contre-exemple, qui est tout l'intérêt du test : sans le filtre par
    // auteur, la page rendrait aussi le public du voisin.
    await expect(page.locator('.enchainement-carte', { hasText: TITRE_VOISIN })).toHaveCount(0)
  })

  test('le privé porte son badge, le public n’en porte pas', async () => {
    test.skip(!seme, 'Aucune passe sur cette cible.')

    await page.goto('/mes-enchainements')

    const prive = page.locator('.enchainement-carte', { hasText: TITRE_PRIVE })
    await expect(prive.locator('.enchainement-badge')).toHaveText('Privé')

    // Le public est le cas ordinaire : le signaler sur chaque carte reviendrait
    // à ne plus rien signaler.
    const publie = page.locator('.enchainement-carte', { hasText: TITRE_PUBLIC })
    await expect(publie.locator('.enchainement-badge')).toHaveCount(0)
  })

  test('chaque carte mène à sa modification et donne son lien', async () => {
    test.skip(!seme, 'Aucune passe sur cette cible.')

    await page.goto('/mes-enchainements')

    const item = page.locator('.mes-enchainements__item', { hasText: TITRE_PRIVE })

    // « Copier le lien » : le seul chemin de partage d'un non répertorié, dont
    // le lien EST la seule adresse. On accorde la permission au contexte, sans
    // quoi le navigateur refuse le presse-papiers en test.
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    await item.getByRole('button', { name: 'Copier le lien' }).click()
    await expect(item.getByRole('button', { name: 'Lien copié' })).toBeVisible()

    const copie = await page.evaluate(() => navigator.clipboard.readText())
    expect(copie).toMatch(/\/enchainements\/[A-Za-z0-9_-]{12}$/)

    // Et le lien copié est bien celui de CETTE carte.
    await item.getByRole('link', { name: 'Modifier' }).click()
    await expect(page).toHaveURL(new RegExp(`${copie.split('/enchainements/')[1]}/modifier$`))
    // L'ecran de modification porte bien CET enchainement : son titre est dans
    // le champ, pas dans le `h1` (qui dit « Modifier »).
    await expect(page.getByLabel('Titre')).toHaveValue(TITRE_PRIVE)
  })
})
