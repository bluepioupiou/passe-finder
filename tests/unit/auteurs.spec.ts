import { describe, expect, it } from 'vitest'

import { nomAuteur, nomDepuisEmail } from '@/auteurs'
import type { User } from '@/payload-types'

/**
 * Le nom d'auteur affiche (UX-DR10, demande d'Alain 2026-08-31).
 *
 * La collection `users` n'a que l'email : le nom affiche est ce qui PRECEDE
 * l'arobase. Ce qui se teste ici, c'est surtout que l'adresse entiere ne sorte
 * jamais — et que les cas tordus rendent `null` plutot qu'une chaine vide, pour
 * que la ligne d'auteur disparaisse au lieu d'afficher « par  ».
 */

describe('nomDepuisEmail', () => {
  it('garde ce qui précède l arobase', () => {
    expect(nomDepuisEmail('begey.alain@gmail.com')).toBe('begey.alain')
    expect(nomDepuisEmail('  alain@exemple.fr  ')).toBe('alain')
  })

  it('ne laisse jamais passer le domaine', () => {
    // Le point du test : c'est l'adresse qu'on refuse de publier.
    expect(nomDepuisEmail('alain@gmail.com')).not.toContain('@')
    expect(nomDepuisEmail('alain@gmail.com')).not.toContain('gmail')
  })

  it('rend null quand il n y a rien de présentable', () => {
    expect(nomDepuisEmail('')).toBeNull()
    expect(nomDepuisEmail('   ')).toBeNull()
    expect(nomDepuisEmail(null)).toBeNull()
    // Une adresse qui commence par l'arobase ne doit pas rendre une chaine vide.
    expect(nomDepuisEmail('@exemple.fr')).toBe('@exemple.fr')
  })

  it('rend quelque chose même sans arobase', () => {
    // Donnee douteuse, mais afficher « alain » vaut mieux que rien.
    expect(nomDepuisEmail('alain')).toBe('alain')
  })
})

describe('nomAuteur', () => {
  const noms = new Map([[7, 'alain']])

  it('trouve le nom que la relation soit résolue ou non', () => {
    expect(nomAuteur({ auteur: 7 }, noms)).toBe('alain')
    expect(nomAuteur({ auteur: { id: 7 } as User }, noms)).toBe('alain')
  })

  it('rend null pour un auteur inconnu', () => {
    // Compte supprime, ou nom illisible : la ligne d'auteur disparait plutot
    // que d'afficher un « par — » qui n'apprend rien.
    expect(nomAuteur({ auteur: 9 }, noms)).toBeNull()
  })
})
