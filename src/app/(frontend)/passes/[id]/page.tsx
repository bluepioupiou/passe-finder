import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ImagePosition } from '@/components/ImagePosition'
import { libelleDifficulte } from '@/collections/Passe'
import config from '@/payload.config'
import type { Position } from '@/payload-types'
import './fiche-passe.css'

export const dynamic = 'force-dynamic'

/** Position cliquable vers sa fiche (FR-22). */
function MaillonPosition({ position, role }: { position: Position; role: string }) {
  return (
    <Link className="fiche-maillon" href={`/positions/${position.id}`}>
      <ImagePosition position={position} className="fiche-maillon__image" />
      <span className="fiche-maillon__role label-caps texte-attenue">{role}</span>
      <span className="fiche-maillon__nom">{position.nom}</span>
    </Link>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })
  const passe = await payload
    .findByID({ collection: 'passes', id, depth: 0, disableErrors: true })
    .catch(() => null)

  return { title: passe ? `${passe.nom} — Passe Finder` : 'Passe introuvable' }
}

/**
 * Fiche d'une passe (E4, UX-DR9) — lecture publique (FR-21).
 *
 * Emplacement prévu, non rempli en v1 (Epic 5, car dépendant des Enchaînements) :
 * la liste « enchaînements qui l'utilisent » (FR-24) et la liste « vidéos »
 * (FR-38) viendront s'insérer après le déroulé, en deux sections distinctes.
 */
export default async function FichePasse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })

  const passe = await payload
    // depth 2 : passe -> position -> image (voir la liste des passes).
    .findByID({ collection: 'passes', id, depth: 2, disableErrors: true })
    .catch(() => null)

  if (!passe) notFound()

  const debut = passe.positionDebut as Position | number
  const fin = passe.positionFin as Position | number
  const difficulte = libelleDifficulte(passe.difficulte)

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/passes">Passes</Link>
      </p>

      <header className="fiche-passe-entete">
        <h1>{passe.nom}</h1>
        {difficulte ? <span className="fiche-passe-badge label-caps">{difficulte}</span> : null}
      </header>

      {/* FR-22 : les deux positions sont cliquables vers leur fiche. */}
      <section className="fiche-chaine">
        {typeof debut === 'object' ? <MaillonPosition position={debut} role="Départ" /> : null}
        <span className="fiche-chaine__fleche" aria-hidden="true">
          →
        </span>
        {typeof fin === 'object' ? <MaillonPosition position={fin} role="Arrivée" /> : null}
      </section>

      {passe.description ? (
        <section className="fiche-section">
          <h2 className="fiche-section__titre">Description</h2>
          <p className="fiche-texte">{passe.description}</p>
        </section>
      ) : null}

      {passe.deroule ? (
        <section className="fiche-section">
          <h2 className="fiche-section__titre">Déroulé</h2>
          {/* Texte temps par temps : les sauts de ligne d'origine font sens. */}
          <p className="fiche-texte fiche-texte--deroule">{passe.deroule}</p>
        </section>
      ) : null}
    </div>
  )
}
