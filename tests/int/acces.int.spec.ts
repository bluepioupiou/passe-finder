import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Gouvernance du catalogue (Story 3.4, FR-29 / ADD-5).
 *
 * Ces tests passent tous par `overrideAccess: false` : c'est ce qui fait
 * REELLEMENT jouer les `access` de la collection. L'API Local de Payload court-
 * circuite les droits par defaut (c'est ce qui permet aux semis et aux scripts
 * de migration d'ecrire), donc un test qui l'oublie verifie... que Payload sait
 * ecrire dans sa base. Le drapeau est le sujet du test, pas un detail.
 *
 * Ce qui est verifie ici protege deux choses distinctes :
 *  - le catalogue, materiau commun des eleves, qu'un compte ordinaire ne doit
 *    pas pouvoir editer ;
 *  - le drapeau lui-meme, qu'aucun compte ne doit pouvoir s'attribuer.
 */
describe('Gouvernance du catalogue', () => {
  let payload: Payload
  let admin: User
  let eleve: User
  let idDanse: number
  const positionsCreees: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    admin = await payload.create({
      collection: 'users',
      data: {
        email: 'test-acces-admin@example.test',
        password: 'test-acces-admin',
        admin: true,
      },
    })

    eleve = await payload.create({
      collection: 'users',
      data: { email: 'test-acces-eleve@example.test', password: 'test-acces-eleve' },
    })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number
  })

  afterAll(async () => {
    for (const id of positionsCreees) {
      await payload.delete({ collection: 'positions', id })
    }
    if (admin) await payload.delete({ collection: 'users', id: admin.id })
    if (eleve) await payload.delete({ collection: 'users', id: eleve.id })
  })

  it('laisse le catalogue lisible par un visiteur anonyme', async () => {
    // FR-21 : verrouiller l'ecriture ne doit pas fermer la lecture. C'est la
    // moitie du produit — un eleve consulte sans compte.
    const positions = await payload.find({
      collection: 'positions',
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })

    expect(positions).toBeDefined()
  })

  it('refuse la creation d une position a un compte non admin', async () => {
    await expect(
      payload.create({
        collection: 'positions',
        data: { nom: 'Position interdite', danse: idDanse },
        overrideAccess: false,
        user: eleve,
      }),
    ).rejects.toThrow()
  })

  it('refuse la creation d une position a un visiteur anonyme', async () => {
    await expect(
      payload.create({
        collection: 'positions',
        data: { nom: 'Position anonyme', danse: idDanse },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('autorise un admin a creer, modifier et supprimer une position', async () => {
    const creee = await payload.create({
      collection: 'positions',
      data: { nom: 'Position admin', danse: idDanse },
      overrideAccess: false,
      user: admin,
    })
    positionsCreees.push(creee.id as number)

    const modifiee = await payload.update({
      collection: 'positions',
      id: creee.id,
      data: { nom: 'Position admin renommee' },
      overrideAccess: false,
      user: admin,
    })
    expect(modifiee.nom).toBe('Position admin renommee')

    await payload.delete({
      collection: 'positions',
      id: creee.id,
      overrideAccess: false,
      user: admin,
    })
    positionsCreees.pop()
  })

  it('refuse le televersement de fichiers a un compte non admin', async () => {
    // Sans cette regle, le verrou des positions serait decoratif : on ne
    // pourrait pas modifier la position, mais on pourrait remplacer l'image
    // qu'elle affiche.
    await expect(
      payload.create({
        collection: 'media',
        data: { alt: 'Fichier interdit' },
        overrideAccess: false,
        user: eleve,
      }),
    ).rejects.toThrow()
  })

  it('empeche un compte non admin de se promouvoir lui-meme', async () => {
    // Payload peut soit refuser l'operation, soit ignorer le champ interdit.
    // Les deux sont acceptables ; ce qui ne l'est pas, c'est que le drapeau
    // change. On verifie donc l'ETAT FINAL, pas la forme du refus.
    await payload
      .update({
        collection: 'users',
        id: eleve.id,
        data: { admin: true },
        overrideAccess: false,
        user: eleve,
      })
      .catch(() => undefined)

    const relu = await payload.findByID({ collection: 'users', id: eleve.id, depth: 0 })
    expect(relu.admin).toBeFalsy()
  })

  it('empeche de naitre admin en glissant le drapeau a l inscription', async () => {
    // Anticipe la Story 3.1 : quand la creation de compte sera ouverte au
    // public, le corps de la requete ne doit pas pouvoir porter `admin: true`.
    let cree: User | undefined
    try {
      cree = await payload.create({
        collection: 'users',
        data: {
          email: 'test-acces-intrus@example.test',
          password: 'test-acces-intrus',
          admin: true,
        },
        overrideAccess: false,
      })
    } catch {
      // Refus a l'inscription : acceptable aussi.
    }

    if (cree) {
      expect(cree.admin).toBeFalsy()
      await payload.delete({ collection: 'users', id: cree.id })
    }
  })
})
