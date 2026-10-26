'use client'

import { useRouter } from 'next/navigation'
import React, { useId, useState } from 'react'

import { Bouton } from '@/components/Bouton'
import { ImagePosition } from '@/components/ImagePosition'
import type { VuePosition } from '@/composition'
import type { ResultatPasse, SaisiePasse } from '@/edition-passe'
import { angleAffiche, PIVOTS, pivotDe } from '@/orientation'
import { DUREES } from '@/rythme'
import './formulaire-passe.css'

type Option = { label: string; value: string }

/**
 * Pourquoi l'arrivee reste telle que dessinee, ou `null` si elle est orientee.
 *
 * DIT ICI ET NULLE PART AILLEURS. La fiche publique tourne sans rien signaler
 * (Epic 7) ; mais c'est en modifiant qu'on se demande pourquoi la vignette ne
 * bouge pas, et la reponse est toujours une donnee manquante a renseigner.
 */
function raisonSansOrientation(
  pivot: string,
  debut: VuePosition | undefined,
  fin: VuePosition | undefined,
): string | null {
  if (!debut || !fin) return null
  if (pivotDe(pivot) === null) return 'Pivot non renseigné : l’arrivée reste telle que dessinée.'

  const manquantes = [debut, fin].filter((position) => position.ligne === null)
  if (manquantes.length === 0) return null

  const noms = [...new Set(manquantes.map((position) => `« ${position.nom} »`))].join(' et ')
  return `Ligne de danse non renseignée pour ${noms} : l’arrivée reste telle que dessinée.`
}

/**
 * Modifier une passe depuis sa fiche, avec l'apercu de ce qu'on modifie.
 *
 * L'APERCU EST LE MEME CALCUL QUE LA FICHE (`angleAffiche`) : le depart tel que
 * dessine, l'arrivee recalee sur lui plus le pivot. Changer le pivot ou une
 * position fait donc tourner la vignette exactement comme elle tournera une
 * fois enregistree.
 *
 * CHANGER UNE POSITION est permis (decision d'Alain, 2026-10-25), mais une
 * passe deja utilisee le fait savoir : les enchainements qui la contiennent
 * ne sont pas reecrits, et la passe suivante pourrait ne plus partir de la
 * nouvelle arrivee.
 */
export function FormulairePasse({
  initial,
  positions,
  difficultes,
  utilisations,
  enregistrer,
  retour,
}: {
  initial: SaisiePasse
  positions: VuePosition[]
  difficultes: readonly Option[]
  /** Nombre d'enchainements qui utilisent la passe, tous auteurs confondus. */
  utilisations: number
  enregistrer: (saisie: SaisiePasse) => Promise<ResultatPasse>
  retour: string
}) {
  const router = useRouter()
  const champ = useId()
  const [saisie, setSaisie] = useState<SaisiePasse>(initial)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const modifier = <Cle extends keyof SaisiePasse>(cle: Cle, valeur: SaisiePasse[Cle]) =>
    setSaisie((actuelle) => ({ ...actuelle, [cle]: valeur }))

  const debut = positions.find((position) => position.id === saisie.positionDebut)
  const fin = positions.find((position) => position.id === saisie.positionFin)
  const angle = debut && fin ? angleAffiche(pivotDe(saisie.pivot), debut.ligne, fin.ligne) : null
  const raison = raisonSansOrientation(saisie.pivot, debut, fin)

  const extremitesChangees =
    saisie.positionDebut !== initial.positionDebut || saisie.positionFin !== initial.positionFin

  const soumettre = async (evenement: React.FormEvent) => {
    evenement.preventDefault()
    if (enCours) return

    setEnCours(true)
    setErreur(null)
    try {
      const resultat = await enregistrer(saisie)

      if (!resultat.ok) {
        // L'echec RESTE A L'ECRAN, avec toute la saisie.
        setErreur(resultat.message)
        setEnCours(false)
        return
      }

      router.push(`/passes/${resultat.id}`)
      router.refresh()
    } catch {
      setErreur("L'enregistrement n'a pas abouti. Réessaie dans un instant.")
      setEnCours(false)
    }
  }

  const selectPosition = (cle: 'positionDebut' | 'positionFin', libelle: string) => (
    <div className="formulaire-passe__champ">
      <label htmlFor={`${champ}-${cle}`}>{libelle}</label>
      <select
        id={`${champ}-${cle}`}
        value={saisie[cle]}
        onChange={(evenement) => modifier(cle, Number(evenement.target.value))}
      >
        {positions.map((position) => (
          <option key={position.id} value={position.id}>
            {position.nom}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <form className="formulaire-passe" onSubmit={soumettre}>
      <section className="fiche-chaine formulaire-passe__apercu" aria-label="Aperçu de la passe">
        <figure className="fiche-maillon">
          {debut ? <ImagePosition position={debut} className="fiche-maillon__image" /> : null}
          <figcaption>
            <span className="fiche-maillon__role label-caps texte-attenue">Départ</span>
            <span className="fiche-maillon__nom">{debut?.nom}</span>
          </figcaption>
        </figure>
        <span className="fiche-chaine__fleche" aria-hidden="true">
          →
        </span>
        <figure className="fiche-maillon">
          {fin ? (
            <ImagePosition position={fin} className="fiche-maillon__image" angle={angle} />
          ) : null}
          <figcaption>
            <span className="fiche-maillon__role label-caps texte-attenue">Arrivée</span>
            <span className="fiche-maillon__nom">{fin?.nom}</span>
          </figcaption>
        </figure>
      </section>
      {raison ? <p className="formulaire-passe__note">{raison}</p> : null}

      <div className="formulaire-passe__grille">
        {selectPosition('positionDebut', 'Position de départ')}
        {selectPosition('positionFin', 'Position d’arrivée')}

        <div className="formulaire-passe__champ">
          <label htmlFor={`${champ}-pivot`}>Pivot du couple</label>
          <select
            id={`${champ}-pivot`}
            value={saisie.pivot}
            onChange={(evenement) => modifier('pivot', evenement.target.value)}
          >
            <option value="">Non renseigné</option>
            {PIVOTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="formulaire-passe__note">
            De combien le couple a tourné par rapport à la ligne de danse : le résultat, pas le sens
            dans lequel on tourne.
          </p>
        </div>

        <div className="formulaire-passe__champ">
          <label htmlFor={`${champ}-duree`}>Durée</label>
          <select
            id={`${champ}-duree`}
            value={saisie.duree}
            onChange={(evenement) => modifier('duree', evenement.target.value)}
          >
            {DUREES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="formulaire-passe__note">
            10 temps répète « 3 et 4 . 5 et 6 . » pour une passe ralentie.
          </p>
        </div>

        <div className="formulaire-passe__champ">
          <label htmlFor={`${champ}-difficulte`}>Difficulté</label>
          <select
            id={`${champ}-difficulte`}
            value={saisie.difficulte}
            onChange={(evenement) => modifier('difficulte', evenement.target.value)}
          >
            <option value="">Non renseignée</option>
            {difficultes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {extremitesChangees && utilisations > 0 ? (
        <p className="formulaire-passe__alerte" role="alert">
          Cette passe est utilisée par {utilisations} enchaînement{utilisations > 1 ? 's' : ''}.
          Changer ses positions ne les réécrit pas : vérifie que la passe suivante part bien de la
          nouvelle arrivée.
        </p>
      ) : null}

      <div className="formulaire-passe__champ">
        <label htmlFor={`${champ}-nom`}>Nom</label>
        <input
          id={`${champ}-nom`}
          type="text"
          value={saisie.nom}
          onChange={(evenement) => modifier('nom', evenement.target.value)}
          required
        />
      </div>

      <div className="formulaire-passe__champ">
        <label htmlFor={`${champ}-description`}>Description</label>
        <textarea
          id={`${champ}-description`}
          rows={3}
          value={saisie.description}
          onChange={(evenement) => modifier('description', evenement.target.value)}
        />
      </div>

      <div className="formulaire-passe__champ">
        <label htmlFor={`${champ}-deroule`}>Déroulé</label>
        <textarea
          id={`${champ}-deroule`}
          rows={8}
          value={saisie.deroule}
          onChange={(evenement) => modifier('deroule', evenement.target.value)}
        />
      </div>

      {erreur ? (
        <p className="formulaire-passe__erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      <div className="formulaire-passe__actions">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </Bouton>
        <Bouton variante="fantome" href={retour}>
          Annuler
        </Bouton>
      </div>
    </form>
  )
}
