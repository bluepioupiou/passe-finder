import Link from 'next/link'
import React from 'react'

import './pagination.css'

/**
 * Pagination d'une liste (demande d'Alain, 2026-08-31).
 *
 * DES LIENS, PAS DES BOUTONS : chaque page est une adresse. Elle se partage,
 * s'ouvre dans un onglet, revient avec le bouton « précédent » du navigateur, et
 * fonctionne sans JavaScript. Un composant qui changerait la page en mémoire
 * perdrait les quatre.
 *
 * Composant SERVEUR : il ne porte aucun état, seulement le calcul de ce qu'il
 * faut montrer. Le parent lui donne comment fabriquer une adresse.
 *
 * On n'affiche pas les cinquante numéros d'un catalogue qui grossit : la page
 * courante, ses voisines, les deux extrémités, et des ellipses entre les deux.
 */

/** Ce qu'on montre : des numéros, et des trous. */
export type Element = number | 'trou'

/**
 * Les numéros à afficher autour de la page courante.
 *
 * PURE et exportée pour être testée : une pagination fausse se remarque tard,
 * quand quelqu'un cherche une page qui n'existe pas.
 */
export function numerosVisibles(page: number, pages: number, voisins = 1): Element[] {
  if (pages <= 1) return pages === 1 ? [1] : []

  const numeros = new Set<number>([1, pages])
  for (let n = page - voisins; n <= page + voisins; n += 1) {
    if (n >= 1 && n <= pages) numeros.add(n)
  }

  const ordonnes = [...numeros].sort((a, b) => a - b)
  const elements: Element[] = []

  ordonnes.forEach((numero, index) => {
    const precedent = ordonnes[index - 1]
    // Un trou ne se note que s'il saute VRAIMENT quelque chose : entre 3 et 5,
    // l'ellipse cacherait la seule page 4, qu'il vaut mieux montrer.
    if (precedent !== undefined && numero - precedent > 1) {
      elements.push(numero - precedent === 2 ? numero - 1 : 'trou')
    }
    elements.push(numero)
  })

  return elements
}

export function Pagination({
  page,
  pages,
  lien,
}: {
  page: number
  pages: number
  /** Fabrique l'adresse d'une page, en gardant les filtres courants. */
  lien: (page: number) => string
}) {
  if (pages <= 1) return null

  const elements = numerosVisibles(page, pages)

  return (
    <nav className="pagination" aria-label="Pages de résultats">
      {page > 1 ? (
        <Link className="pagination__saut" href={lien(page - 1)} rel="prev">
          Précédente
        </Link>
      ) : (
        <span className="pagination__saut pagination__saut--inerte">Précédente</span>
      )}

      <ul className="pagination__numeros">
        {elements.map((element, index) =>
          element === 'trou' ? (
            // `aria-hidden` : l'ellipse est un repère visuel, elle n'apprend
            // rien à qui écoute la page.
            <li key={`trou-${index}`} className="pagination__trou" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={element}>
              {element === page ? (
                <span className="pagination__numero pagination__numero--courant" aria-current="page">
                  {element}
                </span>
              ) : (
                <Link
                  className="pagination__numero"
                  href={lien(element)}
                  aria-label={`Page ${element}`}
                >
                  {element}
                </Link>
              )}
            </li>
          ),
        )}
      </ul>

      {page < pages ? (
        <Link className="pagination__saut" href={lien(page + 1)} rel="next">
          Suivante
        </Link>
      ) : (
        <span className="pagination__saut pagination__saut--inerte">Suivante</span>
      )}
    </nav>
  )
}
