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
 * Qui peut CREER un enchainement.
 *
 * TOUT COMPTE CONNECTE. Composer est le geste central du produit : le reserver
 * a l'admin faisait du site un catalogue a lire, pas un outil a utiliser.
 *
 * Un GEL l'a pourtant reserve aux administrateurs du 2026-08-31 au 2026-09-05,
 * et la raison merite d'etre gardee ici : le modele de visibilite n'etait pas
 * tranche. Laisser les eleves composer avant de savoir ce que « partage »
 * voudrait dire leur aurait fait produire des enchainements dont la portee
 * changerait sous leurs pieds. Le gel est leve parce que ce modele existe
 * desormais — prive / non repertorie / public (voir `src/visibilite.ts`) — et
 * qu'un enchainement nait PRIVE (FR-17, AD-6) : rien ne part au dehors sans un
 * geste de son auteur.
 *
 * IL GARDE SON NOM A LUI plutot que d'etre `Boolean(req.user)` recopie dans la
 * collection : la question « qui a le droit de composer ? » se relira ici, et
 * non parmi les autres regles d'acces. Le jour ou elle se complique (une ecole,
 * un cours, une limite), c'est le seul corps a changer.
 *
 * Ce n'est PAS une regle de gouvernance du catalogue (`adminSeul`) : celle-ci
 * dit qui produit du contenu, celle-la qui gouverne le materiau commun.
 */
export const peutCreerEnchainement: Access = ({ req }) => Boolean(req.user)
