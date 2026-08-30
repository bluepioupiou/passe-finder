import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { GrilleFiltrable } from '@/components/GrilleFiltrable'
import { ImagePosition } from '@/components/ImagePosition'
import { DIFFICULTES, libelleDifficulte } from '@/collections/Passe'
import config from '@/payload.config'
import type { Position } from '@/payload-types'
import './passes.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Passes — Passe Finder',
  description: 'Le catalogue des passes de rock 6 temps.',
}

/**
 * Liste publique des passes (FR-21).
 *
 * Chaque passe est une arête du graphe : elle relie une position de départ à
 * une position d'arrivée (AD-2). L'affichage rend cette lecture évidente en
 * montrant les deux positions de part et d'autre d'une flèche.
 *
 * Section « Passes » du catalogue (E2) : recherche par nom et filtre par
 * difficulté, la seule dimension de tri utile pour choisir quoi travailler.
 */
export default async function PassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // `?q=` : requete transmise par la recherche globale (« voir tout »).
  const { q } = await searchParams
  const requeteInitiale = (q ?? '').trim()

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

  // Les cartes sont rendues ici (côté serveur) ; la grille cliente ne fait que
  // choisir lesquelles afficher.
  const elements = passes.map((passe) => {
    const debut = passe.positionDebut as Position | number
    const fin = passe.positionFin as Position | number
    const difficulte = libelleDifficulte(passe.difficulte)

    return {
      cle: passe.id,
      nom: passe.nom,
      difficulte: passe.difficulte,
      carte: (
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

          {/* Coupee a 3 lignes, comme sur la carte Position : des items de
              hauteur comparable font une grille qu'on balaie. La description
              entiere reste sur la fiche. */}
          {passe.description ? (
            <p className="passe-description texte-attenue texte-coupe">{passe.description}</p>
          ) : null}
        </Link>
      ),
    }
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
        <GrilleFiltrable
          // Remonte le composant quand la requete de l'URL change, pour que le
          // champ suive l'URL au lieu de garder l'ancienne saisie.
          key={requeteInitiale}
          requeteInitiale={requeteInitiale}
          elements={elements}
          classeGrille="passes-liste"
          etiquetteRecherche="Rechercher une passe"
          invite="Nom de la passe…"
          singulier="passe"
          pluriel="passes"
          // Copie simple des libellés : la collection Payload ne doit pas
          // partir dans le navigateur (voir GrilleFiltrable).
          optionsDifficulte={DIFFICULTES.map((d) => ({ label: d.label, value: d.value }))}
        />
      )}
    </div>
  )
}
