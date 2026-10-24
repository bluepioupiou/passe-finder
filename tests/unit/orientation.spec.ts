import { describe, expect, it } from 'vitest'

import { angleAffiche, ligneDe, orientationsCumulees, pivotDe } from '@/orientation'

/**
 * Orientation du couple (Epic 7).
 *
 * LE PIEGE A COUVRIR : « non renseigne » n'est pas « zero ». Une erreur ici ne
 * se voit pas — elle donne une orientation plausible mais fausse, sur tout le
 * catalogue, puisque rien n'est renseigne au deploiement.
 */

describe('pivotDe / ligneDe', () => {
  it('lisent les quatre valeurs du select', () => {
    expect(pivotDe('0')).toBe(0)
    expect(pivotDe('90')).toBe(90)
    expect(pivotDe('180')).toBe(180)
    expect(ligneDe('270')).toBe(270)
  })

  it('rendent null pour une valeur non renseignee, jamais 0', () => {
    expect(pivotDe(null)).toBeNull()
    expect(pivotDe(undefined)).toBeNull()
    expect(ligneDe('')).toBeNull()
  })

  it('ne devinent pas une valeur inattendue', () => {
    expect(pivotDe('45')).toBeNull()
    expect(pivotDe('360')).toBeNull()
    expect(pivotDe('-90')).toBeNull()
    expect(ligneDe('haut')).toBeNull()
  })
})

describe('orientationsCumulees', () => {
  it('rend une case de plus que de passes : le depart, puis chaque arrivee', () => {
    expect(orientationsCumulees([0, 0, 0])).toEqual([0, 0, 0, 0])
  })

  it('deux demi-tours se compensent', () => {
    expect(orientationsCumulees([180, 180])).toEqual([0, 180, 0])
  })

  it('quatre quarts de tour reviennent au depart', () => {
    expect(orientationsCumulees([90, 90, 90, 90])).toEqual([0, 90, 180, 270, 0])
  })

  it('un quart a droite puis un quart a gauche se compensent', () => {
    expect(orientationsCumulees([90, 270])).toEqual([0, 90, 0])
  })

  it('devient inconnue a partir du premier pivot inconnu, meme si la suite est renseignee', () => {
    expect(orientationsCumulees([90, null, 180])).toEqual([0, 90, null, null])
  })

  it('le depart reste le repere, meme quand la premiere passe est inconnue', () => {
    expect(orientationsCumulees([null, 90])).toEqual([0, null, null])
    expect(orientationsCumulees([])).toEqual([0])
  })
})

describe('angleAffiche', () => {
  it('meme dessin, meme orientation : rien a tourner', () => {
    expect(angleAffiche(0, 90, 90)).toBe(0)
  })

  it('cas temoin : X -> X en demi-tour retourne l arrivee', () => {
    expect(angleAffiche(180, 90, 90)).toBe(180)
  })

  it('aligne la ligne du dessin sur celle du depart', () => {
    // Depart dessine ligne vers la droite, arrivee dessinee ligne vers le haut :
    // sans pivot, l'arrivee tourne d'un quart a droite pour que sa ligne pointe
    // aussi vers la droite.
    expect(angleAffiche(0, 90, 0)).toBe(90)
    expect(angleAffiche(0, 0, 90)).toBe(270)
  })

  it('cumule rotation du couple et alignement, modulo 360', () => {
    expect(angleAffiche(270, 0, 180)).toBe(90)
    expect(angleAffiche(90, 270, 0)).toBe(0)
  })

  it('ne tourne rien des qu une donnee manque', () => {
    expect(angleAffiche(null, 0, 0)).toBeNull()
    expect(angleAffiche(90, null, 0)).toBeNull()
    expect(angleAffiche(90, 0, null)).toBeNull()
  })
})
