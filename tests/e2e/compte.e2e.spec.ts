import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

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

/** Compte administrateur, necessaire tant que la creation est gelee. */
const administrateur: Identifiants = {
  email: 'compte-admin@passe-finder.test',
  password: 'test-compte-admin',
  admin: true,
}

test.describe('Compte', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser(administrateur)

    const contexte = await browser.newContext()
    page = await contexte.newPage()
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'users',
      where: { email: { equals: compte.email } },
    })
    await cleanupTestUser(administrateur)
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

  test('le pseudo se choisit depuis le menu de compte', async () => {
    // Action item `pseudo-et-page-auteur`. Le parcours complet : le reglage
    // s'atteint depuis le menu, il annonce ce qui s'affiche AUJOURD'HUI (le
    // debut de l'adresse), et il confirme sur place sans quitter la page.
    await page.getByRole('button', { name: 'Mon compte' }).click()
    await page.getByRole('menuitem', { name: 'Mon compte' }).click()

    await expect(page).toHaveURL(/\/compte$/)
    await expect(page.getByText(`Connecté avec ${compte.email}`)).toBeVisible()
    // Le defaut est ANNONCE : sans cela, le seul moyen de savoir ce que fait un
    // champ vide serait de l'essayer.
    await expect(page.locator('#aide-pseudo')).toContainText(compte.email.split('@')[0])

    await page.fill('#pseudo', 'Prof de rock')
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await expect(page.locator('.formulaire-compte').getByRole('status')).toHaveText(
      "C'est enregistré.",
    )

    // Enregistre pour de bon, et pas seulement affiche.
    await page.reload()
    await expect(page.locator('#pseudo')).toHaveValue('Prof de rock')
  })

  test('un pseudo qui ressemble à une adresse est refusé', async () => {
    // Tout le module `auteurs` existe pour ne pas publier d'adresse : on ne
    // laisse pas quelqu'un en publier une volontairement.
    await page.goto('/compte')

    await page.fill('#pseudo', 'quelquun@exemple.fr')
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    const erreur = page.locator('.formulaire-compte').getByRole('alert')
    await expect(erreur).toContainText('arobase')
    // La saisie refusee reste a l'ecran : on la corrige, on ne la retape pas.
    await expect(page.locator('#pseudo')).toHaveValue('quelquun@exemple.fr')

    // Et le pseudo enregistre n'a pas bouge.
    await page.reload()
    await expect(page.locator('#pseudo')).toHaveValue('Prof de rock')
  })

  test('effacer le pseudo remet l’affichage sur l’adresse', async () => {
    await page.goto('/compte')

    await page.fill('#pseudo', '')
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await expect(page.locator('.formulaire-compte').getByRole('status')).toBeVisible()

    await page.reload()
    await expect(page.locator('#pseudo')).toHaveValue('')
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
    //
    // On se reconnecte en ADMINISTRATEUR et non avec le compte ordinaire du
    // fichier, a cause du gel temporaire de la creation (2026-08-31) : un
    // compte ordinaire serait renvoye vers la liste et on ne verrait pas que la
    // porte a bien rejoue la destination demandee. A remettre sur le compte
    // ordinaire le jour ou la creation est rouverte.
    const contexte = await page.context().browser()!.newContext()
    const visiteur = await contexte.newPage()

    await visiteur.goto('/enchainements/nouveau')
    await expect(visiteur).toHaveURL(/\/connexion\?suite=%2Fenchainements%2Fnouveau$/)

    // La page dit POURQUOI elle demande un compte, sinon elle se lit comme un refus.
    await expect(visiteur.getByText('Cette page demande un compte.')).toBeVisible()

    await visiteur.fill('#email', administrateur.email)
    await visiteur.fill('#motDePasse', administrateur.password)
    await visiteur.getByRole('button', { name: 'Se connecter' }).click()

    // Ramene a ce qu il voulait faire, et le compositeur est bien la.
    await expect(visiteur).toHaveURL(/\/enchainements\/nouveau$/)
    await expect(visiteur.getByLabel("D\'où part l\'enchaînement ?")).toBeVisible()

    await contexte.close()
  })

  test("un compte ordinaire ne voit pas le « + » et ne peut pas composer", async () => {
    // GEL TEMPORAIRE (2026-08-31) : la creation est reservee aux administrateurs.
    // CE TEST EST A SUPPRIMER le jour ou elle est rouverte — il decrit un etat
    // voulu mais provisoire, pas une regle du produit.
    await page.goto('/enchainements')
    await expect(page.getByRole('button', { name: 'Créer' })).toHaveCount(0)

    // Et la porte ne tient pas qu a l affichage : connaitre l URL ne suffit pas.
    await page.goto('/enchainements/nouveau')
    await expect(page).toHaveURL(/\/enchainements$/)
  })
  test("le back-office refuse un compte ordinaire", async () => {
    // Decision du 2026-08-31 : /admin est reserve aux administrateurs. Un eleve
    // connecte ne doit pas y entrer, meme en connaissant l'URL.
    await page.goto('/admin')

    await expect(page.locator('body')).not.toContainText('Tableau de bord')
    await expect(page.getByRole('link', { name: 'Enchaînements' }).first()).toHaveCount(0)
  })
})
