/**
 * Aides de recherche par nom (Story 5.4, UX-DR7).
 *
 * Isolees ici plutot que dans le composant : ce sont des fonctions pures,
 * testables sans rendu, et la meme regle servira a la recherche globale
 * (Story 5.5) pour que « crois » trouve « Croise » partout pareil.
 */

/**
 * Forme comparable d'un texte : sans accent, sans casse, sans espaces
 * superflus.
 *
 * POURQUOI les accents : on tape « crois » ou « passe croisee » au clavier
 * sans se soucier des accents. Une comparaison brute ferait echouer la
 * recherche sur la moitie du catalogue, sans que rien n'explique pourquoi.
 *
 * `normalize('NFD')` separe la lettre de son accent, la classe Unicode
 * `\p{Diacritic}` supprime ensuite les accents ainsi isoles.
 */
export function normaliserTexte(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
    .trim()
}

/**
 * Le nom correspond-il a la requete ?
 *
 * Une requete vide correspond a tout : c'est l'etat « aucun filtre », pas un
 * resultat vide.
 */
export function correspondAuNom(nom: string, requete: string): boolean {
  const cherche = normaliserTexte(requete)
  if (cherche === '') return true

  return normaliserTexte(nom).includes(cherche)
}
