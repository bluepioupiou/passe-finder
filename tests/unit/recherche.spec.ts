import { describe, it, expect } from 'vitest'

import { correspondAuNom, normaliserTexte } from '@/recherche'

/**
 * Recherche par nom du catalogue (Story 5.4).
 *
 * Le comportement qui compte vraiment ici est l'insensibilite aux accents :
 * c'est ce qui fait qu'on trouve « Croisé » en tapant « croise », sans que le
 * lecteur ait a comprendre pourquoi sa recherche echouait.
 */
describe('normaliserTexte', () => {
  it('supprime les accents et la casse', () => {
    expect(normaliserTexte('Croisé')).toBe('croise')
    expect(normaliserTexte('POSITION FERMÉE')).toBe('position fermee')
    expect(normaliserTexte('Ça')).toBe('ca')
  })

  it('ignore les espaces autour', () => {
    expect(normaliserTexte('  ouverte  ')).toBe('ouverte')
  })
})

describe('correspondAuNom', () => {
  it('trouve un nom accentue depuis une saisie sans accent', () => {
    expect(correspondAuNom('Croisé devant', 'croise')).toBe(true)
  })

  it('trouve une correspondance partielle, quelle que soit la casse', () => {
    expect(correspondAuNom('Position ouverte', 'OUVERT')).toBe(true)
  })

  it('rejette ce qui ne correspond pas', () => {
    expect(correspondAuNom('Position ouverte', 'fermee')).toBe(false)
  })

  it('laisse tout passer quand la requete est vide', () => {
    // L'absence de filtre n'est pas un resultat vide : la grille reste entiere.
    expect(correspondAuNom('Position ouverte', '')).toBe(true)
    expect(correspondAuNom('Position ouverte', '   ')).toBe(true)
  })
})
