import { describe, expect, it } from 'vitest'

import {
  dateDuJour,
  isoVersJour,
  jourVersISO,
  passesDepuis,
  positionCourante,
  type VuePasse,
} from '@/composition'

/**
 * Moteur de composition (Stories 4.1 / 4.2 / 4.3).
 *
 * Ce qui compte ici, c'est la PROMESSE DU PRODUIT : le compositeur ne propose
 * jamais un mouvement impossible. Tout le reste (l'ecran, les boutons) n'est
 * qu'un habillage de ces quatre fonctions pures — aucune base, aucun rendu.
 */

function passe(id: number, nom: string, debut: number, fin: number): VuePasse {
  return { id, nom, difficulte: null, debut, fin }
}

// Un petit graphe : 1 --pied--> 2 --toupie--> 1, et 1 --tour--> 3 (cul-de-sac).
const pied = passe(10, 'Passe pied', 1, 2)
const toupie = passe(11, 'Toupie', 2, 1)
const tour = passe(12, 'Tour de main', 1, 3)
const catalogue = [pied, toupie, tour]

describe('passesDepuis', () => {
  it('ne renvoie que les passes qui partent de la position courante', () => {
    expect(passesDepuis(catalogue, 1).map((p) => p.nom)).toEqual(['Passe pied', 'Tour de main'])
    expect(passesDepuis(catalogue, 2).map((p) => p.nom)).toEqual(['Toupie'])
  })

  it('renvoie une liste vide depuis une position sans passe sortante (cul-de-sac)', () => {
    expect(passesDepuis(catalogue, 3)).toEqual([])
  })

  it('ne propose rien tant que la position de depart est inconnue', () => {
    // Surtout pas « toutes les passes » : on ne sait pas encore d'ou l'on part.
    expect(passesDepuis(catalogue, null)).toEqual([])
  })
})

describe('positionCourante', () => {
  it('vaut la position de depart tant que la chaine est vide', () => {
    expect(positionCourante(1, [])).toBe(1)
    expect(positionCourante(null, [])).toBeNull()
  })

  it("avance vers la position d'arrivee de la derniere passe posee", () => {
    expect(positionCourante(1, [pied])).toBe(2)
    expect(positionCourante(1, [pied, toupie])).toBe(1)
  })

  it('recule d’un cran quand on retire la derniere passe', () => {
    // L'annulation ne touche que la chaine : la position courante s'en deduit,
    // elle n'est jamais un etat tenu a cote qui pourrait se desynchroniser.
    const chaine = [pied, toupie]
    expect(positionCourante(1, chaine.slice(0, -1))).toBe(2)
  })
})

describe('jourVersISO', () => {
  it('stocke un jour a minuit UTC, comme la migration de l’historique', () => {
    expect(jourVersISO('2026-03-12')).toBe('2026-03-12T00:00:00.000Z')
  })

  it('ignore une saisie qui n’est pas un jour', () => {
    // La date est facultative : une saisie douteuse ne doit pas faire echouer
    // l'enregistrement de la chaine.
    expect(jourVersISO('')).toBeUndefined()
    expect(jourVersISO('12/03/2026')).toBeUndefined()
    expect(jourVersISO('2026-13-45')).toBeUndefined()
  })
})

describe('dateDuJour', () => {
  it('donne le jour parisien, pas celui de la machine', () => {
    // 1 h du matin a Paris en ete = 23 h UTC la veille. Un cours note apres
    // minuit doit porter la date du jour ou l'on est, pas celle du serveur.
    expect(dateDuJour(new Date('2026-08-30T23:00:00.000Z'))).toBe('2026-08-31')
    expect(dateDuJour(new Date('2026-08-30T12:00:00.000Z'))).toBe('2026-08-30')
  })
})

describe('isoVersJour', () => {
  it('rend le jour à remettre dans le champ date', () => {
    expect(isoVersJour('2026-03-12T00:00:00.000Z')).toBe('2026-03-12')
  })

  it('lit en UTC, donc ne fait pas reculer une date d hiver', () => {
    // Lue dans le fuseau du serveur, cette date deviendrait le 11 pour tout
    // lecteur a l ouest de Greenwich : rouvrir un enchaînement pour changer son
    // titre ferait glisser sa date au passage.
    expect(isoVersJour('2026-01-05T00:00:00.000Z')).toBe('2026-01-05')
    expect(isoVersJour('2026-07-05T00:00:00.000Z')).toBe('2026-07-05')
  })

  it('rend une chaîne vide quand il n y a pas de date', () => {
    expect(isoVersJour(null)).toBe('')
    expect(isoVersJour(undefined)).toBe('')
    expect(isoVersJour('pas une date')).toBe('')
  })

  it('fait l aller-retour avec jourVersISO', () => {
    expect(isoVersJour(jourVersISO('2026-03-12'))).toBe('2026-03-12')
  })
})
