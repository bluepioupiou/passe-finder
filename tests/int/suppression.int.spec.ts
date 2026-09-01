import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Supprimer un enchainement (Story 4.5, FR-18).
 *
 * Ce que ces tests protegent, et qu'aucun test d'interface ne verrait :
 *
 *  - QUI a le droit — la regle est `auteurOuAdmin` sur la collection, donc elle
 *    vaut pour l'API autant que pour le bouton (ADD-5). D'ou
 *    `overrideAccess: false` partout : sans lui, on ne testerait que la
 *    capacite de Payload a effacer une ligne ;
 *  - CE QUI PART AVEC — les favoris poses dessus par d'autres. C'est un hook de
 *    collection et non l'action du site : /admin et l'API suppriment aussi ;
 *  - CE QUI RESTE — le catalogue. Un enchainement supprime ne doit emporter ni
 *    la passe ni les positions qu'il utilisait : elles appartiennent a tout le
 *    monde.
 */
describe('Suppression d un enchaînement', () => {
  let payload: Payload
  let auteur: User
  let eleve: User
  let idDanse: number
  let idDebut: number
  let idFin: number
  let idPasse: number

  const enchainementsCrees: number[] = []

  /** Un enchainement partage tout neuf, dont le test dispose comme il veut. */
  async function enchainement(titre: string): Promise<number> {
    const cree = await payload.create({
      collection: 'enchainements',
      data: {
        titre,
        auteur: auteur.id,
        visibilite: 'partage',
        passes: [{ passe: idPasse }],
      },
    })

    enchainementsCrees.push(cree.id)
    return cree.id
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    auteur = await payload.create({
      collection: 'users',
      data: { email: 'test-suppr-auteur@example.test', password: 'test-suppr-auteur' },
    })
    eleve = await payload.create({
      collection: 'users',
      data: { email: 'test-suppr-eleve@example.test', password: 'test-suppr-eleve' },
    })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const debut = await payload.create({
      collection: 'positions',
      data: { nom: 'Suppression — départ', danse: idDanse },
    })
    const fin = await payload.create({
      collection: 'positions',
      data: { nom: 'Suppression — arrivée', danse: idDanse },
    })
    idDebut = debut.id
    idFin = fin.id

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: 'Suppression — passe', positionDebut: idDebut, positionFin: idFin },
    })
    idPasse = passe.id
  })

  afterAll(async () => {
    for (const id of enchainementsCrees) {
      await payload.delete({ collection: 'enchainements', id }).catch(() => null)
    }
    if (idPasse) await payload.delete({ collection: 'passes', id: idPasse })
    if (idDebut) await payload.delete({ collection: 'positions', id: idDebut })
    if (idFin) await payload.delete({ collection: 'positions', id: idFin })
    if (auteur) await payload.delete({ collection: 'users', id: auteur.id })
    if (eleve) await payload.delete({ collection: 'users', id: eleve.id })
  })

  it('laisse son auteur supprimer le sien', async () => {
    const id = await enchainement('Suppression — le mien')

    await payload.delete({ collection: 'enchainements', id, overrideAccess: false, user: auteur })

    const reste = await payload
      .findByID({ collection: 'enchainements', id, disableErrors: true })
      .catch(() => null)

    expect(reste).toBeNull()
  })

  it('refuse a quelqu un d autre de supprimer', async () => {
    const id = await enchainement('Suppression — pas le tien')

    await expect(
      payload.delete({ collection: 'enchainements', id, overrideAccess: false, user: eleve }),
    ).rejects.toThrow()

    // Et il est TOUJOURS LA : le refus ne doit pas etre un demi-effacement.
    const reste = await payload.findByID({ collection: 'enchainements', id, depth: 0 })
    expect(reste.titre).toBe('Suppression — pas le tien')
  })

  it('emporte les favoris posés dessus par d autres', async () => {
    const id = await enchainement('Suppression — mis en favori')

    await payload.create({
      collection: 'favoris',
      data: { utilisateur: eleve.id, enchainement: id },
      overrideAccess: false,
      user: eleve,
    })

    await payload.delete({ collection: 'enchainements', id, overrideAccess: false, user: auteur })

    // Sans le hook, ces lignes resteraient : `/favoris` afficherait « rien » la
    // ou la base dit « un », un ecart qui ne se voit qu'en cherchant.
    const orphelins = await payload.count({
      collection: 'favoris',
      where: { enchainement: { equals: id } },
    })

    expect(orphelins.totalDocs).toBe(0)
  })

  it('ne touche pas au catalogue qu il utilisait', async () => {
    const id = await enchainement('Suppression — sans dégât')

    await payload.delete({ collection: 'enchainements', id, overrideAccess: false, user: auteur })

    // La passe et ses positions appartiennent a tout le monde : supprimer un
    // enchainement ne retire rien du materiau commun.
    const passe = await payload.findByID({ collection: 'passes', id: idPasse, depth: 0 })
    expect(passe.nom).toBe('Suppression — passe')
  })
})
