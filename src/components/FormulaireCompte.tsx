'use client'

import Link from 'next/link'
import React, { useActionState } from 'react'

import type { EtatFormulaire } from '@/app/(frontend)/compte/actions'
import './formulaire-compte.css'

type Proprietes = {
  action: (precedent: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>
  /** Libelle du bouton d'envoi, et donc du geste : « Se connecter », « Créer mon compte ». */
  libelle: string
  /** Chemin interne ou revenir apres coup ; valide de nouveau cote serveur. */
  suite?: string
  /** Aide sous le champ mot de passe (contrainte a l'inscription). */
  aideMotDePasse?: string
  /** Lien vers l'autre porte : on ne laisse jamais quelqu'un dans un cul-de-sac. */
  alternative: { texte: string; lien: string; libelleLien: string }
}

/**
 * Formulaire de compte, partage par la connexion et l'inscription (E8).
 *
 * Un seul composant pour les deux ecrans : ils ont les memes champs, la meme
 * gestion d'erreur et le meme rythme. Ce qui change (le libelle, l'action, le
 * lien vers l'autre porte) est passe en proprietes.
 *
 * `useActionState` garde le message d'erreur RENVOYE PAR LE SERVEUR sans
 * recharger la page ni vider l'email deja saisi. C'est le serveur qui valide :
 * les attributs `required` du navigateur ne sont qu'un confort, ils evitent un
 * aller-retour, ils ne protegent rien.
 */
export function FormulaireCompte({
  action,
  libelle,
  suite,
  aideMotDePasse,
  alternative,
}: Proprietes) {
  const [etat, envoyer, enCours] = useActionState(action, {})

  return (
    <form className="formulaire-compte" action={envoyer}>
      {suite ? <input type="hidden" name="suite" value={suite} /> : null}

      {/* `role="alert"` : le message est annonce des son apparition, pour qui
          n'a pas les yeux sur le formulaire. */}
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
          autoComplete="email"
          required
          autoFocus
        />
      </div>

      <div className="formulaire-compte__champ">
        <label htmlFor="motDePasse">Mot de passe</label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          // `new-password` a l'inscription, `current-password` a la connexion :
          // c'est ce qui decide si le gestionnaire de mots de passe propose d'en
          // generer un ou de remplir celui qu'il connait deja.
          autoComplete={aideMotDePasse ? 'new-password' : 'current-password'}
          required
          aria-describedby={aideMotDePasse ? 'aide-mot-de-passe' : undefined}
        />
        {aideMotDePasse ? (
          <p id="aide-mot-de-passe" className="formulaire-compte__aide">
            {aideMotDePasse}
          </p>
        ) : null}
      </div>

      <button type="submit" className="bouton bouton--primaire" disabled={enCours}>
        {enCours ? 'Un instant…' : libelle}
      </button>

      <p className="formulaire-compte__alternative texte-attenue">
        {alternative.texte} <Link href={alternative.lien}>{alternative.libelleLien}</Link>
      </p>
    </form>
  )
}
