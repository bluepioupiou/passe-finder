import { describe, expect, it } from 'vitest'

import { peutEtreMisEnFavori } from '@/favoris'
import type { User } from '@/payload-types'

/**
 * Contrainte de favori (ADD-9), cote interface.
 *
 * Ce predicat ne SECURISE rien — la collection `Favori` refuse de son cote, et
 * c'est teste en integration. Il decide seulement s'il faut PROPOSER le bouton.
 * Il est teste a part parce qu'il est pur, et parce qu'une regle a trois
 * conditions se trompe silencieusement : proposer un bouton qui sera refuse est
 * une promesse non tenue, ne pas le proposer alors qu'il marcherait est une
 * fonction invisible.
 */
const eleve = { id: 7 } as User
const autre = { id: 9 } as User

describe('peutEtreMisEnFavori', () => {
  it('accepte un enchaînement partagé écrit par quelqu un d autre', () => {
    expect(peutEtreMisEnFavori({ visibilite: 'public', auteur: autre.id }, eleve)).toBe(true)
  })

  it('refuse à un visiteur anonyme', () => {
    expect(peutEtreMisEnFavori({ visibilite: 'public', auteur: autre.id }, null)).toBe(false)
  })

  it('refuse un enchaînement privé', () => {
    expect(peutEtreMisEnFavori({ visibilite: 'prive', auteur: autre.id }, eleve)).toBe(false)
  })

  it('refuse son propre enchaînement', () => {
    // On ne met pas en signet ce qu'on a ecrit : « mes enchainements » le
    // montre deja, a part (Story 5.2).
    expect(peutEtreMisEnFavori({ visibilite: 'public', auteur: eleve.id }, eleve)).toBe(false)
  })

  it("reconnaît l auteur que la relation soit résolue ou non", () => {
    // Selon la profondeur de lecture, `auteur` est un identifiant ou l'objet
    // complet. Les deux formes doivent donner la meme reponse, sans quoi la
    // regle dependrait d'un detail de requete.
    expect(peutEtreMisEnFavori({ visibilite: 'public', auteur: eleve }, eleve)).toBe(false)
    expect(peutEtreMisEnFavori({ visibilite: 'public', auteur: autre }, eleve)).toBe(true)
  })
})
