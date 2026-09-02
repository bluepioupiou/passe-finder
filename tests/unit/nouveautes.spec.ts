import { describe, expect, it } from 'vitest'

import { fusionner, LIBELLES, type Nouveaute } from '@/nouveautes'

/**
 * Le fil des nouveautes de l'accueil (Story 5.3, E1).
 *
 * Une seule regle a verifier, mais c'est celle qui decide de ce qu'un visiteur
 * voit en arrivant : melanger trois listes deja triees, garder les plus
 * recentes, et rendre TOUJOURS le meme ordre. Fonction pure : aucune base.
 */

function nouveaute(
  type: Nouveaute['type'],
  id: number,
  titre: string,
  creeLe: string,
): Nouveaute {
  return { type, id, titre, creeLe, lien: `/${type}/${id}` }
}

describe('fusionner', () => {
  it('melange les trois types et rend les plus recents d abord', () => {
    const fil = fusionner([
      [nouveaute('position', 1, 'Position fermée', '2026-09-01T10:00:00.000Z')],
      [nouveaute('passe', 2, 'Passe pied', '2026-09-02T10:00:00.000Z')],
      [nouveaute('enchainement', 3, 'Cours du mardi', '2026-08-31T10:00:00.000Z')],
    ])

    expect(fil.map((entree) => entree.type)).toEqual(['passe', 'position', 'enchainement'])
  })

  it('coupe au nombre demande', () => {
    const listes = [
      Array.from({ length: 8 }, (_, index) =>
        nouveaute('position', index, `Position ${index}`, `2026-09-0${(index % 9) + 1}T10:00:00Z`),
      ),
      Array.from({ length: 8 }, (_, index) =>
        nouveaute('passe', index, `Passe ${index}`, `2026-08-0${(index % 9) + 1}T10:00:00Z`),
      ),
    ]

    expect(fusionner(listes, 10)).toHaveLength(10)
    expect(fusionner(listes, 3)).toHaveLength(3)
  })

  /**
   * LE CAS REEL, pas une hypothese : les 119 enchainements, 30 positions et
   * ~110 passes repris de l'ancienne appli ont ete ecrits par le meme script,
   * donc a la meme seconde. Sans departage, leur ordre dependrait de l'ordre
   * d'arrivee des trois requetes et le fil bougerait a chaque rechargement.
   */
  it('departage les dates identiques par identifiant decroissant, de facon stable', () => {
    const meme = '2026-08-30T12:00:00.000Z'
    const listes = [
      [nouveaute('position', 5, 'Position cinq', meme)],
      [nouveaute('passe', 12, 'Passe douze', meme)],
      [nouveaute('enchainement', 9, 'Enchainement neuf', meme)],
    ]

    const attendu = ['Passe douze', 'Enchainement neuf', 'Position cinq']

    expect(fusionner(listes).map((entree) => entree.titre)).toEqual(attendu)
    // Les memes entrees presentees dans un autre ordre donnent le meme fil.
    expect(fusionner([...listes].reverse()).map((entree) => entree.titre)).toEqual(attendu)
  })

  it('rend une liste vide quand rien n a encore ete cree', () => {
    expect(fusionner([[], [], []])).toEqual([])
  })
})

describe('LIBELLES', () => {
  it('nomme les trois types en francais', () => {
    expect(LIBELLES).toEqual({
      position: 'Position',
      passe: 'Passe',
      enchainement: 'Enchaînement',
    })
  })
})
