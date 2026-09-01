import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * Modifier les informations de SON enchainement (Story 4.5, FR-18).
 *
 * Le scenario joue les trois situations, parce que c'est leur difference qui
 * fait la story : l'auteur modifie, un autre compte connecte ne voit meme pas
 * le lien et bute sur un 404, un visiteur anonyme est emmene vers la connexion.
 *
 * Le 404 pour un compte connecte non-auteur est VOLONTAIRE et non un « interdit
 * » : un refus explicite apprendrait a qui tatonne qu'il y a bien quelque chose
 * a cette adresse.
 *
 * Deux comptes dedies a ce fichier : les partager avec un autre fichier
 * reviendrait a se les supprimer mutuellement quand les deux tournent.
 */
const auteur: Identifiants = {
  email: 'modification-auteur@passe-finder.test',
  password: 'test-modification-auteur',
  // La creation reste gelee aux administrateurs (2026-08-31) ; l'enchainement
  // d'essai est cree par l'API, mais le compte doit pouvoir composer si le gel
  // est leve. Le drapeau ne change rien au scenario : `peutModifier` accepte
  // l'auteur, admin ou non.
  admin: true,
}

const autre: Identifiants = {
  email: 'modification-autre@passe-finder.test',
  password: 'test-modification-autre',
}

const TITRE = `Test modification — ${Date.now()}`
const TITRE_MODIFIE = `${TITRE} (corrigé)`
const LIEN_MUSIQUE = 'https://open.spotify.com/track/modification'
const LIEN_VIDEO = 'https://www.youtube.com/watch?v=modification'

test.describe('Modification', () => {
  let page: Page
  let idEnchainement: number | null = null

  test.beforeAll(async ({ browser }) => {
    await seedTestUser(auteur)
    await seedTestUser(autre)

    const payload = await getPayload({ config })

    const passes = await payload.find({ collection: 'passes', limit: 1, depth: 0 })
    const comptes = await payload.find({
      collection: 'users',
      where: { email: { equals: auteur.email } },
      limit: 1,
      depth: 0,
    })

    // Le catalogue de la cible peut etre vide (la reprise est un geste manuel) :
    // sans passe, il n'y a pas d'enchainement a modifier, et les tests se
    // declarent ignores plutot que d'echouer sur l'environnement.
    if (passes.docs[0] && comptes.docs[0]) {
      const cree = await payload.create({
        collection: 'enchainements',
        data: {
          titre: TITRE,
          auteur: comptes.docs[0].id,
          // PARTAGE a dessein : l'autre compte doit pouvoir le LIRE sans
          // pouvoir le modifier. Sur un enchainement prive, le 404 ne dirait
          // rien de la Story 4.5 — il viendrait de la lecture.
          visibilite: 'partage',
          passes: [{ passe: passes.docs[0].id }],
        },
      })
      idEnchainement = cree.id
    }

    const contexte = await browser.newContext()
    page = await contexte.newPage()
    await login({ page, user: auteur })
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'enchainements',
      where: { titre: { in: [TITRE, TITRE_MODIFIE] } },
    })
    await cleanupTestUser(auteur)
    await cleanupTestUser(autre)
  })

  test('l’auteur modifie les informations depuis sa fiche', async () => {
    test.skip(idEnchainement === null, 'Aucune passe sur cette cible.')

    await page.goto(`/enchainements/${idEnchainement}`)

    await page.getByRole('link', { name: 'Modifier' }).click()
    await expect(page).toHaveURL(new RegExp(`/enchainements/${idEnchainement}/modifier$`))

    // Le formulaire s'ouvre SUR LES VALEURS EXISTANTES : sans cela, enregistrer
    // pour corriger un titre effacerait tout le reste.
    await expect(page.getByLabel('Titre')).toHaveValue(TITRE)

    await page.getByLabel('Titre').fill(TITRE_MODIFIE)
    await page.getByLabel('Musique', { exact: true }).fill('Un morceau')
    await page.getByLabel('Lien de la musique').fill(LIEN_MUSIQUE)
    await page.getByLabel('Lien de la vidéo').fill(LIEN_VIDEO)

    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()

    // On revient sur la fiche : la confirmation, c'est de voir le changement.
    await expect(page).toHaveURL(new RegExp(`/enchainements/${idEnchainement}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITRE_MODIFIE)
    await expect(page.getByRole('link', { name: 'Un morceau' })).toHaveAttribute(
      'href',
      LIEN_MUSIQUE,
    )
    // La video nomme son hebergeur : elle n'a pas de titre a porter, elle se
    // regarde.
    await expect(page.getByRole('link', { name: 'Voir sur YouTube' })).toHaveAttribute(
      'href',
      LIEN_VIDEO,
    )
  })

  test('un lien invalide, musique ou vidéo, bloque l’enregistrement', async () => {
    test.skip(idEnchainement === null, 'Aucune passe sur cette cible.')

    const enregistrer = page.getByRole('button', { name: 'Enregistrer les modifications' })

    await page.goto(`/enchainements/${idEnchainement}/modifier`)
    await page.getByLabel('Lien de la musique').fill('pas une adresse')
    await expect(enregistrer).toBeDisabled()

    await page.getByLabel('Lien de la musique').fill(LIEN_MUSIQUE)
    await expect(enregistrer).toBeEnabled()

    // La video porte la meme garde : elle finit elle aussi en `<a href>`.
    await page.getByLabel('Lien de la vidéo').fill('pas une adresse non plus')
    await expect(enregistrer).toBeDisabled()
  })

  test('l’auteur est affiché, sans jamais publier l’adresse', async () => {
    test.skip(idEnchainement === null, 'Aucune passe sur cette cible.')

    await page.goto(`/enchainements/${idEnchainement}`)

    // La partie AVANT l'arobase, et elle seule : publier l'adresse entiere sur
    // une page ouverte se paierait en spam (UX-DR10).
    await expect(page.locator('.fiche-enchainement-auteur')).toHaveText('par modification-auteur')
    await expect(page.locator('body')).not.toContainText(auteur.email)
  })

  test('la carte signale la musique, la vidéo et l’auteur', async () => {
    test.skip(idEnchainement === null, 'Aucune passe sur cette cible.')

    // Dans la grille, on veut savoir « celui-ci en a » sans ouvrir la fiche.
    await page.goto('/enchainements')
    await page.getByLabel('Rechercher un enchaînement').fill(TITRE_MODIFIE)

    const carte = page.locator('.enchainement-carte', { hasText: TITRE_MODIFIE })
    await expect(carte.locator('.enchainement-media')).toHaveCount(2)
    await expect(carte).toContainText('Avec musique')
    await expect(carte).toContainText('Avec vidéo')
    await expect(carte.locator('.enchainement-auteur')).toHaveText('par modification-auteur')
  })

  test('un autre compte ne voit pas le lien, et l’adresse répond 404', async ({ browser }) => {
    test.skip(idEnchainement === null, 'Aucune passe sur cette cible.')

    const contexte = await browser.newContext()
    const pageAutre = await contexte.newPage()
    await login({ page: pageAutre, user: autre })

    // Il LIT l'enchainement (il est partage) mais ne peut pas le modifier.
    await pageAutre.goto(`/enchainements/${idEnchainement}`)
    await expect(pageAutre.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(pageAutre.getByRole('link', { name: 'Modifier' })).toHaveCount(0)

    const reponse = await pageAutre.goto(`/enchainements/${idEnchainement}/modifier`)
    expect(reponse?.status()).toBe(404)

    await contexte.close()
  })

  test('un visiteur anonyme est emmené vers la connexion', async ({ browser }) => {
    test.skip(idEnchainement === null, 'Aucune passe sur cette cible.')

    const contexte = await browser.newContext()
    const anonyme = await contexte.newPage()

    await anonyme.goto(`/enchainements/${idEnchainement}/modifier`)

    // La porte emporte le chemin d'origine, pour y revenir apres connexion
    // (Story 3.5).
    await expect(anonyme).toHaveURL(/\/connexion\?suite=/)
    await expect(anonyme).toHaveURL(new RegExp(encodeURIComponent(`/${idEnchainement}/modifier`)))

    await contexte.close()
  })
})
