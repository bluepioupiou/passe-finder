import { describe, expect, it } from 'vitest'

import {
  chaineDe,
  cleDeTransition,
  construireChaine,
  extremites,
  formaterDate,
  peutModifier,
  placeDansLaChaine,
  rangsDeLaPasse,
  typologie,
} from '@/enchainements'
import type { Pass, Position, Transition, User } from '@/payload-types'

/**
 * Lecture d'un enchainement (Story 4.4).
 *
 * Ce qui compte vraiment ici, c'est la RUPTURE : 59 des 120 enchainements
 * repris de l'ancienne appli enchainent une passe qui ne part pas de la
 * position d'arrivee de la precedente (transitions de main). La vue lecture
 * doit les nommer quand la transition est declaree, et les MONTRER QUAND MEME
 * quand elle ne l'est pas — jamais les masquer ni les traiter comme une erreur.
 *
 * Fonctions pures : aucune base, aucun rendu.
 */

function position(id: number, nom: string): Position {
  return { id, nom, danse: 1, updatedAt: '', createdAt: '' } as Position
}

function passe(id: number, nom: string, debut: Position, fin: Position): Pass {
  return { id, nom, positionDebut: debut, positionFin: fin, updatedAt: '', createdAt: '' } as Pass
}

const fermee = position(1, 'Position fermée')
const ouverte = position(2, 'Position ouverte')
const mainDroite = position(3, 'Main droite / main droite')

function transition(debut: Position, fin: Position, nom?: string | null): Transition {
  return {
    id: 1,
    positionDebut: debut,
    positionFin: fin,
    nom,
    description: 'Il vous suffit juste de lâcher votre main gauche',
    updatedAt: '',
    createdAt: '',
  } as Transition
}

/** Le catalogue de transitions, indexe par trajet — comme `chargerCatalogue`. */
function catalogueDe(...transitions: Transition[]): Map<string, Transition> {
  return new Map(
    transitions.map((t) => [cleDeTransition(t.positionDebut, t.positionFin) as string, t]),
  )
}

describe('construireChaine', () => {
  it('ne signale aucune rupture quand la chaine est continue', () => {
    const maillons = construireChaine([
      passe(10, 'Passe pied', fermee, ouverte),
      passe(11, 'Toupie', ouverte, fermee),
    ])

    expect(maillons.map((maillon) => maillon.rupture)).toEqual([null, null])
    expect(maillons[0].debut?.nom).toBe('Position fermée')
    expect(maillons[1].fin?.nom).toBe('Position fermée')
  })

  it('signale la reprise quand la passe suivante part d une autre position', () => {
    const maillons = construireChaine([
      passe(10, 'Passe pied', fermee, ouverte),
      passe(12, 'Caresse', mainDroite, fermee),
    ])

    expect(maillons[0].rupture).toBeNull()
    expect(maillons[1].rupture).toEqual({
      arrivait: ouverte,
      reprend: mainDroite,
      // Sans catalogue de transitions, la rupture est vue mais pas nommee :
      // c'est le cas de la quinzaine de reprises de l'historique qu'Alain n'a
      // pas encore ecrites, et elles doivent s'afficher comme avant.
      transition: null,
    })
  })

  it('nomme la reprise quand la transition est declaree', () => {
    const maillons = construireChaine(
      [passe(10, 'Passe pied', fermee, ouverte), passe(12, 'Caresse', mainDroite, fermee)],
      catalogueDe(transition(ouverte, mainDroite, 'Lâcher la main gauche')),
    )

    expect(maillons[1].rupture?.transition).toEqual({
      nom: 'Lâcher la main gauche',
      description: 'Il vous suffit juste de lâcher votre main gauche',
    })
  })

  it('donne un libelle par defaut a la transition sans nom', () => {
    // Les dix transitions migrees de 2009 n'ont qu'une description : elles
    // doivent s'afficher, pas rester anonymes.
    const maillons = construireChaine(
      [passe(10, 'Passe pied', fermee, ouverte), passe(12, 'Caresse', mainDroite, fermee)],
      catalogueDe(transition(ouverte, mainDroite, null)),
    )

    expect(maillons[1].rupture?.transition?.nom).toBe('Changement de prise')
  })

  it('ne nomme pas la reprise avec la transition du sens inverse', () => {
    // L'arete est DIRIGEE : declarer B -> A n'explique pas A -> B.
    const maillons = construireChaine(
      [passe(10, 'Passe pied', fermee, ouverte), passe(12, 'Caresse', mainDroite, fermee)],
      catalogueDe(transition(mainDroite, ouverte, 'Sens inverse')),
    )

    expect(maillons[1].rupture).not.toBeNull()
    expect(maillons[1].rupture?.transition).toBeNull()
  })

  it('ne nomme rien quand la chaine est continue', () => {
    // Une transition qui existe entre deux positions ne doit pas se declencher
    // la ou la passe suivante part bien de l'arrivee de la precedente.
    const maillons = construireChaine(
      [passe(10, 'Passe pied', fermee, ouverte), passe(11, 'Toupie', ouverte, fermee)],
      catalogueDe(transition(ouverte, mainDroite, 'Lâcher la main gauche')),
    )

    expect(maillons.map((maillon) => maillon.rupture)).toEqual([null, null])
  })

  it('ne signale jamais de rupture sur le premier maillon', () => {
    // Il n'y a rien avant lui : sa position de depart EST le debut du parcours.
    const maillons = construireChaine([passe(12, 'Caresse', mainDroite, fermee)])

    expect(maillons[0].rupture).toBeNull()
  })
})

describe('extremites', () => {
  it('donne la position de depart et celle d arrivee', () => {
    const { depart, arrivee } = extremites([
      passe(10, 'Passe pied', fermee, ouverte),
      passe(11, 'Toupie', ouverte, mainDroite),
    ])

    expect(depart?.nom).toBe('Position fermée')
    expect(arrivee?.nom).toBe('Main droite / main droite')
  })

  it('accepte une chaine vide', () => {
    expect(extremites([])).toEqual({ depart: null, arrivee: null })
  })
})

describe('chaineDe', () => {
  const passes = new Map([[10, passe(10, 'Passe pied', fermee, ouverte)]])
  const positions = new Map([
    [1, fermee],
    [2, ouverte],
  ])

  it('resout les passes dans l ordre du tableau', () => {
    const resolues = chaineDe([{ passe: 10 }, { passe: 10 }], passes, positions)

    expect(resolues).toHaveLength(2)
    expect(resolues[0].nom).toBe('Passe pied')
  })

  it('ignore une passe introuvable plutot que de casser la page', () => {
    // Une chaine amputee d'un maillon reste plus utile qu'une erreur.
    expect(chaineDe([{ passe: 10 }, { passe: 999 }], passes, positions)).toHaveLength(1)
  })
})

describe('formaterDate', () => {
  it('formate en francais', () => {
    expect(formaterDate('2026-03-12T00:00:00.000Z')).toBe('12 mars 2026')
  })

  it('lit la date en UTC, sans reculer d un jour', () => {
    // Payload stocke une date « jour seul » a minuit UTC : formatee dans un
    // fuseau a l'ouest de Greenwich, elle designerait la veille.
    expect(formaterDate('2026-01-01T00:00:00.000Z')).toBe('1 janvier 2026')
  })

  it('rend null quand il n y a pas de date', () => {
    expect(formaterDate(null)).toBeNull()
    expect(formaterDate(undefined)).toBeNull()
    expect(formaterDate('pas une date')).toBeNull()
  })
})

describe('typologie', () => {
  // Serpentin sur 3 colonnes : la ligne 1 va a droite, la ligne 2 revient a
  // gauche, et le passage de l'une a l'autre se fait par le bas.
  it('deroule la premiere ligne de gauche a droite', () => {
    expect(typologie(0, 3, false)).toEqual({ entree: 'gauche', sortie: 'droite' })
    expect(typologie(1, 3, false)).toEqual({ entree: 'gauche', sortie: 'droite' })
  })

  it('sort par le bas au bout de la ligne', () => {
    expect(typologie(2, 3, false)).toEqual({ entree: 'gauche', sortie: 'bas' })
  })

  it('repart de droite a gauche a la ligne suivante', () => {
    // On entre par le haut : c'est la carte qui recoit le changement de ligne.
    expect(typologie(3, 3, false)).toEqual({ entree: 'haut', sortie: 'gauche' })
    expect(typologie(4, 3, false)).toEqual({ entree: 'droite', sortie: 'gauche' })
    expect(typologie(5, 3, false)).toEqual({ entree: 'droite', sortie: 'bas' })
  })

  it('reprend vers la droite a la ligne d apres', () => {
    expect(typologie(6, 3, false)).toEqual({ entree: 'haut', sortie: 'droite' })
  })

  it('ne fait pas descendre la derniere carte de la chaine', () => {
    // Sortir par le bas designerait une ligne suivante qui n'existe pas : la
    // position d'arrivee se pose au bout du fil, dans le sens de lecture.
    expect(typologie(2, 3, true)).toEqual({ entree: 'gauche', sortie: 'droite' })
    expect(typologie(5, 3, true)).toEqual({ entree: 'droite', sortie: 'gauche' })
  })

  it('serpente aussi sur deux colonnes', () => {
    expect(typologie(0, 2, false)).toEqual({ entree: 'gauche', sortie: 'droite' })
    expect(typologie(1, 2, false)).toEqual({ entree: 'gauche', sortie: 'bas' })
    expect(typologie(2, 2, false)).toEqual({ entree: 'haut', sortie: 'gauche' })
    expect(typologie(3, 2, false)).toEqual({ entree: 'droite', sortie: 'bas' })
  })

  it('devient un simple flux vertical sur une colonne', () => {
    // Le telephone : un seul fil, du haut vers le bas, la bulle entre chaque
    // paire de cartes.
    for (const index of [0, 1, 5, 42]) {
      expect(typologie(index, 1, false)).toEqual({ entree: 'haut', sortie: 'bas' })
    }
  })
})

describe('peutModifier', () => {
  const auteur = { id: 7 } as User
  const autre = { id: 9 } as User
  const administrateur = { id: 3, admin: true } as User

  it('accepte l auteur', () => {
    expect(peutModifier({ auteur: auteur.id }, auteur)).toBe(true)
  })

  it('refuse quelqu un d autre, et un visiteur anonyme', () => {
    // Le lien « Modifier » ne doit pas apparaitre sur l enchaînement d un
    // autre : il menerait a une porte fermee. La collection refuse de son cote,
    // et c est teste en integration — ici on evite seulement la promesse non
    // tenue.
    expect(peutModifier({ auteur: auteur.id }, autre)).toBe(false)
    expect(peutModifier({ auteur: auteur.id }, null)).toBe(false)
  })

  it('accepte un administrateur, comme la collection', () => {
    expect(peutModifier({ auteur: auteur.id }, administrateur)).toBe(true)
  })

  it('reconnaît l auteur que la relation soit résolue ou non', () => {
    // Selon la profondeur de lecture, `auteur` est un identifiant ou l objet
    // complet : la reponse ne doit pas dependre d un detail de requete.
    expect(peutModifier({ auteur }, auteur)).toBe(true)
    expect(peutModifier({ auteur }, autre)).toBe(false)
  })
})

/**
 * La PLACE d'une passe dans un enchaînement (FR-24, 2026-09-07).
 *
 * C'est ce qui transforme la liste de la fiche passe en exemples : sans elle,
 * dix titres n'apprennent rien sur la passe qu'on est en train de lire. Le cas
 * qui compte est la RÉPÉTITION — une passe se danse deux fois dans la même
 * chaîne, et ne montrer que la première occurrence donnerait une réponse
 * incomplète que rien ne signalerait à l'écran.
 */
describe('Place d une passe dans une chaine', () => {
  const chaine = (...ids: number[]) => ids.map((id) => ({ passe: id }))

  it('numérote à partir de 1, dans l ordre du tableau', () => {
    // L'index EST l'ordre de l'enchaînement (ADD-18) : aucun champ « rang » à
    // recouper, mais un décalage de 1 à ne pas oublier.
    expect(rangsDeLaPasse(chaine(7, 3, 9), 3)).toEqual([2])
    expect(rangsDeLaPasse(chaine(7, 3, 9), 7)).toEqual([1])
  })

  it('rend TOUTES les occurrences quand la passe se répète', () => {
    expect(rangsDeLaPasse(chaine(3, 7, 3, 9, 3), 3)).toEqual([1, 3, 5])
  })

  it('lit la relation résolue comme l identifiant nu', () => {
    // Selon la profondeur de lecture, `passe` est un numéro ou l'objet : la
    // réponse ne doit pas dépendre d'un détail de requête.
    expect(rangsDeLaPasse([{ passe: { id: 3 } as Pass }], 3)).toEqual([1])
  })

  it('rend une liste vide quand la passe n est pas là', () => {
    expect(rangsDeLaPasse(chaine(7, 9), 3)).toEqual([])
  })

  it('écrit la place en toutes lettres, au féminin au premier rang', () => {
    // « 1er » parlerait d'un maillon ; c'est une passe.
    expect(placeDansLaChaine([1], 8)).toBe('1re passe sur 8')
    expect(placeDansLaChaine([3], 8)).toBe('3e passe sur 8')
  })

  it('énumère les répétitions et accorde le pluriel', () => {
    expect(placeDansLaChaine([2, 5], 8)).toBe('2e et 5e passes sur 8')
    expect(placeDansLaChaine([1, 4, 6], 8)).toBe('1re, 4e et 6e passes sur 8')
  })

  it('ne dit rien plutôt que de dire « 0e passe »', () => {
    // Le cas ne devrait pas arriver — la liste vient d'une requête sur cette
    // passe — mais une ligne muette vaut mieux qu'une ligne fausse.
    expect(placeDansLaChaine([], 8)).toBeNull()
    expect(placeDansLaChaine([1], 0)).toBeNull()
  })
})
