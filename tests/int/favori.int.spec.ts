import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Collection Favori (Story 5.1, FR-25 / AD-7 / ADD-9).
 *
 * Ce que ces tests protegent : la contrainte de favori est une regle METIER
 * (on ne met en signet que le partage d'autrui), pas une preference d'affichage.
 * Elle doit donc tenir face a l'API, pas seulement face au bouton — d'ou
 * `overrideAccess: false` partout.
 */
describe('Favori', () => {
  let payload: Payload
  let auteur: User
  let eleve: User
  let idDanse: number
  let idDebut: number
  let idFin: number
  let idPasse: number
  let idPartage: number
  let idPartageBis: number
  let idPrive: number

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    auteur = await payload.create({
      collection: 'users',
      data: { email: 'test-favori-auteur@example.test', password: 'test-favori-auteur' },
    })
    eleve = await payload.create({
      collection: 'users',
      data: { email: 'test-favori-eleve@example.test', password: 'test-favori-eleve' },
    })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const debut = await payload.create({
      collection: 'positions',
      data: { nom: 'Favori — départ', danse: idDanse },
    })
    const fin = await payload.create({
      collection: 'positions',
      data: { nom: 'Favori — arrivée', danse: idDanse },
    })
    idDebut = debut.id as number
    idFin = fin.id as number

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: 'Favori — passe', positionDebut: idDebut, positionFin: idFin },
    })
    idPasse = passe.id as number

    const partage = await payload.create({
      collection: 'enchainements',
      data: {
        titre: 'Favori — partagé',
        auteur: auteur.id,
        visibilite: 'partage',
        passes: [{ passe: idPasse }],
      },
    })
    idPartage = partage.id as number

    // Un second partage, pour les tests qui ont besoin d un enchainement
    // encore libre de tout favori (l unicite interdit de reutiliser le premier).
    const partageBis = await payload.create({
      collection: 'enchainements',
      data: {
        titre: 'Favori — partagé (bis)',
        auteur: auteur.id,
        visibilite: 'partage',
        passes: [{ passe: idPasse }],
      },
    })
    idPartageBis = partageBis.id as number

    const prive = await payload.create({
      collection: 'enchainements',
      data: {
        titre: 'Favori — privé',
        auteur: auteur.id,
        visibilite: 'prive',
        passes: [{ passe: idPasse }],
      },
    })
    idPrive = prive.id as number
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'favoris',
      where: { enchainement: { in: [idPartage, idPartageBis, idPrive] } },
    })
    for (const id of [idPartage, idPartageBis, idPrive]) {
      if (id) await payload.delete({ collection: 'enchainements', id })
    }
    if (idPasse) await payload.delete({ collection: 'passes', id: idPasse })
    if (idDebut) await payload.delete({ collection: 'positions', id: idDebut })
    if (idFin) await payload.delete({ collection: 'positions', id: idFin })
    if (auteur) await payload.delete({ collection: 'users', id: auteur.id })
    if (eleve) await payload.delete({ collection: 'users', id: eleve.id })
  })

  it("met en favori un enchaînement partagé d'autrui", async () => {
    const favori = await payload.create({
      collection: 'favoris',
      data: { utilisateur: eleve.id, enchainement: idPartage },
      overrideAccess: false,
      user: eleve,
    })

    expect(favori.id).toBeDefined()
  })

  it('refuse un second favori sur le même enchaînement', async () => {
    // Unicite (ADD-9) : au plus un favori par couple (utilisateur, enchainement).
    await expect(
      payload.create({
        collection: 'favoris',
        data: { utilisateur: eleve.id, enchainement: idPartage },
        overrideAccess: false,
        user: eleve,
      }),
    ).rejects.toThrow()

    const tous = await payload.find({
      collection: 'favoris',
      where: { enchainement: { equals: idPartage } },
      depth: 0,
      overrideAccess: true,
    })
    expect(tous.totalDocs).toBe(1)
  })

  it('refuse un enchaînement privé', async () => {
    await expect(
      payload.create({
        collection: 'favoris',
        data: { utilisateur: eleve.id, enchainement: idPrive },
        overrideAccess: false,
        user: eleve,
      }),
    ).rejects.toThrow()
  })

  it("refuse son propre enchaînement", async () => {
    await expect(
      payload.create({
        collection: 'favoris',
        data: { utilisateur: auteur.id, enchainement: idPartage },
        overrideAccess: false,
        user: auteur,
      }),
    ).rejects.toThrow()
  })

  it("ignore l'utilisateur envoyé et prend celui de la session", async () => {
    // Sinon on deposerait un favori dans la liste de quelqu'un d'autre.
    const favori = await payload.create({
      collection: 'favoris',
      data: { utilisateur: auteur.id, enchainement: idPartageBis },
      overrideAccess: true,
      user: eleve,
      // `overrideAccess: true` court-circuite les droits mais PAS les hooks :
      // c'est bien le hook qui doit reecrire le proprietaire.
    })

    const relu = await payload.findByID({ collection: 'favoris', id: favori.id, depth: 0 })
    expect(relu.utilisateur).toBe(eleve.id)

    await payload.delete({ collection: 'favoris', id: favori.id })
  })

  it('ne montre pas les favoris des autres', async () => {
    const vus = await payload.find({
      collection: 'favoris',
      limit: 100,
      depth: 0,
      overrideAccess: false,
      user: auteur,
    })

    expect(vus.docs.every((favori) => favori.utilisateur === auteur.id)).toBe(true)
  })

  it("laisse retirer son favori, et refuse celui d'un autre", async () => {
    const sien = await payload.find({
      collection: 'favoris',
      where: { enchainement: { equals: idPartage } },
      depth: 0,
      overrideAccess: true,
    })
    const id = sien.docs[0].id

    await expect(
      payload.delete({ collection: 'favoris', id, overrideAccess: false, user: auteur }),
    ).rejects.toThrow()

    await payload.delete({ collection: 'favoris', id, overrideAccess: false, user: eleve })

    const restants = await payload.find({
      collection: 'favoris',
      where: { enchainement: { equals: idPartage } },
      depth: 0,
      overrideAccess: true,
    })
    expect(restants.totalDocs).toBe(0)
  })
})
