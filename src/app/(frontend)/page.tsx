import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import { Bouton } from '@/components/Bouton'
import config from '@/payload.config'

export const dynamic = 'force-dynamic'

/**
 * Accueil provisoire. Le vrai fil des nouveautes (E1) arrive avec la Story 5.3 ;
 * cette page sert pour l'instant de point d'entree vers le catalogue.
 */
export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return (
    <div className="contenu-page">
      <h1>{!user || !('email' in user) ? 'Passe Finder' : `Bienvenue, ${user.email}`}</h1>
      <p className="texte-attenue" style={{ marginTop: 'var(--space-2)' }}>
        Le catalogue des positions et des passes de rock 6 temps, et les enchaînements du cours.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-8)',
        }}
      >
        <Bouton href="/enchainements">Voir les enchaînements</Bouton>
        <Bouton href="/positions" variante="fantome">
          Voir les positions
        </Bouton>
        <Bouton href="/passes" variante="fantome">
          Voir les passes
        </Bouton>
      </div>
    </div>
  )
}
