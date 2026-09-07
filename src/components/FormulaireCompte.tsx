'use client'

import Link from 'next/link'
import React, { useActionState, useState } from 'react'

import type { EtatFormulaire } from '@/app/(frontend)/compte/actions'
import { Bouton } from './Bouton'
import './formulaire-compte.css'

type Proprietes = {
  action: (precedent: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>
  /** Libelle du bouton d'envoi, et donc du geste : « Se connecter », « Créer mon compte ». */
  libelle: string
  /** Chemin interne ou revenir apres coup ; valide de nouveau cote serveur. */
  suite?: string
  /** Aide sous le champ mot de passe (contrainte a l'inscription). */
  aideMotDePasse?: string
  /** Affiche le renvoi vers la reinitialisation (Story 3.3) — connexion seulement. */
  motDePasseOublie?: boolean
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
 * recharger la page. C'est le serveur qui valide : les attributs `required` du
 * navigateur ne sont qu'un confort, ils evitent un aller-retour, ils ne
 * protegent rien.
 *
 * CHAMP E-MAIL CONTROLE. Il ne l'etait pas, et le commentaire promettait
 * pourtant de garder l'adresse saisie : React 19 REINITIALISE un formulaire des
 * que son action serveur se termine, y compris sur une erreur. La promesse
 * etait donc fausse depuis l'origine — on retapait son adresse a chaque mot de
 * passe rate. Meme correctif que sur le formulaire de pseudo, ou le defaut
 * avait ete constate le premier (Story 3.3).
 *
 * LE MOT DE PASSE, LUI, RESTE NON CONTROLE, et c'est voulu : un champ efface
 * apres un refus est ici le bon comportement, personne ne corrige un mot de
 * passe faux en modifiant deux lettres.
 */
export function FormulaireCompte({
  action,
  libelle,
  suite,
  aideMotDePasse,
  motDePasseOublie,
  alternative,
}: Proprietes) {
  const [etat, envoyer, enCours] = useActionState(action, {})
  const [email, setEmail] = useState('')

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
          value={email}
          onChange={(evenement) => setEmail(evenement.target.value)}
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
        {/* SOUS LE CHAMP MOT DE PASSE, et pas en bas de page : c'est la, au
            moment ou l'on bute, que la question se pose. */}
        {motDePasseOublie ? (
          <p className="formulaire-compte__aide">
            <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          </p>
        ) : null}
      </div>

      {/* Le composant `Bouton`, et non les classes recopiees : elles seules
          n'entrainent pas le chargement de la feuille de style, et le bouton
          se retrouvait sans aucun habillage sur ces deux pages. */}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? 'Un instant…' : libelle}
      </Bouton>

      <p className="formulaire-compte__alternative texte-attenue">
        {alternative.texte} <Link href={alternative.lien}>{alternative.libelleLien}</Link>
      </p>
    </form>
  )
}
