/**
 * Orientation du couple dans la salle (Epic 7) : la ligne de danse des dessins,
 * le pivot des passes, et l'angle a donner a chaque vignette.
 *
 * RIEN N'EST ECRIT NI SIGNALE A L'ECRAN, a dessein (decision d'Alain) : les
 * vignettes sont simplement tournees, pour qu'on retrouve les danseurs la ou
 * on les attend. Dire comment on tourne relevera d'une autre feature.
 *
 * Fonctions PURES, sans Payload et sans React : ce fichier part AUSSI dans le
 * navigateur (le compositeur tourne ses bulles a chaque ajout), et les
 * collections `Position` et `Passe` y lisent leurs options — une seule liste de
 * valeurs, une seule regle.
 *
 * LE PRINCIPE : la premiere position (depart d'une passe ou d'un enchainement)
 * s'affiche TELLE QUE DESSINEE et fixe le repere de l'ecran. Chaque position
 * suivante est tournee pour que sa ligne de danse s'aligne sur celle du depart,
 * plus la rotation accumulee du couple (`angleAffiche`). Chaque dessin garde
 * ainsi son orientation la plus lisible quand on le regarde seul.
 */

/**
 * Un quart de tour, vue de dessus, sens horaire — la convention de `rotation`
 * dans les schemas (y vers le bas).
 */
export type Quart = 0 | 90 | 180 | 270

/**
 * De combien le couple a tourne par rapport a la ligne de danse, entre la
 * position de depart et celle d'arrivee.
 *
 * C'est le RESULTAT, jamais le geste : `270` dit « l'arrivee est tournee d'un
 * quart vers la gauche », pas « on a tourne par la gauche ». Le sens de rotation
 * et les tours complets n'ont souvent pas de sens pour une passe (l'un tourne
 * sur sa droite pendant que l'autre tourne sur sa gauche) : ils releveront de la
 * maniere de danser la passe, une autre feature. Un tour complet vaut donc 0.
 */
export type Pivot = Quart

/**
 * Vers ou pointe la ligne de danse dans le DESSIN d'une position.
 *
 * Elle depend de la position (elle separe les danseurs en position fermee, les
 * relie en cote a cote…) : elle ne se deduit pas du schema, elle se declare.
 */
export type Ligne = Quart

/**
 * Options du champ `pivot` de la collection `Passe`.
 *
 * Payload stocke un select en TEXTE : la valeur ne redevient un nombre qu'a un
 * seul endroit, `quartDe`.
 */
export const PIVOTS = [
  { label: 'Même orientation', value: '0' },
  { label: 'Quart de tour à droite', value: '90' },
  { label: 'Demi-tour', value: '180' },
  { label: 'Quart de tour à gauche', value: '270' },
] as const

/** Options du champ `ligneDeDanse` de la collection `Position`. */
export const LIGNES = [
  { label: 'Vers le haut', value: '0' },
  { label: 'Vers la droite', value: '90' },
  { label: 'Vers le bas', value: '180' },
  { label: 'Vers la gauche', value: '270' },
] as const

/**
 * Valeur stockee -> quart de tour, ou `null` si inconnu.
 *
 * « NON RENSEIGNE » N'EST PAS « ZERO », et c'est tout l'enjeu de l'epic : au
 * deploiement, ni les positions ni les passes ne sont renseignees. Lire
 * l'absence comme 0 afficherait tout le catalogue avec des orientations
 * fausses, avec l'aplomb du vrai. Une valeur inattendue est traitee pareil :
 * on ne devine pas.
 */
function quartDe(valeur: string | number | null | undefined): Quart | null {
  if (valeur === null || valeur === undefined || valeur === '') return null

  const nombre = Number(valeur)
  return nombre === 0 || nombre === 90 || nombre === 180 || nombre === 270 ? nombre : null
}

/** Pivot stocke sur une passe -> nombre, ou `null` si inconnu. */
export const pivotDe = quartDe

/** Ligne de danse stockee sur une position -> nombre, ou `null` si inconnue. */
export const ligneDe = quartDe

/**
 * Orientation du couple a chaque etape d'une chaine de passes, par rapport au
 * depart.
 *
 * Le tableau rendu a UNE CASE DE PLUS que les pivots : la case 0 est le depart
 * (toujours 0, c'est le repere), la case `i + 1` l'arrivee de la passe `i`. Un
 * changement de prise (transition) ne figure pas parmi les pivots : on change de
 * main, pas d'orientation — la position reprise a l'orientation de celle qu'on
 * quittait.
 *
 * L'orientation devient `null` A PARTIR DU PREMIER PIVOT INCONNU, et le reste :
 * elle ne se devine jamais, meme si les passes suivantes sont renseignees.
 */
export function orientationsCumulees(pivots: (Pivot | null)[]): (number | null)[] {
  const orientations: (number | null)[] = [0]

  for (const pivot of pivots) {
    const precedente = orientations[orientations.length - 1]
    orientations.push(precedente === null || pivot === null ? null : (precedente + pivot) % 360)
  }

  return orientations
}

/**
 * L'angle dont tourner la vignette d'une position, ou `null` pour l'afficher
 * telle que dessinee.
 *
 *   angle = orientation + ligne(depart) − ligne(position)      (mod 360)
 *
 * `ligneDepart − ligne` aligne la ligne de danse de ce dessin sur celle du
 * depart, qui fixe le repere de l'ecran ; `orientation` ajoute la rotation du
 * couple depuis le depart.
 *
 * Il suffit d'une inconnue pour ne rien tourner. Une ligne inconnue ne prive
 * QUE cette position de son angle : l'orientation du couple, elle, ne depend
 * pas des dessins, et la suite de la chaine reste calculable.
 */
export function angleAffiche(
  orientation: number | null,
  ligneDepart: Ligne | null,
  ligne: Ligne | null,
): number | null {
  if (orientation === null || ligneDepart === null || ligne === null) return null
  return (((orientation + ligneDepart - ligne) % 360) + 360) % 360
}
