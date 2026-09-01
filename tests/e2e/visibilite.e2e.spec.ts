import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * Le « non repertorie » vu du dehors (action item
 * `identifiant-opaque-et-visibilites`).
 *
 * CE QUI SE JOUE ICI EST LA PROMESSE ELLE-MEME : un enchainement non
 * repertorie s'ouvre pour qui a le lien, ET ne se retrouve nulle part pour qui
 * ne l'a pas. Les tests d'integration verrouillent la regle cote base ; ceux-ci
 * verifient qu'aucune SURFACE ne la contredit — la liste, la recherche, et
 * surtout l'API publique, qui est la porte qu'on oublie.
 *
 * Le visiteur est ANONYME dans presque tous les cas, et c'est voulu : c'est le
 * scenario reel, un eleve qui recoit un lien et l'ouvre sans compte (FR-19).
 */
const auteur: Identifiants = {
  email: 'visibilite-auteur@passe-finder.test',
  password: 'test-visibilite-auteur',
  // La creation d'enchainement reste gelee aux administrateurs (2026-08-31) ;
  // la fixture passe par l'API, mais le drapeau ne gene pas le scenario.
  admin: true,
}

const TITRE_CACHE = `Test non répertorié — ${Date.now()}`
const TITRE_OUVERT = `Test public — ${Date.now()}`

test.describe('Visibilité', () => {
  let page: Page
  let lienCache: string | null = null
  let lienOuvert: string | null = null
  let idCache: number | null = null

  test.beforeAll(async ({ browser }) => {
    await seedTestUser(auteur)

    const payload = await getPayload({ config })

    const passes = await payload.find({ collection: 'passes', limit: 1, depth: 0 })
    const comptes = await payload.find({
      collection: 'users',
      where: { email: { equals: auteur.email } },
      limit: 1,
      depth: 0,
    })

    if (passes.docs[0] && comptes.docs[0]) {
      const cache = await payload.create({
        collection: 'enchainements',
        data: {
          titre: TITRE_CACHE,
          auteur: comptes.docs[0].id,
          visibilite: 'nonRepertorie',
          passes: [{ passe: passes.docs[0].id }],
        },
      })
      lienCache = cache.idPublic ?? null
      idCache = cache.id

      const ouvert = await payload.create({
        collection: 'enchainements',
        data: {
          titre: TITRE_OUVERT,
          auteur: comptes.docs[0].id,
          visibilite: 'public',
          passes: [{ passe: passes.docs[0].id }],
        },
      })
      lienOuvert = ouvert.idPublic ?? null
    }

    const contexte = await browser.newContext()
    page = await contexte.newPage()
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'enchainements',
      where: { titre: { in: [TITRE_CACHE, TITRE_OUVERT] } },
    })
    await cleanupTestUser(auteur)
  })

  test('l’adresse d’un enchaînement n’est plus un numéro', async () => {
    test.skip(lienOuvert === null, 'Aucune passe sur cette cible.')

    // 12 caractères tirés au hasard : c'est ce qui rend le lien de partage
    // possible. Avec un numéro qui se suit, il se devinerait en comptant.
    expect(lienOuvert).toMatch(/^[A-Za-z0-9_-]{12}$/)

    await page.goto(`/enchainements/${lienOuvert}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITRE_OUVERT)
  })

  test('une ancienne adresse numérique ne répond plus', async () => {
    test.skip(idCache === null, 'Aucune passe sur cette cible.')

    // Décidé avec Alain le 2026-09-01. Une redirection aurait été aimable pour
    // les anciens liens, mais elle aurait laissé retrouver n'importe quel non
    // répertorié par dénombrement — c'est-à-dire vidé la fonction de son sens.
    const reponse = await page.goto(`/enchainements/${idCache}`)
    expect(reponse?.status()).toBe(404)
  })

  test('un non répertorié s’ouvre pour qui a le lien, sans compte', async () => {
    test.skip(lienCache === null, 'Aucune passe sur cette cible.')

    await page.goto(`/enchainements/${lienCache}`)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITRE_CACHE)
    // LE BADGE EST POUR TOUT LE MONDE, pas seulement pour l'auteur : le lecteur
    // doit savoir qu'il tient une adresse qu'il ne retrouvera pas dans la liste.
    await expect(page.locator('.fiche-enchainement-badge')).toHaveText('Non répertorié')
  })

  test('il n’apparaît ni dans la liste ni dans la recherche', async () => {
    test.skip(lienCache === null, 'Aucune passe sur cette cible.')

    await page.goto('/enchainements')
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Rechercher un enchaînement').fill(TITRE_CACHE)
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 15_000 })
    await expect(page.locator('.enchainement-carte', { hasText: TITRE_CACHE })).toHaveCount(0)

    // Le public, lui, se trouve : sans ce contre-exemple, le test passerait
    // aussi bien si la recherche était cassée.
    await page.goto(`/enchainements?q=${encodeURIComponent(TITRE_OUVERT)}`)
    await expect(page.locator('.enchainement-carte', { hasText: TITRE_OUVERT })).toHaveCount(1)

    // La recherche globale non plus. On regarde DANS LES RESULTATS et pas dans
    // la page entiere : l'en-tete rappelle la requete telle qu'on l'a tapee, et
    // un `getByText` global s'y accrocherait — le test passerait au vert en
    // lisant sa propre question.
    await page.goto(`/recherche?q=${encodeURIComponent(TITRE_CACHE)}`)
    await expect(page.locator('.resultats').getByText(TITRE_CACHE)).toHaveCount(0)
    await expect(page.getByText('Rien trouvé pour')).toBeVisible()
  })

  test('l’API publique ne le liste pas non plus', async ({ request }) => {
    test.skip(lienCache === null, 'Aucune passe sur cette cible.')

    // LA PORTE QU'ON OUBLIE. Masquer un enchaînement dans l'interface pendant
    // que l'API le publie ne serait pas une visibilité, ce serait un décor
    // (ADD-5) : n'importe qui lirait la liste complète en une requête.
    const reponse = await request.get('/api/enchainements?limit=200&depth=0')
    expect(reponse.ok()).toBe(true)

    const { docs } = await reponse.json()
    const titres = (docs as { titre: string }[]).map((doc) => doc.titre)

    expect(titres).toContain(TITRE_OUVERT)
    expect(titres).not.toContain(TITRE_CACHE)
  })

  test('son auteur le retrouve, lui, dans la liste', async ({ browser }) => {
    test.skip(lienCache === null, 'Aucune passe sur cette cible.')

    // L'autre moitié de la règle : sans elle, on perdrait de vue ce qu'on vient
    // de partager par lien.
    const contexte = await browser.newContext()
    const sien = await contexte.newPage()

    // Le helper ATTEND que la session soit ouverte (le menu de compte
    // apparait). Enchainer une navigation sur le clic sans attendre partirait
    // parfois avant que le cookie ne soit pose, et la liste repondrait en
    // anonyme.
    await login({ page: sien, user: auteur })

    await sien.goto(`/enchainements?q=${encodeURIComponent(TITRE_CACHE)}`)
    await expect(sien.locator('.enchainement-carte', { hasText: TITRE_CACHE })).toHaveCount(1)

    await contexte.close()
  })
})
