import { describe, expect, it } from 'vitest'

import { comptage, dureeDe, libelleInstant } from '@/rythme'

/**
 * Le rythme d'une passe (Epic 8).
 *
 * LE PIEGE A COUVRIR : ici, contrairement a l'orientation, « non renseigne »
 * VAUT 6 temps (decision d'Alain) — et une valeur inattendue aussi. Le comptage
 * doit etre exactement celui qu'Alain dit en cours, pas une suite de points.
 */

describe('dureeDe', () => {
  it('lit les deux durees du select', () => {
    expect(dureeDe('6')).toBe(6)
    expect(dureeDe('10')).toBe(10)
    expect(dureeDe(10)).toBe(10)
  })

  it('lit une duree non renseignee comme 6 temps', () => {
    expect(dureeDe(null)).toBe(6)
    expect(dureeDe(undefined)).toBe(6)
    expect(dureeDe('')).toBe(6)
  })

  it('lit une valeur inattendue comme 6 temps (8 temps n existe pas)', () => {
    expect(dureeDe('8')).toBe(6)
    expect(dureeDe('12')).toBe(6)
    expect(dureeDe('dix')).toBe(6)
  })
})

describe('comptage', () => {
  it('compte 6 temps en 12 instants', () => {
    expect(comptage(6).join(' ')).toBe('1 . 2 . 3 et 4 . 5 et 6 .')
    expect(comptage(6)).toHaveLength(12)
  })

  it('compte 10 temps en repetant « 3 et 4 . 5 et 6 . »', () => {
    expect(comptage(10).join(' ')).toBe('1 . 2 . 3 et 4 . 5 et 6 . 7 et 8 . 9 et 10 .')
    expect(comptage(10)).toHaveLength(20)
  })
})

describe('libelleInstant', () => {
  it('nomme un temps par son chiffre', () => {
    expect(libelleInstant(6, 0)).toBe('1')
    expect(libelleInstant(6, 6)).toBe('4')
  })

  it('nomme un demi-temps avec le temps qui le precede', () => {
    expect(libelleInstant(6, 5)).toBe('3 et')
    expect(libelleInstant(6, 1)).toBe('1 .')
    expect(libelleInstant(6, 11)).toBe('6 .')
    expect(libelleInstant(10, 19)).toBe('10 .')
  })

  it('rend null hors de la duree', () => {
    expect(libelleInstant(6, 12)).toBeNull()
    expect(libelleInstant(6, -1)).toBeNull()
    expect(libelleInstant(6, 2.5)).toBeNull()
    expect(libelleInstant(10, 19)).not.toBeNull()
  })
})
