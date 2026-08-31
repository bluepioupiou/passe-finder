import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * Parcours de compte (Stories 3.1 / 3.2) : s'inscrire, etre reconnu par la
 * barre de navigation, se deconnecter, se reconnecter.
 *
 * C'est le SEUL test qui exerce l'inscription de bout en bout, donc le seul qui
 * prouve que la porte ouverte a un anonyme donne bien un compte ordinaire et
 * une session utilisable. Les regles d'acces elles-memes sont verifiees en
 * integration (tests/int/proprietaire.int.spec.ts) : ici on verifie le chemin
 * qu'une personne emprunte reellement.
 *
 * Compte horodate : deux executations successives ne doivent pas se heurter sur
 * l'unicite de l'email, et le menage de fin ne doit jamais emporter le compte
 * d'un autre fichier de test.
 */
const compte = {
  email: `test-compte-${Date.now()}@example.test`,
  motDePasse: 'motdepasse-de-test',
}

test.describe('Compte', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const contexte = await browser.newContext()
    page = await contexte.newPage()
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'users',
      where: { email: { equals: compte.email } },
    })
  })

  test('un visiteur anonyme se voit proposer la connexion', async () => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()
    // Le menu de compte n'existe pas tant qu'il n'y a pas de compte.
    await expect(page.getByRole('button', { name: 'Mon compte' })).toHaveCount(0)
  })

  test("l'inscription crée un compte et ouvre la session", async () => {
    await page.goto('/inscription')

    await page.fill('#email', compte.email)
    await page.fill('#motDePasse', compte.motDePasse)
    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    // La barre bascule : c'est elle qui porte la preuve visible de la session.
    await expect(page.getByRole('button', { name: 'Mon compte' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Se connecter' })).toHaveCount(0)

    // Et le « + » des creations apparait, puisqu'il est reserve aux connectes.
    await expect(page.getByRole('button', { name: 'Créer' })).toBeVisible()
  })

  test('le menu de compte nomme la session et permet de se déconnecter', async () => {
    await page.getByRole('button', { name: 'Mon compte' }).click()
    // Portee au PANNEAU : la page d'accueil affiche elle aussi l'email
    // (« Bienvenue, … », heritage du scaffold), un selecteur global en
    // trouverait plusieurs.
    await expect(page.getByRole('menu').getByText(compte.email)).toBeVisible()

    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()

    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mon compte' })).toHaveCount(0)
  })

  test('la connexion rouvre la session et respecte la destination demandée', async () => {
    // `suite` : on revient a ce qu'on voulait faire, pas sur l'accueil.
    await page.goto('/connexion?suite=%2Fenchainements')

    await page.fill('#email', compte.email)
    await page.fill('#motDePasse', compte.motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()

    await expect(page).toHaveURL(/\/enchainements$/)
    await expect(page.getByRole('button', { name: 'Mon compte' })).toBeVisible()
  })

  test("un mot de passe faux ne dit pas si le compte existe", async () => {
    const contexte = await page.context().browser()!.newContext()
    const anonyme = await contexte.newPage()

    await anonyme.goto('/connexion')
    await anonyme.fill('#email', compte.email)
    await anonyme.fill('#motDePasse', 'ce-n-est-pas-le-bon')
    await anonyme.getByRole('button', { name: 'Se connecter' }).click()

    // Le meme message que pour une adresse inconnue : rien ne permet de savoir
    // quelles adresses ont un compte ici.
    // Portee au FORMULAIRE : l'annonceur de route de Next porte lui aussi
    // role="alert".
    const erreur = anonyme.locator('.formulaire-compte').getByRole('alert')
    await expect(erreur).toHaveText('Adresse e-mail ou mot de passe incorrect.')
    await expect(anonyme.getByRole('button', { name: 'Mon compte' })).toHaveCount(0)

    await contexte.close()
  })

  test("la porte emmène un anonyme vers la connexion, puis le ramène", async () => {
    // Story 3.5 : le contrat complet, sur une route protegee. On repart d un
    // contexte neuf pour etre reellement anonyme.
    const contexte = await page.context().browser()!.newContext()
    const visiteur = await contexte.newPage()

    await visiteur.goto('/enchainements/nouveau')
    await expect(visiteur).toHaveURL(/\/connexion\?suite=%2Fenchainements%2Fnouveau$/)

    // La page dit POURQUOI elle demande un compte, sinon elle se lit comme un refus.
    await expect(visiteur.getByText('Cette page demande un compte.')).toBeVisible()

    await visiteur.fill('#email', compte.email)
    await visiteur.fill('#motDePasse', compte.motDePasse)
    await visiteur.getByRole('button', { name: 'Se connecter' }).click()

    // Ramene a ce qu il voulait faire, et le compositeur est bien la.
    await expect(visiteur).toHaveURL(/\/enchainements\/nouveau$/)
    await expect(visiteur.getByLabel("D'où part l'enchaînement ?")).toBeVisible()

    await contexte.close()
  })

  test("un compte déjà connecté n'est pas renvoyé vers la connexion", async () => {
    await page.goto('/enchainements/nouveau')

    await expect(page).toHaveURL(/\/enchainements\/nouveau$/)
    await expect(page.getByLabel("D'où part l'enchaînement ?")).toBeVisible()
  })

  test("le back-office refuse un compte ordinaire", async () => {
    // Decision du 2026-08-31 : /admin est reserve aux administrateurs. Un eleve
    // connecte ne doit pas y entrer, meme en connaissant l'URL.
    await page.goto('/admin')

    await expect(page.locator('body')).not.toContainText('Tableau de bord')
    await expect(page.getByRole('link', { name: 'Enchaînements' }).first()).toHaveCount(0)
  })
})
