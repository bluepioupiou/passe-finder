import { describe, expect, it } from 'vitest'

import { chaineDe, construireChaine, extremites, formaterDate, typologie } from '@/enchainements'
import type { Pass, Position } from '@/payload-types'

/**
 * Lecture d'un enchainement (Story 4.4).
 *
 * Ce qui compte vraiment ici, c'est la RUPTURE : 59 des 119 enchainements
 * repris de l'ancienne appli enchainent une passe qui ne part pas de la
 * position d'arrivee de la precedente (transitions de main). La vue lecture
 * doit les nommer, jamais les masquer ni les traiter comme une erreur.
 *
 * Fonctions pures : aucune base, aucun rendu.
 */

function position(id: number, nom: string): Position {
  return { id, nom, danse: 1, updatedAt: '', createdAt: '' } as Position
}

function passe(id: number, nom: string, debut: Position, fin: Position): Pass {
  return { id, nom, positionDebut: debut, positionFin: fin, updatedAt: '', createdAt: '' } as Pass
}

const fermee = position(1, 'Position fermée')
const ouverte = position(2, 'Position ouverte')
const mainDroite = position(3, 'Main droite / main droite')

describe('construireChaine', () => {
  it('ne signale aucune rupture quand la chaine est continue', () => {
    const maillons = construireChaine([
      passe(10, 'Passe pied', fermee, ouverte),
      passe(11, 'Toupie', ouverte, fermee),
    ])

    expect(maillons.map((maillon) => maillon.rupture)).toEqual([null, null])
    expect(maillons[0].debut?.nom).toBe('Position fermée')
    expect(maillons[1].fin?.nom).toBe('Position fermée')
  })

  it('signale la reprise quand la passe suivante part d une autre position', () => {
    const maillons = construireChaine([
      passe(10, 'Passe pied', fermee, ouverte),
      passe(12, 'Caresse', mainDroite, fermee),
    ])

    expect(maillons[0].rupture).toBeNull()
    expect(maillons[1].rupture).toEqual({ arrivait: ouverte, reprend: mainDroite })
  })

  it('ne signale jamais de rupture sur le premier maillon', () => {
    // Il n'y a rien avant lui : sa position de depart EST le debut du parcours.
    const maillons = construireChaine([passe(12, 'Caresse', mainDroite, fermee)])

    expect(maillons[0].rupture).toBeNull()
  })
})

describe('extremites', () => {
  it('donne la position de depart et celle d arrivee', () => {
    const { depart, arrivee } = extremites([
      passe(10, 'Passe pied', fermee, ouverte),
      passe(11, 'Toupie', ouverte, mainDroite),
    ])

    expect(depart?.nom).toBe('Position fermée')
    expect(arrivee?.nom).toBe('Main droite / main droite')
  })

  it('accepte une chaine vide', () => {
    expect(extremites([])).toEqual({ depart: null, arrivee: null })
  })
})

describe('chaineDe', () => {
  const passes = new Map([[10, passe(10, 'Passe pied', fermee, ouverte)]])
  const positions = new Map([
    [1, fermee],
    [2, ouverte],
  ])

  it('resout les passes dans l ordre du tableau', () => {
    const resolues = chaineDe([{ passe: 10 }, { passe: 10 }], passes, positions)

    expect(resolues).toHaveLength(2)
    expect(resolues[0].nom).toBe('Passe pied')
  })

  it('ignore une passe introuvable plutot que de casser la page', () => {
    // Une chaine amputee d'un maillon reste plus utile qu'une erreur.
    expect(chaineDe([{ passe: 10 }, { passe: 999 }], passes, positions)).toHaveLength(1)
  })
})

describe('formaterDate', () => {
  it('formate en francais', () => {
    expect(formaterDate('2026-03-12T00:00:00.000Z')).toBe('12 mars 2026')
  })

  it('lit la date en UTC, sans reculer d un jour', () => {
    // Payload stocke une date « jour seul » a minuit UTC : formatee dans un
    // fuseau a l'ouest de Greenwich, elle designerait la veille.
    expect(formaterDate('2026-01-01T00:00:00.000Z')).toBe('1 janvier 2026')
  })

  it('rend null quand il n y a pas de date', () => {
    expect(formaterDate(null)).toBeNull()
    expect(formaterDate(undefined)).toBeNull()
    expect(formaterDate('pas une date')).toBeNull()
  })
})

describe('typologie', () => {
  // Serpentin sur 3 colonnes : la ligne 1 va a droite, la ligne 2 revient a
  // gauche, et le passage de l'une a l'autre se fait par le bas.
  it('deroule la premiere ligne de gauche a droite', () => {
    expect(typologie(0, 3, false)).toEqual({ entree: 'gauche', sortie: 'droite' })
    expect(typologie(1, 3, false)).toEqual({ entree: 'gauche', sortie: 'droite' })
  })

  it('sort par le bas au bout de la ligne', () => {
    expect(typologie(2, 3, false)).toEqual({ entree: 'gauche', sortie: 'bas' })
  })

  it('repart de droite a gauche a la ligne suivante', () => {
    // On entre par le haut : c'est la carte qui recoit le changement de ligne.
    expect(typologie(3, 3, false)).toEqual({ entree: 'haut', sortie: 'gauche' })
    expect(typologie(4, 3, false)).toEqual({ entree: 'droite', sortie: 'gauche' })
    expect(typologie(5, 3, false)).toEqual({ entree: 'droite', sortie: 'bas' })
  })

  it('reprend vers la droite a la ligne d apres', () => {
    expect(typologie(6, 3, false)).toEqual({ entree: 'haut', sortie: 'droite' })
  })

  it('ne fait pas descendre la derniere carte de la chaine', () => {
    // Sortir par le bas designerait une ligne suivante qui n'existe pas : la
    // position d'arrivee se pose au bout du fil, dans le sens de lecture.
    expect(typologie(2, 3, true)).toEqual({ entree: 'gauche', sortie: 'droite' })
    expect(typologie(5, 3, true)).toEqual({ entree: 'droite', sortie: 'gauche' })
  })

  it('serpente aussi sur deux colonnes', () => {
    expect(typologie(0, 2, false)).toEqual({ entree: 'gauche', sortie: 'droite' })
    expect(typologie(1, 2, false)).toEqual({ entree: 'gauche', sortie: 'bas' })
    expect(typologie(2, 2, false)).toEqual({ entree: 'haut', sortie: 'gauche' })
    expect(typologie(3, 2, false)).toEqual({ entree: 'droite', sortie: 'bas' })
  })

  it('devient un simple flux vertical sur une colonne', () => {
    // Le telephone : un seul fil, du haut vers le bas, la bulle entre chaque
    // paire de cartes.
    for (const index of [0, 1, 5, 42]) {
      expect(typologie(index, 1, false)).toEqual({ entree: 'haut', sortie: 'bas' })
    }
  })
})
