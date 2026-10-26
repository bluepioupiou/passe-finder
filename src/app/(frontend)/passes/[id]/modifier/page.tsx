import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { estAdmin } from '@/collections/acces'
import { DIFFICULTES } from '@/collections/Passe'
import { FormulairePasse } from '@/components/FormulairePasse'
import { identifiant } from '@/enchainements'
import { ligneDe } from '@/orientation'
import config from '@/payload.config'
import type { Position } from '@/payload-types'
import { exigerSession } from '@/porte'
import { imageDePosition } from '@/positions'
import { dureeDe } from '@/rythme'
import { modifierPasse } from '../../actions'
import '../fiche-passe.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })
  const passe = await payload
    .findByID({ collection: 'passes', id, depth: 0, disableErrors: true })
    .catch(() => null)

  return { title: passe ? `Modifier ${passe.nom} — Passe Finder` : 'Passe introuvable' }
}

/**
 * Modifier une passe sans passer par /admin (demande d'Alain, 2026-10-25) :
 * les corrections du catalogue se font la ou on les remarque, sur la fiche.
 *
 * RESERVE A L'ADMIN, comme la page « Modifier » d'une position. Une passe n'a
 * pas d'auteur — seul l'admin en cree — et c'est le materiau commun de tous les
 * enchainements. Cette garde soigne le parcours ; l'action revérifie et
 * `Passe.access` tranche en dernier ressort (ADD-5).
 */
export default async function ModifierPasse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const utilisateur = await exigerSession(`/passes/${id}/modifier`)
  if (!estAdmin(utilisateur)) redirect(`/passes/${id}`)

  const payload = await getPayload({ config: await config })
  const passe = await payload
    .findByID({ collection: 'passes', id, depth: 0, disableErrors: true })
    .catch(() => null)

  if (!passe) notFound()

  const debut = identifiant(passe.positionDebut)
  const fin = identifiant(passe.positionFin)
  if (debut === null || fin === null) notFound()

  const [{ docs: positions }, { totalDocs: utilisations }] = await Promise.all([
    payload.find({ collection: 'positions', limit: 500, depth: 1, sort: 'nom' }),
    // TOUS les enchainements, prives d'autrui compris : l'avertissement doit
    // compter ce qu'un changement de position risque de casser, pas ce que
    // l'admin a le droit de lire. Meme choix que la garde de suppression.
    payload.count({
      collection: 'enchainements',
      where: { 'passes.passe': { equals: passe.id } },
      overrideAccess: true,
    }),
  ])

  // Des vues, comme pour le compositeur : le navigateur n'a besoin ni des
  // schemas ni des medias complets pour afficher trente vignettes.
  const vues = positions.map((position: Position) => ({
    id: position.id,
    nom: position.nom,
    src: imageDePosition(position).src,
    ligne: ligneDe(position.ligneDeDanse),
  }))

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/passes">Passes</Link> · <Link href={`/passes/${id}`}>{passe.nom}</Link>
      </p>

      <header className="fiche-passe-entete">
        <h1>Modifier « {passe.nom} »</h1>
      </header>

      <div className="fiche-section">
        <FormulairePasse
          initial={{
            id: passe.id,
            nom: passe.nom,
            positionDebut: debut,
            positionFin: fin,
            description: passe.description ?? '',
            deroule: passe.deroule ?? '',
            difficulte: passe.difficulte ?? '',
            pivot: passe.pivot ?? '',
            // Une duree vide s'affiche « 6 temps » : c'est ce qu'elle vaut.
            duree: String(dureeDe(passe.duree)),
          }}
          positions={vues}
          difficultes={DIFFICULTES}
          utilisations={utilisations}
          enregistrer={modifierPasse}
          retour={`/passes/${id}`}
        />
      </div>
    </div>
  )
}
