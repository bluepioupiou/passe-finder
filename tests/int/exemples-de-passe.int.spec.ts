import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { enchainementsUtilisant, EXEMPLES_PAR_PASSE } from '@/catalogue'
import { conditions, lireCriteres } from '@/enchainements-liste'
import config from '@/payload.config'
import type { User } from '@/payload-types'

/**
 * Les enchaînements donnés en exemple sur la fiche passe (FR-24, 2026-09-07).
 *
 * TROIS PROMESSES QU'AUCUN TEST PUR NE PEUT TENIR, parce qu'elles se jouent
 * toutes dans la requête :
 *
 *  - la SÉLECTION passe par le sous-champ d'un tableau ordonné
 *    (`passes.passe`). Rien ne le distingue à l'œil d'un chemin qui ne
 *    ramènerait rien : la liste serait vide, plausible, et fausse ;
 *  - le TOTAL est compté SOUS LES RÈGLES D'ACCÈS. C'est la vraie fuite du lot :
 *    dire « 12 » à qui n'a le droit d'en voir que 2 révèle l'existence de dix
 *    enchaînements privés, sans jamais en montrer un seul (AD-6) ;
 *  - la LIMITE tronque l'affichage sans toucher au compte. Un `totalDocs` qui
 *    tomberait à 10 ferait mentir la phrase « les 10 plus récents sur 12 ».
 *
 * Le jeu d'essai monte un LEURRE : un enchaînement qui n'utilise pas la passe
 * observée, et qui ne doit apparaître ni dans la liste ni dans le total.
 */
describe('Enchaînements qui utilisent une passe', () => {
  let payload: Payload
  let auteur: User
  let idDanse: number
  let idDebut: number
  let idFin: number
  let idPasse: number
  let idAutrePasse: number

  const crees: number[] = []

  /** Un enchaînement daté, sur la passe observée sauf mention contraire. */
  async function creer(
    titre: string,
    jour: string,
    options: { visibilite?: 'prive' | 'nonRepertorie' | 'public'; passe?: number } = {},
  ) {
    const cree = await payload.create({
      collection: 'enchainements',
      data: {
        titre,
        auteur: auteur.id,
        visibilite: options.visibilite ?? 'public',
        date: `${jour}T00:00:00.000Z`,
        passes: [{ passe: options.passe ?? idPasse }],
      },
    })

    crees.push(cree.id)
    return cree
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    auteur = await payload.create({
      collection: 'users',
      data: { email: 'test-exemples-auteur@example.test', password: 'test-exemples-auteur' },
    })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const debut = await payload.create({
      collection: 'positions',
      data: { nom: 'Exemples — départ', danse: idDanse },
    })
    const fin = await payload.create({
      collection: 'positions',
      data: { nom: 'Exemples — arrivée', danse: idDanse },
    })
    idDebut = debut.id
    idFin = fin.id

    const passe = await payload.create({
      collection: 'passes',
      data: { nom: 'Exemples — passe observée', positionDebut: idDebut, positionFin: idFin },
    })
    idPasse = passe.id

    const autre = await payload.create({
      collection: 'passes',
      data: { nom: 'Exemples — passe leurre', positionDebut: idDebut, positionFin: idFin },
    })
    idAutrePasse = autre.id

    // Douze publics datés, du 1er au 12 janvier : deux de plus que la limite,
    // ce qui est le seul moyen de voir la troncature agir.
    for (let jour = 1; jour <= 12; jour += 1) {
      const numero = String(jour).padStart(2, '0')
      await creer(`Exemples — public du ${numero}`, `2026-01-${numero}`)
    }

    // Le plus RÉCENT de tous, mais privé : il doit disparaître pour un visiteur
    // anonyme, du haut de la liste comme du total.
    await creer('Exemples — privé récent', '2026-03-01', { visibilite: 'prive' })

    // Le leurre : la bonne période, la mauvaise passe.
    await creer('Exemples — leurre', '2026-02-01', { passe: idAutrePasse })
  })

  afterAll(async () => {
    for (const id of crees) {
      await payload.delete({ collection: 'enchainements', id }).catch(() => null)
    }
    if (idPasse) await payload.delete({ collection: 'passes', id: idPasse }).catch(() => null)
    if (idAutrePasse) {
      await payload.delete({ collection: 'passes', id: idAutrePasse }).catch(() => null)
    }
    if (idDebut) await payload.delete({ collection: 'positions', id: idDebut }).catch(() => null)
    if (idFin) await payload.delete({ collection: 'positions', id: idFin }).catch(() => null)
    if (auteur) await payload.delete({ collection: 'users', id: auteur.id }).catch(() => null)
  })

  it('ne retient que les enchaînements qui contiennent la passe', async () => {
    const { exemples, total } = await enchainementsUtilisant(payload, idPasse, null)

    expect(total).toBe(12)
    expect(exemples.map((e) => e.titre)).not.toContain('Exemples — leurre')
  })

  it('rend les plus récents en premier', async () => {
    const { exemples } = await enchainementsUtilisant(payload, idPasse, null)

    expect(exemples[0].titre).toBe('Exemples — public du 12')
    expect(exemples[exemples.length - 1].titre).toBe('Exemples — public du 03')
  })

  it('tronque la liste sans tronquer le total', async () => {
    // C'est ce couple qui rend honnête la phrase « les 10 plus récents sur 12 ».
    const { exemples, total } = await enchainementsUtilisant(payload, idPasse, null)

    expect(exemples).toHaveLength(EXEMPLES_PAR_PASSE)
    expect(total).toBeGreaterThan(exemples.length)
  })

  it('compte la visibilité, et pas seulement l affichage', async () => {
    // Le privé est le PLUS RÉCENT : s'il fuyait, il serait en tête de liste.
    // Et s'il ne fuyait que du compte, le total dirait 13 sans jamais le
    // montrer — ce qui trahit son existence tout autant (AD-6).
    const anonyme = await enchainementsUtilisant(payload, idPasse, null)

    expect(anonyme.total).toBe(12)
    expect(anonyme.exemples.map((e) => e.titre)).not.toContain('Exemples — privé récent')
  })

  it('montre à son auteur ses propres enchaînements privés', async () => {
    // La fiche passe reste publique, mais un élève connecté doit y retrouver
    // ses brouillons : c'est la règle de la collection, pas une règle de page.
    const sien = await enchainementsUtilisant(payload, idPasse, auteur)

    expect(sien.total).toBe(13)
    expect(sien.exemples[0].titre).toBe('Exemples — privé récent')
  })

  it('mène à la même sélection que le filtre de la liste', async () => {
    // C'EST LA PROMESSE DU LIEN « Voir les N enchaînements » : la liste filtrée
    // doit contenir exactement ce que la fiche compte, sinon le nombre annoncé
    // ne correspond pas à ce qu'on trouve en arrivant. Les deux chemins passent
    // par le même sous-champ, mais par deux fonctions différentes — c'est
    // justement ce qui peut diverger.
    const { total } = await enchainementsUtilisant(payload, idPasse, null)

    const criteres = lireCriteres({ passe: String(idPasse) })
    const filtree = await payload.find({
      collection: 'enchainements',
      where: conditions(criteres, []),
      limit: 0,
      depth: 0,
      overrideAccess: false,
    })

    expect(filtree.totalDocs).toBe(total)
    expect(filtree.docs.map((doc) => doc.titre)).not.toContain('Exemples — leurre')
  })

  it('rend une liste vide sur une passe que personne n utilise, sans échouer', async () => {
    const orpheline = await payload.create({
      collection: 'passes',
      data: { nom: 'Exemples — passe orpheline', positionDebut: idDebut, positionFin: idFin },
    })

    const { exemples, total } = await enchainementsUtilisant(payload, orpheline.id, null)

    expect(exemples).toEqual([])
    expect(total).toBe(0)

    await payload.delete({ collection: 'passes', id: orpheline.id })
  })
})
