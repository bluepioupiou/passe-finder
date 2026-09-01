'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { ResultatSuppression } from '@/app/(frontend)/enchainements/[id]/modifier/actions'
import { Bouton } from './Bouton'
import './compositeur.css'

/**
 * Supprimer son enchainement (Story 4.5, FR-18).
 *
 * EN DEUX TEMPS, ET SANS `window.confirm`. Une suppression est le seul geste
 * irreversible de l'application : elle ne doit pas partir d'un clic isole, au
 * bout d'un ecran ou l'on vient de cliquer dix fois pour composer. Le premier
 * bouton n'efface rien, il DEMANDE — et laisse a cote un « Non, annuler » aussi
 * gros que la confirmation.
 *
 * Pourquoi pas la boite de dialogue du navigateur : elle n'est pas stylable,
 * elle se lit mal sur telephone, et plusieurs contextes (certaines webviews)
 * l'ignorent purement et simplement — le clic supprimerait alors sans avoir
 * rien demande.
 *
 * EN BAS DE L'ECRAN DE MODIFICATION, et pas sur la fiche : la fiche se relit
 * souvent, en cours, parfois en dansant. Un bouton destructeur y serait a
 * portee de pouce a chaque consultation, pour un geste qu'on ne fait qu'une
 * fois dans la vie d'un enchainement.
 */
export function SuppressionEnchainement({
  id,
  titre,
  supprimer,
}: {
  id: number
  /** Rappele dans la demande de confirmation : on supprime CELUI-CI, pas « un ». */
  titre: string
  supprimer: (id: number) => Promise<ResultatSuppression>
}) {
  const router = useRouter()

  const [demande, setDemande] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const confirmer = async () => {
    if (enCours) return

    setEnCours(true)
    setErreur(null)

    try {
      const resultat = await supprimer(id)

      if (resultat.ok) {
        // Vers la LISTE et non vers la fiche : celle qu'on vient de quitter
        // n'existe plus. `refresh` vide le cache du routeur, sans quoi la liste
        // se rouvrirait avec l'enchainement supprime encore dedans.
        router.push('/enchainements')
        router.refresh()
        return
      }

      setErreur(resultat.message)
    } catch {
      setErreur("La suppression n'a pas abouti (connexion ?). Réessaie.")
    } finally {
      setEnCours(false)
    }
  }

  return (
    <section className="compo-bloc compo-danger">
      <h2 className="compo-bloc__titre">Supprimer</h2>

      {erreur ? (
        <p className="compo-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {demande ? (
        <>
          <p className="compo-danger__question" role="alert">
            Supprimer « {titre} » définitivement ? Sa chaîne, ses informations et les favoris
            posés dessus par d&apos;autres seront perdus.
          </p>

          <div className="compo-actions">
            <button
              type="button"
              className="compo-danger__bouton"
              onClick={confirmer}
              disabled={enCours}
            >
              {enCours ? 'Suppression…' : 'Oui, supprimer'}
            </button>

            <Bouton
              variante="fantome"
              type="button"
              onClick={() => setDemande(false)}
              disabled={enCours}
            >
              Non, annuler
            </Bouton>
          </div>
        </>
      ) : (
        <>
          <p className="compo-aide texte-attenue">
            Définitif : un enchaînement supprimé ne se récupère pas.
          </p>

          <div className="compo-actions">
            <button
              type="button"
              className="compo-danger__bouton"
              onClick={() => setDemande(true)}
            >
              Supprimer l&apos;enchaînement
            </button>
          </div>
        </>
      )}
    </section>
  )
}
