import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ImagePosition } from '@/components/ImagePosition'
import { ListePasses, Transitions } from '@/components/Voisinage'
import config from '@/payload.config'
import './fiche-position.css'

export const dynamic = 'force-dynamic'

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
 * Les listes sont les lectures inverses des DEUX arêtes du graphe : les passes
 * (AD-2) — ce qui part d'ici, ce qui y mène — et les transitions (Story 4.7),
 * les changements de prise qui ne coûtent pas de temps musical. C'est ce qui
 * rend le catalogue navigable de proche en proche.
 *
 * Le groupe des transitions ne s'affiche que s'il a quelque chose à dire ;
 * les listes de passes s'affichent toujours. Voir `Transitions`.
 */
export default async function FichePosition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })

  const position = await payload
    .findByID({ collection: 'positions', id, depth: 1, disableErrors: true })
    .catch(() => null)

  if (!position) notFound()

  const [sortantes, entrantes, prisesDepuis, prisesVers] = await Promise.all([
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
    // Les deux lectures inverses de l'AUTRE arete du graphe (Story 4.7) : celle
    // qui ne coute pas de temps musical. Meme forme de requete que les passes —
    // c'est le meme graphe, lu deux fois.
    payload.find({
      collection: 'transitions',
      where: { positionDebut: { equals: position.id } },
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
    payload.find({
      collection: 'transitions',
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

      {/* Les transitions APRES les deux listes de passes : c'est l'exception du
          graphe, pas son corps. La seule fiche ou elles passent devant est
          celle d'un cul-de-sac — et la, la liste des passes sortantes est vide,
          donc elles arrivent tout de suite sous les yeux. */}
      <Transitions depuis={prisesDepuis.docs} vers={prisesVers.docs} />
    </div>
  )
}
