import { fournisseurDe, lienEcoutable } from './musique'

/**
 * Le TITRE du morceau, demande au fournisseur a l'enregistrement (demande
 * d'Alain, 2026-08-31).
 *
 * A PART de `musique.ts`, et ce n'est pas un detail : ce fichier-la est PUR et
 * part dans le navigateur avec le compositeur. Celui-ci parle au reseau et ne
 * tourne QUE sur le serveur.
 *
 * POURQUOI oEmbed ET PAS L'API DE SPOTIFY. oEmbed resout une URL qu'on a deja,
 * et ne demande NI cle NI application enregistree : rien a porter jusqu'au
 * deploiement, rien a renouveler. L'API de recherche, elle, irait dans l'autre
 * sens (un titre tape -> des candidats), demanderait deux secrets de plus, et
 * surtout rendrait des CANDIDATS : accrocher le premier silencieusement
 * collerait un mauvais enregistrement, ce qui compte pour une choregraphie
 * (tempo, montage, duree). Ici il n'y a pas de choix a faire : le lien designe
 * un morceau et un seul.
 *
 * TROIS PRINCIPES, dans cet ordre :
 *  1. l'enregistrement ne doit JAMAIS echouer a cause d'un tiers. Toute panne
 *     — reseau coupe, 404, JSON douteux, lenteur — se solde par « pas de
 *     titre », et la sauvegarde continue ;
 *  2. on n'ecrase JAMAIS une saisie. Le titre n'est demande que si le champ est
 *     vide : ce qu'Alain a ecrit vaut mieux que ce que Spotify renvoie ;
 *  3. rien n'est appele au RENDU. La fiche que lisent les eleves ne charge
 *     aucun tiers (FR-39, UX-DR1) : l'appel a lieu une fois, a l'ecriture.
 */

/**
 * Points oEmbed publics, sans cle, par fournisseur.
 *
 * Seuls figurent ceux qui en publient un : Apple Music et Bandcamp n'en ont
 * pas d'officiel, leurs liens restent donc sans titre automatique — ils
 * s'affichent « Ecouter sur … » comme avant, ce qui n'est pas une regression.
 *
 * On n'appelle QUE ces quatre hotes, jamais l'URL saisie elle-meme : celle-ci
 * ne voyage qu'en parametre. Un lien vers une adresse interne ne peut donc pas
 * faire emettre une requete au serveur (SSRF).
 */
const POINTS: Record<string, (lien: string) => string> = {
  Spotify: (lien) => `https://open.spotify.com/oembed?url=${encodeURIComponent(lien)}`,
  Deezer: (lien) => `https://api.deezer.com/oembed?format=json&url=${encodeURIComponent(lien)}`,
  YouTube: (lien) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(lien)}`,
  SoundCloud: (lien) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(lien)}`,
}

/** Au-dela, ce n'est plus un titre de morceau : on n'en garde rien. */
const LONGUEUR_MAX = 200

/** Un tiers ne doit pas faire attendre un enregistrement plus que ca. */
const DELAI_MS = 3_000

/** L'adresse a interroger pour ce lien, ou `null` si personne ne repond ici. */
export function pointOEmbed(lien: string | null | undefined): string | null {
  const url = lienEcoutable(lien)
  if (url === null) return null

  const fournisseur = fournisseurDe(url)
  if (fournisseur === null) return null

  return POINTS[fournisseur]?.(url) ?? null
}

/**
 * Le titre porte par une reponse oEmbed, s'il en porte un d'utilisable.
 *
 * PURE, et volontairement mefiante : la charge vient d'un tiers, elle n'est pas
 * un contrat. Tout ce qui n'est pas une chaine non vide et de taille raisonnable
 * est traite comme une absence de titre — jamais comme une erreur.
 *
 * L'ARTISTE EST IGNORE, meme quand le fournisseur le donne (Deezer, YouTube) :
 * decision d'Alain, le titre suffit. Une regle unique vaut mieux qu'un libelle
 * qui changerait de forme selon l'hebergeur.
 */
export function titreDeReponse(charge: unknown): string | null {
  if (typeof charge !== 'object' || charge === null) return null

  const titre = (charge as { title?: unknown }).title
  if (typeof titre !== 'string') return null

  const propre = titre.trim()
  if (propre === '' || propre.length > LONGUEUR_MAX) return null

  return propre
}

/**
 * Demande au fournisseur le titre du morceau, ou `null` — jamais une erreur.
 *
 * `recuperer` est injectable pour les tests : aucun test n'a a dependre du
 * reseau ni de la disponibilite de Spotify.
 */
export async function titreDuMorceau(
  lien: string | null | undefined,
  recuperer: typeof fetch = fetch,
): Promise<string | null> {
  const point = pointOEmbed(lien)
  if (point === null) return null

  try {
    const reponse = await recuperer(point, {
      headers: { accept: 'application/json' },
      // Sans delai, une lenteur du tiers deviendrait une lenteur de
      // l'enregistrement — et l'enchainement compose resterait en suspens.
      signal: AbortSignal.timeout(DELAI_MS),
    })

    if (!reponse.ok) return null

    return titreDeReponse(await reponse.json())
  } catch {
    // Reseau coupe, delai depasse, JSON illisible : autant de « pas de titre ».
    // L'enregistrement, lui, continue.
    return null
  }
}
