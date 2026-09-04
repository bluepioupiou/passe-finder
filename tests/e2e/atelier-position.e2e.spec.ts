import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * L'atelier de schema de position, joue comme Alain le jouera.
 *
 * CE QUI NE SE VERIFIE QU'ICI : le GLISSER. jsdom ne met rien en page —
 * `getBoundingClientRect()` y renvoie des zeros et `setPointerCapture` n'existe
 * pas — donc le test unitaire ne peut eprouver que le clavier et les boutons.
 * Playwright emet de vrais evenements de pointeur sur une page reellement mise
 * en page : c'est le seul niveau ou le geste principal de l'atelier est prouve.
 *
 * Le scenario verifie aussi la chaine complete de bout en bout : le schema
 * monte, le PNG nait sur le serveur, le media est cree, la position le porte.
 * Aucune doublure ne pourrait le dire.
 *
 * Comme les autres fichiers de la suite, il a son PROPRE compte : deux fichiers
 * qui partagent des identifiants se les suppriment mutuellement.
 */

const NOM = `Test atelier — ${Date.now()}`

const atelierAdmin: Identifiants = {
  email: 'atelier@passe-finder.test',
  password: 'test-atelier',
  // L'atelier est reserve aux administrateurs en v1, comme le reste du
  // catalogue de reference (`Position.access` et `Media.access` = adminSeul).
  admin: true,
}

const atelierEleve: Identifiants = {
  email: 'atelier-eleve@passe-finder.test',
  password: 'test-atelier-eleve',
}

test.describe('Atelier de schéma de position', () => {
  test.afterAll(async () => {
    // On ne laisse rien derriere soi dans la base de la cible.
    const payload = await getPayload({ config })

    const positions = await payload.find({
      collection: 'positions',
      where: { nom: { contains: 'Test atelier' } },
      limit: 20,
      depth: 1,
    })

    for (const position of positions.docs) {
      const image = position.image
      await payload.delete({ collection: 'positions', id: position.id }).catch(() => {})
      if (image && typeof image === 'object') {
        await payload.delete({ collection: 'media', id: image.id }).catch(() => {})
      }
    }

    await cleanupTestUser(atelierAdmin)
    await cleanupTestUser(atelierEleve)
  })

  test('renvoie un compte non administrateur vers la liste', async ({ browser }) => {
    // La page ne fait que soigner le parcours — mais elle doit le soigner.
    await seedTestUser(atelierEleve)
    const contexte = await browser.newContext()
    const page = await contexte.newPage()

    await login({ page, user: atelierEleve })
    await page.goto('/positions/nouvelle')

    await expect(page).toHaveURL(/\/positions$/)
    await contexte.close()
  })

  test('compose une position, la glisse, et l’enregistre avec son image', async ({ browser }) => {
    await seedTestUser(atelierAdmin)
    const contexte = await browser.newContext()
    const page: Page = await contexte.newPage()
    await login({ page, user: atelierAdmin })

    await page.goto('/positions/nouvelle')
    await expect(page.getByRole('heading', { name: 'Composer une position' })).toBeVisible()

    // ── La scene de depart : un couple complet, quatre bras compris ────────
    const pile = page.locator('.atelier__pile > li')
    await expect(pile).toHaveCount(6)
    await expect(pile.filter({ hasText: 'Bras gauche du cavalier' })).toHaveCount(1)
    await expect(pile.filter({ hasText: 'Bras droit de la cavalière' })).toHaveCount(1)

    // ── Tourner une tete : ses bras doivent suivre ─────────────────────────
    await pile.filter({ hasText: 'Cavalier ·' }).getByRole('button').first().click()
    await page.getByRole('button', { name: 'Tourner vers la droite' }).click()
    await expect(page.locator('.atelier__annonce')).toContainText('30 degrés')

    // Les bras du cavalier ont pris les memes 30 degres : leur libelle le dit.
    await expect(pile.filter({ hasText: 'Bras gauche du cavalier · 300°' })).toHaveCount(1)
    await expect(pile.filter({ hasText: 'Bras droit du cavalier · 120°' })).toHaveCount(1)

    // ── Un bras ajoute se rattache a la tete choisie ───────────────────────
    await page.getByRole('button', { name: 'Bras droit', exact: true }).click()
    await expect(pile).toHaveCount(7)

    // ── Reordonner : le geste « qui passe par-dessus qui » ─────────────────
    await page.locator('.atelier__outils button[title="Monter d’un rang"]').last().click()
    await expect(page.locator('.atelier__annonce')).toContainText('monté d’un rang')

    // ── LE GLISSER, la raison d'etre de ce fichier ────────────────────────
    const canevas = page.locator('.atelier__canevas')
    const cadre = (await canevas.boundingBox())!

    // La premiere tete est posee a -0,17 x la toile : on vise son centre.
    const departX = cadre.x + cadre.width * (0.5 - 0.17)
    const departY = cadre.y + cadre.height * 0.5

    await page.mouse.move(departX, departY)
    await page.mouse.down()
    await page.mouse.move(departX, departY - cadre.height * 0.2, { steps: 12 })
    await page.mouse.up()

    // La piece a bouge : l'annonce porte la position atteinte, et elle est
    // negative en y (vers le haut).
    await expect(page.locator('.atelier__annonce')).toContainText('posé, x')
    const annonce = await page.locator('.atelier__annonce').textContent()
    expect(annonce).toMatch(/y -\d+/)

    // ── Enregistrer ────────────────────────────────────────────────────────
    await page.getByLabel('Nom de la position').fill(NOM)
    await page.getByRole('button', { name: 'Créer la position' }).click()

    await page.waitForURL(/\/positions\/\d+$/)
    await expect(page.getByRole('heading', { name: NOM })).toBeVisible()

    // L'image affichee est bien celle qui vient d'etre produite, et non le
    // placeholder `no_position`.
    const vignette = page.locator('img.image-position').first()
    await expect(vignette).toHaveAttribute('src', /\/api\/media\/file\//)
    const premiereImage = await vignette.getAttribute('src')

    // ── Rouvrir : le schema doit revenir ENTIER ────────────────────────────
    // C'est ce que protege le choix d'`admin.hidden` plutot que `hidden: true`
    // sur `schemaCompose` : un champ absent des reponses ouvrirait un atelier
    // vierge, et cet enregistrement-ci ecraserait le travail.
    await page.getByRole('link', { name: 'Modifier le schéma' }).click()
    await expect(page.locator('.atelier__pile > li')).toHaveCount(7)

    // Deplacer au clavier, puis reenregistrer.
    await page.locator('.atelier__pile > li').first().getByRole('button').first().click()
    await page.locator('.atelier').press('ArrowUp')
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()

    await page.waitForURL(/\/positions\/\d+$/)
    await page.getByRole('link', { name: 'Modifier le schéma' }).click()
    await expect(page.locator('.atelier__pile > li')).toHaveCount(7)

    // Une nouvelle image a bien ete produite : la position ne pointe plus sur
    // le meme fichier qu'au premier enregistrement.
    await page.goBack()
    await expect(page.locator('img.image-position').first()).not.toHaveAttribute(
      'src',
      premiereImage!,
    )

    await contexte.close()
  })

  test('ouvre une vignette historique avec l’ancienne image en calque', async ({
    browser,
    request,
  }) => {
    // Les positions d'avant l'atelier n'ont pas de schema : elles doivent
    // s'ouvrir vierges, mais avec leur image a decalquer — c'est ce qui rend
    // leur reprise faisable une par une.
    const reponse = await request.get('/api/positions?limit=50&depth=1')
    const { docs } = await reponse.json()
    const historique = (docs ?? []).find(
      (position: { image?: unknown; schemaCompose?: unknown }) =>
        position.image && typeof position.image === 'object' && !position.schemaCompose,
    )
    test.skip(!historique, 'Aucune position historique sur cette cible.')

    await seedTestUser(atelierAdmin)
    const contexte = await browser.newContext()
    const page = await contexte.newPage()
    await login({ page, user: atelierAdmin })

    await page.goto(`/positions/${historique.id}/modifier`)

    // Atelier vierge — le couple par defaut ne doit PAS s'y inviter : il
    // ajouterait des pieces a un schema qu'on vient de relire.
    await expect(page.locator('.atelier__pile > li')).toHaveCount(0)
    // …mais l'ancienne image est bien posee sous le canevas, et son curseur
    // d'opacite est la pour la reculer une fois le decalque commence.
    await expect(page.locator('.atelier__canevas image')).toHaveCount(1)
    await expect(page.getByLabel(/Ancienne image en calque/)).toBeVisible()

    await contexte.close()
  })
})
