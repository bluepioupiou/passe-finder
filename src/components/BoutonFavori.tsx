'use client'

import React, { useState, useTransition } from 'react'

import type { ResultatFavori } from '@/app/(frontend)/favoris/actions'
import { IconeEtoile } from './Icones'
import './bouton-favori.css'

type Proprietes = {
  /**
   * L'IDENTIFIANT PUBLIC, et pas le numero de la ligne : c'est la seule adresse
   * qu'accepte la collection `Favori`, parce que la connaitre prouve qu'on a
   * bien recu le lien (cf. `retrouverParLeLien`).
   */
  idPublic: string
  /** Etat au chargement, lu en base par la page. */
  favoriInitial: boolean
  /** Chemin a rafraichir apres coup (la fiche, ou la liste). */
  chemin: string
  action: (idPublic: string, chemin: string) => Promise<ResultatFavori>
}

/**
 * Bascule « mettre en favori » (Story 5.1, FR-25).
 *
 * ETAT OPTIMISTE, ET C'EST VOULU : l'etoile change des le clic, sans attendre
 * le serveur. Mettre en signet est un geste anodin et repete ; une attente d'un
 * demi-seconde a chaque clic le rendrait penible. En cas d'echec on REVIENT en
 * arriere et on affiche la raison — l'affichage ment donc au plus le temps d'un
 * aller-retour, et jamais en silence.
 *
 * Le serveur reste seul juge de l'etat final (il regarde ce qui existe et fait
 * l'inverse), donc deux clics rapides ne peuvent pas desynchroniser durablement
 * le bouton et la base.
 */
export function BoutonFavori({ idPublic, favoriInitial, chemin, action }: Proprietes) {
  const [favori, setFavori] = useState(favoriInitial)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, demarrer] = useTransition()

  const basculer = () => {
    const avant = favori

    setFavori(!avant)
    setErreur(null)

    demarrer(async () => {
      const resultat = await action(idPublic, chemin)

      if (!resultat.ok) {
        setFavori(avant)
        setErreur(resultat.message)
        return
      }

      // On adopte l'etat que le SERVEUR annonce, et non celui qu'on avait
      // suppose : si un autre onglet a deja retire ce favori, c'est lui qui a
      // raison.
      setFavori(resultat.favori)
    })
  }

  return (
    <div className="bouton-favori__zone">
      <button
        type="button"
        className="bouton-favori"
        onClick={basculer}
        disabled={enCours}
        aria-pressed={favori}
      >
        <IconeEtoile className="bouton-favori__icone" rempli={favori} />
        {favori ? 'En favori' : 'Mettre en favori'}
      </button>

      {erreur ? (
        <p className="bouton-favori__erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
