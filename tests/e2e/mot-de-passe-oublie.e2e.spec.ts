import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * Recuperation d'acces (Story 3.3, FR-28) : le parcours qu'une personne suit
 * vraiment, du lien « Mot de passe oublie ? » jusqu'a la session rouverte.
 *
 * AUCUN E-MAIL N'EST ENVOYE ICI, et c'est ce qui rend le test possible en CI :
 * le jeton est demande par l'API locale avec `disableEmail`, exactement celui
 * que le message aurait porte, puis on ouvre l'adresse a la main. Ce qui est
 * verifie, c'est donc bien la PAGE et l'ACTION, la moitie qui nous appartient.
 *
 * Compte horodate : deux executions successives ne doivent pas se heurter sur
 * l'unicite de l'email.
 */
const compte = {
  email: `test-oubli-${Date.now()}@example.test`,
  ancien: 'ancien-mot-de-passe',
  nouveau: 'nouveau-mot-de-passe',
}

/** Demande un jeton comme le ferait le formulaire, sans passer par l'envoi. */
async function jetonDeReinitialisation(): Promise<string> {
  const payload = await getPayload({ config })

  return await payload.forgotPassword({
    collection: 'users',
    data: { email: compte.email },
    disableEmail: true,
  })
}

test.describe('Mot de passe oublié', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const payload = await getPayload({ config })

    await payload.delete({ collection: 'users', where: { email: { equals: compte.email } } })
    await payload.create({
      collection: 'users',
      data: { email: compte.email, password: compte.ancien },
    })

    const contexte = await browser.newContext()
    page = await contexte.newPage()
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'users', where: { email: { equals: compte.email } } })
  })

  test('la connexion mène à la demande de réinitialisation', async () => {
    await page.goto('/connexion')

    // SOUS LE CHAMP MOT DE PASSE : c'est la, au moment ou l'on bute, que la
    // question se pose.
    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click()

    await expect(page).toHaveURL(/\/mot-de-passe-oublie$/)
    await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible()
  })

  test("l'indisponibilité de l'envoi est annoncée avant le formulaire", async () => {
    // Ce test decrit le serveur SANS configuration d'envoi — l'etat de la CI et
    // du developpement local. Sur une machine ou les variables SMTP existent,
    // il n'a pas d'objet.
    test.skip(Boolean(process.env.SMTP_HOTE), 'Envoi configuré sur cette machine.')

    await page.goto('/mot-de-passe-oublie')

    await expect(page.locator('.formulaire-compte__erreur')).toContainText("L'envoi d'e-mails n'est pas configuré")
    // Le champ est hors service : on ne laisse pas remplir un formulaire dont
    // on sait qu'il ne mènera nulle part.
    await expect(page.locator('#email')).toBeDisabled()
  })

  test('un lien sans jeton invite à en redemander un', async () => {
    await page.goto('/reinitialiser')

    await expect(page.locator('.formulaire-compte__erreur')).toContainText('Ce lien est incomplet')
    await expect(page.getByRole('link', { name: 'Demander un nouveau lien' })).toBeVisible()
  })

  test('un jeton inventé est refusé, sans piste sur ce qui cloche', async () => {
    await page.goto('/reinitialiser?jeton=jeton-invente-de-toutes-pieces')

    await page.fill('#motDePasse', 'peu-importe-vraiment')
    await page.getByRole('button', { name: 'Enregistrer et me connecter' }).click()

    await expect(page.locator('.formulaire-compte__erreur')).toContainText("Ce lien n'est plus valable")
    // Toujours une porte de sortie : on ne laisse personne dans un cul-de-sac.
    await expect(page.getByRole('link', { name: 'Refaire une demande' })).toBeVisible()
  })

  test('un mot de passe trop court est refusé avant tout changement', async () => {
    const jeton = await jetonDeReinitialisation()
    await page.goto(`/reinitialiser?jeton=${jeton}`)

    await page.fill('#motDePasse', 'court')
    await page.getByRole('button', { name: 'Enregistrer et me connecter' }).click()

    await expect(page.locator('.formulaire-compte__erreur')).toContainText('au moins 8 caractères')

    // LE JETON N'A PAS ETE CONSOMME : le refus vient de nous, avant Payload.
    // Sans cette verification, un mot de passe trop court obligerait a refaire
    // toute la demande.
    await page.fill('#motDePasse', compte.nouveau)
    await page.getByRole('button', { name: 'Enregistrer et me connecter' }).click()
    await expect(page.getByRole('button', { name: 'Mon compte' })).toBeVisible()
  })

  test('le lien reçu ouvre la session avec le nouveau mot de passe', async () => {
    // La session precedente est encore ouverte : on repart d'un etat anonyme,
    // sinon la barre montrerait « Mon compte » sans que ce test y soit pour rien.
    await page.getByRole('button', { name: 'Mon compte' }).click()
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
    await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible()

    // Le mot de passe a REELLEMENT change au test precedent : c'est le nouveau
    // qui ouvre la session, et lui seul.
    await page.goto('/connexion')
    await page.fill('#email', compte.email)
    await page.fill('#motDePasse', compte.ancien)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.formulaire-compte__erreur')).toContainText('incorrect')

    await page.fill('#motDePasse', compte.nouveau)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('button', { name: 'Mon compte' })).toBeVisible()
  })
})
