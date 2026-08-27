import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ImagePosition } from '@/components/ImagePosition'
import { DIFFICULTES } from '@/collections/Passe'
import config from '@/payload.config'
// Payload singularise le slug `passes` en `Pass` dans les types generes.
import type { Pass, Position } from '@/payload-types'
import './fiche-position.css'

export const dynamic = 'force-dynamic'

/** Libellé lisible d'un niveau de difficulté (1 à 4). */
function libelleDifficulte(valeur?: string | null): string | null {
  if (!valeur) return null
  return DIFFICULTES.find((d) => d.value === valeur)?.label ?? null
}

/** L'autre extrémité d'une passe, selon le sens de lecture. */
function extremite(passe: Pass, sens: 'sortante' | 'entrante'): Position | null {
  const cible = sens === 'sortante' ? passe.positionFin : passe.positionDebut
  return typeof cible === 'object' ? cible : null
}

/**
 * Liste de passes reliées à la position courante (FR-23).
 * `sortante` : elles partent d'ici. `entrante` : elles arrivent ici.
 */
function ListePasses({
  titre,
  vide,
  passes,
  sens,
}: {
  titre: string
  vide: string
  passes: Pass[]
  sens: 'sortante' | 'entrante'
}) {
  return (
    <section className="fiche-section">
      <h2 className="fiche-section__titre">
        {titre} <span className="texte-attenue">({passes.length})</span>
      </h2>

      {passes.length === 0 ? (
        <p className="texte-attenue">{vide}</p>
      ) : (
        <ul className="fiche-passes">
          {passes.map((passe) => {
            const autre = extremite(passe, sens)
            const difficulte = libelleDifficulte(passe.difficulte)

            return (
              <li key={passe.id}>
                <Link className="fiche-passe-lien" href={`/passes/${passe.id}`}>
                  <span className="fiche-passe-nom">{passe.nom}</span>
                  {autre ? (
                    <span className="fiche-passe-cible texte-attenue">
                      {sens === 'sortante' ? '→ ' : '← '}
                      {autre.nom}
                    </span>
                  ) : null}
                  {difficulte ? (
                    <span className="fiche-passe-difficulte label-caps">{difficulte}</span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })
  const position = await payload
    .findByID({ collection: 'positions', id, depth: 0, disableErrors: true })
    .catch(() => null)

  return { title: position ? `${position.nom} — Passe Finder` : 'Position introuvable' }
}

/**
 * Fiche d'une position (E3, UX-DR8) — lecture publique (FR-21).
 *
 * Les deux listes sont les deux lectures inverses d'une même arête du graphe
 * (AD-2) : ce qui part d'ici, et ce qui y mène. C'est ce qui rend le catalogue
 * navigable de proche en proche.
 */
export default async function FichePosition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })

  const position = await payload
    .findByID({ collection: 'positions', id, depth: 1, disableErrors: true })
    .catch(() => null)

  if (!position) notFound()

  const [sortantes, entrantes] = await Promise.all([
    payload.find({
      collection: 'passes',
      where: { positionDebut: { equals: position.id } },
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
    payload.find({
      collection: 'passes',
      where: { positionFin: { equals: position.id } },
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
  ])

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/positions">Positions</Link>
      </p>

      <header className="fiche-entete">
        <ImagePosition position={position} className="fiche-image" />
        <div className="fiche-entete__texte">
          <h1>{position.nom}</h1>
          {position.description ? (
            <p className="fiche-description texte-attenue">{position.description}</p>
          ) : null}
        </div>
      </header>

      <ListePasses
        titre="Passes qui partent d'ici"
        vide="Aucune passe ne part de cette position."
        passes={sortantes.docs}
        sens="sortante"
      />

      <ListePasses
        titre="Passes qui arrivent ici"
        vide="Aucune passe n'arrive à cette position."
        passes={entrantes.docs}
        sens="entrante"
      />
    </div>
  )
}
