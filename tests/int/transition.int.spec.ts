import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

/**
 * Collection Transition (Story 4.7).
 *
 * Ce qui se teste ici protege la LECTURE : une reprise d'enchainement ne stocke
 * rien, elle se retrouve par son seul couple de positions. Les regles de la
 * collection sont ce qui rend cette deduction possible et honnete —
 * l'unicite de A -> B surtout, sans laquelle la vue ne saurait quelle
 * transition nommer.
 *
 * Le jeu d'essai est autonome (positions et transitions creees puis detruites) :
 * aucune donnee reelle n'est mise en jeu.
 */
describe('Transition', () => {
  let payload: Payload
  let idDanse: number
  let idA: number
  let idB: number
  let idTransition: number
  const aNettoyer: number[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const a = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — mains décroisées', danse: idDanse },
    })
    const b = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — main droite / main gauche', danse: idDanse },
    })
    idA = a.id as number
    idB = b.id as number

    const transition = await payload.create({
      collection: 'transitions',
      data: {
        positionDebut: idA,
        positionFin: idB,
        nom: 'Lâcher la main gauche',
        description: 'On lâche simplement la main gauche qui tient la main droite de la cavalière',
      },
    })
    idTransition = transition.id as number
  })

  afterAll(async () => {
    for (const id of aNettoyer) {
      await payload.delete({ collection: 'transitions', id }).catch(() => {})
    }
    if (idTransition) await payload.delete({ collection: 'transitions', id: idTransition })
    if (idA) await payload.delete({ collection: 'positions', id: idA })
    if (idB) await payload.delete({ collection: 'positions', id: idB })
  })

  it('refuse un doublon sur le meme trajet', async () => {
    // L'invariant qui rend la lecture possible : la vue retrouve la transition
    // d'une reprise par son SEUL couple de positions. Deux transitions A -> B
    // et elle ne saurait laquelle nommer.
    await expect(
      payload.create({
        collection: 'transitions',
        data: { positionDebut: idA, positionFin: idB, nom: 'Une autre façon' },
      }),
    ).rejects.toThrow(/existe déjà/)
  })

  it('accepte le sens inverse, qui est une autre transition', async () => {
    // L'arete est DIRIGEE : dans l'historique, « mains croisees » vers « main
    // droite / main droite » existe 14 fois et l'inverse jamais. Interdire le
    // retour reviendrait a inventer une symetrie que la danse n'a pas.
    const retour = await payload.create({
      collection: 'transitions',
      data: { positionDebut: idB, positionFin: idA, nom: 'Reprendre la main gauche' },
    })
    aNettoyer.push(retour.id as number)

    expect(retour.id).toBeDefined()
  })

  it('refuse une transition vers elle-meme', async () => {
    await expect(
      payload.create({
        collection: 'transitions',
        data: { positionDebut: idA, positionFin: idA },
      }),
    ).rejects.toThrow(/positions différentes/)
  })

  it('refuse de relier deux danses differentes', async () => {
    const autreDanse = await payload.create({
      collection: 'danses',
      data: { nom: 'danse de test — transitions' },
    })
    const ailleurs = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — autre danse', danse: autreDanse.id },
    })

    await expect(
      payload.create({
        collection: 'transitions',
        data: { positionDebut: idA, positionFin: ailleurs.id },
      }),
    ).rejects.toThrow(/même danse/)

    await payload.delete({ collection: 'positions', id: ailleurs.id })
    await payload.delete({ collection: 'danses', id: autreDanse.id })
  })

  it('empeche de supprimer une position encore utilisee par une transition', async () => {
    // Pendant de la garde des passes (FR-8 / AD-6). Sans elle, la transition
    // survivrait en pointant dans le vide, et le compositeur proposerait un
    // changement de prise vers une position disparue.
    await expect(payload.delete({ collection: 'positions', id: idA })).rejects.toThrow(/transition/)
  })

  it('se laisse supprimer sans garde, contrairement a une passe', async () => {
    // Une transition n'est REFERENCEE NULLE PART : les enchainements ne
    // stockent que des passes. La supprimer ne vide aucun maillon — la reprise
    // cesse simplement d'etre nommee, exactement comme les reprises de
    // l'historique qui n'ont pas encore de transition ecrite.
    const troisieme = await payload.create({
      collection: 'positions',
      data: { nom: 'Position de test — jetable', danse: idDanse },
    })

    const jetable = await payload.create({
      collection: 'transitions',
      data: { positionDebut: idA, positionFin: troisieme.id, nom: 'Jetable' },
    })

    await payload.delete({ collection: 'transitions', id: jetable.id })

    const restantes = await payload.find({
      collection: 'transitions',
      where: { id: { equals: jetable.id } },
      limit: 1,
      depth: 0,
    })
    expect(restantes.totalDocs).toBe(0)

    // La position redevient supprimable une fois sa derniere transition partie.
    await payload.delete({ collection: 'positions', id: troisieme.id })
  })

  it('est lisible par un visiteur anonyme, et non modifiable', async () => {
    // Catalogue de reference : meme porte que Position et Passe (FR-21, FR-29).
    const lues = await payload.find({
      collection: 'transitions',
      where: { id: { equals: idTransition } },
      limit: 1,
      depth: 0,
      overrideAccess: false,
    })
    expect(lues.totalDocs).toBe(1)

    await expect(
      payload.create({
        collection: 'transitions',
        data: { positionDebut: idB, positionFin: idA, nom: 'Par un anonyme' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
