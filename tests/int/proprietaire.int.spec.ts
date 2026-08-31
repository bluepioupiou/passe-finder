import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Propriete des enchainements et des comptes (Stories 3.1 / 3.2 / 4.5).
 *
 * CES REGLES SONT LE PREREQUIS DE L'INSCRIPTION PUBLIQUE. Tant que personne ne
 * pouvait se connecter hors /admin, les droits par defaut de Payload — « tout
 * compte connecte peut tout » — etaient sans consequence. Le jour ou n'importe
 * qui peut creer un compte, ils laisseraient le premier inscrit reecrire les
 * enchainements des autres eleves et lire la liste des emails de la classe.
 *
 * Comme pour la gouvernance du catalogue, tout passe par `overrideAccess: false`
 * : sans cela l'API Local court-circuite les droits et le test ne verifie rien.
 */
describe('Propriété', () => {
  let payload: Payload
  let auteur: User
  let autre: User
  let idDanse: number
  let idDebut: number
  let idFin: number
  let idPasse: number
  let idPrive: number
  let idPartage: number

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    auteur = await payload.create({
      collection: 'users',
      data: { email: 'test-proprio-auteur@example.test', password: 'test-proprio-auteur' },
    })
    autre = await payload.create({
      collection: 'users',
      data: { email: 'test-proprio-autre@example.test', password: 'test-proprio-autre' },
    })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const debut = await payload.create({
      collection: 'positions',
      data: { nom: 'Propriété — départ', danse: idDanse },
    })
    const fin = await payload.create({
      collection: 'positions',
      data: { nom: 'Propriété — arrivée', danse: idDanse },
    })
    idDebut = debut.id as number
    idFin = fin.id as number

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: 'Propriété — passe', positionDebut: idDebut, positionFin: idFin },
    })
    idPasse = passe.id as number

    const prive = await payload.create({
      collection: 'enchainements',
      data: {
        titre: 'Propriété — privé',
        auteur: auteur.id,
        visibilite: 'prive',
        passes: [{ passe: idPasse }],
      },
    })
    idPrive = prive.id as number

    const partage = await payload.create({
      collection: 'enchainements',
      data: {
        titre: 'Propriété — partagé',
        auteur: auteur.id,
        visibilite: 'partage',
        passes: [{ passe: idPasse }],
      },
    })
    idPartage = partage.id as number
  })

  afterAll(async () => {
    for (const id of [idPrive, idPartage]) {
      if (id) await payload.delete({ collection: 'enchainements', id })
    }
    if (idPasse) await payload.delete({ collection: 'passes', id: idPasse })
    if (idDebut) await payload.delete({ collection: 'positions', id: idDebut })
    if (idFin) await payload.delete({ collection: 'positions', id: idFin })
    if (auteur) await payload.delete({ collection: 'users', id: auteur.id })
    if (autre) await payload.delete({ collection: 'users', id: autre.id })
  })

  it("cache l'enchaînement privé d'autrui à un compte connecté", async () => {
    // Le point sensible : etre connecte ne donne pas acces aux brouillons des
    // autres. Avant cette regle, `read` renvoyait `true` des qu'une session
    // existait — donc toute la classe voyait tous les prives.
    const vus = await payload.find({
      collection: 'enchainements',
      where: { id: { equals: idPrive } },
      overrideAccess: false,
      user: autre,
      depth: 0,
    })

    expect(vus.totalDocs).toBe(0)
  })

  it('montre à un auteur son propre enchaînement privé', async () => {
    const vus = await payload.find({
      collection: 'enchainements',
      where: { id: { equals: idPrive } },
      overrideAccess: false,
      user: auteur,
      depth: 0,
    })

    expect(vus.totalDocs).toBe(1)
  })

  it("montre l'enchaînement partagé à tout le monde, connecté ou non", async () => {
    const parAutre = await payload.find({
      collection: 'enchainements',
      where: { id: { equals: idPartage } },
      overrideAccess: false,
      user: autre,
      depth: 0,
    })
    const parAnonyme = await payload.find({
      collection: 'enchainements',
      where: { id: { equals: idPartage } },
      overrideAccess: false,
      depth: 0,
    })

    expect(parAutre.totalDocs).toBe(1)
    expect(parAnonyme.totalDocs).toBe(1)
  })

  it("refuse de modifier l'enchaînement d'un autre", async () => {
    await expect(
      payload.update({
        collection: 'enchainements',
        id: idPartage,
        data: { titre: 'Détourné' },
        overrideAccess: false,
        user: autre,
      }),
    ).rejects.toThrow()

    // L'etat en base fait foi : un refus qui laisserait passer l'ecriture ne
    // serait pas un refus.
    const relu = await payload.findByID({ collection: 'enchainements', id: idPartage, depth: 0 })
    expect(relu.titre).toBe('Propriété — partagé')
  })

  it("refuse de supprimer l'enchaînement d'un autre", async () => {
    await expect(
      payload.delete({
        collection: 'enchainements',
        id: idPartage,
        overrideAccess: false,
        user: autre,
      }),
    ).rejects.toThrow()

    const survivant = await payload.findByID({
      collection: 'enchainements',
      id: idPartage,
      depth: 0,
    })
    expect(survivant.id).toBe(idPartage)
  })

  it('laisse un auteur modifier le sien', async () => {
    const modifie = await payload.update({
      collection: 'enchainements',
      id: idPrive,
      data: { titre: 'Propriété — privé (corrigé)' },
      overrideAccess: false,
      user: auteur,
    })

    expect(modifie.titre).toBe('Propriété — privé (corrigé)')
  })

  it('empêche un compte de lire les autres comptes', async () => {
    // Sinon /api/users rend la liste des emails de la classe a qui s'inscrit.
    const comptes = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: autre,
      limit: 100,
      depth: 0,
    })

    expect(comptes.docs.every((compte) => compte.id === autre.id)).toBe(true)
  })

  it("empêche un compte de modifier le compte d'un autre", async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: auteur.id,
        data: { email: 'detourne@example.test' },
        overrideAccess: false,
        user: autre,
      }),
    ).rejects.toThrow()

    const relu = await payload.findByID({ collection: 'users', id: auteur.id, depth: 0 })
    expect(relu.email).toBe('test-proprio-auteur@example.test')
  })

  it('refuse la création d un enchaînement à un compte ordinaire (gel temporaire)', async () => {
    // GEL TEMPORAIRE (2026-08-31) : creation reservee aux administrateurs, le
    // temps de trancher le modele de visibilite. CE TEST EST A SUPPRIMER le jour
    // ou elle est rouverte — il decrit un etat voulu mais provisoire.
    //
    // Il est ici plutot que dans l'interface parce que c'est la collection qui
    // protege : cacher le « + » de la barre ne ferme ni la page ni l API.
    await expect(
      payload.create({
        collection: 'enchainements',
        data: {
          titre: 'Refusé',
          auteur: autre.id,
          visibilite: 'prive',
          passes: [{ passe: idPasse }],
        },
        overrideAccess: false,
        user: autre,
      }),
    ).rejects.toThrow()
  })

  it("laisse un visiteur anonyme créer un compte (inscription publique)", async () => {
    const cree = await payload.create({
      collection: 'users',
      overrideAccess: false,
      data: { email: 'test-proprio-inscrit@example.test', password: 'test-proprio-inscrit' },
    })

    expect(cree.admin).toBeFalsy()
    await payload.delete({ collection: 'users', id: cree.id })
  })
})
