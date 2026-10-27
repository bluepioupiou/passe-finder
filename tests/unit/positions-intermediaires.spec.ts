import { describe, expect, it } from 'vitest'

import {
  erreurPositionsIntermediaires,
  frise,
  poserPosition,
  positionsIntermediairesDe,
  retirerPosition,
  schemaDOuverture,
} from '@/positions-intermediaires'
import { scenePardefaut, type SchemaPosition } from '@/schema-position'

/**
 * Les positions intermediaires d'une passe (Epic 8).
 *
 * LE PIEGE A COUVRIR : rien ne doit disparaitre en silence. Une duree reduite
 * sous une position posee, deux positions sur le meme instant ou un schema
 * illisible sont REFUSES avec un message qui dit quoi faire — jamais
 * « corriges » en jetant un dessin.
 */

const schema = (): SchemaPosition => scenePardefaut()
const ligne = (instant: unknown, contenu: unknown = schema()) => ({ instant, schema: contenu })

describe('positionsIntermediairesDe', () => {
  it('relit les lignes stockees, triees par instant, sans calque', () => {
    const avecCalque = { ...schema(), calque: { src: '/media/depart.png' } }
    const lues = positionsIntermediairesDe([
      { id: 'b', instant: 6, schema: schema() },
      { id: 'a', instant: 5, schema: JSON.stringify(avecCalque) },
    ])

    expect(lues.map((position) => position.instant)).toEqual([5, 6])
    expect(lues[0].schema.calque).toBeNull()
  })

  it('ecarte une ligne illisible au lieu de faire tomber la fiche', () => {
    const lues = positionsIntermediairesDe([ligne(5, { version: 2 }), ligne(6), ligne('x')])
    expect(lues.map((position) => position.instant)).toEqual([6])
  })

  it('rend une liste vide pour une valeur absente', () => {
    expect(positionsIntermediairesDe(null)).toEqual([])
    expect(positionsIntermediairesDe(undefined)).toEqual([])
  })
})

describe('erreurPositionsIntermediaires', () => {
  it('accepte une passe sans position, et des positions dans la duree', () => {
    expect(erreurPositionsIntermediaires([], 6)).toBeNull()
    expect(erreurPositionsIntermediaires([ligne(0), ligne(5), ligne(11)], 6)).toBeNull()
    expect(erreurPositionsIntermediaires([ligne(19)], 10)).toBeNull()
  })

  it('refuse de reduire la duree sous une position posee, et dit laquelle', () => {
    const message = erreurPositionsIntermediaires([ligne(13)], 6)
    expect(message).toMatch(/« 6 \. »/)
    expect(message).toMatch(/« 7 et »/)
  })

  it('refuse un instant qui n est pas un instant', () => {
    expect(erreurPositionsIntermediaires([ligne(-1)], 6)).not.toBeNull()
    expect(erreurPositionsIntermediaires([ligne(2.5)], 6)).not.toBeNull()
    expect(erreurPositionsIntermediaires([ligne('5')], 6)).not.toBeNull()
  })

  it('refuse deux positions sur le meme instant', () => {
    expect(erreurPositionsIntermediaires([ligne(5), ligne(5)], 6)).toMatch(/« 3 et »/)
  })

  it('refuse un schema illisible ou vide', () => {
    expect(erreurPositionsIntermediaires([ligne(5, { version: 2 })], 6)).toMatch(/illisible/)
    expect(erreurPositionsIntermediaires([ligne(5, { ...schema(), pieces: [] })], 6)).toMatch(
      /aucune pièce/,
    )
  })
})

describe('poserPosition / retirerPosition', () => {
  it('ajoute une position, a sa place dans le rythme, sans calque', () => {
    const avecCalque = { ...schema(), calque: { src: '/media/depart.png' } }
    const posees = poserPosition([{ instant: 6, schema: schema() }], 5, avecCalque)

    expect(posees.map((position) => position.instant)).toEqual([5, 6])
    expect(posees[0].schema.calque).toBeNull()
  })

  it('remplace la position deja posee sur cet instant', () => {
    const autre = { ...schema(), taille: 760 }
    const posees = poserPosition([{ instant: 5, schema: schema() }], 5, autre)

    expect(posees).toHaveLength(1)
    expect(posees[0].schema.taille).toBe(760)
  })

  it('retire seulement la position de cet instant', () => {
    const posees = [
      { instant: 5, schema: schema() },
      { instant: 6, schema: schema() },
    ]
    expect(retirerPosition(posees, 5).map((position) => position.instant)).toEqual([6])
  })
})

describe('frise', () => {
  it('donne chaque instant du comptage, avec son temps et son nom', () => {
    const instants = frise(6, [])
    expect(instants).toHaveLength(12)
    expect(instants.map((instant) => instant.temps).join(' ')).toBe('1 . 2 . 3 et 4 . 5 et 6 .')
    expect(instants[5]).toMatchObject({ instant: 5, temps: 'et', nom: '3 et', schema: null })
  })

  it('pose chaque position sur son instant (cas temoin « Trou de souris »)', () => {
    const posees = [5, 6, 9].map((instant) => ({ instant, schema: schema() }))
    const occupes = frise(6, posees).filter((instant) => instant.schema !== null)
    expect(occupes.map((instant) => instant.nom)).toEqual(['3 et', '4', '5 et'])
  })

  it('ignore une position hors de la duree au lieu de l inventer ailleurs', () => {
    const occupes = frise(6, [{ instant: 13, schema: schema() }]).filter(
      (instant) => instant.schema !== null,
    )
    expect(occupes).toEqual([])
  })
})

describe('schemaDOuverture', () => {
  // Une taille differente par schema, pour savoir lequel a ete copie.
  const marque = (taille: number): SchemaPosition => ({ ...scenePardefaut(), taille })
  const depart = marque(520)
  const posees = [
    { instant: 5, schema: marque(640) },
    { instant: 9, schema: marque(760) },
  ]

  it('rouvre la position deja posee sur l instant', () => {
    expect(schemaDOuverture(posees, 9, depart)?.taille).toBe(760)
  })

  it('copie la derniere position intermediaire avant l instant', () => {
    expect(schemaDOuverture(posees, 6, depart)?.taille).toBe(640)
    expect(schemaDOuverture(posees, 11, depart)?.taille).toBe(760)
  })

  it('copie le depart quand aucune position ne precede l instant', () => {
    expect(schemaDOuverture(posees, 3, depart)?.taille).toBe(520)
  })

  it('ne rend rien a copier quand le depart n a pas de schema', () => {
    expect(schemaDOuverture([], 3, null)).toBeNull()
  })

  it('ne garde jamais le calque de la position copiee', () => {
    const avecCalque = { ...depart, calque: { src: '/media/depart.png' } }
    expect(schemaDOuverture([], 3, avecCalque)?.calque).toBeNull()
  })
})
