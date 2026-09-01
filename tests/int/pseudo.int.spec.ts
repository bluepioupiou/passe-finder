import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { nomsDesAuteurs } from '@/auteurs'
import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Le pseudo sur un compte (action item `pseudo-et-page-auteur`).
 *
 * Ce que ces tests protegent, et qu'un test unitaire ne peut pas voir :
 *
 *  - la DERIVATION (`pseudoNormalise`) et l'UNICITE, qui vivent dans un hook et
 *    dans un index SQLite — pas dans une fonction pure ;
 *  - le fait qu'une ecriture ORDINAIRE sur le compte (ce que Payload fait a
 *    chaque connexion) n'efface pas le pseudo ;
 *  - le fait que personne ne renomme l'auteur d'a cote, ce qui passe par les
 *    `access` et donc par `overrideAccess: false`.
 */
describe('Pseudo', () => {
  let payload: Payload
  let alain: User
  let chloe: User

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    alain = await payload.create({
      collection: 'users',
      data: { email: 'test-pseudo-alain@example.test', password: 'test-pseudo-alain' },
    })
    chloe = await payload.create({
      collection: 'users',
      data: { email: 'test-pseudo-chloe@example.test', password: 'test-pseudo-chloe' },
    })
  })

  afterAll(async () => {
    if (alain) await payload.delete({ collection: 'users', id: alain.id })
    if (chloe) await payload.delete({ collection: 'users', id: chloe.id })
  })

  it('range le pseudo et en derive la forme comparable', async () => {
    const compte = await payload.update({
      collection: 'users',
      id: alain.id,
      data: { pseudo: '  Le   Prof  ' },
    })

    expect(compte.pseudo).toBe('Le Prof')
    expect(compte.pseudoNormalise).toBe('le prof')
  })

  it('refuse un pseudo deja pris, meme ecrit autrement', async () => {
    // L'unicite porte sur la forme SANS casse ni accent : deux auteurs qu'on ne
    // distingue pas a la lecture ne sont pas deux auteurs distincts.
    await payload.update({ collection: 'users', id: alain.id, data: { pseudo: 'Chloé' } })

    await expect(
      payload.update({ collection: 'users', id: chloe.id, data: { pseudo: 'chloe' } }),
    ).rejects.toThrow()
  })

  it('laisse plusieurs comptes sans pseudo', async () => {
    // Le vide doit devenir NULL et non chaine vide : un index unique n'accepte
    // qu'une seule chaine vide, mais autant de NULL qu'on veut.
    await payload.update({ collection: 'users', id: alain.id, data: { pseudo: '' } })
    await payload.update({ collection: 'users', id: chloe.id, data: { pseudo: null } })

    const compte = await payload.findByID({ collection: 'users', id: alain.id })
    expect(compte.pseudo).toBeNull()
    expect(compte.pseudoNormalise).toBeNull()
  })

  it('refuse un pseudo mal forme, y compris par l API', async () => {
    // La regle vit dans la collection, pas dans le formulaire : c'est ce qui
    // fait qu'elle tient aussi face a /admin, a REST et a GraphQL (ADD-5).
    await expect(
      payload.update({ collection: 'users', id: alain.id, data: { pseudo: 'a@b.fr' } }),
    ).rejects.toThrow()
  })

  it('ne perd pas le pseudo lors d une ecriture ordinaire sur le compte', async () => {
    // Payload ecrit sur cette collection a chaque connexion (tentatives, date
    // de derniere connexion). Si le hook ne se retenait pas, se connecter
    // effacerait son propre pseudo.
    await payload.update({ collection: 'users', id: alain.id, data: { pseudo: 'Alain' } })
    await payload.update({ collection: 'users', id: alain.id, data: { admin: false } })

    const compte = await payload.findByID({ collection: 'users', id: alain.id })
    expect(compte.pseudo).toBe('Alain')
    expect(compte.pseudoNormalise).toBe('alain')
  })

  it('n autorise personne a renommer l auteur d a cote', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: alain.id,
        overrideAccess: false,
        user: chloe,
        data: { pseudo: 'Usurpé' },
      }),
    ).rejects.toThrow()

    const compte = await payload.findByID({ collection: 'users', id: alain.id })
    expect(compte.pseudo).toBe('Alain')
  })

  it('affiche le pseudo comme auteur, et l adresse a defaut', async () => {
    // Le point d'arrivee de tout le lot : ce que les cartes et les fiches
    // recevront. `chloe` n'a pas de pseudo — elle retombe sur son adresse.
    const noms = await nomsDesAuteurs(payload, [{ auteur: alain.id }, { auteur: chloe.id }])

    expect(noms.get(alain.id)).toBe('Alain')
    expect(noms.get(chloe.id)).toBe('test-pseudo-chloe')
  })
})
