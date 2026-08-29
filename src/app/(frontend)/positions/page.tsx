import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { GrilleFiltrable } from '@/components/GrilleFiltrable'
import { ImagePosition } from '@/components/ImagePosition'
import config from '@/payload.config'
import './positions.css'

/**
 * Rendu a la demande : le contenu vient de la base et evolue quand Alain edite
 * le catalogue. Le pre-rendu au build est impossible de toute facon (aucune
 * base n'existe a ce moment-la).
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Positions — Passe Finder',
  description: 'Le catalogue des positions de rock 6 temps.',
}

/**
 * Liste publique des positions, habillee par le design system « Lin & Sauge ».
 * Lecture publique : aucune authentification requise (FR-21).
 *
 * Section « Positions » du catalogue (E2) : la recherche par nom filtre la
 * grille sans aller-retour serveur. Le passage vers les Passes se fait par
 * la barre de navigation, seul endroit ou vit ce choix.
 */
export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // `?q=` : requete transmise par la recherche globale (« voir tout »).
  const { q } = await searchParams
  const requeteInitiale = (q ?? '').trim()

  const payload = await getPayload({ config: await config })

  const { docs: positions, totalDocs } = await payload.find({
    collection: 'positions',
    limit: 200,
    depth: 1,
    sort: 'nom',
  })

  // Les cartes sont rendues ici (cote serveur) ; la grille cliente ne fait que
  // choisir lesquelles afficher.
  const elements = positions.map((position) => ({
    cle: position.id,
    nom: position.nom,
    carte: (
      <Link className="position-carte" href={`/positions/${position.id}`}>
        <ImagePosition position={position} />
        <h2 className="position-nom">{position.nom}</h2>
        {position.description ? (
          <p className="position-description texte-attenue">{position.description}</p>
        ) : null}
      </Link>
    ),
  }))

  return (
    <div className="contenu-page">
      <header className="positions-entete">
        <h1>Positions</h1>
        <p className="texte-attenue">
          {totalDocs === 0
            ? 'Aucune position pour le moment.'
            : `${totalDocs} position${totalDocs > 1 ? 's' : ''} au catalogue.`}
        </p>
      </header>

      {totalDocs === 0 ? (
        <p className="texte-attenue">
          Le catalogue est vide. Ajoute une position depuis le back-office.
        </p>
      ) : (
        <GrilleFiltrable
          // Remonte le composant quand la requete de l'URL change, pour que le
          // champ suive l'URL au lieu de garder l'ancienne saisie.
          key={requeteInitiale}
          requeteInitiale={requeteInitiale}
          elements={elements}
          classeGrille="positions-grille"
          etiquetteRecherche="Rechercher une position"
          invite="Nom de la position…"
          singulier="position"
          pluriel="positions"
        />
      )}
    </div>
  )
}
