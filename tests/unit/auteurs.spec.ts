import { describe, expect, it } from 'vitest'

import {
  erreurPseudo,
  nettoyerPseudo,
  nomAffiche,
  nomAuteur,
  nomDepuisEmail,
  PSEUDO_MAX,
  pseudoComparable,
} from '@/auteurs'
import type { User } from '@/payload-types'

/**
 * Le nom d'auteur affiche (UX-DR10, demande d'Alain 2026-08-31).
 *
 * Deux sources : le PSEUDO choisi, sinon ce qui precede l'arobase de l'adresse.
 * Ce qui se teste ici, c'est surtout que l'adresse entiere ne sorte jamais — et
 * que les cas tordus rendent `null` plutot qu'une chaine vide, pour que la ligne
 * d'auteur disparaisse au lieu d'afficher « par  ».
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

describe('nomAffiche', () => {
  it('préfère le pseudo à l adresse', () => {
    expect(nomAffiche({ pseudo: 'Le prof', email: 'begey.alain@gmail.com' })).toBe('Le prof')
  })

  it('retombe sur l adresse quand le pseudo est vide', () => {
    // La regle tranchee par Alain : effacer son pseudo ne fait pas disparaitre
    // la ligne d'auteur, elle revient a l'affichage d'avant.
    expect(nomAffiche({ pseudo: null, email: 'begey.alain@gmail.com' })).toBe('begey.alain')
    expect(nomAffiche({ pseudo: '', email: 'begey.alain@gmail.com' })).toBe('begey.alain')
    expect(nomAffiche({ pseudo: '   ', email: 'begey.alain@gmail.com' })).toBe('begey.alain')
  })

  it('ne laisse pas le pseudo faire sortir l adresse', () => {
    // Un pseudo en base est cense etre valide, mais c'est ici que passe TOUT
    // affichage d'auteur : le test vaut filet.
    expect(nomAffiche({ pseudo: null, email: 'alain@gmail.com' })).not.toContain('@')
  })
})

describe('nettoyerPseudo', () => {
  it('coupe les bords et ramène les espaces internes à un', () => {
    // « Alain  B » et « Alain B » se lisent pareil : ils ne doivent pas pouvoir
    // coexister comme deux auteurs distincts.
    expect(nettoyerPseudo('  Alain   B  ')).toBe('Alain B')
    expect(nettoyerPseudo(null)).toBe('')
  })
})

describe('pseudoComparable', () => {
  it('ignore la casse et les accents', () => {
    expect(pseudoComparable('Chloé')).toBe(pseudoComparable('chloe'))
    expect(pseudoComparable('ALAIN')).toBe(pseudoComparable('alain'))
  })
})

describe('erreurPseudo', () => {
  it('accepte les noms qu on écrit vraiment', () => {
    expect(erreurPseudo('Alain')).toBeNull()
    expect(erreurPseudo('Jean-Bapt.')).toBeNull()
    expect(erreurPseudo('Chloé B')).toBeNull()
    expect(erreurPseudo('rock6')).toBeNull()
    expect(erreurPseudo("O'Neil")).toBeNull()
  })

  it('laisse passer le vide : le pseudo est facultatif', () => {
    expect(erreurPseudo('')).toBeNull()
  })

  it('refuse ce qui est trop court ou trop long', () => {
    expect(erreurPseudo('A')).not.toBeNull()
    expect(erreurPseudo('a'.repeat(PSEUDO_MAX + 1))).not.toBeNull()
    expect(erreurPseudo('a'.repeat(PSEUDO_MAX))).toBeNull()
  })

  it('compte les caractères, pas les unités UTF-16', () => {
    // « 𝐀 » (U+1D400) est une LETTRE, mais elle occupe deux unites UTF-16 :
    // compte avec `.length`, ce pseudo de PSEUDO_MAX caracteres serait refuse
    // a tort.
    const lettreHorsPlanDeBase = '𝐀'
    expect(erreurPseudo(lettreHorsPlanDeBase.repeat(PSEUDO_MAX))).toBeNull()
    expect(erreurPseudo(lettreHorsPlanDeBase.repeat(PSEUDO_MAX + 1))).not.toBeNull()
  })

  it('refuse ce qui ressemble à une adresse', () => {
    // Tout ce module existe pour ne pas publier d'adresse : on ne va pas
    // laisser quelqu'un en publier une volontairement.
    expect(erreurPseudo('alain@gmail.com')).toContain('arobase')
  })

  it('refuse un début en ponctuation', () => {
    // Invisible a la lecture, et se classe n'importe ou dans une liste triee.
    expect(erreurPseudo('.alain')).not.toBeNull()
    expect(erreurPseudo('-alain')).not.toBeNull()
  })

  it('refuse les caractères qui n ont rien à faire dans un nom', () => {
    expect(erreurPseudo('<script>')).not.toBeNull()
    expect(erreurPseudo('alain/prof')).not.toBeNull()
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
