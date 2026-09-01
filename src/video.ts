import { fournisseurParmi, hoteDe, lienSur, type Fournisseur } from './liens'

/**
 * La video d'un enchainement (Story 4.6, FR-16 / FR-37).
 *
 * UN SEUL CHAMP, contrairement a la musique, et c'est voulu (demande d'Alain,
 * 2026-08-31) : un morceau se NOMME — « Gene Vincent — Be-Bop-A-Lula » se lit
 * mieux qu'une URL et survit au lien mort — alors qu'une video de cours ne se
 * nomme pas, elle se regarde. Lui inventer un titre a saisir serait un champ de
 * plus a remplir pour rien.
 *
 * Le champ se disait « Video YouTube » : c'est le LIBELLE qui a change, pas le
 * nom en base (`urlVideo`, conserve — le renommer imposerait une migration de
 * colonne pour un gain nul). Rien n'oblige a passer par YouTube, et l'affichage
 * reconnait desormais l'hebergeur pour le nommer.
 *
 * Comme la musique : AUCUN LECTEUR INTEGRE, donc aucun tiers charge sur la page
 * de revision (FR-39, UX-DR1). Un lien, et on part chez l'hebergeur.
 */

const FOURNISSEURS: Fournisseur[] = [
  { nom: 'YouTube', domaines: ['youtube.com', 'youtu.be'] },
  { nom: 'Vimeo', domaines: ['vimeo.com'] },
  { nom: 'Dailymotion', domaines: ['dailymotion.com', 'dai.ly'] },
  { nom: 'Instagram', domaines: ['instagram.com'] },
  { nom: 'TikTok', domaines: ['tiktok.com'] },
  // Une video tournee en cours et deposee dans un espace partage : c'est le
  // reflexe le plus courant apres YouTube.
  { nom: 'Google Drive', domaines: ['drive.google.com'] },
]

/** Le nom de l'hebergeur (« YouTube »), ou `null` s'il n'est pas reconnu. */
export function fournisseurVideoDe(lien: string | null | undefined): string | null {
  return fournisseurParmi(lien, FOURNISSEURS)
}

/** Ce que la fiche affiche pour la video. */
export type PresentationVideo = {
  /** « Voir sur YouTube », sinon l'hote — jamais l'URL brute. */
  texte: string
  /** Cible du lien, `null` si rien d'ouvrable. */
  lien: string | null
}

/**
 * Met la video en forme, ou renvoie `null` s'il n'y a rien a montrer.
 *
 * Trois cas :
 *  - hebergeur connu   -> « Voir sur YouTube » ;
 *  - hebergeur inconnu -> l'hote (« exemple.fr »), qui dit ou l'on part ;
 *  - lien inutilisable -> montre TEL QUEL, en texte, jamais cliquable. La
 *    validation du champ rend le cas presque impossible, mais faire
 *    disparaitre une saisie de l'ecran est pire que l'afficher inerte.
 */
export function presenterVideo(valeur: string | null | undefined): PresentationVideo | null {
  const brut = (valeur ?? '').trim()
  if (brut === '') return null

  const lien = lienSur(brut)
  if (lien === null) return { texte: brut, lien: null }

  const fournisseur = fournisseurVideoDe(lien)

  return { texte: fournisseur ? `Voir sur ${fournisseur}` : hoteDe(lien), lien }
}
