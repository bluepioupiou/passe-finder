import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { DANSE_V1 } from '../../src/collections/Danse.js'
import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, type Identifiants } from '../helpers/seedUser'

/**
 * Modifier une passe depuis sa fiche, sans passer par /admin.
 *
 * CE QUI NE SE VERIFIE QU'ICI : l'apercu tourne l'arrivee DES QU'ON CHANGE le
 * pivot, avant tout enregistrement — c'est tout l'interet de l'ecran.
 *
 * Le scenario cree SES positions et SA passe, et les supprime ensuite : il ne
 * touche jamais au catalogue de la cible.
 */

const MARQUE = `Test modifier passe — ${Date.now()}`

const admin: Identifiants = {
  email: 'modifier-passe@passe-finder.test',
  password: 'test-modifier-passe',
  admin: true,
}

const eleve: Identifiants = {
  email: 'modifier-passe-eleve@passe-finder.test',
  password: 'test-modifier-passe-eleve',
}

let passeId: number

test.describe('Modifier une passe', () => {
  test.beforeAll(async () => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'danses',
      where: { nom: { equals: DANSE_V1 } },
      limit: 1,
    })
    const danse = docs[0].id

    // Deux lignes de danse connues : seul le pivot decide de l'angle.
    const [debut, fin] = await Promise.all(
      ['départ', 'arrivée'].map((role) =>
        payload.create({
          collection: 'positions',
          data: { nom: `${MARQUE} ${role}`, danse, ligneDeDanse: '0' },
        }),
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
    await cleanupTestUser(eleve)
  })

  test("n'est pas proposé à un compte non administrateur", async ({ browser }) => {
    await seedTestUser(eleve)
    const contexte = await browser.newContext()
    const page = await contexte.newPage()

    await login({ page, user: eleve })
    await page.goto(`/passes/${passeId}`)
    await expect(page.getByRole('link', { name: 'Modifier la passe' })).toHaveCount(0)

    await page.goto(`/passes/${passeId}/modifier`)
    await expect(page).toHaveURL(new RegExp(`/passes/${passeId}$`))
    await contexte.close()
  })

  test("tourne l'arrivée avec le pivot, puis enregistre", async ({ browser }) => {
    await seedTestUser(admin)
    const contexte = await browser.newContext()
    const page = await contexte.newPage()

    await login({ page, user: admin })
    await page.goto(`/passes/${passeId}`)
    await page.getByRole('link', { name: 'Modifier la passe' }).click()
    await expect(page).toHaveURL(new RegExp(`/passes/${passeId}/modifier$`))

    const arrivee = page.getByRole('img', { name: `${MARQUE} arrivée` })
    await expect(page.getByText('Pivot non renseigné')).toBeVisible()
    await expect(arrivee).not.toHaveAttribute('style', /rotate/)

    await page.getByLabel('Pivot du couple').selectOption('90')
    await expect(arrivee).toHaveAttribute('style', /rotate\(90deg\)/)
    await expect(page.getByText('Pivot non renseigné')).toHaveCount(0)

    await page.getByLabel('Déroulé').fill('1-2 : on tourne.')
    await page.getByRole('button', { name: 'Enregistrer' }).click()

    await expect(page).toHaveURL(new RegExp(`/passes/${passeId}$`))
    await expect(page.getByText('1-2 : on tourne.')).toBeVisible()
    await expect(page.getByRole('img', { name: `${MARQUE} arrivée` })).toHaveAttribute(
      'style',
      /rotate\(90deg\)/,
    )

    const payload = await getPayload({ config })
    const passe = await payload.findByID({ collection: 'passes', id: passeId, depth: 0 })
    expect(passe.pivot).toBe('90')
    await contexte.close()
  })

  test('propose 6 temps pour une durée vide, puis enregistre 10 temps', async ({ browser }) => {
    await seedTestUser(admin)
    const contexte = await browser.newContext()
    const page = await contexte.newPage()

    await login({ page, user: admin })
    await page.goto(`/passes/${passeId}/modifier`)

    // Epic 8 : une duree non renseignee VAUT 6 temps, et s'affiche ainsi.
    const duree = page.getByLabel('Durée')
    await expect(duree).toHaveValue('6')

    await duree.selectOption('10')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page).toHaveURL(new RegExp(`/passes/${passeId}$`))

    const payload = await getPayload({ config })
    const passe = await payload.findByID({ collection: 'passes', id: passeId, depth: 0 })
    expect(passe.duree).toBe('10')
    await contexte.close()
  })
})
