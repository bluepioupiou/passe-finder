import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * Parcours des favoris (Story 5.1, FR-25).
 *
 * Compte dedie a ce fichier : deux fichiers qui partagent un compte se le
 * suppriment mutuellement. Compte ORDINAIRE et non administrateur, et c'est le
 * point du scenario — il ne doit pas etre l'auteur des enchainements du
 * catalogue, sinon la contrainte ADD-9 lui refuserait le favori.
 */
const eleve: Identifiants = {
  email: 'favoris@passe-finder.test',
  password: 'test-favoris',
}

/** Un enchainement partage de la cible, ou `null` si le catalogue est vide. */
async function unEnchainementPartage(request: APIRequestContext): Promise<number | null> {
  // Requete ANONYME : elle ne peut donc ramener que du partage (FR-17).
  const reponse = await request.get('/api/enchainements?limit=1&depth=0')
  if (!reponse.ok()) return null

  const { docs } = await reponse.json()
  return docs?.[0]?.id ?? null
}

test.describe('Favoris', () => {
  let page: Page
  let idEnchainement: number | null = null

  test.beforeAll(async ({ browser, request }) => {
    await seedTestUser(eleve)

    idEnchainement = await unEnchainementPartage(request)

    const contexte = await browser.newContext()
    page = await contexte.newPage()
    await login({ page, user: eleve })
  })

  test.afterAll(async () => {
    // Les favoris d'abord : la cle etrangere est en `set null`, les laisser
    // derriere laisserait des lignes orphelines dans la base de dev.
    const payload = await getPayload({ config })
    const comptes = await payload.find({
      collection: 'users',
      where: { email: { equals: eleve.email } },
      limit: 1,
      depth: 0,
    })
    const compte = comptes.docs[0]
    if (compte) {
      await payload.delete({ collection: 'favoris', where: { utilisateur: { equals: compte.id } } })
    }

    await cleanupTestUser(eleve)
  })

  test('la fiche propose la mise en favori, et la bascule', async () => {
    test.skip(idEnchainement === null, 'Aucun enchaînement partagé sur cette cible.')

    await page.goto(`/enchainements/${idEnchainement}`)

    const bouton = page.getByRole('button', { name: 'Mettre en favori' })
    await expect(bouton).toBeVisible()
    await bouton.click()

    // Le libelle porte l'etat : c'est ce que lit quelqu'un qui revient sur la
    // fiche plus tard.
    const pose = page.getByRole('button', { name: 'En favori' })
    await expect(pose).toBeVisible()
    // ET on attend la fin de l aller-retour serveur : le bouton est OPTIMISTE,
    // il bascule AVANT la reponse. Sans cette attente, la suite du scenario peut
    // lire la base avant que l ecriture n ait atterri — la suite devient alors
    // rouge une fois sur quatre, pour une raison qui n a rien a voir avec elle.
    // Le bouton est desactive pendant la transition : le voir reactive prouve
    // que le serveur a repondu.
    await expect(pose).toBeEnabled()
  })

  test("l'état survit au rechargement (il est en base, pas dans la page)", async () => {
    test.skip(idEnchainement === null, 'Aucun enchaînement partagé sur cette cible.')

    await page.reload()

    await expect(page.getByRole('button', { name: 'En favori' })).toBeVisible()
  })

  test('le menu de compte mène à mes favoris, qui contient l’enchaînement', async () => {
    test.skip(idEnchainement === null, 'Aucun enchaînement partagé sur cette cible.')

    await page.getByRole('button', { name: 'Mon compte' }).click()
    await page.getByRole('menuitem', { name: 'Mes favoris' }).click()

    await expect(page).toHaveURL(/\/favoris$/)
    await expect(page.locator('.enchainements-grille li')).toHaveCount(1)
  })

  test('la liste des enchaînements se filtre sur mes favoris', async () => {
    test.skip(idEnchainement === null, 'Aucun enchaînement partagé sur cette cible.')

    await page.goto('/enchainements')
    // ATTENDRE QUE LA PAGE SOIT VIVANTE AVANT DE TAPER. La recherche est un
    // composant client : tant qu'il n'est pas hydrate, une frappe programmee
    // pose bien le texte dans le champ, mais React n'a pas encore branche son
    // `onChange` — la pause de 300 ms ne demarre jamais, et l'URL ne bouge pas.
    // Un humain ne le voit pas (sa frappe suivante repart), un test si : c'est
    // exactement ce qui rendait cette suite rouge une fois sur trois.
    await page.waitForLoadState('networkidle')

    const total = await page.locator('.enchainements-grille li').count()
    expect(total).toBeGreaterThan(1)

    await page.getByLabel('Mes favoris').check()

    await expect(page.locator('.enchainements-grille li')).toHaveCount(1)
  })

  test('le favori se retire, et la liste redevient vide', async () => {
    test.skip(idEnchainement === null, 'Aucun enchaînement partagé sur cette cible.')

    await page.goto(`/enchainements/${idEnchainement}`)
    await page.getByRole('button', { name: 'En favori' }).click()
    const retire = page.getByRole('button', { name: 'Mettre en favori' })
    await expect(retire).toBeVisible()
    // ET on attend la fin de l aller-retour serveur : le bouton est OPTIMISTE,
    // il bascule AVANT la reponse. Sans cette attente, la suite du scenario peut
    // lire la base avant que l ecriture n ait atterri — la suite devient alors
    // rouge une fois sur quatre, pour une raison qui n a rien a voir avec elle.
    // Le bouton est desactive pendant la transition : le voir reactive prouve
    // que le serveur a repondu.
    await expect(retire).toBeEnabled()

    await page.goto('/favoris')
    await expect(page.getByText('Pas encore de favori.')).toBeVisible()
  })

  test('un visiteur anonyme ne voit aucun contrôle de favori', async () => {
    test.skip(idEnchainement === null, 'Aucun enchaînement partagé sur cette cible.')

    // Decision d'Alain (2026-08-31) : la fiche ne propose RIEN a un anonyme, pas
    // meme une invitation a se connecter — elle encombrait la lecture. La porte
    // reste ouverte par la barre de navigation, qui offre « Se connecter »
    // partout.
    const contexte = await page.context().browser()!.newContext()
    const visiteur = await contexte.newPage()

    await visiteur.goto(`/enchainements/${idEnchainement}`)

    await expect(visiteur.getByRole('button', { name: 'Mettre en favori' })).toHaveCount(0)
    await expect(visiteur.getByRole('link', { name: /favori/i })).toHaveCount(0)
    // La fiche reste lisible : on ne lui a rien retire de son contenu.
    await expect(visiteur.getByRole('heading', { level: 1 })).toBeVisible()

    await contexte.close()
  })
})
