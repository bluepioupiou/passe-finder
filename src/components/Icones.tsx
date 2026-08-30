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
