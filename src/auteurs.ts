import type { Payload, Where } from 'payload'

import { identifiant } from './enchainements'
import { normaliserTexte } from './recherche'
import type { Enchainement, User } from './payload-types'

/**
 * Qui a ecrit cet enchainement (UX-DR10, demande d'Alain 2026-08-31).
 *
 * DEUX SOURCES, DANS CET ORDRE : le PSEUDO choisi, sinon la partie de l'adresse
 * qui precede l'arobase.
 *
 * L'email etait, jusqu'ici, la seule matiere disponible — la collection `users`
 * n'avait que lui — et ce defaut restait devinable : la plupart des comptes sont
 * chez gmail, et un « prenom.nom » se recompose en une ligne. Le pseudo est le
 * remede prevu (action item `pseudo-et-page-auteur`), et il se branche ICI,
 * exactement comme annonce : aucune page n'a eu a changer pour l'accueillir.
 *
 * LE DEFAUT PAR L'EMAIL RESTE, plutot que de n'afficher personne tant qu'aucun
 * pseudo n'est choisi : les 119 enchainements migres ont deja un auteur, et
 * faire disparaitre la ligne d'auteur de toutes les cartes jusqu'a ce que
 * chacun passe par son compte ferait regresser l'affichage au lieu de
 * l'ameliorer.
 *
 * L'EMAIL LUI-MEME NE SORT JAMAIS D'ICI. Les pages recoivent un nom deja
 * reduit, jamais l'objet `User` : rien a filtrer plus loin, rien qui puisse
 * fuir dans une props de composant client ou dans le HTML.
 */

/**
 * Le nom d'affichage tire d'une adresse : ce qui precede l'arobase.
 *
 * `null` quand il n'y a rien de presentable — on n'affiche alors pas de ligne
 * d'auteur du tout, ce qui vaut mieux qu'un « par — » qui n'apprend rien.
 */
export function nomDepuisEmail(email: string | null | undefined): string | null {
  const propre = (email ?? '').trim()
  if (propre === '') return null

  // Pas de `split('@')[0]` : une adresse sans arobase (donnee douteuse) doit
  // rendre quelque chose plutot que rien, et une adresse qui COMMENCE par une
  // arobase ne doit pas rendre une chaine vide.
  const arobase = propre.indexOf('@')
  const nom = arobase > 0 ? propre.slice(0, arobase) : propre

  return nom.trim() === '' ? null : nom.trim()
}

// --- Le pseudo choisi ------------------------------------------------------

/** Bornes du pseudo. Deux caracteres pour « JB », trente pour tenir sur une carte. */
export const PSEUDO_MIN = 2
export const PSEUDO_MAX = 30

/**
 * Caracteres acceptes : lettres (accentuees comprises), chiffres, et les
 * separateurs qu'on ecrit naturellement dans un nom. Le premier caractere doit
 * etre une lettre ou un chiffre : un pseudo qui commence par un point ou un
 * tiret se lit mal et se classe n'importe ou dans une liste triee.
 */
const PSEUDO_ACCEPTE = /^[\p{L}\p{N}][\p{L}\p{N} ._'’-]*$/u

/**
 * La forme retenue d'une saisie : bords coupes, espaces internes ramenes a un.
 *
 * Les espaces multiples comptent : « Alain  B » et « Alain B » se lisent pareil
 * a l'ecran, et deux pseudos qu'on ne distingue pas a l'oeil ne doivent pas
 * pouvoir coexister.
 */
export function nettoyerPseudo(valeur: string | null | undefined): string {
  return (valeur ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * La forme COMPARABLE d'un pseudo (sans accent ni casse) — ce qui porte
 * l'unicite en base, dans la colonne `pseudoNormalise`.
 *
 * Meme normalisation que la recherche par nom : « Alain » et « alain » sont le
 * meme pseudo, et « Chloe » n'est plus libre si « Chloé » est pris. Deux noms
 * qu'on ne peut pas distinguer en les lisant a voix haute ne distinguent pas
 * deux auteurs.
 */
export function pseudoComparable(valeur: string): string {
  return normaliserTexte(valeur)
}

/**
 * Ce qui cloche dans un pseudo, en clair — ou `null` s'il est acceptable.
 *
 * Attend une valeur DEJA nettoyee (`nettoyerPseudo`). La chaine vide n'est pas
 * une erreur : le pseudo est facultatif, et l'effacer remet l'affichage sur
 * l'email. C'est a l'appelant de distinguer « vide » de « invalide ».
 */
export function erreurPseudo(pseudo: string): string | null {
  if (pseudo === '') return null

  // On compte en POINTS DE CODE et non en unites UTF-16 : un emoji ou une
  // lettre hors du plan de base compterait double avec `.length`.
  const longueur = [...pseudo].length

  if (longueur < PSEUDO_MIN) return `Un pseudo fait au moins ${PSEUDO_MIN} caractères.`
  if (longueur > PSEUDO_MAX) return `Un pseudo fait au plus ${PSEUDO_MAX} caractères.`

  // Refuse l'arobase AVANT le motif general, pour lui donner sa propre phrase :
  // un pseudo qui contient une adresse publierait, volontairement cette fois,
  // ce que tout ce module s'emploie a ne pas publier.
  if (pseudo.includes('@')) {
    return 'Un pseudo ne contient pas d’arobase : ce n’est pas une adresse e-mail.'
  }

  if (!PSEUDO_ACCEPTE.test(pseudo)) {
    return 'Un pseudo contient des lettres et des chiffres, et éventuellement espace, point, tiret ou apostrophe.'
  }

  return null
}

/**
 * Le nom sous lequel un compte s'affiche : son pseudo, sinon son email reduit.
 *
 * LE SEUL ENDROIT ou cet arbitrage se fait. Toute page qui affiche un auteur
 * passe par ici (directement, ou par `nomsDesAuteurs`) : le jour ou la regle du
 * vide change, elle change une fois.
 */
export function nomAffiche(compte: Pick<User, 'pseudo' | 'email'>): string | null {
  const pseudo = nettoyerPseudo(compte.pseudo)

  return pseudo !== '' ? pseudo : nomDepuisEmail(compte.email)
}

/**
 * Les noms d'auteur des enchainements donnes, par identifiant de compte.
 *
 * LIT LES COMPTES EN CONTOURNANT LES `access`, DELIBEREMENT. La collection
 * `users` n'est lisible que par soi-meme ou un administrateur (chacun son
 * compte) : sans ce contournement, un visiteur anonyme ne verrait aucun nom, et
 * l'auteur ne s'afficherait que pour lui-meme. Ce qui sort d'ici est le seul
 * fragment qu'Alain a decide de rendre public — jamais l'adresse.
 *
 * Une seule requete, quel que soit le nombre de cartes : les identifiants sont
 * dedoublonnes avant l'appel.
 */
export async function nomsDesAuteurs(
  payload: Payload,
  enchainements: Pick<Enchainement, 'auteur'>[],
): Promise<Map<number, string>> {
  const ids = [
    ...new Set(
      enchainements
        .map((enchainement) => identifiant(enchainement.auteur))
        .filter((id): id is number => id !== null),
    ),
  ]

  if (ids.length === 0) return new Map()

  const { docs } = await payload.find({
    collection: 'users',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
  })

  const noms = new Map<number, string>()
  for (const compte of docs) {
    const nom = nomAffiche(compte)
    if (nom !== null) noms.set(compte.id, nom)
  }

  return noms
}

/** Le nom d'affichage de l'auteur d'un enchainement, ou `null`. */
export function nomAuteur(
  enchainement: Pick<Enchainement, 'auteur'>,
  noms: Map<number, string>,
): string | null {
  const id = identifiant(enchainement.auteur)

  return id === null ? null : (noms.get(id) ?? null)
}

/** Un auteur proposable au filtre. */
export type ChoixAuteur = { id: number; nom: string }

/**
 * Les auteurs qu'on peut proposer au filtre de la liste.
 *
 * TIRES DES ENCHAINEMENTS VISIBLES, et surtout PAS de la table des comptes.
 * Lister les comptes reviendrait a publier, a qui passe par la, le nom de
 * chaque personne inscrite — y compris celles qui n'ont jamais rien partage.
 * Ici, n'apparait que quelqu'un dont le lecteur voit deja au moins un
 * enchainement : le filtre ne dit rien de plus que la liste elle-meme.
 *
 * `overrideAccess: false` avec l'utilisateur courant : la visibilite est celle
 * de la collection (ADD-5), la meme que pour la liste.
 *
 * COUT : une lecture de la colonne `auteur` sur les enchainements visibles, a
 * chaque affichage de la liste. Une colonne d'entiers, quelques milliers de
 * lignes au plus — SQLite lit ca sans y penser. Le jour ou ce n'est plus vrai,
 * c'est une requete DISTINCT qu'il faudra, pas une liste des comptes.
 */
export async function auteursProposables(
  payload: Payload,
  utilisateur: User | null,
  ou?: Where,
): Promise<ChoixAuteur[]> {
  const { docs } = await payload.find({
    collection: 'enchainements',
    where: ou,
    pagination: false,
    depth: 0,
    select: { auteur: true },
    overrideAccess: false,
    user: utilisateur,
  })

  const noms = await nomsDesAuteurs(payload, docs)

  return [...noms.entries()]
    .map(([id, nom]) => ({ id, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}
