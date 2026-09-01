import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { CarteEnchainement } from '@/components/CarteEnchainement'
import { GrilleFiltrable } from '@/components/GrilleFiltrable'
import { nomAuteur, nomsDesAuteurs } from '@/auteurs'
import { chargerCatalogue } from '@/catalogue'
import { idsFavoris } from '@/favoris'
import config from '@/payload.config'
import './enchainements.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Enchaînements — Passe Finder',
  description: 'Les enchaînements de rock 6 temps partagés par le professeur.',
}

/**
 * Liste des enchaînements (E2 / UX-DR14) — la porte d'entrée de la révision.
 *
 * VISIBILITE : la sélection est faite par les `access` de la collection
 * (ADD-5), jamais par un filtre d'interface. `overrideAccess: false` les
 * applique ; un visiteur anonyme ne reçoit donc QUE les enchaînements partagés
 * (FR-17 / AD-6), et l'auteur connecté voit en plus les siens. Rien ici ne
 * réimplémente cette règle : la changer se fait dans la collection.
 *
 * La recherche filtre par TITRE, côté client comme pour le reste du catalogue
 * (Story 5.4) : le volume tient en mémoire et la frappe répond sans attente.
 */
export default async function EnchainementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  // `?q=` : requête transmise par la recherche globale (« voir tout »).
  const { q } = await searchParams
  const requeteInitiale = (q ?? '').trim()

  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  const [{ docs: enchainements, totalDocs }, catalogue] = await Promise.all([
    payload.find({
      collection: 'enchainements',
      limit: 300,
      // Profondeur 0 : les passes et positions viennent du catalogue chargé en
      // une fois (voir `chargerCatalogue`), pas d'une résolution par maillon.
      depth: 0,
      sort: '-date',
      overrideAccess: false,
      user,
    }),
    chargerCatalogue(payload),
  ])

  // Les favoris de la personne connectee, en UNE requete : la grille en a
  // besoin par carte pour le filtre « mes favoris ».
  const favoris = await idsFavoris(payload, user)

  // Une seule requete pour tous les auteurs de la page, quel que soit le nombre
  // de cartes.
  const auteurs = await nomsDesAuteurs(payload, enchainements)

  const elements = enchainements.map((enchainement) => ({
    cle: enchainement.id,
    nom: enchainement.titre,
    favori: favoris.has(enchainement.id),
    carte: (
      <CarteEnchainement
        enchainement={enchainement}
        catalogue={catalogue}
        auteur={nomAuteur(enchainement, auteurs)}
      />
    ),
  }))
  return (
    <div className="contenu-page">
      <header className="enchainements-entete">
        <h1>Enchaînements</h1>
        <p className="texte-attenue">
          {totalDocs === 0
            ? 'Aucun enchaînement pour le moment.'
            : `${totalDocs} enchaînement${totalDocs > 1 ? 's' : ''} à réviser.`}
        </p>
      </header>

      {totalDocs === 0 ? (
        <p className="texte-attenue">
          Rien de partagé pour l&apos;instant. Les enchaînements du cours apparaîtront ici.
        </p>
      ) : (
        <GrilleFiltrable
          // Remonte le composant quand la requête de l'URL change, pour que le
          // champ suive l'URL au lieu de garder l'ancienne saisie.
          key={requeteInitiale}
          requeteInitiale={requeteInitiale}
          elements={elements}
          classeGrille="enchainements-grille"
          etiquetteRecherche="Rechercher un enchaînement"
          invite="Titre de l'enchaînement…"
          singulier="enchaînement"
          pluriel="enchaînements"
          // Le filtre n'a de sens que pour qui a des favoris : le proposer a un
          // visiteur anonyme afficherait une case qui ne peut rien donner.
          filtreFavoris={user ? favoris.size > 0 : false}
        />
      )}
    </div>
  )
}
