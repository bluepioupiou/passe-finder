import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { estAdmin } from '@/collections/acces'
import { AtelierPosition } from '@/components/AtelierPosition'
import { identifiant } from '@/enchainements'
import config from '@/payload.config'
import { exigerSession } from '@/porte'
import { imageDePosition, NO_POSITION_IMAGE } from '@/positions'
import { positionsIntermediairesDe } from '@/positions-intermediaires'
import { dureeDe, libelleInstant } from '@/rythme'
import { scenePardefaut } from '@/schema-position'
import { enregistrerPositionIntermediaire } from '../../../actions'
import '@/app/(frontend)/positions/atelier-page.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Position intermédiaire — Passe Finder' }

/**
 * Dessiner la position d'un instant de la passe (Story 8.2).
 *
 * LE DEPART EN CALQUE. Alain dessine par-dessus la position de depart : la
 * position intermediaire est donc d'emblee dans le repere du depart, et la
 * fiche l'affichera telle quelle, sans aucun angle de l'Epic 7.
 *
 * RESERVE A L'ADMIN, comme la page « Modifier » de la passe. Cette garde soigne
 * le parcours ; l'action revérifie et `Passe.access` tranche en dernier ressort.
 */
export default async function PositionIntermediaire({
  params,
}: {
  params: Promise<{ id: string; instant: string }>
}) {
  const { id, instant: brut } = await params
  const retour = `/passes/${id}/modifier`

  const utilisateur = await exigerSession(`/passes/${id}/intermediaires/${brut}`)
  if (!estAdmin(utilisateur)) redirect(`/passes/${id}`)

  const payload = await getPayload({ config: await config })
  const passe = await payload
    .findByID({ collection: 'passes', id, depth: 0, disableErrors: true })
    .catch(() => null)
  if (!passe) notFound()

  // Un instant que le comptage de la passe ne connait pas n'a pas d'atelier :
  // le hook le refuserait de toute facon a l'enregistrement.
  const instant = Number(brut)
  const libelle = libelleInstant(dureeDe(passe.duree), instant)
  if (libelle === null) notFound()

  const idDepart = identifiant(passe.positionDebut)
  const depart =
    idDepart === null
      ? null
      : await payload
          .findByID({ collection: 'positions', id: idDepart, depth: 1, disableErrors: true })
          .catch(() => null)

  // Le placeholder n'a rien a decalquer : sans vraie image, pas de calque.
  const image = depart ? imageDePosition(depart).src : NO_POSITION_IMAGE
  const calque = image === NO_POSITION_IMAGE ? null : { src: image }

  const existante = positionsIntermediairesDe(passe.positionsIntermediaires).find(
    (position) => position.instant === instant,
  )

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/passes">Passes</Link> · <Link href={`/passes/${id}`}>{passe.nom}</Link> ·{' '}
        <Link href={retour}>Modifier</Link>
      </p>

      <header className="atelier-entete">
        <h1>
          {passe.nom} — instant « {libelle} »
        </h1>
        <p className="texte-attenue">
          {calque
            ? `Le départ, « ${depart?.nom} », est en calque sous le canevas : dessine la position par-dessus, dans le même sens.`
            : 'Le départ n’a pas d’image à mettre en calque : dessine la position dans le sens du départ.'}
        </p>
      </header>

      <AtelierPosition
        initial={{
          id: null,
          // Le calque n'est jamais stocke : on le remet a chaque ouverture.
          schema: { ...(existante?.schema ?? scenePardefaut()), calque },
          informations: { nom: '', description: '' },
        }}
        intermediaire
        destination={retour}
        enregistrer={enregistrerPositionIntermediaire.bind(null, passe.id, instant)}
        retour={retour}
      />
    </div>
  )
}
