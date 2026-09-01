import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { GrilleFiltrable } from '@/components/GrilleFiltrable'
import { IconeTransition } from '@/components/Icones'
import { ImagePosition } from '@/components/ImagePosition'
import { positionsQuiChangentDePrise } from '@/catalogue'
import config from '@/payload.config'
import './positions.css'

/**
 * Rendu a la demande : le contenu vient de la base et evolue quand Alain edite
 * le catalogue. Le pre-rendu au build est impossible de toute facon (aucune
 * base n'existe a ce moment-la).
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Positions — Passe Finder',
  description: 'Le catalogue des positions de rock 6 temps.',
}

/**
 * Liste publique des positions, habillee par le design system « Lin & Sauge ».
 * Lecture publique : aucune authentification requise (FR-21).
 *
 * Section « Positions » du catalogue (E2) : la recherche par nom filtre la
 * grille sans aller-retour serveur. Le passage vers les Passes se fait par
 * la barre de navigation, seul endroit ou vit ce choix.
 */
export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // `?q=` : requete transmise par la recherche globale (« voir tout »).
  const { q } = await searchParams
  const requeteInitiale = (q ?? '').trim()

  const payload = await getPayload({ config: await config })

  const [{ docs: positions, totalDocs }, changentDePrise] = await Promise.all([
    payload.find({
      collection: 'positions',
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
    positionsQuiChangentDePrise(payload),
  ])

  // Les cartes sont rendues ici (cote serveur) ; la grille cliente ne fait que
  // choisir lesquelles afficher.
  const elements = positions.map((position) => ({
    cle: position.id,
    nom: position.nom,
    carte: (
      // Ordre : nom, puis image, puis description. Le catalogue se filtre par
      // nom : quand la grille se reduit, l'oeil cherche le nom, qui doit donc
      // etre au meme endroit que sur la carte Passe. La description est coupee
      // a 3 lignes pour que les cartes gardent une hauteur comparable ; elle
      // reste entiere sur la fiche.
      <Link className="position-carte" href={`/positions/${position.id}`}>
        <h2 className="position-nom">
          {position.nom}
          {/* JUSTE L'ICONE, collee au nom : dans une grille, ce qu'on veut
              savoir c'est « d'ici, on peut changer de prise sans danser ».
              Le detail (vers quoi, comment) se lit sur la fiche. Meme parti que
              les marqueurs musique et video des cartes Enchainement.
              L'intitule reste, invisible, pour les lecteurs d'ecran : ici
              l'icone EST l'information (UX-DR17). */}
          {changentDePrise.has(position.id) ? (
            <span className="position-transition">
              <IconeTransition taille={15} />
              <span className="position-transition__intitule">
                Changement de prise possible depuis cette position
              </span>
            </span>
          ) : null}
        </h2>
        <ImagePosition position={position} className="position-image" />
        {position.description ? (
          <p className="position-description texte-attenue texte-coupe">{position.description}</p>
        ) : null}
      </Link>
    ),
  }))

  return (
    <div className="contenu-page">
      <header className="positions-entete">
        <h1>Positions</h1>
        <p className="texte-attenue">
          {totalDocs === 0
            ? 'Aucune position pour le moment.'
            : `${totalDocs} position${totalDocs > 1 ? 's' : ''} au catalogue.`}
        </p>
      </header>

      {totalDocs === 0 ? (
        <p className="texte-attenue">
          Le catalogue est vide. Ajoute une position depuis le back-office.
        </p>
      ) : (
        <GrilleFiltrable
          // Remonte le composant quand la requete de l'URL change, pour que le
          // champ suive l'URL au lieu de garder l'ancienne saisie.
          key={requeteInitiale}
          requeteInitiale={requeteInitiale}
          elements={elements}
          classeGrille="positions-grille"
          etiquetteRecherche="Rechercher une position"
          invite="Nom de la position…"
          singulier="position"
          pluriel="positions"
        />
      )}
    </div>
  )
}
