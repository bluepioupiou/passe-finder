import type { Access, FieldAccess, PayloadRequest } from 'payload'

/**
 * Regles d'acces partagees (Story 3.4, FR-29 / ADD-5 / AD-3).
 *
 * POURQUOI UN SEUL ENDROIT. ADD-5 impose que les droits vivent dans les `access`
 * des collections Payload et nulle part ailleurs — jamais reimplementes dans
 * l'interface. Une regle dupliquee dans un composant serait un decor : elle
 * masquerait un bouton sans fermer l'API qui est derriere. Regrouper le predicat
 * ici garantit que « admin » veut dire la meme chose pour les quatre collections
 * du catalogue, et qu'un futur changement de forme du drapeau (booleen -> liste
 * de roles) se fasse a un seul endroit.
 */

/**
 * L'utilisateur porte-t-il le drapeau admin ?
 *
 * Tolerant a l'absence d'utilisateur (visiteur anonyme) : `undefined` et `null`
 * repondent `false`, jamais une exception. C'est important car ce predicat est
 * evalue sur CHAQUE requete, y compris celles des visiteurs non connectes.
 */
export function estAdmin(utilisateur: PayloadRequest['user']): boolean {
  return Boolean(utilisateur?.admin)
}

/**
 * Acces reserve aux administrateurs — pour les collections du catalogue de
 * reference (Danse, Position, Passe, Media).
 *
 * En v1, un seul compte porte ce drapeau (celui d'Alain). Le catalogue est le
 * materiau commun de tous les eleves : une erreur d'edition ne casse pas une
 * fiche isolee, elle casse les enchainements qui s'appuient dessus.
 */
export const adminSeul: Access = ({ req }) => estAdmin(req.user)

/**
 * Meme regle, au niveau d'un CHAMP.
 *
 * La signature differe de `Access` : un acces de champ renvoie un booleen et
 * jamais une contrainte de requete, puisqu'il autorise ou refuse l'ecriture
 * d'une valeur, pas la selection de documents.
 */
export const champAdminSeul: FieldAccess = ({ req }) => estAdmin(req.user)
