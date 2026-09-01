import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { ImagePosition } from '@/components/ImagePosition'
import { libelleDifficulte } from '@/collections/Passe'
import { formaterDate } from '@/enchainements'
import config from '@/payload.config'
import type { Pass, Position } from '@/payload-types'
import { correspondAuNom } from '@/recherche'
import './recherche.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Recherche — Passe Finder',
  description: 'Retrouver une position, une passe ou un enchaînement.',
}

/** Nombre de resultats montres par categorie avant le lien « voir tout ». */
const APERCU = 6

/** L'autre extremite d'une passe, quand la relation est resolue. */
function positionDe(valeur: Pass['positionDebut']): Position | null {
  return typeof valeur === 'object' && valeur !== null ? valeur : null
}

/**
 * Resultats de recherche globale (E10, UX-DR14).
 *
 * La requete vit dans l'URL (`?q=`) : le formulaire de la barre de navigation
 * est un simple GET, la page est partageable et rechargeable, et tout
 * fonctionne sans JavaScript.
 *
 * Le filtrage se fait en memoire plutot qu'en base : SQLite compare les accents
 * a la lettre, « croise » ne trouverait donc pas « croisées ». Passer par
 * `correspondAuNom` garantit surtout que la recherche globale se comporte
 * EXACTEMENT comme celle du catalogue (Story 5.4). Le cout est nul a cette
 * echelle (quelques dizaines de positions, une centaine de passes) ; le jour ou
 * le catalogue changera d'ordre de grandeur, il faudra une vraie recherche
 * indexee.
 *
 * Les enchainements forment la troisieme categorie prevue par UX-DR14. Leur
 * selection n'est PAS filtree ici : `overrideAccess: false` laisse les `access`
 * de la collection decider (ADD-5), donc un anonyme ne voit que les partages
 * (FR-17). Un groupe sans resultat ne s'affiche pas.
 */
export default async function RecherchePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const requete = (q ?? '').trim()

  if (requete === '') {
    return (
      <div className="contenu-page">
        <h1>Recherche</h1>
        <p className="texte-attenue recherche-invite">
          Tape le nom d&apos;une position, d&apos;une passe ou d&apos;un enchaînement dans la barre
          de recherche.
        </p>
      </div>
    )
  }

  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  const [{ docs: positions }, { docs: passes }, { docs: enchainements }] = await Promise.all([
    payload.find({ collection: 'positions', limit: 200, depth: 1, sort: 'nom' }),
    // depth 1 : suffit a resoudre les positions de debut/fin pour leur nom.
    payload.find({ collection: 'passes', limit: 300, depth: 1, sort: 'nom' }),
    // depth 0 : le resultat n'affiche que titre, date et longueur de la chaine.
    payload.find({
      collection: 'enchainements',
      limit: 300,
      depth: 0,
      sort: '-date',
      overrideAccess: false,
      user,
    }),
  ])

  const positionsTrouvees = positions.filter((position) => correspondAuNom(position.nom, requete))
  const passesTrouvees = passes.filter((passe) => correspondAuNom(passe.nom, requete))
  const enchainementsTrouves = enchainements.filter((enchainement) =>
    correspondAuNom(enchainement.titre, requete),
  )
  const total = positionsTrouvees.length + passesTrouvees.length + enchainementsTrouves.length

  return (
    <div className="contenu-page">
      <header className="recherche-entete">
        <h1>Recherche</h1>
        <p className="texte-attenue">
          {total === 0
            ? `Rien trouvé pour « ${requete} ».`
            : `${total} résultat${total > 1 ? 's' : ''} pour « ${requete} ».`}
        </p>
      </header>

      {total === 0 ? (
        <p className="texte-attenue">
          Essaie un autre mot, ou parcours le <Link href="/positions">catalogue</Link> en entier.
        </p>
      ) : null}

      {positionsTrouvees.length > 0 ? (
        <section className="recherche-groupe">
          <h2 className="recherche-groupe__titre">
            Positions <span className="texte-attenue">({positionsTrouvees.length})</span>
          </h2>

          <ul className="resultats">
            {positionsTrouvees.slice(0, APERCU).map((position) => (
              <li key={position.id}>
                <Link className="resultat" href={`/positions/${position.id}`}>
                  <ImagePosition position={position} className="resultat__image" />
                  <span className="resultat__nom">{position.nom}</span>
                </Link>
              </li>
            ))}
          </ul>

          {positionsTrouvees.length > APERCU ? (
            // La recherche du catalogue accepte la meme requete en URL :
            // « voir tout » y renvoie avec le filtre deja applique.
            <Link
              className="recherche-voir-tout"
              href={`/positions?q=${encodeURIComponent(requete)}`}
            >
              Voir les {positionsTrouvees.length} positions
            </Link>
          ) : null}
        </section>
      ) : null}

      {passesTrouvees.length > 0 ? (
        <section className="recherche-groupe">
          <h2 className="recherche-groupe__titre">
            Passes <span className="texte-attenue">({passesTrouvees.length})</span>
          </h2>

          <ul className="resultats">
            {passesTrouvees.slice(0, APERCU).map((passe) => {
              const debut = positionDe(passe.positionDebut)
              const fin = positionDe(passe.positionFin)
              const difficulte = libelleDifficulte(passe.difficulte)

              return (
                <li key={passe.id}>
                  <Link className="resultat resultat--passe" href={`/passes/${passe.id}`}>
                    <span className="resultat__nom">{passe.nom}</span>
                    {debut && fin ? (
                      <span className="resultat__meta texte-attenue">
                        {debut.nom} → {fin.nom}
                      </span>
                    ) : null}
                    {difficulte ? (
                      <span className="resultat__difficulte label-caps">{difficulte}</span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>

          {passesTrouvees.length > APERCU ? (
            <Link className="recherche-voir-tout" href={`/passes?q=${encodeURIComponent(requete)}`}>
              Voir les {passesTrouvees.length} passes
            </Link>
          ) : null}
        </section>
      ) : null}

      {enchainementsTrouves.length > 0 ? (
        <section className="recherche-groupe">
          <h2 className="recherche-groupe__titre">
            Enchaînements <span className="texte-attenue">({enchainementsTrouves.length})</span>
          </h2>

          <ul className="resultats">
            {enchainementsTrouves.slice(0, APERCU).map((enchainement) => {
              const date = formaterDate(enchainement.date)
              const nombre = enchainement.passes.length

              return (
                <li key={enchainement.id}>
                  <Link
                    className="resultat resultat--passe"
                    href={`/enchainements/${enchainement.idPublic}`}
                  >
                    <span className="resultat__nom">{enchainement.titre}</span>
                    <span className="resultat__meta texte-attenue">
                      {date ? `${date} · ` : ''}
                      {nombre} passe{nombre > 1 ? 's' : ''}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {enchainementsTrouves.length > APERCU ? (
            <Link
              className="recherche-voir-tout"
              href={`/enchainements?q=${encodeURIComponent(requete)}`}
            >
              Voir les {enchainementsTrouves.length} enchaînements
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
