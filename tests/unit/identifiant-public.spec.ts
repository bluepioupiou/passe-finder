import { describe, expect, it } from 'vitest'

import {
  estIdentifiantPublic,
  LONGUEUR_IDENTIFIANT,
  nouvelIdentifiantPublic,
} from '@/identifiant-public'

/**
 * L'identifiant public (action item `identifiant-opaque-et-visibilites`).
 *
 * Ce qui se teste ici n'est pas « la fonction rend une chaîne » mais les deux
 * propriétés dont dépend tout le modèle de visibilité : l'identifiant NE SE
 * DEVINE PAS, et un ANCIEN NUMÉRO n'en est pas un.
 */

describe('nouvelIdentifiantPublic', () => {
  it('rend un identifiant de la forme attendue', () => {
    const identifiant = nouvelIdentifiantPublic()

    expect(identifiant).toHaveLength(LONGUEUR_IDENTIFIANT)
    expect(estIdentifiantPublic(identifiant)).toBe(true)
  })

  it('ne rend jamais deux fois la même chose', () => {
    // Pas une preuve d'unicité — c'en est une de NON-DÉTERMINISME. Un
    // générateur qui repartirait d'un compteur ou d'une graine fixe (le piège
    // classique) tomberait ici, et rendrait tous les liens devinables.
    const tirages = new Set(Array.from({ length: 500 }, () => nouvelIdentifiantPublic()))

    expect(tirages.size).toBe(500)
  })

  it('ne produit rien qui doive être échappé dans une URL', () => {
    // `base64url` et non `base64` : ni `+`, ni `/`, ni `=`. Un lien qui se
    // casse au copier-coller ne serait pas un lien de partage.
    for (let essai = 0; essai < 200; essai += 1) {
      const identifiant = nouvelIdentifiantPublic()

      expect(identifiant).toBe(encodeURIComponent(identifiant))
    }
  })
})

describe('estIdentifiantPublic', () => {
  it('accepte l alphabet et la longueur attendus', () => {
    expect(estIdentifiantPublic('abcDEF012_-x')).toBe(true)
  })

  it('refuse un ancien numéro', () => {
    // LE CAS QUI COMPTE. Les 120 enchaînements migrés vivaient sur
    // /enchainements/1 à /120 ; ces adresses ne doivent plus rien atteindre,
    // sans quoi on retrouverait n'importe quel non-répertorié en comptant.
    expect(estIdentifiantPublic('1')).toBe(false)
    expect(estIdentifiantPublic('120')).toBe(false)
    expect(estIdentifiantPublic('000000000012')).toBe(true)
  })

  it('refuse ce qui n a pas la bonne longueur', () => {
    expect(estIdentifiantPublic('abcDEF012_-')).toBe(false)
    expect(estIdentifiantPublic('abcDEF012_-xy')).toBe(false)
    expect(estIdentifiantPublic('')).toBe(false)
  })

  it('refuse ce qui sort de l alphabet', () => {
    // Rien de tordu n'atteint la couche SQL : ni point, ni barre oblique, ni
    // caractère accentué.
    expect(estIdentifiantPublic('abcDEF012_-.')).toBe(false)
    expect(estIdentifiantPublic('../../secret')).toBe(false)
    expect(estIdentifiantPublic('abcDEF012_-é')).toBe(false)
    expect(estIdentifiantPublic('abcDEF012 -x')).toBe(false)
  })
})
