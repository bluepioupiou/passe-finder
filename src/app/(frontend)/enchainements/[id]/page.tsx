import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ChaineEnchainement } from '@/components/ChaineEnchainement'
import { chargerCatalogue } from '@/catalogue'
import { chaineDe, construireChaine, formaterDate } from '@/enchainements'
import config from '@/payload.config'
import './fiche-enchainement.css'

export const dynamic = 'force-dynamic'

/**
 * Lit l'enchaînement en appliquant les `access` de la collection.
 *
 * `overrideAccess: false` fait tout le travail de FR-17 / AD-6 : un
 * enchaînement privé n'est simplement pas trouvé pour qui n'est pas son auteur,
 * exactement comme s'il n'existait pas. Rien n'est masqué côté interface, donc
 * rien ne fuit par l'API ni par les métadonnées de la page.
 */
async function lireEnchainement(id: string) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  const enchainement = await payload
    .findByID({
      collection: 'enchainements',
      id,
      depth: 0,
      disableErrors: true,
      overrideAccess: false,
      user,
    })
    .catch(() => null)

  return { payload, enchainement }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { enchainement } = await lireEnchainement(id)

  return {
    title: enchainement ? `${enchainement.titre} — Passe Finder` : 'Enchaînement introuvable',
  }
}

/**
 * Vue lecture d'un enchaînement (E5, UX-DR10) — le cœur du besoin élève :
 * ouvrir le lien reçu et réviser, sans compte (FR-18, FR-19).
 *
 * Ce qui attend d'autres stories : les contrôles d'auteur (basculer la
 * visibilité, éditer, supprimer) et le bouton Favori demandent les comptes
 * (Epic 3) ; l'auteur n'est pas affiché tant que les comptes n'ont pas de nom
 * d'affichage — montrer une adresse e-mail sur une page publique se paierait
 * en spam.
 */
export default async function FicheEnchainement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { payload, enchainement } = await lireEnchainement(id)

  if (!enchainement) notFound()

  const catalogue = await chargerCatalogue(payload)
  const maillons = construireChaine(
    chaineDe(enchainement.passes, catalogue.passes, catalogue.positions),
  )

  const date = formaterDate(enchainement.date)
  const nombre = enchainement.passes.length

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/enchainements">Enchaînements</Link>
      </p>

      <header className="fiche-enchainement-entete">
        <h1>{enchainement.titre}</h1>

        <p className="fiche-enchainement-meta texte-attenue">
          {date ? <span className="donnee">{date}</span> : null}
          <span>
            {nombre} passe{nombre > 1 ? 's' : ''}
          </span>
          {/* Visible du seul auteur, puisque les autres ne reçoivent pas un
              enchaînement privé : le badge lui rappelle que ce lien ne mène
              nulle part pour ses élèves. */}
          {enchainement.visibilite === 'prive' ? (
            <span className="fiche-enchainement-badge label-caps">Privé</span>
          ) : null}
        </p>

        {enchainement.description ? (
          <p className="fiche-texte fiche-enchainement-description">{enchainement.description}</p>
        ) : null}
      </header>

      <section className="fiche-section">
        <h2 className="fiche-section__titre">La chaîne</h2>
        <ChaineEnchainement maillons={maillons} />
      </section>

      {enchainement.notes ? (
        <section className="fiche-section">
          <h2 className="fiche-section__titre">Notes</h2>
          <p className="fiche-texte">{enchainement.notes}</p>
        </section>
      ) : null}

      {enchainement.urlVideo ? (
        <section className="fiche-section">
          <h2 className="fiche-section__titre">Vidéo</h2>
          {/* En v1, la vidéo est un simple lien (FR-39) : pas de lecteur
              intégré, donc pas de tiers chargé sur la page de révision. */}
          <p>
            <a href={enchainement.urlVideo} target="_blank" rel="noopener noreferrer">
              Voir la vidéo
            </a>
          </p>
        </section>
      ) : null}
    </div>
  )
}
