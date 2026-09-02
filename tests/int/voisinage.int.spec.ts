import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { voisinesDePasse } from '@/catalogue'
import config from '@/payload.config'

/**
 * Le voisinage d'une passe, servi par la fiche passe (2026-09-02).
 *
 * CE QUI SE TESTE ICI EST UNE ERREUR FACILE A FAIRE, et invisible a l'ecran :
 * les trois listes se lisent sur les EXTREMITES de la passe, jamais sur elle.
 * Interverti, « ce qui mene ici » afficherait les passes qui PARTENT de son
 * depart — c'est-a-dire ses concurrentes, pas ce qui l'amene. La liste serait
 * pleine, plausible, et fausse. D'ou le LEURRE du jeu d'essai : une passe qui
 * part du meme endroit que celle qu'on observe, et qui ne doit apparaitre dans
 * aucune des deux listes.
 *
 * Le graphe monte pour l'occasion :
 *
 *   [C] ──avant──> [A] ──testee──> [B] ──apres──> [C] ──boucle──┐
 *                   │                    └──transition──> [C]   └> [C]
 *                   ├──leurre───────────────────────────> [C]
 *                   └──impasse──────────────────────────> [D]  (rien n'en part)
 *
 * Aucune donnee reelle n'est mise en jeu : positions, passes et transitions
 * sont creees puis detruites.
 */
describe('Voisinage d une passe', () => {
  let payload: Payload
  let idDanse: number
  const positions: Record<string, number> = {}
  const passes: Record<string, number> = {}
  let idTransition: number

  const creerPosition = async (cle: string) => {
    const doc = await payload.create({
      collection: 'positions',
      data: { nom: `Position de test — voisinage ${cle.toUpperCase()}`, danse: idDanse },
    })
    positions[cle] = doc.id as number
  }

  const creerPasse = async (cle: string, debut: number, fin: number) => {
    const doc = await payload.create({
      collection: 'passes',
      data: { nom: `Passe de test — ${cle}`, positionDebut: debut, positionFin: fin },
    })
    passes[cle] = doc.id as number
  }

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    for (const cle of ['a', 'b', 'c', 'd']) await creerPosition(cle)

    await creerPasse('testee', positions.a, positions.b)
    await creerPasse('avant', positions.c, positions.a)
    await creerPasse('apres', positions.b, positions.c)
    // Elle part du meme endroit que la passe testee : ni avant, ni apres.
    await creerPasse('leurre', positions.a, positions.c)
    // Elle part et revient au meme endroit (24 cas dans le vrai catalogue).
    await creerPasse('boucle', positions.c, positions.c)
    // Elle mene la ou rien ne part : le cul-de-sac.
    await creerPasse('impasse', positions.a, positions.d)

    const transition = await payload.create({
      collection: 'transitions',
      data: { positionDebut: positions.b, positionFin: positions.c, nom: 'Lâcher la main gauche' },
    })
    idTransition = transition.id as number
  })

  afterAll(async () => {
    if (idTransition) await payload.delete({ collection: 'transitions', id: idTransition })
    for (const id of Object.values(passes)) {
      await payload.delete({ collection: 'passes', id }).catch(() => {})
    }
    for (const id of Object.values(positions)) {
      await payload.delete({ collection: 'positions', id }).catch(() => {})
    }
  })

  const voisinesDe = async (cle: string) => {
    const passe = await payload.findByID({ collection: 'passes', id: passes[cle], depth: 0 })
    return voisinesDePasse(payload, passe)
  }

  it('lit les voisines sur les extremites, et pas sur la passe', async () => {
    const { menentIci, enchainentApres, prisesApres } = await voisinesDe('testee')

    // Ce qui MENE ICI arrive au DEPART (A) : « avant », jamais « leurre ».
    expect(menentIci.map((p) => p.id)).toEqual([passes.avant])
    // Ce qui ENCHAINE part de l'ARRIVEE (B) : « apres », jamais « leurre ».
    expect(enchainentApres.map((p) => p.id)).toEqual([passes.apres])
    // Le changement de prise part lui aussi de l'ARRIVEE (B).
    expect(prisesApres.map((t) => t.id)).toEqual([idTransition])
  })

  it('resout l autre extremite de chaque voisine, pour que la liste la nomme', async () => {
    // La liste affiche « ← position de depart » : a profondeur 0, elle
    // n'afficherait qu'un numero — ou rien du tout.
    const { menentIci } = await voisinesDe('testee')

    expect(typeof menentIci[0].positionDebut).toBe('object')
  })

  it('rend une passe qui boucle presente dans ses propres listes', async () => {
    // Elle se danse reellement deux fois de suite : l'ecarter cacherait une
    // option vraie. Ce test dit que c'est un CHOIX, pas un oubli.
    const { menentIci, enchainentApres } = await voisinesDe('boucle')

    expect(menentIci.map((p) => p.id)).toContain(passes.boucle)
    expect(enchainentApres.map((p) => p.id)).toContain(passes.boucle)
  })

  it('rend des listes vides sur un cul-de-sac, sans echouer', async () => {
    // La fiche affiche alors « (0) » et son message : « aucune passe ne part de
    // cette position d'arrivee » est une information utile, pas une panne.
    const { enchainentApres, prisesApres } = await voisinesDe('impasse')

    expect(enchainentApres).toEqual([])
    expect(prisesApres).toEqual([])
  })
})
