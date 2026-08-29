import type { Media, Position } from './payload-types'

/** Placeholder servi quand une position n'a pas d'image (FR-2, NFR-3). */
export const NO_POSITION_IMAGE = '/no_position.jpg'

/**
 * Source d'affichage d'une position : image reelle si presente, placeholder sinon.
 * Regle centralisee ici pour qu'aucune surface d'affichage ne la reimplemente.
 * Le texte alternatif est toujours le nom de la position (UX-DR17).
 */
export function imageDePosition(position: Position): { src: string; alt: string } {
  const image = position.image as Media | number | null | undefined
  const src =
    image && typeof image === 'object' && typeof image.url === 'string' && image.url
      ? image.url
      : NO_POSITION_IMAGE

  return { src, alt: position.nom }
}
