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
  // LE LIEN, et non le numero : c'est la seule adresse que le site sert
  // desormais (action item `identifiant-opaque-et-visibilites`).
  let lien: string | null = null

  test.beforeAll(async ({ browser }) => {
    await seedTestUser(auteur)
    await seedTestUser(autre)

    const payload = await getPayload({ config })

    const passes = await payload.find({ collection: 'passes', limit: 500, depth: 0 })
    const comptes = await payload.find({
      collection: 'users',
      where: { email: { equals: auteur.email } },
      limit: 1,
      depth: 0,
    })

    // UNE PASSE PROLONGEABLE, et pas la premiere venue : le scenario de reprise
    // de chaine a besoin qu'au moins une passe parte de la position d'arrivee,
    // sinon le compositeur n'a rien a proposer et le test echouerait sur le
    // catalogue plutot que sur le code.
    const departs = new Set(passes.docs.map((passe) => passe.positionDebut as number))
    const prolongeable = passes.docs.find((passe) => departs.has(passe.positionFin as number))

    // Le catalogue de la cible peut etre vide (la reprise est un geste manuel) :
    // sans passe, il n'y a pas d'enchainement a modifier, et les tests se
    // declarent ignores plutot que d'echouer sur l'environnement.
    if (prolongeable && comptes.docs[0]) {
      const cree = await payload.create({
        collection: 'enchainements',
        data: {
          titre: TITRE,
          auteur: comptes.docs[0].id,
          // PARTAGE a dessein : l'autre compte doit pouvoir le LIRE sans
          // pouvoir le modifier. Sur un enchainement prive, le 404 ne dirait
          // rien de la Story 4.5 — il viendrait de la lecture.
          visibilite: 'public',
          passes: [{ passe: prolongeable.id }],
        },
      })
      lien = cree.idPublic ?? null
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
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    await page.goto(`/enchainements/${lien}`)

    await page.getByRole('link', { name: 'Modifier' }).click()
    await expect(page).toHaveURL(new RegExp(`/enchainements/${lien}/modifier$`))

    // Le formulaire s'ouvre SUR LES VALEURS EXISTANTES : sans cela, enregistrer
    // pour corriger un titre effacerait tout le reste.
    await expect(page.getByLabel('Titre')).toHaveValue(TITRE)

    await page.getByLabel('Titre').fill(TITRE_MODIFIE)
    await page.getByLabel('Musique', { exact: true }).fill('Un morceau')
    await page.getByLabel('Lien de la musique').fill(LIEN_MUSIQUE)
    await page.getByLabel('Lien de la vidéo').fill(LIEN_VIDEO)

    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()

    // On revient sur la fiche : la confirmation, c'est de voir le changement.
    await expect(page).toHaveURL(new RegExp(`/enchainements/${lien}$`))
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

  test('l’auteur reprend la chaîne là où elle en est, et la prolonge', async () => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    await page.goto(`/enchainements/${lien}/modifier`)

    // LA CHAINE EST DEJA LA : c'est tout l'objet de la reprise. Un compositeur
    // qui s'ouvrirait vide effacerait l'enchainement a l'enregistrement.
    const maillons = page.locator('.compo-passe')
    await expect(maillons).toHaveCount(1)

    // Le depart est verrouille tant que la chaine porte des passes (FR-13) :
    // en changer viderait la chaine sans prevenir.
    await expect(page.getByLabel("D'où part l'enchaînement ?")).toBeDisabled()

    // Et la suite se compose comme ailleurs : seules les passes qui partent de
    // la position courante sont proposees (FR-10).
    const choix = page.locator('.compo-choix__bouton')
    await expect(choix.first()).toBeVisible()
    await choix.first().click()
    await expect(maillons).toHaveCount(2)

    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click()

    await expect(page).toHaveURL(new RegExp(`/enchainements/${lien}$`))
    // La fiche compte les passes : c'est la preuve que la chaine a bien ete
    // REECRITE en base, et pas seulement affichee autrement.
    await expect(page.getByText('2 passes')).toBeVisible()
  })

  test('une chaîne vidée ne peut pas être enregistrée', async () => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    // Le garde-fou qui compte : sans lui, retirer toutes les passes puis
    // enregistrer laisserait un enchainement sans chaine — ni lisible, ni
    // reparable depuis la fiche.
    await page.goto(`/enchainements/${lien}/modifier`)

    const enregistrer = page.getByRole('button', { name: 'Enregistrer les modifications' })
    await expect(enregistrer).toBeEnabled()

    // On retire les passes une a une : seule la derniere porte une croix.
    await page.locator('.compo-passe__retirer').click()
    await page.locator('.compo-passe__retirer').click()

    await expect(page.locator('.compo-passe')).toHaveCount(0)
    await expect(enregistrer).toBeDisabled()
    await expect(page.getByText('Ajoute au moins une passe pour pouvoir enregistrer.')).toBeVisible()

    // On repart sans enregistrer : la chaine en base n'a pas bouge.
    await page.goto(`/enchainements/${lien}`)
    await expect(page.getByText('2 passes')).toBeVisible()
  })

  test('un lien invalide, musique ou vidéo, bloque l’enregistrement', async () => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    const enregistrer = page.getByRole('button', { name: 'Enregistrer les modifications' })

    await page.goto(`/enchainements/${lien}/modifier`)
    await page.getByLabel('Lien de la musique').fill('pas une adresse')
    await expect(enregistrer).toBeDisabled()

    await page.getByLabel('Lien de la musique').fill(LIEN_MUSIQUE)
    await expect(enregistrer).toBeEnabled()

    // La video porte la meme garde : elle finit elle aussi en `<a href>`.
    await page.getByLabel('Lien de la vidéo').fill('pas une adresse non plus')
    await expect(enregistrer).toBeDisabled()
  })

  test('l’auteur est affiché, sans jamais publier l’adresse', async () => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    await page.goto(`/enchainements/${lien}`)

    // La partie AVANT l'arobase, et elle seule : publier l'adresse entiere sur
    // une page ouverte se paierait en spam (UX-DR10).
    await expect(page.locator('.fiche-enchainement-auteur')).toHaveText('par modification-auteur')
    await expect(page.locator('body')).not.toContainText(auteur.email)
  })

  test('la carte signale la musique, la vidéo et l’auteur', async () => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    // Dans la grille, on veut savoir « celui-ci en a » sans ouvrir la fiche.
    await page.goto('/enchainements')
    // ATTENDRE QUE LA PAGE SOIT VIVANTE AVANT DE TAPER. La recherche est un
    // composant client : tant qu'il n'est pas hydrate, une frappe programmee
    // pose bien le texte dans le champ, mais React n'a pas encore branche son
    // `onChange` — la pause de 300 ms ne demarre jamais, et l'URL ne bouge pas.
    // Un humain ne le voit pas (sa frappe suivante repart), un test si : c'est
    // exactement ce qui rendait cette suite rouge une fois sur trois.
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Rechercher un enchaînement').fill(TITRE_MODIFIE)
    // La frappe part dans l'URL apres une pause de 300 ms, et la page revient
    // filtree : on attend cette navigation avant de lire la grille, sinon on
    // lit celle d'avant. Delai large — en developpement, la route peut se
    // compiler a la demande.
    await expect(page).toHaveURL(/[?&]q=/, { timeout: 15_000 })

    const carte = page.locator('.enchainement-carte', { hasText: TITRE_MODIFIE })
    await expect(carte.locator('.enchainement-media')).toHaveCount(2)
    await expect(carte).toContainText('Avec musique')
    await expect(carte).toContainText('Avec vidéo')
    await expect(carte.locator('.enchainement-auteur')).toHaveText('par modification-auteur')
  })

  test('un autre compte ne voit pas le lien, et l’adresse répond 404', async ({ browser }) => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    const contexte = await browser.newContext()
    const pageAutre = await contexte.newPage()
    await login({ page: pageAutre, user: autre })

    // Il LIT l'enchainement (il est partage) mais ne peut pas le modifier.
    await pageAutre.goto(`/enchainements/${lien}`)
    await expect(pageAutre.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(pageAutre.getByRole('link', { name: 'Modifier' })).toHaveCount(0)

    const reponse = await pageAutre.goto(`/enchainements/${lien}/modifier`)
    expect(reponse?.status()).toBe(404)

    await contexte.close()
  })

  test('un visiteur anonyme est emmené vers la connexion', async ({ browser }) => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    const contexte = await browser.newContext()
    const anonyme = await contexte.newPage()

    await anonyme.goto(`/enchainements/${lien}/modifier`)

    // La porte emporte le chemin d'origine, pour y revenir apres connexion
    // (Story 3.5).
    await expect(anonyme).toHaveURL(/\/connexion\?suite=/)
    await expect(anonyme).toHaveURL(new RegExp(encodeURIComponent(`/${lien}/modifier`)))

    await contexte.close()
  })

  // EN DERNIER, forcement : ce test detruit l'enchainement sur lequel tous les
  // autres travaillent.
  test('l’auteur supprime son enchaînement, en deux temps', async () => {
    test.skip(lien === null, 'Aucune passe sur cette cible.')

    await page.goto(`/enchainements/${lien}/modifier`)

    const demander = page.getByRole('button', { name: "Supprimer l'enchaînement" })
    await demander.click()

    // ON DEMANDE AVANT DE FAIRE. Le premier clic n'efface rien : c'est le seul
    // geste irreversible de l'application, il ne part pas d'un clic isole.
    const confirmer = page.getByRole('button', { name: 'Oui, supprimer' })
    await expect(confirmer).toBeVisible()

    // Et l'on peut se raviser sans consequence.
    await page.getByRole('button', { name: 'Non, annuler' }).click()
    await expect(confirmer).toHaveCount(0)
    await expect(demander).toBeVisible()

    await demander.click()
    await page.getByRole('button', { name: 'Oui, supprimer' }).click()

    // Vers la LISTE : la fiche qu'on vient de quitter n'existe plus.
    await expect(page).toHaveURL(/\/enchainements$/)

    // Et elle n'existe vraiment plus, y compris en tapant l'adresse.
    const reponse = await page.goto(`/enchainements/${lien}`)
    expect(reponse?.status()).toBe(404)

    lien = null
  })
})
