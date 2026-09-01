import { randomBytes } from 'node:crypto'

/**
 * L'identifiant PUBLIC d'un enchainement — celui qui vit dans l'URL
 * (action item `identifiant-opaque-et-visibilites`).
 *
 * IL N'EST PAS LA CLE PRIMAIRE, ET IL NE DOIT PAS LE DEVENIR. Sous
 * Payload/Drizzle, l'entier auto-incremente ancre toutes les relations : auteur,
 * maillons de passes, favoris. Le geste peu couteux et reversible est d'AJOUTER
 * une colonne indexee et unique, et de router dessus. La base garde ses entiers,
 * les URL n'en montrent plus.
 *
 * POURQUOI IL EXISTE. Pas pour reparer une fuite : un enchainement prive
 * repondait deja 404 a qui n'en est pas l'auteur, identifiant devine ou non.
 * Il existe parce que le NON REPERTORIE n'est possible qu'avec lui — dans ce
 * modele, c'est l'URL ELLE-MEME qui fait office de cle. Avec /enchainements/12,
 * un lien « non repertorie » se retrouverait en comptant jusqu'a 12.
 *
 * Consequence directe : les anciennes URL numeriques NE REPONDENT PLUS (decide
 * avec Alain le 2026-09-01). Les laisser vivre par une redirection annulerait
 * ce qu'on vient de construire — on retrouverait n'importe quel enchainement
 * par denombrement.
 */

/**
 * Longueur d'un identifiant, en caracteres.
 *
 * 12 caracteres de base64url = 9 octets = 72 bits tires au hasard. L'ordre de
 * grandeur qui compte : il faudrait des milliards d'essais pour tomber sur un
 * lien existant, quand notre serveur repond quelques dizaines de fois par
 * seconde. Ce n'est pas un secret cryptographique, c'est une adresse qu'on ne
 * devine pas.
 */
export const LONGUEUR_IDENTIFIANT = 12

/**
 * La forme d'un identifiant : l'alphabet de base64url, et rien d'autre.
 *
 * Sert a ECARTER TOT une adresse qui n'en est pas une — `/enchainements/12`,
 * `/enchainements/../..`, un identifiant tronque par un logiciel de messagerie.
 * On repond 404 sans ouvrir la base, et surtout sans passer a la couche SQL une
 * chaine dont on ne sait rien.
 */
const FORME = new RegExp(`^[A-Za-z0-9_-]{${LONGUEUR_IDENTIFIANT}}$`)

/** La chaine a-t-elle la forme d'un identifiant public ? */
export function estIdentifiantPublic(valeur: string): boolean {
  return FORME.test(valeur)
}

/**
 * Un nouvel identifiant, tire au hasard.
 *
 * `randomBytes` et non `Math.random` : le second est previsible a partir de
 * quelques tirages observes, ce qui rendrait devinables les liens crees juste
 * apres ceux qu'on a vus. C'est exactement la propriete qu'on achete ici.
 *
 * `base64url` plutot que `base64` : ni `+`, ni `/`, ni `=` — donc rien qui
 * doive etre echappe dans une URL, ni qui casse un copier-coller.
 */
export function nouvelIdentifiantPublic(): string {
  // 9 octets rendent exactement 12 caracteres de base64url, sans remplissage :
  // toute autre taille produirait des `=` a couper a la main.
  return randomBytes(9).toString('base64url')
}
