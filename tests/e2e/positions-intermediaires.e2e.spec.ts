import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { DANSE_V1 } from '../../src/collections/Danse.js'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * Dessiner les positions intermediaires d'une passe (Story 8.2).
 *
 * CE QUI NE SE VERIFIE QU'ICI : le parcours complet entre trois ecrans — la
 * frise de la page « Modifier », l'atelier ouvert sur un instant, puis le
 * retour a la frise avec la vignette posee, et son retrait.
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
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'passes', id: passeId }).catch(() => {})
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
})
