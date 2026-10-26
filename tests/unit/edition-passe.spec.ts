import { describe, expect, it } from 'vitest'

import { donneesDePasse, type SaisiePasse } from '@/edition-passe'

/**
 * Modifier une passe depuis le site.
 *
 * LE PIEGE A COUVRIR : un champ vide doit EFFACER (`null`), et une valeur de
 * select inattendue ne doit jamais devenir un pivot plausible mais faux.
 */

const saisie = (surcharge: Partial<SaisiePasse> = {}): SaisiePasse => ({
  id: 1,
  nom: 'Passe à droite',
  positionDebut: 2,
  positionFin: 3,
  description: '',
  deroule: '',
  difficulte: '',
  pivot: '',
  duree: '6',
  ...surcharge,
})

describe('donneesDePasse', () => {
  it('refuse un nom vide', () => {
    expect(donneesDePasse(saisie({ nom: '   ' })).ok).toBe(false)
  })

  it('ramene les champs vides a null', () => {
    const resultat = donneesDePasse(saisie({ nom: '  Passe à droite  ' }))
    expect(resultat).toEqual({
      ok: true,
      donnees: {
        nom: 'Passe à droite',
        positionDebut: 2,
        positionFin: 3,
        description: null,
        deroule: null,
        difficulte: null,
        pivot: null,
        duree: '6',
      },
    })
  })

  it('garde un pivot et une difficulte connus', () => {
    const resultat = donneesDePasse(saisie({ pivot: '270', difficulte: '3' }))
    expect(resultat.ok && resultat.donnees.pivot).toBe('270')
    expect(resultat.ok && resultat.donnees.difficulte).toBe('3')
  })

  it('lit une valeur inattendue comme non renseignee, jamais comme 0', () => {
    const resultat = donneesDePasse(saisie({ pivot: '45', difficulte: '9' }))
    expect(resultat.ok && resultat.donnees.pivot).toBeNull()
    expect(resultat.ok && resultat.donnees.difficulte).toBeNull()
  })

  it('garde une duree de 10 temps', () => {
    const resultat = donneesDePasse(saisie({ duree: '10' }))
    expect(resultat.ok && resultat.donnees.duree).toBe('10')
  })

  it('ecrit 6 temps pour une duree vide ou inattendue, jamais 8', () => {
    for (const duree of ['', '8', 'dix']) {
      const resultat = donneesDePasse(saisie({ duree }))
      expect(resultat.ok && resultat.donnees.duree).toBe('6')
    }
  })

  it('refuse une position absente', () => {
    expect(donneesDePasse(saisie({ positionFin: Number.NaN })).ok).toBe(false)
  })
})
