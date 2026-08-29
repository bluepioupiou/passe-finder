import React from 'react'

import type { Position } from '@/payload-types'
import { imageDePosition } from '@/positions'
import './image-position.css'

/**
 * Image d'une position (UX-DR3) : ronde, fond `pos-bg`.
 *
 * Ne decide jamais elle-meme de l'image a afficher : elle delegue a
 * `imageDePosition()`, seule source de verite pour « image reelle ou
 * placeholder `no_position` » et pour le texte alternatif (= nom, UX-DR17).
 */
export function ImagePosition({
  position,
  className,
}: {
  position: Position
  className?: string
}) {
  const { src, alt } = imageDePosition(position)

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={['image-position', className].filter(Boolean).join(' ')}
      src={src}
      alt={alt}
      loading="lazy"
    />
  )
}
