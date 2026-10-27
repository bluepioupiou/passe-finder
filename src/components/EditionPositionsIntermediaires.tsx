'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { ResultatPasse } from '@/edition-passe'
import { frise, type PositionIntermediaire } from '@/positions-intermediaires'
import type { Duree } from '@/rythme'
import { ScenePosition } from './ScenePosition'
import './edition-positions-intermediaires.css'

/**
 * La frise du comptage d'une passe, en edition (Story 8.2) : un « + » sur
 * chaque instant libre ouvre l'atelier, une position posee se rouvre ou se
 * retire.
 *
 * LA DUREE EST CELLE QUI EST ENREGISTREE, pas celle du menu du formulaire
 * au-dessus : un instant n'existe pour l'atelier que si la passe l'a deja.
 * Passer a 10 temps, c'est donc enregistrer d'abord.
 *
 * Les vignettes sont dessinees depuis leur schema (`ScenePosition`) : une
 * position intermediaire n'a jamais d'image (AD-16).
 */
export function EditionPositionsIntermediaires({
  passeId,
  duree,
  positions,
  retirer,
}: {
  passeId: number
  duree: Duree
  positions: PositionIntermediaire[]
  /** L'action serveur, `passeId` deja lie par la page. */
  retirer: (instant: number) => Promise<ResultatPasse>
}) {
  const router = useRouter()
  const [enCours, setEnCours] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const retirerInstant = async (instant: number, nom: string) => {
    if (enCours !== null) return
    if (!window.confirm(`Retirer la position posée sur « ${nom} » ?`)) return

    setEnCours(instant)
    setErreur(null)
    try {
      const resultat = await retirer(instant)
      if (!resultat.ok) setErreur(resultat.message)
      else router.refresh()
    } catch {
      setErreur("Le retrait n'a pas abouti. Réessaie dans un instant.")
    } finally {
      setEnCours(null)
    }
  }

  return (
    <section className="edition-intermediaires" aria-labelledby="edition-intermediaires-titre">
      <h2 id="edition-intermediaires-titre" className="fiche-section__titre">
        Positions intermédiaires
      </h2>
      <p className="edition-intermediaires__note">
        Comptage en {duree} temps. « + » sur un instant y dessine une position, par-dessus le
        départ. Pour passer à une autre durée, enregistre d’abord le formulaire ci-dessus.
      </p>

      <ol className="edition-intermediaires__instants">
        {frise(duree, positions).map(({ instant, temps, nom, schema }) => {
          const atelier = `/passes/${passeId}/intermediaires/${instant}`

          return (
            <li
              key={instant}
              className={`edition-intermediaires__instant${schema ? ' edition-intermediaires__instant--occupe' : ''}`}
            >
              <span className="edition-intermediaires__temps" aria-hidden="true">
                {temps}
              </span>

              {schema ? (
                <>
                  <Link href={atelier} aria-label={`Modifier la position posée sur « ${nom} »`}>
                    <ScenePosition
                      className="edition-intermediaires__vignette"
                      schema={schema}
                      titre={`Position à l’instant ${nom}`}
                    />
                  </Link>
                  <button
                    type="button"
                    className="edition-intermediaires__retirer"
                    onClick={() => retirerInstant(instant, nom)}
                    disabled={enCours !== null}
                    aria-label={`Retirer la position posée sur « ${nom} »`}
                    title="Retirer"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <Link
                  href={atelier}
                  className="edition-intermediaires__ajouter"
                  aria-label={`Ajouter une position sur « ${nom} »`}
                  title="Ajouter une position"
                >
                  +
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {erreur ? (
        <p className="edition-intermediaires__erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </section>
  )
}
