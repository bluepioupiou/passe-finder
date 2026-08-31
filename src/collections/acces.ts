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

/**
 * Acces reserve a l'AUTEUR du document (ou a un administrateur).
 *
 * Renvoie une CONTRAINTE DE REQUETE plutot qu'un booleen, et c'est la
 * difference qui compte : Payload l'applique a la selection des documents, donc
 * la regle vaut aussi pour une mise a jour ou une suppression par lot, et pour
 * l'API REST/GraphQL. Un booleen `true` autoriserait l'operation sur N'IMPORTE
 * QUEL document.
 *
 * Pose la regle attendue par la Story 4.5, mais c'est un PREREQUIS de la
 * Story 3.1 : le jour ou l'inscription s'ouvre, sans elle, le premier inscrit
 * peut reecrire les enchainements des autres eleves.
 */
export const auteurOuAdmin: Access = ({ req }) => {
  if (estAdmin(req.user)) return true
  if (!req.user) return false

  return { auteur: { equals: req.user.id } }
}

/**
 * Acces reserve a SON PROPRE compte (ou a un administrateur).
 *
 * Sans cela, les droits par defaut de Payload autorisent tout compte connecte a
 * lire et modifier TOUS les comptes : la liste des emails de la classe d'un
 * cote, le changement de mot de passe d'autrui de l'autre. Inoffensif tant que
 * personne ne peut se connecter ; indispensable des l'ouverture de
 * l'inscription (Story 3.1).
 */
export const soiMemeOuAdmin: Access = ({ req }) => {
  if (estAdmin(req.user)) return true
  if (!req.user) return false

  return { id: { equals: req.user.id } }
}

/**
 * Qui peut CREER un enchainement — restriction TEMPORAIRE (2026-08-31).
 *
 * Alain a demande de refermer la creation aux seuls administrateurs, le temps
 * de trancher le modele de visibilite (cf. l'action item
 * `identifiant-opaque-et-visibilites` : public, prive, lien de partage, et
 * peut-etre plus tard l'ecole). Ouvrir la composition avant de savoir ce que
 * « partage » voudra dire ferait produire aux eleves des enchainements dont la
 * portee changerait sous leurs pieds.
 *
 * POUR ROUVRIR : remplacer le corps par `Boolean(req.user)`. C'est la seule
 * ligne a changer — la barre de navigation, la page du compositeur et la
 * collection lisent toutes ce meme predicat. C'est precisement pourquoi il
 * porte un nom a lui plutot que d'etre `adminSeul` recopie trois fois : le jour
 * de la reouverture, on ne veut pas avoir a se demander lesquels des trois
 * `estAdmin` du projet parlaient de creation.
 *
 * Ce n'est PAS une regle de gouvernance du catalogue (`adminSeul`), qui est
 * durable : celle-ci est un gel, et le nom doit le dire.
 */
export const peutCreerEnchainement: Access = ({ req }) => estAdmin(req.user)
