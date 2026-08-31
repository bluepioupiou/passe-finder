import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { FormulaireCompte } from '@/components/FormulaireCompte'
import config from '@/payload.config'
import { seConnecter } from '../compte/actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Se connecter — Passe Finder',
}

/**
 * Connexion (E8, Story 3.2, FR-26).
 *
 * Remplace le renvoi provisoire vers `/admin`, qui etait jusqu'ici l'unique
 * porte de connexion du site — et qui est desormais reserve aux
 * administrateurs.
 *
 * Deja connecte, on ne montre pas le formulaire : on renvoie la ou la personne
 * voulait aller. Un formulaire de connexion propose a quelqu'un de connecte
 * n'a pas de reponse juste.
 */
export default async function Connexion({
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
        <h1>Se connecter</h1>
        <p className="texte-attenue">
          Un compte sert à composer tes enchaînements et à les retrouver, ici ou sur ton téléphone.
        </p>
      </header>

      <FormulaireCompte
        action={seConnecter}
        libelle="Se connecter"
        suite={suite}
        alternative={{
          texte: "Pas encore de compte ?",
          lien: suite ? `/inscription?suite=${encodeURIComponent(suite)}` : '/inscription',
          libelleLien: 'En créer un',
        }}
      />
    </div>
  )
}
