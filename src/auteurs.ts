import type { Payload, Where } from 'payload'

import { identifiant } from './enchainements'
import type { Enchainement, User } from './payload-types'

/**
 * Qui a ecrit cet enchainement (UX-DR10, demande d'Alain 2026-08-31).
 *
 * LA COLLECTION `users` N'A QUE L'EMAIL. C'est ce qui avait fait repousser
 * l'affichage de l'auteur : publier une adresse sur une page ouverte se paie en
 * spam. Alain tranche : on affiche LA PARTIE AVANT L'ARROBASE.
 *
 * CE DEFAUT EST TRANSITOIRE, et il faut le savoir en le lisant. « begey.alain »
 * est moins expose que l'adresse entiere, mais il reste devinable — la plupart
 * des comptes sont chez gmail, et un prenom.nom se recompose en une ligne. Le
 * vrai remede est le PSEUDO choisi, note au backlog (`pseudo-et-page-auteur`) :
 * le jour ou il existe, c'est ICI qu'il se branchera, et nulle part ailleurs.
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
    const nom = nomDepuisEmail(compte.email)
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
