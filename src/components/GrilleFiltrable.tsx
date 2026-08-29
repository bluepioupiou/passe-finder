'use client'

import React, { useId, useMemo, useState } from 'react'

import { correspondAuNom } from '@/recherche'
import { Bouton } from './Bouton'
import './grille-filtrable.css'

/**
 * Un element du catalogue, pret a etre filtre puis affiche.
 *
 * `carte` est le rendu deja produit PAR LE SERVEUR (la vignette complete, avec
 * son image). Seul le filtrage vit cote client : on evite ainsi de reimplementer
 * les cartes en double, et les images restent servies dans le HTML initial.
 */
export type ElementCatalogue = {
  cle: React.Key
  nom: string
  /** Valeur brute de difficulte ('1' a '4'), utilisee par le filtre des passes. */
  difficulte?: string | null
  carte: React.ReactNode
}

export type OptionDifficulte = { label: string; value: string }

/**
 * Grille de catalogue filtrable par nom, et par difficulte pour les passes
 * (Story 5.4, UX-DR7).
 *
 * POURQUOI un filtrage cote client : le catalogue tient en quelques dizaines
 * d'elements, deja tous charges par la page. Filtrer sur place donne un retour
 * immediat a la frappe, sans aller-retour serveur ni etat d'attente.
 *
 * L'etat vide « catalogue sans aucun element » reste a la charge de la page :
 * ici on ne traite que « la recherche ne donne rien » (UX-DR7, UX-DR15).
 */
export function GrilleFiltrable({
  elements,
  classeGrille,
  etiquetteRecherche,
  invite,
  singulier,
  pluriel,
  optionsDifficulte,
  requeteInitiale = '',
}: {
  elements: ElementCatalogue[]
  /** Classe de la liste, propre a chaque page (grille de positions, de passes…). */
  classeGrille: string
  etiquetteRecherche: string
  invite: string
  singulier: string
  pluriel: string
  /**
   * Fournies par la page (donnees simples). Elles ne sont PAS importees depuis
   * la collection Payload : ce fichier partant dans le navigateur, cet import y
   * embarquerait tout Payload.
   */
  optionsDifficulte?: OptionDifficulte[]
  /**
   * Requete pre-remplie, venant de l'URL (`?q=`). C'est ce qui permet au
   * « voir tout » de la page de resultats d'arriver ici avec le filtre deja
   * applique, sans que le lecteur ait a retaper sa recherche.
   */
  requeteInitiale?: string
}) {
  const [requete, setRequete] = useState(requeteInitiale)
  const [difficulte, setDifficulte] = useState('')
  const idRecherche = useId()
  const idDifficulte = useId()

  const resultats = useMemo(
    () =>
      elements.filter(
        (element) =>
          correspondAuNom(element.nom, requete) &&
          (difficulte === '' || element.difficulte === difficulte),
      ),
    [elements, requete, difficulte],
  )

  const filtreActif = requete.trim() !== '' || difficulte !== ''

  const effacer = () => {
    setRequete('')
    setDifficulte('')
  }

  return (
    <>
      <div className="filtres">
        <div className="filtres__champ">
          <label className="filtres__label label-caps" htmlFor={idRecherche}>
            {etiquetteRecherche}
          </label>
          <input
            id={idRecherche}
            type="search"
            className="filtres__saisie"
            placeholder={invite}
            value={requete}
            onChange={(evenement) => setRequete(evenement.target.value)}
          />
        </div>

        {optionsDifficulte ? (
          <div className="filtres__champ filtres__champ--court">
            <label className="filtres__label label-caps" htmlFor={idDifficulte}>
              Difficulté
            </label>
            <select
              id={idDifficulte}
              className="filtres__saisie"
              value={difficulte}
              onChange={(evenement) => setDifficulte(evenement.target.value)}
            >
              <option value="">Toutes</option>
              {optionsDifficulte.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {filtreActif ? (
          <Bouton variante="fantome" type="button" className="filtres__effacer" onClick={effacer}>
            Tout afficher
          </Bouton>
        ) : null}
      </div>

      {/* Annonce le nombre de resultats aux lecteurs d'ecran a chaque frappe. */}
      <p className="filtres__compte texte-attenue" role="status" aria-live="polite">
        {filtreActif
          ? `${resultats.length} ${resultats.length > 1 ? pluriel : singulier} sur ${elements.length}`
          : ''}
      </p>

      {resultats.length === 0 ? (
        <p className="texte-attenue">
          {requete.trim() !== ''
            ? `Rien trouvé pour « ${requete.trim()} ». Essaie un autre mot, ou retire les filtres.`
            : 'Rien à cette difficulté. Choisis-en une autre, ou retire les filtres.'}
        </p>
      ) : (
        <ul className={classeGrille}>
          {resultats.map((element) => (
            <li key={element.cle}>{element.carte}</li>
          ))}
        </ul>
      )}
    </>
  )
}
