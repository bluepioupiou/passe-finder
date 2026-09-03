import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { estAdmin } from '@/collections/acces'
import { AtelierPosition } from '@/components/AtelierPosition'
import type { Media } from '@/payload-types'
import config from '@/payload.config'
import { exigerSession } from '@/porte'
import { schemaSur, schemaVide } from '@/schema-position'
import { enregistrerSchemaPosition } from '../../actions'
import '../../atelier-page.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })
  const position = await payload
    .findByID({ collection: 'positions', id, depth: 0, disableErrors: true })
    .catch(() => null)

  return { title: position ? `Modifier ${position.nom} — Passe Finder` : 'Position introuvable' }
}

/**
 * Rouvrir le schema d'une position pour le corriger.
 *
 * DEUX SITUATIONS, ET C'EST TOUT L'INTERET DE LA PAGE.
 *
 * 1. La position a ete composee ici : son schema revient, on reprend le travail
 *    ou il s'etait arrete. C'est ce qui evite qu'une vignette soit un
 *    cul-de-sac — corriger un bras six mois plus tard n'impose pas de tout
 *    refaire.
 *
 * 2. La position est HISTORIQUE : dessinee dans Paint, elle n'a pas de schema.
 *    L'atelier s'ouvre alors vierge, mais avec l'ancienne image EN CALQUE sous
 *    le canevas, a decalquer. C'est ce qui rend la reprise des trente vignettes
 *    d'origine faisable une par une, sans jamais perdre celles qui attendent.
 *
 * ET UNE TROISIEME, QU'IL NE FAUT PAS CONFONDRE AVEC LA DEUXIEME : un schema
 * present mais ILLISIBLE. Ouvrir un atelier vierge dans ce cas laisserait le
 * premier enregistrement ecraser un travail que la page n'a pas su relire. On
 * le DIT, et bruyamment.
 */
export default async function ModifierPosition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const utilisateur = await exigerSession(`/positions/${id}/modifier`)
  if (!estAdmin(utilisateur)) redirect(`/positions/${id}`)

  const payload = await getPayload({ config: await config })
  const position = await payload
    .findByID({ collection: 'positions', id, depth: 1, disableErrors: true })
    .catch(() => null)

  if (!position) notFound()

  // `schemaCompose` porte `admin.hidden` et NON `hidden: true` : il revient donc
  // spontanement, sans `showHiddenFields`. Le choix est explique dans
  // `src/collections/Position.ts` — c'est exactement ce scenario qu'il protege.
  const brut = position.schemaCompose
  const absent = brut === null || brut === undefined
  const relu = absent ? null : schemaSur(brut)
  const illisible = !absent && relu === null

  const image = position.image as Media | number | null | undefined
  const ancienneImage =
    image && typeof image === 'object' && typeof image.url === 'string' ? image.url : null

  // Le `src` du calque vit DANS le schema, et non dans l'etat local du
  // composant : sinon il s'evaporerait au premier enregistrement — l'image de
  // la position venant d'etre remplacee — c'est-a-dire au moment precis ou
  // Alain commence a iterer.
  const schema = relu ?? { ...schemaVide(), calque: ancienneImage ? { src: ancienneImage } : null }

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/positions">Positions</Link> · <Link href={`/positions/${id}`}>{position.nom}</Link>
      </p>

      <header className="atelier-entete">
        <h1>Modifier « {position.nom} »</h1>
        {illisible ? null : relu ? (
          <p className="texte-attenue">
            Le schéma enregistré est rouvert tel quel. Enregistrer remplacera l’image de la
            position.
          </p>
        ) : (
          <p className="texte-attenue">
            Cette position a été dessinée avant l’atelier : il n’y a pas de schéma à rouvrir.
            {ancienneImage
              ? ' L’ancienne image est affichée en calque sous le canevas — pose tes pièces par-dessus pour la retracer, puis règle son opacité plus bas.'
              : null}
          </p>
        )}
      </header>

      {illisible ? (
        <div className="atelier-alerte" role="alert">
          <p>
            <strong>Le schéma de cette position existe mais n’a pas pu être relu.</strong>
          </p>
          <p>
            L’atelier n’est pas ouvert : enregistrer par-dessus effacerait un travail que la page ne
            sait pas afficher. L’image actuelle de la position, elle, n’a rien perdu.
          </p>
          <p>
            <Link href={`/positions/${id}`}>Revenir à la fiche</Link>
          </p>
        </div>
      ) : (
        <AtelierPosition
          initial={{
            id: position.id as number,
            schema,
            informations: { nom: position.nom, description: position.description ?? '' },
          }}
          enregistrer={enregistrerSchemaPosition}
          retour={`/positions/${id}`}
        />
      )}
    </div>
  )
}
