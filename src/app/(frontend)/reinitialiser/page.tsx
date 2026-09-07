import Link from 'next/link'
import React from 'react'

import { FormulaireNouveauMotDePasse } from '@/components/FormulaireNouveauMotDePasse'
import { reinitialiserMotDePasse } from '../compte/actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Nouveau mot de passe — Passe Finder',
  // Un lien de reinitialisation n'a rien a faire dans un index de moteur de
  // recherche, meme perime.
  robots: { index: false, follow: false },
}

/**
 * Choix d'un nouveau mot de passe (E8, Story 3.3, FR-28).
 *
 * LE JETON N'EST PAS VERIFIE ICI, et c'est deliberé : le verifier a l'affichage
 * puis a l'envoi ferait deux verdicts pour une seule verite, avec une fenetre
 * entre les deux. C'est `resetPassword` qui tranche, au moment ou le mot de
 * passe est reellement change ; la page se contente de constater l'absence
 * totale de jeton, qui n'est pas un jeton perime mais une adresse tapee a la
 * main ou un lien tronque par un client de messagerie.
 */
export default async function Reinitialiser({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>
}) {
  const { jeton } = await searchParams

  return (
    <div className="contenu-page">
      <header className="compte-entete">
        <h1>Nouveau mot de passe</h1>
      </header>

      {jeton ? (
        <FormulaireNouveauMotDePasse action={reinitialiserMotDePasse} jeton={jeton} />
      ) : (
        <div className="formulaire-compte">
          <p className="formulaire-compte__erreur" role="alert">
            Ce lien est incomplet. Il a peut-être été coupé par ta messagerie : copie-le en
            entier, ou refais une demande.
          </p>
          <p className="formulaire-compte__alternative texte-attenue">
            <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        </div>
      )}
    </div>
  )
}
