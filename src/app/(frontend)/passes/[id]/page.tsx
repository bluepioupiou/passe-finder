import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ImagePosition } from '@/components/ImagePosition'
import { ListePasses, Transitions } from '@/components/Voisinage'
import { voisinesDePasse } from '@/catalogue'
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
 * CE QUI SE DANSE AVANT ET APRES (2026-09-02, demande d'Alain). La fiche était
 * un cul-de-sac : elle montrait l'arête — départ → arrivée — et rien de ce qui
 * s'y raccroche. La question qu'on se pose devant une passe est pourtant la
 * même que devant une position : « et ensuite ? ». La règle des trois listes,
 * et ce qu'elle assume, sont dans `voisinesDePasse` (src/catalogue.ts).
 *
 * L'ORDRE DE LA PAGE est celui de la danse — ce qui mène ici, puis ce qui
 * enchaîne, puis les changements de prise — et les trois viennent APRES le
 * déroulé. Le déroulé est le contenu de cours, la raison d'être de la fiche :
 * trois listes qui peuvent compter des dizaines d'entrées (44 au pire) le
 * repousseraient hors de vue sur téléphone. Le troncage à un aperçu reste au
 * backlog, mis en pause par Alain faute d'un classement clair.
 *
 * LA PRECISION SOUS CHAQUE TITRE NOMME LA POSITION concernée. Sur une fiche
 * position, « qui partent d'ici » se suffit ; ici les listes parlent de deux
 * positions différentes, dont aucune n'est le sujet de la page.
 *
 * Reste à faire ici (Story 5.6, FR-24 / FR-38) : les enchaînements qui utilisent
 * cette passe, et les vidéos correspondantes.
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

  // La règle des trois listes vit dans `voisinesDePasse` : elle se teste, et
  // elle ne se recopiera pas le jour où une autre surface en aura besoin.
  const { menentIci, enchainentApres, prisesApres } = await voisinesDePasse(payload, passe)

  const nomDebut = typeof debut === 'object' ? debut.nom : null
  const nomFin = typeof fin === 'object' ? fin.nom : null

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

      {/* CE QUI VIENT AVANT, PUIS CE QUI VIENT APRES : l'ordre de la danse, et
          celui de la flèche affichée plus haut. */}
      <ListePasses
        titre="Passes qui mènent ici"
        precision={nomDebut ? `Elles arrivent en ${nomDebut}, d'où part cette passe.` : undefined}
        vide="Aucune passe n'arrive à cette position de départ."
        passes={menentIci}
        sens="entrante"
      />

      <ListePasses
        titre="Passes qui enchaînent après"
        precision={nomFin ? `Elles partent de ${nomFin}, où cette passe amène.` : undefined}
        vide="Aucune passe ne part de cette position d'arrivée."
        passes={enchainentApres}
        sens="sortante"
      />

      <Transitions
        titre="Transitions après cette passe"
        precision={
          nomFin
            ? `Depuis ${nomFin}, changer de prise sans danser de passe — donc sans prendre de temps sur la musique.`
            : 'Changer de prise sans danser de passe, donc sans prendre de temps sur la musique.'
        }
        depuis={prisesApres}
      />
    </div>
  )
}
