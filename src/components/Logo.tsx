import React from 'react'

/**
 * Logo de la barre de navigation.
 *
 * Reprend le langage visuel des fiches de position (voir « Main droite / main
 * gauche ») : deux corps, rose pour la suiveuse et bleu pour le guideur, des
 * bras en arcs, des mains en petits ronds blancs cernes. Les mains jointes
 * enjambent l'espace entre les danseurs — c'est cet arc qui traverse qui dit
 * « ils se tiennent ». Inverse vers le bas, il passe sous les corps et ne relie
 * plus rien.
 *
 * Les traits utilisent `currentColor` plutot qu'une couleur fixe : en theme
 * sombre, un noir d'encre disparaitrait sur le fond. Ils suivent donc la
 * couleur du texte de la marque, qui bascule avec le theme. Les mains sont
 * remplies de `--surface` pour la meme raison.
 *
 * `aria-hidden` : le nom « Passe Finder » est juste a cote dans le meme lien.
 * Annoncer le dessin en plus ferait repeter la meme information.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="8 0 40 34"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {/* Bras : traces avant les corps, pour passer dessous. */}
      <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <path d="M14.5 11.5 Q22 2 30 4.5" />
        <path d="M41.5 11 Q38 4 33.5 4.2" />
        <path d="M13 24.5 Q11 30.5 16.5 30" />
        <path d="M43 24 Q45 30.5 39.5 30" />
      </g>

      <circle cx="18" cy="17" r="8.2" fill="var(--dancer-follow)" />
      <circle cx="38" cy="17" r="7.6" fill="var(--dancer-lead)" />

      {/* Mains : jointes en haut, libres en bas. */}
      <g fill="var(--surface)" stroke="currentColor" strokeWidth="1.3">
        <circle cx="30.4" cy="4.6" r="2.4" />
        <circle cx="34.2" cy="4.3" r="2.4" />
        <circle cx="17.2" cy="29.9" r="2.4" />
        <circle cx="38.8" cy="29.9" r="2.4" />
      </g>
    </svg>
  )
}
