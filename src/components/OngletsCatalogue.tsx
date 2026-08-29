import Link from 'next/link'
import React from 'react'

import './onglets-catalogue.css'

/**
 * Onglets du catalogue : Positions | Passes (UX-DR7, E2).
 *
 * Chaque onglet est un LIEN vers une vraie page, pas un etat local. Les deux
 * sections gardent donc leur URL propre (partageable, indexable, fonctionnelle
 * sans JavaScript) tout en se lisant comme un seul ecran « Catalogue ».
 *
 * L'onglet actif est fourni par la page appelante : le composant reste rendu
 * cote serveur, sans avoir a lire l'URL.
 */
export function OngletsCatalogue({ actif }: { actif: 'positions' | 'passes' }) {
  const onglets = [
    { cle: 'positions' as const, libelle: 'Positions', href: '/positions' },
    { cle: 'passes' as const, libelle: 'Passes', href: '/passes' },
  ]

  return (
    <nav className="onglets" aria-label="Sections du catalogue">
      {onglets.map((onglet) => {
        const estActif = onglet.cle === actif

        return (
          <Link
            key={onglet.cle}
            href={onglet.href}
            className={['onglet', estActif ? 'onglet--actif' : ''].filter(Boolean).join(' ')}
            // Annonce la section courante aux lecteurs d'ecran (UX-DR17).
            aria-current={estActif ? 'page' : undefined}
          >
            {onglet.libelle}
          </Link>
        )
      })}
    </nav>
  )
}
