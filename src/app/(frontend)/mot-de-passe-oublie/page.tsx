import React from 'react'

import { FormulaireMotDePasseOublie } from '@/components/FormulaireMotDePasseOublie'
import { ENVOI_INDISPONIBLE, envoiConfigure } from '@/courriel'
import { demanderReinitialisation } from '../compte/actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mot de passe oublié — Passe Finder',
}

/**
 * Demande de reinitialisation (E8, Story 3.3, FR-28).
 *
 * PAS DE REDIRECTION SI L'ON EST DEJA CONNECTE, contrairement a /connexion et
 * /inscription. Quelqu'un de connecte sur son telephone peut vouloir changer un
 * mot de passe qu'il ne retrouve pas sur son ordinateur : le renvoyer a
 * l'accueil serait un refus incomprehensible.
 *
 * L'INDISPONIBILITE SE DIT AVANT LE FORMULAIRE, pas apres l'envoi (decision
 * d'Alain, 2026-09-07). Laisser remplir un champ pour repondre ensuite que rien
 * ne partira ferait perdre du temps a la personne, et lui ferait croire que sa
 * demande a peut-etre abouti.
 */
export default async function MotDePasseOublie() {
  return (
    <div className="contenu-page">
      <header className="compte-entete">
        <h1>Mot de passe oublié</h1>
        <p className="texte-attenue">
          Donne l&apos;adresse de ton compte : tu recevras un lien pour en choisir un nouveau.
        </p>
      </header>

      {envoiConfigure ? null : (
        <p className="formulaire-compte__erreur" role="alert">
          {ENVOI_INDISPONIBLE}
        </p>
      )}

      <FormulaireMotDePasseOublie
        action={demanderReinitialisation}
        disponible={envoiConfigure}
      />
    </div>
  )
}
