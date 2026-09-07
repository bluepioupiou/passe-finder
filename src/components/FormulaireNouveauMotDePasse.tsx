'use client'

import Link from 'next/link'
import React, { useActionState, useState } from 'react'

import type { EtatFormulaire } from '@/app/(frontend)/compte/actions'
import { Bouton } from './Bouton'
import './formulaire-compte.css'

type Proprietes = {
  action: (precedent: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>
  /** Le jeton recu par e-mail, revalide cote serveur a l'envoi. */
  jeton: string
}

/**
 * Choix du nouveau mot de passe, au bout du lien recu par e-mail (Story 3.3).
 *
 * UN SEUL CHAMP, pas de confirmation a retaper : la personne peut afficher ce
 * qu'elle tape dans son gestionnaire de mots de passe, et une erreur de frappe
 * se repare en refaisant une demande. Un second champ ajouterait une friction
 * a l'ecran le plus fragile du parcours, celui ou l'on arrive deja agace.
 *
 * `autoComplete="new-password"` : c'est ce qui decide si le gestionnaire
 * propose d'en generer un plutot que de remplir l'ancien.
 */
export function FormulaireNouveauMotDePasse({ action, jeton }: Proprietes) {
  const [etat, envoyer, enCours] = useActionState(action, {})
  const [saisie, setSaisie] = useState('')

  return (
    <form className="formulaire-compte" action={envoyer}>
      <input type="hidden" name="jeton" value={jeton} />

      {etat.erreur ? (
        <p className="formulaire-compte__erreur" role="alert">
          {etat.erreur}{' '}
          <Link href="/mot-de-passe-oublie">Refaire une demande</Link>
        </p>
      ) : null}

      <div className="formulaire-compte__champ">
        <label htmlFor="motDePasse">Nouveau mot de passe</label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          value={saisie}
          onChange={(evenement) => setSaisie(evenement.target.value)}
          autoComplete="new-password"
          required
          autoFocus
          aria-describedby="aide-mot-de-passe"
        />
        <p id="aide-mot-de-passe" className="formulaire-compte__aide">
          Au moins 8 caractères.
        </p>
      </div>

      <Bouton type="submit" disabled={enCours}>
        {enCours ? 'Un instant…' : 'Enregistrer et me connecter'}
      </Bouton>
    </form>
  )
}
