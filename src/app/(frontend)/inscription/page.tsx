import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { FormulaireCompte } from '@/components/FormulaireCompte'
import config from '@/payload.config'
import { sInscrire } from '../compte/actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Créer un compte — Passe Finder',
}

/**
 * Inscription (E8, Story 3.1, FR-26).
 *
 * Un compte neuf est un compte ORDINAIRE : il compose, enregistre et partage
 * ses propres enchainements, et n'a aucun droit sur le catalogue de reference
 * (Story 3.4). Rien, dans ce formulaire ni dans la requete qu'il envoie, ne
 * permet d'obtenir autre chose.
 */
export default async function Inscription({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>
}) {
  const { suite } = await searchParams
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  if (user) redirect(suite?.startsWith('/') && !suite.startsWith('//') ? suite : '/')

  return (
    <div className="contenu-page">
      <header className="compte-entete">
        <h1>Créer un compte</h1>
        <p className="texte-attenue">
          Il faut un compte pour composer un enchaînement : c&apos;est lui qui en devient
          l&apos;auteur, et qui décide ensuite de le garder privé ou de le partager.
        </p>
      </header>

      <FormulaireCompte
        action={sInscrire}
        libelle="Créer mon compte"
        suite={suite}
        aideMotDePasse="Au moins 8 caractères."
        alternative={{
          texte: 'Tu as déjà un compte ?',
          lien: suite ? `/connexion?suite=${encodeURIComponent(suite)}` : '/connexion',
          libelleLien: 'Se connecter',
        }}
      />
    </div>
  )
}
