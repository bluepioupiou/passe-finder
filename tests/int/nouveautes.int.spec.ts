import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { chargerNouveautes } from '@/nouveautes'
import config from '@/payload.config'

/**
 * Le fil des nouveautes de l'accueil (Story 5.3, E1), contre une vraie base.
 *
 * CE QUE LE TEST UNITAIRE NE PEUT PAS DIRE : le tri en memoire se verifie sans
 * base, mais deux choses ne se verifient QUE cablees —
 *
 *  1. le MELANGE. Trois collections, trois requetes, un seul fil ordonne par
 *     date : c'est le geste central de la demande, et personne d'autre ne le
 *     fait dans le code ;
 *  2. la VISIBILITE. Un enchainement prive ou non repertorie sur la page
 *     d'accueil serait une fuite, et l'accueil est la page la plus vue du
 *     site. La regle vit dans les `access` de la collection (ADD-5) ; ce test
 *     verifie qu'elle s'applique bien par ce chemin-la, et pas seulement qu'on
 *     l'a ecrite.
 *
 * LES DATES SONT POSEES A LA MAIN plutot que laissees a l'horloge : trois
 * creations qui se suivent tombent dans la meme milliseconde, et le test
 * verifierait alors le departage au lieu du tri.
 */
describe('Fil des nouveautes', () => {
  let payload: Payload
  let idDanse: number
  let idAuteur: number
  const aNettoyer: { collection: 'positions' | 'passes' | 'enchainements'; id: number }[] = []

  /** Un titre reconnaissable : le fil melange nos fixtures aux donnees en base. */
  const MARQUE = 'FIXTURE-NOUVEAUTES'

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number

    const auteur = await payload.create({
      collection: 'users',
      data: { email: 'fil@passe-finder.test', password: 'MotDePasseDeTest1!' },
    })
    idAuteur = auteur.id as number

    const position = await payload.create({
      collection: 'positions',
      data: { nom: `${MARQUE} position`, danse: idDanse, createdAt: '2026-09-01T10:00:00.000Z' },
    })
    aNettoyer.push({ collection: 'positions', id: position.id as number })

    const passe = await payload.create({
      collection: 'passes',
      data: {
        nom: `${MARQUE} passe`,
        positionDebut: position.id,
        positionFin: position.id,
        createdAt: '2026-09-03T10:00:00.000Z',
      },
    })
    aNettoyer.push({ collection: 'passes', id: passe.id as number })

    // Les trois visibilites, meme jour, dates decalees d'une heure : seule la
    // publique doit ressortir, et elle doit se ranger entre la position et la
    // passe.
    for (const [visibilite, heure] of [
      ['public', '02T10'],
      ['nonRepertorie', '02T11'],
      ['prive', '02T12'],
    ] as const) {
      const enchainement = await payload.create({
        collection: 'enchainements',
        data: {
          titre: `${MARQUE} ${visibilite}`,
          auteur: idAuteur,
          visibilite,
          passes: [{ passe: passe.id }],
          createdAt: `2026-09-${heure}:00:00.000Z`,
        },
      })
      aNettoyer.push({ collection: 'enchainements', id: enchainement.id as number })
    }
  })

  afterAll(async () => {
    // A l'envers : un enchainement retient ses passes, une passe ses positions.
    for (const { collection, id } of [...aNettoyer].reverse()) {
      await payload.delete({ collection, id }).catch(() => {})
    }
    await payload.delete({ collection: 'users', id: idAuteur }).catch(() => {})
  })

  /** Les seules entrees semees par ce fichier, dans l'ordre rendu par le fil. */
  const filDesFixtures = async () => {
    const nouveautes = await chargerNouveautes(payload, 50)
    return nouveautes.filter((entree) => entree.titre.startsWith(MARQUE))
  }

  it('melange les trois types, plus recents d abord', async () => {
    const fil = await filDesFixtures()

    expect(fil.map((entree) => entree.type)).toEqual(['passe', 'enchainement', 'position'])
  })

  it('ne montre que les enchainements PUBLICS', async () => {
    const fil = await filDesFixtures()
    const titres = fil.map((entree) => entree.titre)

    expect(titres).toContain(`${MARQUE} public`)
    expect(titres).not.toContain(`${MARQUE} nonRepertorie`)
    expect(titres).not.toContain(`${MARQUE} prive`)
  })

  it('mene chaque entree vers sa fiche, l enchainement par son identifiant public', async () => {
    const fil = await filDesFixtures()
    const parType = new Map(fil.map((entree) => [entree.type, entree]))

    expect(parType.get('position')?.lien).toMatch(/^\/positions\/\d+$/)
    expect(parType.get('passe')?.lien).toMatch(/^\/passes\/\d+$/)
    // Jamais le numero de ligne : l'identifiant public est la seule adresse
    // que le site sert pour un enchainement.
    expect(parType.get('enchainement')?.lien).toMatch(/^\/enchainements\/[A-Za-z0-9_-]{6,}$/)
  })

  it('ne rend jamais plus que le nombre demande', async () => {
    expect((await chargerNouveautes(payload, 3)).length).toBeLessThanOrEqual(3)
  })
})
