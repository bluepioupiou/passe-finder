import { getPayload } from 'payload'
import React from 'react'

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
 */
export default async function PositionsPage() {
  const payload = await getPayload({ config: await config })

  const { docs: positions, totalDocs } = await payload.find({
    collection: 'positions',
    limit: 200,
    depth: 1,
    sort: 'nom',
  })

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
        <ul className="positions-grille">
          {positions.map((position) => (
            <li key={position.id} className="position-carte">
              <ImagePosition position={position} />
              <h2 className="position-nom">{position.nom}</h2>
              {position.description ? (
                <p className="position-description texte-attenue">{position.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
