import { describe, expect, it } from 'vitest'

import {
  dateDuJour,
  isoVersJour,
  jourVersISO,
  passesDepuis,
  positionCourante,
  reprendreChaine,
  transitionsUtiles,
  type MaillonCompose,
  type VuePasse,
  type VueTransition,
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

/** Une passe posee dans la chaine, sans changement de prise avant elle. */
function pose(passe: VuePasse): MaillonCompose {
  return { passe, transitionAvant: null }
}

function transition(debut: number, fin: number, nom: string): VueTransition {
  return { debut, fin, nom, description: null }
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

describe('transitionsUtiles', () => {
  // Depuis 3 (cul-de-sac : aucune passe n'en part), on peut lacher une main
  // pour revenir en 1, d'ou trois passes repartent. C'est exactement ce que
  // fait l'historique pour sortir de « Berceau gauche » et « Enroulee gauche ».
  const sortieDuCulDeSac = transition(3, 1, 'Lâcher la main gauche')

  it('propose le changement de prise qui rouvre le catalogue', () => {
    expect(transitionsUtiles([sortieDuCulDeSac], catalogue, 3)).toEqual([sortieDuCulDeSac])
  })

  it('ecarte celui qui mene vers une position sans passe sortante', () => {
    // Echanger un cul-de-sac contre un autre n'offre rien : la proposer serait
    // promettre une suite qui n'existe pas.
    expect(transitionsUtiles([transition(2, 3, 'Vers nulle part')], catalogue, 2)).toEqual([])
  })

  it('ne propose que celles qui partent d ici', () => {
    expect(transitionsUtiles([sortieDuCulDeSac], catalogue, 2)).toEqual([])
  })

  it('ne propose rien tant que la position de depart est inconnue', () => {
    expect(transitionsUtiles([sortieDuCulDeSac], catalogue, null)).toEqual([])
  })

  it('respecte le sens de l arete', () => {
    // 31 fois « main gauche / main droite » vers « main droite / main droite »
    // dans l'historique, l'inverse jamais : declarer un sens n'ouvre pas l'autre.
    expect(transitionsUtiles([transition(1, 2, 'Aller')], catalogue, 2)).toEqual([])
  })
})

describe('positionCourante', () => {
  it('vaut la position de depart tant que la chaine est vide', () => {
    expect(positionCourante(1, [])).toBe(1)
    expect(positionCourante(null, [])).toBeNull()
  })

  it("avance vers la position d'arrivee de la derniere passe posee", () => {
    expect(positionCourante(1, [pose(pied)])).toBe(2)
    expect(positionCourante(1, [pose(pied), pose(toupie)])).toBe(1)
  })

  it('recule d’un cran quand on retire la derniere passe', () => {
    // L'annulation ne touche que la chaine : la position courante s'en deduit,
    // elle n'est jamais un etat tenu a cote qui pourrait se desynchroniser.
    const chaine = [pose(pied), pose(toupie)]
    expect(positionCourante(1, chaine.slice(0, -1))).toBe(2)
  })

  it('suit le changement de prise choisi mais pas encore consomme', () => {
    // Entre le clic sur la transition et la passe qui la consomme, la position
    // courante n'est plus deductible de la chaine seule : c'est pourquoi elle
    // est un parametre et non un calcul du composant.
    expect(positionCourante(1, [pose(pied)], 3)).toBe(3)
    expect(positionCourante(1, [], 3)).toBe(3)
  })

  it('revient a l arrivee de la derniere passe quand le changement est annule', () => {
    expect(positionCourante(1, [pose(pied)], null)).toBe(2)
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

describe('reprendreChaine', () => {
  it('rend une chaîne vide sans départ', () => {
    // Cas impossible en base (un enchaînement a au moins une passe), mais la
    // page le traverse quand une passe a disparu du catalogue.
    expect(reprendreChaine([])).toEqual({ depart: null, chaine: [] })
  })

  it('remet le départ et les maillons dans l ordre', () => {
    const { depart, chaine } = reprendreChaine([pied, toupie])

    expect(depart).toBe(1)
    expect(chaine.map((maillon) => maillon.passe.id)).toEqual([10, 11])
    expect(chaine.every((maillon) => maillon.transitionAvant === null)).toBe(true)
  })

  it('rededuit le changement de prise d une rupture', () => {
    // `tour` finit en 3, `pied` repart de 1 : la chaîne stockée ne dit pas
    // pourquoi, c'est ici qu'on retrouve « on a changé de prise vers 1 ».
    const { chaine } = reprendreChaine([tour, pied])

    expect(chaine[0].transitionAvant).toBeNull()
    expect(chaine[1].transitionAvant).toBe(1)
  })

  it('reprend une rupture même sans transition déclarée', () => {
    // Une quinzaine d'enchaînements de l'historique sont dans ce cas. Rouvrir
    // l'un d'eux pour corriger son titre ne doit pas amputer sa chaîne : on
    // garde la rupture, le compositeur l'affichera sans la nommer.
    const inconnue = passe(99, 'Venue d ailleurs', 7, 8)
    const { depart, chaine } = reprendreChaine([pied, inconnue])

    expect(depart).toBe(1)
    expect(chaine).toHaveLength(2)
    expect(chaine[1].transitionAvant).toBe(7)
  })

  it('se recompose à l identique une fois enregistrée', () => {
    // L'aller-retour qui compte : seules les passes sont stockées, et ce qu'on
    // relit doit redonner exactement la chaîne qu'on avait sous les yeux.
    const original = reprendreChaine([tour, pied, toupie])
    const stockees = original.chaine.map((maillon) => maillon.passe)

    expect(reprendreChaine(stockees)).toEqual(original)
  })
})
