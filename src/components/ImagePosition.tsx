import React from 'react'

import type { VuePosition } from '@/composition'
import type { Position } from '@/payload-types'
import { imageDePosition } from '@/positions'
import './image-position.css'

/**
 * Image d'une position (UX-DR3) : ronde, fond `pos-bg`.
 *
 * Ne decide jamais elle-meme de l'image a afficher : elle delegue a
 * `imageDePosition()`, seule source de verite pour « image reelle ou
 * placeholder `no_position` » et pour le texte alternatif (= nom, UX-DR17).
 *
 * `angle` ORIENTE LA VIGNETTE DANS LA SALLE (Epic 7) : degres, sens horaire,
 * par rapport au depart de la passe ou de l'enchainement. On tourne a
 * l'AFFICHAGE, jamais le PNG — la vignette est ronde, la rotation ne montre
 * aucun coin.
 *
 * AUCUN INDICE QUE LA VIGNETTE A TOURNE, et c'est voulu (decision d'Alain) :
 * le but est qu'on retrouve les danseurs la ou on s'attend a les voir, pas de
 * souligner la rotation. Ni repere, ni animation.
 *
 * `null` (le defaut) veut dire « orientation inconnue » : la vignette reste
 * telle que dessinee.
 */
export function ImagePosition({
  position,
  className,
  angle = null,
}: {
  position: Position | VuePosition
  className?: string
  angle?: number | null
}) {
  const { src, alt } = imageDePosition(position)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={['image-position', className].filter(Boolean).join(' ')}
      src={src}
      alt={alt}
      loading="lazy"
      style={angle !== null ? { transform: `rotate(${angle}deg)` } : undefined}
    />
  )
}
