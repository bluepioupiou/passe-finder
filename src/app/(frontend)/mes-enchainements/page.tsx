import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { BoutonCopierLien } from '@/components/BoutonCopierLien'
import { CarteEnchainement } from '@/components/CarteEnchainement'
import { Pagination } from '@/components/Pagination'
import { chargerCatalogue } from '@/catalogue'
import { lireCriteres, PAR_PAGE, type ParametresURL } from '@/enchainements-liste'
import config from '@/payload.config'
import { exigerSession } from '@/porte'
import '../enchainements/enchainements.css'
import './mes-enchainements.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mes enchaînements — Passe Finder',
}

/** L'adresse d'une page de cette liste. `?page=1` est omis : c'est le défaut. */
function lienPage(page: number): string {
  return page > 1 ? `/mes-enchainements?page=${page}` : '/mes-enchainements'
}

/**
 * Mes enchaînements (Story 5.2, FR-30 / UX-DR12) — la seconde des deux listes
 * du profil, dont /favoris était la première.
 *
 * DEUX LISTES DISJOINTES, ET C'EST LE MODÈLE QUI L'IMPOSE : on ne met en favori
 * que le partagé d'AUTRUI (ADD-9). Ce que j'ai écrit et ce que j'ai mis de côté
 * ne peuvent donc jamais se recouvrir — d'où deux pages plutôt qu'une liste
 * avec un filtre, qui suggérerait un chevauchement qui n'existe pas.
 *
 * ELLE MONTRE TOUT CE QUE J'AI ÉCRIT, privés et non répertoriés compris. Rien
 * ici ne le décide : c'est `access.read` de la collection qui rend à un compte
 * connecté les siens quelle que soit leur visibilité (ADD-5). D'où le badge de
 * visibilité sur chaque carte — c'est la seule page du site où les trois
 * cohabitent, et où la question « qui voit celui-ci ? » se pose vraiment.
 *
 * PAGINÉE, et pas par principe : Alain porte à lui seul les 119 enchaînements
 * migrés. Sans pagination, sa propre page serait la plus lourde du site.
 *
 * CE QUE CETTE PAGE NE PROPOSE PAS, et pourquoi :
 *
 *  - SUPPRIMER. La suppression vit au bas de l'écran de modification (Story
 *    4.5), à dessein : un geste irréversible n'a pas sa place à portée de pouce
 *    dans une grille, où le doigt vise déjà une carte voisine. La mettre ici la
 *    rendrait facile là où elle doit rester délibérée.
 *  - BASCULER LA VISIBILITÉ. L'AC de la Story 5.2 la prévoyait, du temps où la
 *    visibilité était binaire (privé / partagé). Elle a trois valeurs depuis
 *    (voir `src/visibilite.ts`) : une « bascule » n'a plus de destination
 *    évidente, et chaque valeur porte une promesse qui doit se lire AVANT le
 *    clic — ce que le menu du compositeur fait, et qu'un interrupteur de grille
 *    ne peut pas faire. Le badge dit l'état ; « Modifier » mène là où on en
 *    change.
 */
export default async function MesEnchainements({
  searchParams,
}: {
  searchParams: Promise<ParametresURL>
}) {
  const utilisateur = await exigerSession('/mes-enchainements')

  // On ne lit que la pagination : les filtres de la liste publique (titre,
  // musique, auteur…) n'ont pas de sens ici, et `lireCriteres` est réutilisée
  // pour la tolérance qu'elle apporte à une URL bricolée (`?page=abc`).
  const { page: pageDemandee } = lireCriteres(await searchParams)

  const payload = await getPayload({ config: await config })

  const [resultat, catalogue] = await Promise.all([
    payload.find({
      collection: 'enchainements',
      where: { auteur: { equals: utilisateur.id } },
      limit: PAR_PAGE,
      page: pageDemandee,
      // Profondeur 0 : les passes et positions viennent du catalogue chargé en
      // une fois, pas d'une résolution par maillon.
      depth: 0,
      // Par DATE DE DANSE et non de création : c'est la date que l'auteur a
      // saisie qui situe l'enchaînement dans son année de cours.
      sort: '-date',
      overrideAccess: false,
      user: utilisateur,
    }),
    chargerCatalogue(payload),
  ])

  const { docs: enchainements, totalDocs, totalPages, page } = resultat

  return (
    <div className="contenu-page">
      <header className="enchainements-entete">
        <h1>Mes enchaînements</h1>
        <p className="texte-attenue">
          {totalDocs === 0
            ? 'Rien pour le moment.'
            : `${totalDocs} enchaînement${totalDocs > 1 ? 's' : ''} composé${
                totalDocs > 1 ? 's' : ''
              }.`}
        </p>
      </header>

      {enchainements.length === 0 ? (
        // État vide accueillant, qui dit le geste à faire (UX-DR15) — et qui
        // mène droit au compositeur : la page où l'on constate qu'on n'a rien
        // écrit est exactement celle où l'on a envie de commencer.
        <p className="texte-attenue">
          Tu n’as encore composé aucun enchaînement.{' '}
          <Link href="/enchainements/nouveau">Compose le premier</Link> : choisis une position de
          départ, et enchaîne les passes qui en partent.
        </p>
      ) : (
        <>
          <ul className="enchainements-grille">
            {enchainements.map((enchainement) => (
              <li key={enchainement.id} className="mes-enchainements__item">
                {/* Pas de ligne « par … » : ils sont tous de moi. */}
                <CarteEnchainement
                  enchainement={enchainement}
                  catalogue={catalogue}
                  montrerVisibilite
                />

                {/* HORS DE LA CARTE, et pas seulement pour la mise en page : la
                    carte EST un lien, et un bouton imbriqué dans un `a` n'est ni
                    du HTML valide ni cliquable de façon prévisible. */}
                <p className="mes-enchainements__actions">
                  <Link
                    className="action-discrete"
                    href={`/enchainements/${enchainement.idPublic}/modifier`}
                  >
                    Modifier
                  </Link>
                  <BoutonCopierLien chemin={`/enchainements/${enchainement.idPublic}`} />
                </p>
              </li>
            ))}
          </ul>

          <Pagination page={page ?? pageDemandee} pages={totalPages} lien={lienPage} />
        </>
      )}
    </div>
  )
}
