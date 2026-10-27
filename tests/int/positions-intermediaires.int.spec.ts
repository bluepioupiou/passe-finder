import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import { positionsIntermediairesDe } from '@/positions-intermediaires'
import { scenePardefaut } from '@/schema-position'

/**
 * Positions intermediaires d'une passe (Story 8.2) — le hook de la collection.
 *
 * Ce qui se teste ici protege le DESSIN d'Alain : rien ne doit disparaitre en
 * silence. Le hook est la derniere garde, que l'ecriture vienne de la page
 * « Modifier », de l'admin ou d'un script.
 *
 * Le jeu d'essai est autonome (positions, passe et comptes crees puis
 * detruits) : aucune donnee reelle n'est mise en jeu.
 */
describe('Positions intermédiaires', () => {
  let payload: Payload
  let eleve: User
  let idA: number
  let idB: number
  let idPasse: number

  const position = (instant: number) => ({ instant, schema: scenePardefaut() })

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    const danse = danses.docs[0].id as number

    const a = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — intermédiaires départ', danse },
    })
    const b = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — intermédiaires arrivée', danse },
    })
    idA = a.id as number
    idB = b.id as number

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: 'Passe de test — intermédiaires', positionDebut: idA, positionFin: idB },
    })
    idPasse = passe.id as number

    eleve = await payload.create({
      collection: 'users',
      data: {
        email: 'test-intermediaires-eleve@example.test',
        password: 'test-intermediaires-eleve',
      },
    })
  })

  afterAll(async () => {
    if (idPasse) await payload.delete({ collection: 'passes', id: idPasse })
    if (idA) await payload.delete({ collection: 'positions', id: idA })
    if (idB) await payload.delete({ collection: 'positions', id: idB })
    if (eleve) await payload.delete({ collection: 'users', id: eleve.id })
  })

  it('enregistre des positions et les relit dans l’ordre du rythme', async () => {
    const passe = await payload.update({
      collection: 'passes',
      id: idPasse,
      data: { positionsIntermediaires: [position(6), position(5)] },
    })

    const relues = positionsIntermediairesDe(passe.positionsIntermediaires)
    expect(relues.map((ligne) => ligne.instant)).toEqual([5, 6])
  })

  it('refuse deux positions sur le même instant', async () => {
    await expect(
      payload.update({
        collection: 'passes',
        id: idPasse,
        data: { positionsIntermediaires: [position(5), position(5)] },
      }),
    ).rejects.toThrow(/une seule par instant/)
  })

  it('refuse un instant hors de la durée', async () => {
    await expect(
      payload.update({
        collection: 'passes',
        id: idPasse,
        data: { positionsIntermediaires: [position(13)] },
      }),
    ).rejects.toThrow(/retire d’abord/)
  })

  it('refuse de réduire la durée sous une position posée, sans rien supprimer', async () => {
    await payload.update({
      collection: 'passes',
      id: idPasse,
      data: { duree: '10', positionsIntermediaires: [position(5), position(13)] },
    })

    // La duree seule : le hook doit relire les positions DEJA enregistrees.
    await expect(
      payload.update({ collection: 'passes', id: idPasse, data: { duree: '6' } }),
    ).rejects.toThrow(/« 7 et »/)

    const passe = await payload.findByID({ collection: 'passes', id: idPasse, depth: 0 })
    expect(passe.duree).toBe('10')
    expect(positionsIntermediairesDe(passe.positionsIntermediaires)).toHaveLength(2)
  })

  it('refuse l’écriture à un compte qui n’est pas admin', async () => {
    await expect(
      payload.update({
        collection: 'passes',
        id: idPasse,
        overrideAccess: false,
        user: eleve,
        data: { positionsIntermediaires: [] },
      }),
    ).rejects.toThrow()
  })

  it('ne charge pas les positions dans les listes de passes', async () => {
    const liste = await payload.find({
      collection: 'passes',
      where: { id: { equals: idPasse } },
      depth: 0,
      select: { positionsIntermediaires: false },
    })
    expect(liste.docs[0]).not.toHaveProperty('positionsIntermediaires')
  })
})
