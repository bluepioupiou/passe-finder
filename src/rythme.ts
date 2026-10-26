/**
 * Le rythme d'une passe (Epic 8) : sa duree, et le comptage qu'Alain dit en
 * cours — `1 . 2 . 3 et 4 . 5 et 6 .`.
 *
 * CHAQUE CHIFFRE, « ET » OU « . » EST UN INSTANT : un demi-temps. C'est sur ces
 * instants que se posent les positions intermediaires d'une passe. Un instant
 * se designe par son INDEX dans le comptage, a partir de 0 : en 6 temps, `0` =
 * « 1 », `5` = « 3 et », `11` = le « . » final.
 *
 * Fonctions PURES, sans Payload et sans React : ce fichier part AUSSI dans le
 * navigateur (la frise de la fiche passe), et la collection `Passe` y lit ses
 * options — une seule liste de valeurs, un seul comptage.
 */

/**
 * 6 temps, ou 10 temps quand Alain ralentit une passe. 8 temps n'existe pas
 * (decision d'Alain, 2026-10-25) : on ralentit en passant directement a 10.
 */
export type Duree = 6 | 10

/**
 * Options du champ `duree` de la collection `Passe`.
 *
 * Payload stocke un select en TEXTE : la valeur ne redevient un nombre qu'a un
 * seul endroit, `dureeDe`.
 */
export const DUREES = [
  { label: '6 temps', value: '6' },
  { label: '10 temps', value: '10' },
] as const

/**
 * Valeur stockee -> duree.
 *
 * ICI, « NON RENSEIGNE » VAUT 6 TEMPS — a l'inverse du pivot (Epic 7), et a
 * dessein : c'est la duree de la tres grande majorite des passes, et une duree
 * fausse ne trompe personne tant que la passe n'a pas de position
 * intermediaire. Une valeur inattendue est lue pareil.
 */
export function dureeDe(valeur: string | number | null | undefined): Duree {
  return Number(valeur) === 10 ? 10 : 6
}

/**
 * Le comptage d'une passe, un libelle par instant.
 *
 * `1 . 2 .`, puis des paires de pas chasses `n et n+1 .` jusqu'a la duree :
 * 10 temps repete `3 et 4 . 5 et 6 .`, comme Alain le compte.
 */
export function comptage(duree: Duree): string[] {
  const instants = ['1', '.', '2', '.']

  for (let temps = 3; temps < duree; temps += 2) {
    instants.push(String(temps), 'et', String(temps + 1), '.')
  }

  return instants
}

/**
 * Le nom d'un instant, tel qu'on le dit : « 4 » pour un temps, « 3 et » ou
 * « 6 . » pour un demi-temps (on nomme le temps qui le precede, sinon tous les
 * « . » se ressembleraient). `null` hors de la duree.
 */
export function libelleInstant(duree: Duree, instant: number): string | null {
  const instants = comptage(duree)
  if (!Number.isInteger(instant) || instant < 0 || instant >= instants.length) return null

  const libelle = instants[instant]
  return instant % 2 === 0 ? libelle : `${instants[instant - 1]} ${libelle}`
}
