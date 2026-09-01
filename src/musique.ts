import { fournisseurParmi, hoteDe, lienSur, type Fournisseur } from './liens'

/**
 * La musique d'un enchainement : ce qu'on en lit, ce qu'on ouvre.
 *
 * Fonctions PURES, sans Payload et sans React — ce fichier part AUSSI dans le
 * navigateur (le compositeur valide le lien a la saisie) et sert au rendu de la
 * fiche cote serveur. Une seule regle, ecrite une fois, partagee par les trois
 * endroits qui la posent : la collection (validation), le compositeur (saisie)
 * et la fiche (affichage). La garde sur le lien lui-meme vit dans `liens.ts`,
 * partagee avec la video.
 *
 * DEUX CHAMPS ET NON UN, tranche avec Alain le 2026-08-31 : un TITRE et un
 * LIEN, tous deux facultatifs. Le titre se lit mieux qu'une URL, et surtout il
 * SURVIT AU LIEN MORT — ce n'est pas theorique : sur les cinq enchainements de
 * l'historique qui portaient une musique, quatre pointent vers des fichiers de
 * l'ancien site, disparus avec lui.
 *
 * C'est la difference avec la VIDEO, qui n'a qu'un lien : un morceau se nomme
 * (« Be-Bop-A-Lula »), une video de cours ne se nomme pas — elle se regarde.
 *
 * Ce qu'on ne fait PAS ici : appeler un fournisseur. Aucun reseau, aucun
 * lecteur integre, aucun tiers charge sur la page de revision — meme regle que
 * la video (FR-39, UX-DR1). On se contente de RECONNAITRE l'hebergeur pour le
 * nommer en toutes lettres. La recuperation du titre a l'ECRITURE vit a part
 * (`musique-oembed.ts`), et ne tourne que sur le serveur.
 */

/** Le champ tel que le porte l'enchainement — les deux moities sont facultatives. */
export type Musique = {
  titre?: string | null
  lien?: string | null
}

/**
 * Fournisseurs nommes a l'affichage.
 *
 * Reconnaitre un hebergeur coute une ligne et zero reseau : c'est l'API qui
 * serait chere, pas la reconnaissance. La liste reste donc large alors meme
 * qu'on n'appelle personne — l'historique porte deja un lien Deezer, et un
 * affichage qui ne connaitrait que Spotify le rendrait en URL nue.
 */
const FOURNISSEURS: Fournisseur[] = [
  { nom: 'Spotify', domaines: ['spotify.com', 'spoti.fi'] },
  { nom: 'Deezer', domaines: ['deezer.com', 'dzr.page.link'] },
  { nom: 'YouTube', domaines: ['youtube.com', 'youtu.be'] },
  { nom: 'Apple Music', domaines: ['music.apple.com'] },
  { nom: 'SoundCloud', domaines: ['soundcloud.com', 'snd.sc'] },
  { nom: 'Bandcamp', domaines: ['bandcamp.com'] },
]

/** Le nom de l'hebergeur (« Spotify »), ou `null` s'il ne fait pas partie des connus. */
export function fournisseurDe(lien: string | null | undefined): string | null {
  return fournisseurParmi(lien, FOURNISSEURS)
}

/** Ce que la fiche affiche : un texte, et parfois un lien dessous. */
export type PresentationMusique = {
  /** Ce qu'on lit : le titre saisi, sinon « Ecouter sur Spotify », sinon l'hote. */
  texte: string
  /** Cible du lien, `null` si rien d'ouvrable — le texte reste alors du texte. */
  lien: string | null
  /**
   * Ou mene le lien (« Spotify », « passe-finder.fr »), quand le texte est deja
   * pris par le titre du morceau. `null` sinon — l'information serait redondante
   * avec un texte qui dit deja « Ecouter sur Spotify ».
   */
  complement: string | null
}

/**
 * Met la musique en forme, ou renvoie `null` s'il n'y a rien a montrer.
 *
 * Les quatre cas reels, dans l'ordre ou ils se presentent :
 *  - titre seul                -> du texte, point (le cas le plus frequent) ;
 *  - titre + lien              -> le TITRE cliquable, jamais l'URL brute, et
 *                                 l'hebergeur en complement ;
 *  - lien seul, hote connu     -> « Ecouter sur Deezer » ;
 *  - lien seul, hote inconnu   -> l'hote (« passe-finder.fr »), qui dit au moins
 *                                 ou l'on part.
 *
 * Un lien non ouvrable (protocole exotique, saisie qui n'est pas une URL) ne
 * devient jamais cliquable. Faute de titre pour le remplacer, il est montre
 * TEL QUEL, en texte : la validation du champ rend le cas presque impossible,
 * et faire disparaitre une saisie de l'ecran est pire que l'afficher inerte.
 */
export function presenterMusique(musique: Musique | null | undefined): PresentationMusique | null {
  const titre = (musique?.titre ?? '').trim()
  const brut = (musique?.lien ?? '').trim()
  if (titre === '' && brut === '') return null

  const lien = lienSur(brut)

  if (titre !== '') {
    return {
      texte: titre,
      lien,
      complement: lien === null ? null : (fournisseurDe(lien) ?? hoteDe(lien)),
    }
  }

  if (lien === null) return { texte: brut, lien: null, complement: null }

  const fournisseur = fournisseurDe(lien)

  return {
    texte: fournisseur ? `Écouter sur ${fournisseur}` : hoteDe(lien),
    lien,
    complement: null,
  }
}
