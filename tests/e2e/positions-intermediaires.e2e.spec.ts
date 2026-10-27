import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { DANSE_V1 } from '../../src/collections/Danse.js'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { scenePardefaut, TAILLES } from '../../src/schema-position.js'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * Dessiner les positions intermediaires d'une passe (Story 8.2).
 *
 * CE QUI NE SE VERIFIE QU'ICI : le parcours complet entre trois ecrans — la
 * frise de la page « Modifier », l'atelier ouvert sur un instant, puis le
 * retour a la frise avec la vignette posee, et son retrait. Puis, sur la fiche
 * publique (Story 8.3), la bascule « Simple | Rythme » et la frise, sur grand
 * ecran comme sur telephone.
 *
 * Le scenario cree SES positions et SA passe, et les supprime ensuite : il ne
 * touche jamais au catalogue de la cible.
 */

const MARQUE = `Test intermédiaires — ${Date.now()}`

const admin: Identifiants = {
  email: 'positions-intermediaires@passe-finder.test',
  password: 'test-positions-intermediaires',
  admin: true,
}

let passeId: number
/** Le cas temoin « Trou de souris » : des positions sur « 3 et », « 4 » et « 5 et ». */
let temoinId: number

test.describe('Positions intermédiaires', () => {
  test.beforeAll(async () => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'danses',
      where: { nom: { equals: DANSE_V1 } },
      limit: 1,
    })
    const danse = docs[0].id

    const [debut, fin] = await Promise.all(
      ['départ', 'arrivée'].map((role) =>
        payload.create({ collection: 'positions', data: { nom: `${MARQUE} ${role}`, danse } }),
      ),
    )

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: MARQUE, positionDebut: debut.id, positionFin: fin.id },
    })
    passeId = passe.id

    // En 6 temps, « 3 et » = 5, « 4 » = 6, « 5 et » = 9. Ecrites dans le
    // desordre : la fiche doit suivre le rythme, pas le tableau. Celle de
    // « 4 » est en petite taille, pour reconnaitre ou l'atelier la recopie.
    const temoin = await payload.create({
      collection: 'passes',
      data: {
        nom: `${MARQUE} témoin`,
        positionDebut: debut.id,
        positionFin: fin.id,
        positionsIntermediaires: [9, 5, 6].map((instant) => ({
          instant,
          schema: instant === 6 ? { ...scenePardefaut(), taille: TAILLES.petit } : scenePardefaut(),
        })),
      },
    })
    temoinId = temoin.id
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'passes', id: passeId }).catch(() => {})
    await payload.delete({ collection: 'passes', id: temoinId }).catch(() => {})
    await payload
      .delete({ collection: 'positions', where: { nom: { contains: MARQUE } } })
      .catch(() => {})
    await cleanupTestUser(admin)
  })

  test('pose une position sur « 3 et », puis la retire', async ({ browser }) => {
    await seedTestUser(admin)
    const contexte = await browser.newContext()
    const page = await contexte.newPage()

    await login({ page, user: admin })
    await page.goto(`/passes/${passeId}/modifier`)

    // 6 temps par defaut : douze instants, tous libres.
    await expect(page.getByRole('link', { name: /^Ajouter une position sur/ })).toHaveCount(12)
    await page.getByRole('link', { name: 'Ajouter une position sur « 3 et »' }).click()

    await expect(page).toHaveURL(new RegExp(`/passes/${passeId}/intermediaires/5$`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText('instant « 3 et »')
    await expect(page.getByLabel('Nom de la position')).toHaveCount(0)

    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await expect(page).toHaveURL(new RegExp(`/passes/${passeId}/modifier$`))
    await expect(page.getByRole('img', { name: 'Position à l’instant 3 et' })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Ajouter une position sur/ })).toHaveCount(11)

    const payload = await getPayload({ config })
    const posee = await payload.findByID({ collection: 'passes', id: passeId, depth: 0 })
    expect(posee.positionsIntermediaires?.map((ligne) => ligne.instant)).toEqual([5])

    page.once('dialog', (dialogue) => dialogue.accept())
    await page.getByRole('button', { name: 'Retirer la position posée sur « 3 et »' }).click()

    await expect(page.getByRole('img', { name: 'Position à l’instant 3 et' })).toHaveCount(0)
    const retiree = await payload.findByID({ collection: 'passes', id: passeId, depth: 0 })
    expect(retiree.positionsIntermediaires ?? []).toEqual([])
    await contexte.close()
  })

  test('une nouvelle position s’ouvre sur une copie de celle d’avant', async ({ browser }) => {
    await seedTestUser(admin)
    const contexte = await browser.newContext()
    const page = await contexte.newPage()
    await login({ page, user: admin })

    // « 4 . » (7) suit « 4 » (6), posee en petite taille : l'atelier la recopie.
    await page.goto(`/passes/${temoinId}/intermediaires/7`)
    await expect(page.getByRole('button', { name: 'petit' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // « 2 » (2) ne suit aucune position, et le depart n'a pas de schema :
    // l'atelier part du couple par defaut.
    await page.goto(`/passes/${temoinId}/intermediaires/2`)
    await expect(page.getByRole('button', { name: 'moyen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await contexte.close()
  })

  test('fiche sans position intermédiaire : aucune bascule', async ({ page }) => {
    await page.goto(`/passes/${passeId}`)
    await expect(page.getByRole('img', { name: `${MARQUE} départ` })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rythme' })).toHaveCount(0)
  })

  test('fiche témoin : « Simple » par défaut, puis la frise dans l’ordre du rythme', async ({
    page,
  }) => {
    await page.goto(`/passes/${temoinId}`)

    const simple = page.getByRole('button', { name: 'Simple' })
    await expect(simple).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('img', { name: /^Position à l’instant/ })).toHaveCount(0)

    await page.getByRole('button', { name: 'Rythme' }).click()
    const vignettes = page.getByRole('img', { name: /^Position à l’instant/ })
    await expect(vignettes).toHaveCount(3)
    await expect(vignettes.nth(0)).toHaveAccessibleName('Position à l’instant 3 et')
    await expect(vignettes.nth(1)).toHaveAccessibleName('Position à l’instant 4')
    await expect(vignettes.nth(2)).toHaveAccessibleName('Position à l’instant 5 et')

    // Sur grand ecran, les douze instants gardent leur place, vides compris.
    await expect(page.locator('.frise-rythme__instant')).toHaveCount(12)
    await expect(page.locator('.frise-rythme__instant').first()).toBeVisible()

    // Le depart reste cliquable vers sa fiche.
    await expect(page.getByRole('link', { name: new RegExp(`${MARQUE} départ`) })).toBeVisible()

    await simple.click()
    await expect(vignettes).toHaveCount(0)
  })

  test('fiche témoin sur téléphone : seulement les instants occupés', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/passes/${temoinId}`)
    await page.getByRole('button', { name: 'Rythme' }).click()

    await expect(page.locator('.frise-rythme__comptage')).toBeVisible()
    await expect(page.locator('.frise-rythme__instant--occupe')).toHaveCount(3)
    // Le premier instant, « 1 », est vide : il disparait de la colonne.
    await expect(page.locator('.frise-rythme__instant').first()).toBeHidden()
    await expect(page.locator('.frise-rythme__nom').first()).toHaveText('3 et')
  })
})
