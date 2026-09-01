/**
 * Les liens saisis, et ce qu'on ose en faire.
 *
 * PARTAGE par la musique et la video (Stories 4.5 / 4.6), parce que la question
 * est la meme des deux cotes : « cette saisie peut-elle devenir un `<a href>`
 * sur une fiche que d'autres ouvrent ? ». Ce qui DIFFERE, ce sont les
 * hebergeurs et la facon de les annoncer — ca reste chez `musique.ts` et
 * `video.ts`. On ne fond pas les deux en un « media » generique : la video
 * montre l'execution, la musique est ce sur quoi on danse.
 *
 * Fonctions PURES, sans reseau : ce fichier part aussi dans le navigateur.
 */

/** Un hebergeur reconnu : son nom d'affichage et les domaines qui le designent. */
export type Fournisseur = { nom: string; domaines: string[] }

/**
 * L'hote appartient-il a ce domaine ?
 *
 * Comparaison par SUFFIXE DE LABEL, jamais `includes` : `spotify.com.exemple.net`
 * contient « spotify.com » sans lui appartenir, et se ferait passer pour Spotify
 * a l'affichage. Le point separateur est ce qui fait la difference.
 */
function releveDe(hote: string, domaine: string): boolean {
  return hote === domaine || hote.endsWith(`.${domaine}`)
}

/**
 * L'URL, si et seulement si on peut l'ouvrir sans danger.
 *
 * SEULS `http` et `https` ressortent. C'est la garde qui compte vraiment : ces
 * champs sont remplis par les eleves, et une saisie utilisateur qui devient un
 * lien cliquable est une porte — un `javascript:` colle ici ne doit jamais
 * pouvoir etre clique sur la fiche d'un autre.
 *
 * Tolerance unique, et pratique : un lien sans protocole (`open.spotify.com/...`,
 * ce qu'on obtient en recopiant une barre d'adresse) est complete en `https`.
 * Il faut alors un hote credible — aucun espace, au moins un point — sinon un
 * titre saisi dans la mauvaise case deviendrait un lien.
 */
export function lienSur(valeur: string | null | undefined): string | null {
  const brut = (valeur ?? '').trim()
  if (brut === '') return null

  const candidat = /^[a-z][a-z0-9+.-]*:/i.test(brut)
    ? brut
    : /^\S+\.\S+$/.test(brut)
      ? `https://${brut}`
      : null

  if (candidat === null) return null

  try {
    const url = new URL(candidat)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null

    return url.toString()
  } catch {
    return null
  }
}

/** Nom d'hote sans le `www.` : « passe-finder.fr ». */
export function hoteDe(lien: string): string {
  return new URL(lien).hostname.replace(/^www\./, '')
}

/**
 * Le nom de l'hebergeur, ou `null` s'il ne fait pas partie de ceux qu'on
 * reconnait.
 *
 * Un hebergeur inconnu n'est PAS un echec : le lien reste cliquable, nomme par
 * son hote (voir `presenterMusique` et `presenterVideo`).
 */
export function fournisseurParmi(
  lien: string | null | undefined,
  fournisseurs: Fournisseur[],
): string | null {
  const url = lienSur(lien)
  if (url === null) return null

  const hote = new URL(url).hostname.toLowerCase()
  const trouve = fournisseurs.find((fournisseur) =>
    fournisseur.domaines.some((domaine) => releveDe(hote, domaine)),
  )

  return trouve?.nom ?? null
}
