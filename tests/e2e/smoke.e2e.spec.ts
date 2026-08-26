import { expect, test } from '@playwright/test'

/**
 * Test de fumee du pipeline (Story 1.3).
 *
 * Concu pour tourner contre N'IMPORTE QUELLE cible (via baseURL), en particulier
 * contre le CONTENEUR de production construit par la CI. C'est ce qui lui donne
 * sa valeur : en production le schema n'existe que si les migrations ont ete
 * appliquees, donc une migration oubliee fait echouer ce test (AC #3) au lieu de
 * passer inapercue jusqu'en prod.
 *
 * Toutes les sondes sont IDEMPOTENTES : elles peuvent etre rejouees sur le meme
 * conteneur (les tests sont reessayes jusqu'a 2 fois en CI).
 */
test.describe('Fumee', () => {
  test("la page d'accueil se charge", async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/Passe Finder/)
    await expect(page.locator('h1').first()).toHaveText('Passe Finder')
  })

  test('le back-office repond', async ({ request }) => {
    const response = await request.get('/admin')

    expect(response.status()).toBe(200)
  })

  test('la base repond (garde-fou des migrations)', async ({ request }) => {
    // Sonde de lecture avec des identifiants volontairement invalides :
    //   - schema present  -> 401 (Payload a bien interroge la table users)
    //   - schema absent   -> 500 (SQLITE_ERROR: no such table: users)
    // Verifie par contre-epreuve sur un conteneur demarre sans migrations.
    const response = await request.post('/api/users/login', {
      data: { email: 'sonde@passe-finder.test', password: 'MotDePasseInvalide1!' },
      failOnStatusCode: false,
    })

    expect(
      response.status(),
      "La base n'a pas repondu comme attendu. Une reponse 500 signifie le plus " +
        'souvent qu une collection a evolue sans migration correspondante : ' +
        'lancer `npm run payload -- migrate:create <nom>` et commiter le fichier genere.',
    ).toBe(401)
  })
})
