'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useId, useRef, useState } from 'react'

import { lienListe, type Criteres } from '@/enchainements-liste'
import { Bouton } from './Bouton'
import './grille-filtrable.css'

/**
 * Les filtres de la liste des enchaînements (demande d'Alain, 2026-08-31).
 *
 * IL ÉCRIT DANS L'URL, il ne filtre rien lui-même. C'est la contrepartie de la
 * pagination : le tri vit dans la requête serveur, sinon on ne filtrerait que
 * la page affichée. Ce composant ne fait donc que traduire une saisie en
 * adresse, et laisser la page se recharger avec.
 *
 * LA FRAPPE EST DIFFÉRÉE (300 ms), les autres critères partent tout de suite.
 * Sans ce délai, chaque lettre déclencherait une navigation — et l'ancienne
 * version, qui filtrait en mémoire, répondait instantanément : il s'agit de
 * s'en approcher, pas de faire payer un aller-retour par caractère.
 *
 * TOUT CHANGEMENT DE FILTRE RAMÈNE À LA PAGE 1. Rester en page 4 après avoir
 * réduit la liste à deux résultats afficherait une page vide, sans rien dire de
 * pourquoi.
 */
export function FiltresEnchainements({
  criteres,
  proposerFavoris,
  total,
}: {
  criteres: Criteres
  /**
   * Propose la case « Mes favoris ». La page en décide : elle seule sait s'il y
   * a une session ET au moins un favori. Une case qui ne peut rien donner est
   * pire que pas de case.
   */
  proposerFavoris: boolean
  /** Nombre de résultats, pour l'annonce aux lecteurs d'écran. */
  total: number
}) {
  const router = useRouter()
  const idRecherche = useId()
  const idFavoris = useId()

  // La saisie est tenue localement pour rester fluide sous les doigts ; l'URL,
  // elle, ne suit qu'après la pause.
  const [requete, setRequete] = useState(criteres.requete)
  // La case suit le doigt AVANT que la navigation n'aboutisse : liee a la seule
  // valeur de l'URL, elle se decocherait toute seule pendant l'aller-retour,
  // comme si le clic n'avait pas pris.
  const [favorisSeuls, setFavorisSeuls] = useState(criteres.favorisSeuls)
  const [derniereURL, setDerniereURL] = useState(criteres)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  // L'URL peut changer sans passer par ce champ : bouton « précédent » du
  // navigateur, lien « Tout afficher », arrivée depuis la recherche globale. Le
  // champ suit alors l'URL.
  //
  // Ajusté PENDANT LE RENDU et non dans un effet : un effet provoquerait un
  // second rendu en cascade (React le signale), et surtout un `key` qui
  // remonterait le composant ferait perdre le focus au champ à chaque
  // navigation — c'est-à-dire au milieu de la frappe.
  if (
    derniereURL.requete !== criteres.requete ||
    derniereURL.favorisSeuls !== criteres.favorisSeuls
  ) {
    setDerniereURL(criteres)
    setRequete(criteres.requete)
    setFavorisSeuls(criteres.favorisSeuls)
  }

  useEffect(
    () => () => {
      if (minuterie.current) clearTimeout(minuterie.current)
    },
    [],
  )

  const naviguer = (suivants: Partial<Criteres>) => {
    router.push(lienListe({ ...criteres, page: 1, ...suivants }))
  }

  const saisir = (valeur: string) => {
    setRequete(valeur)
    if (minuterie.current) clearTimeout(minuterie.current)
    minuterie.current = setTimeout(() => naviguer({ requete: valeur }), 300)
  }

  const filtreActif = criteres.requete !== '' || criteres.favorisSeuls

  return (
    <>
      {/* Un vrai formulaire : sans JavaScript, la touche Entrée soumet et la
          recherche fonctionne quand même. */}
      <form
        className="filtres"
        action="/enchainements"
        method="get"
        onSubmit={(evenement) => {
          evenement.preventDefault()
          if (minuterie.current) clearTimeout(minuterie.current)
          naviguer({ requete })
        }}
      >
        <div className="filtres__champ">
          <label className="filtres__label label-caps" htmlFor={idRecherche}>
            Rechercher un enchaînement
          </label>
          <input
            id={idRecherche}
            name="q"
            type="search"
            className="filtres__saisie"
            placeholder="Titre de l'enchaînement…"
            value={requete}
            onChange={(evenement) => saisir(evenement.target.value)}
          />
        </div>

        {proposerFavoris ? (
          <div className="filtres__champ filtres__champ--case">
            <input
              id={idFavoris}
              name="favoris"
              value="1"
              type="checkbox"
              className="filtres__case"
              checked={favorisSeuls}
              onChange={(evenement) => {
                setFavorisSeuls(evenement.target.checked)
                naviguer({ favorisSeuls: evenement.target.checked })
              }}
            />
            <label className="filtres__label-case" htmlFor={idFavoris}>
              Mes favoris
            </label>
          </div>
        ) : null}

        {filtreActif ? (
          <Bouton variante="fantome" href="/enchainements" className="filtres__effacer">
            Tout afficher
          </Bouton>
        ) : null}
      </form>

      {/* Annonce le nombre de resultats aux lecteurs d'ecran. */}
      <p className="filtres__compte texte-attenue" role="status" aria-live="polite">
        {filtreActif ? `${total} enchaînement${total > 1 ? 's' : ''}` : ''}
      </p>
    </>
  )
}
