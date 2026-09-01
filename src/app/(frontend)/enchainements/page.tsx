import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import React from 'react'

import { CarteEnchainement } from '@/components/CarteEnchainement'
import { FiltresEnchainements } from '@/components/FiltresEnchainements'
import { Pagination } from '@/components/Pagination'
import { nomAuteur, nomsDesAuteurs } from '@/auteurs'
import { chargerCatalogue } from '@/catalogue'
import {
  auMoinsUnCritere,
  conditions,
  lienListe,
  lireCriteres,
  PAR_PAGE,
  type ParametresURL,
} from '@/enchainements-liste'
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
 * PAGINÉE ET FILTRÉE PAR LE SERVEUR (demande d'Alain, 2026-08-31). Jusqu'ici la
 * page chargeait tout et filtrait dans le navigateur : instantané à la frappe,
 * et tenable à 120 enchaînements. Ça ne l'aurait plus été quand les élèves
 * créeront les leurs — une page qui télécharge mille cartes est une page qu'on
 * n'ouvre plus au bord de la piste.
 *
 * Les deux vont ensemble et pas l'un sans l'autre : un filtre resté côté client
 * ne filtrerait que la page affichée, ce qui est pire que pas de filtre du tout
 * — il donnerait de fausses réponses (« rien trouvé » alors que le résultat est
 * page 3).
 */
export default async function EnchainementsPage({
  searchParams,
}: {
  searchParams: Promise<ParametresURL>
}) {
  // `?q=` arrive aussi de la recherche globale (« voir tout »), `?page=` de la
  // pagination, `?favoris=1` de la case.
  const criteres = lireCriteres(await searchParams)

  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  // Les favoris d'abord : le filtre « mes favoris » en fait une contrainte de
  // requête, il faut donc les connaître AVANT d'interroger les enchaînements.
  const favoris = await idsFavoris(payload, user)

  const [resultat, catalogue] = await Promise.all([
    payload.find({
      collection: 'enchainements',
      where: conditions(criteres, [...favoris]),
      limit: PAR_PAGE,
      page: criteres.page,
      // Profondeur 0 : les passes et positions viennent du catalogue chargé en
      // une fois (voir `chargerCatalogue`), pas d'une résolution par maillon.
      depth: 0,
      sort: '-date',
      overrideAccess: false,
      user,
    }),
    chargerCatalogue(payload),
  ])

  const { docs: enchainements, totalDocs, totalPages, page } = resultat
  // Une seule requête pour tous les auteurs de la page.
  const auteurs = await nomsDesAuteurs(payload, enchainements)
  const filtre = auMoinsUnCritere(criteres)

  return (
    <div className="contenu-page">
      <header className="enchainements-entete">
        <h1>Enchaînements</h1>
        <p className="texte-attenue">
          {totalDocs === 0 && !filtre
            ? 'Aucun enchaînement pour le moment.'
            : `${totalDocs} enchaînement${totalDocs > 1 ? 's' : ''} à réviser.`}
        </p>
      </header>

      <FiltresEnchainements
        criteres={criteres}
        // Le filtre n'a de sens que pour qui a des favoris : le proposer à un
        // visiteur anonyme afficherait une case qui ne peut rien donner.
        proposerFavoris={user ? favoris.size > 0 : false}
        total={totalDocs}
      />

      {enchainements.length === 0 ? (
        <p className="texte-attenue">
          {criteres.requete !== ''
            ? `Rien trouvé pour « ${criteres.requete} ». Essaie un autre mot, ou retire les filtres.`
            : criteres.favorisSeuls
              ? 'Aucun favori ici. Décoche « Mes favoris » pour tout revoir.'
              : "Rien de partagé pour l'instant. Les enchaînements du cours apparaîtront ici."}
        </p>
      ) : (
        <>
          <ul className="enchainements-grille">
            {enchainements.map((enchainement) => (
              <li key={enchainement.id}>
                <CarteEnchainement
                  enchainement={enchainement}
                  catalogue={catalogue}
                  auteur={nomAuteur(enchainement, auteurs)}
                />
              </li>
            ))}
          </ul>

          <Pagination
            page={page ?? criteres.page}
            pages={totalPages}
            // Les critères courants sont conservés d'une page à l'autre : sans
            // cela, passer à la page 2 relâcherait la recherche en cours.
            lien={(numero) => lienListe({ ...criteres, page: numero })}
          />
        </>
      )}
    </div>
  )
}
