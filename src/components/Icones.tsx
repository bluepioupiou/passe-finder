import React from 'react'

/**
 * Icones du produit, en SVG inline.
 *
 * POURQUOI inline plutot qu'une police d'icones ou un paquet externe : le site
 * ne charge aucune ressource externe (UX-DR1), et ces quelques traces tiennent en
 * quelques lignes. `currentColor` partout : l'icone prend la couleur du texte
 * qui la porte, donc suit les deux themes sans regle supplementaire.
 *
 * Toutes sont `aria-hidden` : elles accompagnent un intitule accessible porte
 * par le bouton qui les contient (UX-DR17), jamais l'inverse.
 */

type ProprietesIcone = { className?: string; taille?: number }

function Svg({
  children,
  className,
  taille = 20,
}: ProprietesIcone & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** Loupe : la recherche. */
export function IconeLoupe(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.2" y1="16.2" x2="21" y2="21" />
    </Svg>
  )
}

/** Plus : ouvre le menu des creations (reserve aux comptes connectes). */
export function IconePlus(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  )
}

/** Chevron : ouvre / ferme le menu mobile. La rotation est faite en CSS. */
export function IconeChevron(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <polyline points="6 9 12 15 18 9" />
    </Svg>
  )
}

/** Soleil : theme clair force. */
export function IconeSoleil(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <circle cx="12" cy="12" r="4.2" />
      <line x1="12" y1="2" x2="12" y2="4.4" />
      <line x1="12" y1="19.6" x2="12" y2="22" />
      <line x1="4.2" y1="4.2" x2="5.9" y2="5.9" />
      <line x1="18.1" y1="18.1" x2="19.8" y2="19.8" />
      <line x1="2" y1="12" x2="4.4" y2="12" />
      <line x1="19.6" y1="12" x2="22" y2="12" />
      <line x1="4.2" y1="19.8" x2="5.9" y2="18.1" />
      <line x1="18.1" y1="5.9" x2="19.8" y2="4.2" />
    </Svg>
  )
}

/** Lune : theme sombre force. */
export function IconeLune(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z" />
    </Svg>
  )
}

/**
 * Cercle moitie plein, moitie vide : « suivre le systeme ».
 * Le remplissage dit litteralement « ni l'un ni l'autre, les deux ».
 */
export function IconeMoitieMoitie(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** Silhouette : le menu de compte (Story 3.2). */
export function IconeCompte(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  )
}

/**
 * Etoile : le favori (Story 5.1).
 *
 * `rempli` change le FOND, pas le trait : l'etoile garde exactement la meme
 * silhouette qu'elle soit posee ou non, donc la bascule ne fait pas sauter la
 * mise en page et se lit d'un coup d'oeil.
 */
export function IconeEtoile({
  rempli = false,
  ...proprietes
}: ProprietesIcone & { rempli?: boolean }) {
  return (
    <svg
      className={proprietes.className}
      width={proprietes.taille ?? 20}
      height={proprietes.taille ?? 20}
      viewBox="0 0 24 24"
      fill={rempli ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" />
    </svg>
  )
}

/**
 * Note de musique : le morceau sur lequel l'enchainement se danse.
 *
 * UNE SEULE icone pour TOUS les fournisseurs, decide avec Alain le 2026-08-31 :
 * les logos de marque sont des formes pleines, avec leurs couleurs imposees et
 * leurs regles d'usage propres — ils jureraient au milieu d'un jeu d'icones au
 * trait qui suit `currentColor` et les deux themes. Le fournisseur est donc
 * nomme en toutes lettres a cote (« Ecouter sur Spotify »), ce qui a l'avantage
 * de marcher aussi pour ceux qu'on ne connait pas.
 */
export function IconeNote(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.6" />
      <circle cx="17.5" cy="16" r="2.6" />
    </Svg>
  )
}

/**
 * Deux fleches en cycle : le changement de prise sans passe (Story 4.7).
 *
 * POURQUOI DES FLECHES ET PAS UN SYMBOLE D'ECHANGE : une transition est
 * DIRIGEE (declarer A -> B n'ouvre pas B -> A), mais ce que l'icone doit dire
 * ici, c'est « on peut passer d'une prise a une autre », pas le sens. Le cycle
 * dit le changement ; le sens se lit dans la liste, en toutes lettres.
 *
 * Le meme geste est marque « ↻ » dans la chaine d'un enchainement, ou l'espace
 * se compte en pixels au coin d'une bulle. Ici on a la place d'une vraie icone,
 * au trait, comme le reste du jeu.
 */
export function IconeTransition(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <polyline points="21 5 21 10 16 10" />
      <polyline points="3 19 3 14 8 14" />
      <path d="M4.6 9.5a7.5 7.5 0 0 1 12.4-2.8L21 10" />
      <path d="M3 14l4 3.8a7.5 7.5 0 0 0 12.4-2.8" />
    </Svg>
  )
}

/**
 * Camera : la video de l'enchainement.
 *
 * Meme parti que la note de musique — une icone au trait, aucune marque : le
 * fournisseur est nomme en toutes lettres a cote (« Voir sur YouTube »), ce qui
 * marche aussi pour ceux qu'on ne connait pas.
 */
export function IconeVideo(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.5l5-3v9l-5-3z" />
    </Svg>
  )
}

/**
 * Deux partenaires vus du dessus : une POSITION (fil des nouveautes, E1).
 *
 * L'icone reprend la convention des vignettes du catalogue — la position est
 * un couple, vu d'en haut. Un disque plein et un disque au trait : c'est ce qui
 * distingue les deux danseurs quand la couleur n'est pas disponible (l'icone
 * suit `currentColor`, elle n'a qu'une encre).
 */
export function IconePosition(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <circle cx="7.5" cy="12" r="4" />
      <circle cx="16.5" cy="12" r="4" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/**
 * Une position, une fleche, une autre position : une PASSE (fil des
 * nouveautes, E1).
 *
 * C'est exactement ce que montre la carte du catalogue (« depart -> arrivee »),
 * reduit a la taille d'une puce : une passe est une ARETE du graphe (AD-2), et
 * la fleche est la seule chose qui la distingue d'une position.
 */
export function IconePasse(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <circle cx="4.5" cy="12" r="2.8" />
      <circle cx="19.5" cy="12" r="2.8" />
      <line x1="8" y1="12" x2="15.4" y2="12" />
      <polyline points="13 9.8 15.4 12 13 14.2" />
    </Svg>
  )
}

/**
 * Le serpentin de la chaine : un ENCHAINEMENT (fil des nouveautes, E1).
 *
 * Le trace EST celui de la vue lecture — une ligne vers la droite, on descend,
 * la suivante repart vers la gauche (voir `chaine-enchainement.css`). Il dit
 * « une suite ordonnee » la ou une chaine de maillons aurait dit « un lien ».
 *
 * Le point plein marque le DEPART : un enchainement se lit dans un sens, et
 * sans lui le serpentin se lirait aussi bien a l'envers.
 */
export function IconeEnchainement(proprietes: ProprietesIcone) {
  return (
    <Svg {...proprietes}>
      <path d="M5 6h10a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h10" />
      <circle cx="5" cy="6" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  )
}
