import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { ImagePosition } from '@/components/ImagePosition'
import { DIFFICULTES } from '@/collections/Passe'
import config from '@/payload.config'
import type { Position } from '@/payload-types'
import './passes.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Passes — Passe Finder',
  description: 'Le catalogue des passes de rock 6 temps.',
}

/** Libellé lisible d'un niveau de difficulté (1 à 4). */
function libelleDifficulte(valeur?: string | null): string | null {
  if (!valeur) return null
  return DIFFICULTES.find((d) => d.value === valeur)?.label ?? null
}

/**
 * Liste publique des passes (FR-21).
 *
 * Chaque passe est une arête du graphe : elle relie une position de départ à
 * une position d'arrivée (AD-2). L'affichage rend cette lecture évidente en
 * montrant les deux positions de part et d'autre d'une flèche.
 */
export default async function PassesPage() {
  const payload = await getPayload({ config: await config })

  const { docs: passes, totalDocs } = await payload.find({
    collection: 'passes',
    limit: 300,
    // depth 2 : passe -> position -> image. Avec depth 1, la position est bien
    // résolue (d'où le nom correct) mais son image reste un identifiant, et
    // l'affichage bascule à tort sur le placeholder.
    depth: 2,
    sort: 'nom',
  })

  return (
    <div className="contenu-page">
      <header className="passes-entete">
        <h1>Passes</h1>
        <p className="texte-attenue">
          {totalDocs === 0
            ? 'Aucune passe pour le moment.'
            : `${totalDocs} passe${totalDocs > 1 ? 's' : ''} au catalogue.`}
        </p>
      </header>

      {totalDocs === 0 ? (
        <p className="texte-attenue">
          Le catalogue est vide. Ajoute une passe depuis le back-office.
        </p>
      ) : (
        <ul className="passes-liste">
          {passes.map((passe) => {
            const debut = passe.positionDebut as Position | number
            const fin = passe.positionFin as Position | number
            const difficulte = libelleDifficulte(passe.difficulte)

            return (
              <li key={passe.id}>
                <Link className="passe-carte" href={`/passes/${passe.id}`}>
                <div className="passe-entete">
                  <h2 className="passe-nom">{passe.nom}</h2>
                  {difficulte ? <span className="passe-difficulte label-caps">{difficulte}</span> : null}
                </div>

                {/* L'arête du graphe : position de départ → position d'arrivée. */}
                <div className="passe-chaine">
                  {typeof debut === 'object' ? (
                    <div className="passe-maillon">
                      <ImagePosition position={debut} className="passe-image" />
                      <span className="passe-position-nom texte-attenue">{debut.nom}</span>
                    </div>
                  ) : null}

                  <span className="passe-fleche" aria-hidden="true">
                    →
                  </span>

                  {typeof fin === 'object' ? (
                    <div className="passe-maillon">
                      <ImagePosition position={fin} className="passe-image" />
                      <span className="passe-position-nom texte-attenue">{fin.nom}</span>
                    </div>
                  ) : null}
                </div>

                {passe.description ? (
                  <p className="passe-description texte-attenue">{passe.description}</p>
                ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
