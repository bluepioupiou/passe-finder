'use client'

import React, { useActionState, useState } from 'react'

import type { EtatPseudo } from '@/app/(frontend)/compte/actions'
import { PSEUDO_MAX } from '@/auteurs'
import { Bouton } from './Bouton'
import './formulaire-compte.css'

type Proprietes = {
  action: (precedent: EtatPseudo, donnees: FormData) => Promise<EtatPseudo>
  /** Le pseudo enregistre, ou une chaine vide. Sert de valeur initiale au champ. */
  pseudo: string
  /** Ce qui s'afficherait si le champ restait vide : le debut de l'adresse. */
  parDefaut: string | null
}

/**
 * Choix du pseudo, sur la page du compte (action item `pseudo-et-page-auteur`).
 *
 * CHAMP CONTROLE, et c'est le seul moyen de garder la saisie a l'ecran quand
 * l'envoi est refuse (NFR-4, UX-DR16) : React 19 REINITIALISE un formulaire des
 * que son action serveur se termine, y compris quand elle renvoie une erreur.
 * Un champ non controle reviendrait alors a sa valeur d'origine — la personne
 * verrait « corrige ton pseudo » au-dessus d'un champ qui a efface ce qu'elle
 * venait de taper. Constate en test end-to-end, pas devine.
 *
 * LE VIDE EST UNE REPONSE VALIDE, pas un oubli : effacer le champ et enregistrer
 * remet l'affichage sur l'adresse. Le formulaire le dit sous le champ, sinon le
 * seul moyen de l'apprendre serait d'essayer.
 */
export function FormulairePseudo({ action, pseudo, parDefaut }: Proprietes) {
  const [etat, envoyer, enCours] = useActionState(action, {})
  const [saisie, setSaisie] = useState(pseudo)

  return (
    <form className="formulaire-compte" action={envoyer}>
      {/* `role="alert"` : annonce des son apparition, pour qui n'a pas les yeux
          sur le formulaire. */}
      {etat.erreur ? (
        <p className="formulaire-compte__erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}

      {etat.enregistre ? (
        <p className="formulaire-compte__succes" role="status">
          C&apos;est enregistré.
        </p>
      ) : null}

      <div className="formulaire-compte__champ">
        <label htmlFor="pseudo">Pseudo</label>
        <input
          id="pseudo"
          name="pseudo"
          type="text"
          value={saisie}
          onChange={(evenement) => setSaisie(evenement.target.value)}
          // Garde-fou de SAISIE seulement (il compte en unites UTF-16, la
          // regle compte en caracteres) : il evite de taper trente lignes pour
          // se les faire refuser. C'est `erreurPseudo` qui tranche.
          maxLength={PSEUDO_MAX}
          autoComplete="nickname"
          aria-describedby="aide-pseudo"
        />
        <p id="aide-pseudo" className="formulaire-compte__aide">
          C&apos;est le nom affiché comme auteur de tes enchaînements.{' '}
          {parDefaut
            ? `Laisse-le vide et c’est « ${parDefaut} » qui s’affichera, comme aujourd’hui.`
            : 'Laisse-le vide et aucun nom d’auteur ne s’affichera.'}
        </p>
      </div>

      <Bouton type="submit" disabled={enCours}>
        {enCours ? 'Un instant…' : 'Enregistrer'}
      </Bouton>
    </form>
  )
}
