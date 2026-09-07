'use client'

import Link from 'next/link'
import React, { useActionState, useState } from 'react'

import type { EtatDemande } from '@/app/(frontend)/compte/actions'
import { Bouton } from './Bouton'
import './formulaire-compte.css'

type Proprietes = {
  action: (precedent: EtatDemande, donnees: FormData) => Promise<EtatDemande>
  /** L'envoi d'e-mails est-il configure sur ce serveur ? */
  disponible: boolean
}

/**
 * Demande d'un lien de reinitialisation (E8, Story 3.3, FR-28).
 *
 * L'ACCUSE DE RECEPTION REMPLACE LE FORMULAIRE au lieu de s'afficher au-dessus.
 * Laisser le champ en place inviterait a renvoyer, alors qu'un deuxieme envoi
 * dans la minute est justement refuse en silence : la personne conclurait que
 * rien ne marche.
 *
 * CHAMP CONTROLE, comme le formulaire de pseudo et pour la meme raison : React
 * 19 reinitialise un formulaire des que son action serveur se termine, y
 * compris sur une erreur. Non controle, le champ effacerait l'adresse au moment
 * meme ou on demande de la corriger.
 */
export function FormulaireMotDePasseOublie({ action, disponible }: Proprietes) {
  const [etat, envoyer, enCours] = useActionState(action, {})
  const [saisie, setSaisie] = useState('')

  if (etat.envoye) {
    return (
      <div className="formulaire-compte">
        {/* LE MEME TEXTE QUELLE QUE SOIT L'ADRESSE — connue, inconnue, ou envoi
            deja fait il y a quelques secondes. Un message qui dirait « compte
            introuvable » ferait de cet ecran un revelateur d'adresses. */}
        <p className="formulaire-compte__succes" role="status">
          Si un compte existe avec cette adresse, un message vient d&apos;y partir. Le lien
          qu&apos;il contient est valable une heure. Pense à regarder dans les indésirables.
        </p>
        <p className="formulaire-compte__alternative texte-attenue">
          <Link href="/connexion">Revenir à la connexion</Link>
        </p>
      </div>
    )
  }

  return (
    <form className="formulaire-compte" action={envoyer}>
      {etat.erreur ? (
        <p className="formulaire-compte__erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}

      <div className="formulaire-compte__champ">
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          value={saisie}
          onChange={(evenement) => setSaisie(evenement.target.value)}
          autoComplete="email"
          required
          autoFocus
          disabled={!disponible}
        />
      </div>

      <Bouton type="submit" disabled={enCours || !disponible}>
        {enCours ? 'Un instant…' : 'Recevoir un lien'}
      </Bouton>

      <p className="formulaire-compte__alternative texte-attenue">
        Tu t&apos;en souviens finalement ? <Link href="/connexion">Se connecter</Link>
      </p>
    </form>
  )
}
