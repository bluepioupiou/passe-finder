import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { basculerFavori } from '@/app/(frontend)/favoris/actions'
import { Bouton } from '@/components/Bouton'
import { BoutonFavori } from '@/components/BoutonFavori'
import { ChaineEnchainement } from '@/components/ChaineEnchainement'
import { IconeNote, IconeVideo } from '@/components/Icones'
import { nomAuteur, nomsDesAuteurs } from '@/auteurs'
import { chargerCatalogue } from '@/catalogue'
import { chaineDe, construireChaine, formaterDate, peutModifier } from '@/enchainements'
import { idsFavoris, peutEtreMisEnFavori } from '@/favoris'
import { presenterMusique } from '@/musique'
import { presenterVideo } from '@/video'
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

  return { payload, enchainement, user }
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
 * visibilité, éditer, supprimer, Story 4.5). L'auteur n'est pas affiché tant
 * que les comptes n'ont pas de nom d'affichage — montrer une adresse e-mail sur
 * une page publique se paierait en spam.
 *
 * Le FAVORI (Story 5.1) n'est proposé que s'il peut aboutir : connecté,
 * partagé, et pas le sien.
 *
 * RIEN N'EST PROPOSÉ À UN VISITEUR ANONYME — décision d'Alain, 2026-08-31.
 * L'AC de la Story 5.1 prévoyait de l'inviter à se connecter puis de le
 * ramener ici ; le bouton encombrait la fiche pour un geste que personne ne
 * vient chercher en lecture. La porte n'est pas perdue pour autant : la barre
 * de navigation propose « Se connecter » sur toutes les pages, et le favori
 * apparaît dès qu'on l'est.
 */
export default async function FicheEnchainement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { payload, enchainement, user } = await lireEnchainement(id)

  if (!enchainement) notFound()

  const chemin = `/enchainements/${enchainement.id}`
  const favorisable = peutEtreMisEnFavori(enchainement, user)
  // Proposer, pas autoriser : la page de modification revalide, l'action aussi,
  // et la collection tranche (ADD-5). Ici on evite seulement d'offrir un lien
  // qui menerait a une porte fermee.
  const modifiable = peutModifier(enchainement, user)
  // On ne charge les favoris que si le bouton peut apparaitre : inutile de
  // poser une requete pour un visiteur anonyme ou sur son propre enchainement.
  const dejaFavori = favorisable ? (await idsFavoris(payload, user)).has(enchainement.id) : false

  const catalogue = await chargerCatalogue(payload)
  const maillons = construireChaine(
    chaineDe(enchainement.passes, catalogue.passes, catalogue.positions),
  )

  const auteur = nomAuteur(enchainement, await nomsDesAuteurs(payload, [enchainement]))
  const date = formaterDate(enchainement.date)
  const musique = presenterMusique(enchainement.musique)
  const video = presenterVideo(enchainement.urlVideo)
  const nombre = enchainement.passes.length

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/enchainements">Enchaînements</Link>
      </p>

      <header className="fiche-enchainement-entete">
        {/* Le titre et, EN HAUT A DROITE, le geste de l'auteur : c'est la que
            l'oeil va chercher l'action sur une page qu'on relit souvent, et il
            reste visible sans derouler, meme sur telephone. */}
        <div className="fiche-enchainement-ligne-titre">
          <h1>{enchainement.titre}</h1>

          {/* Visible du seul auteur (ou d'un administrateur) : les autres ne
              verraient qu'une porte fermee. */}
          {modifiable ? (
            <Bouton variante="fantome" href={`${chemin}/modifier`}>
              Modifier
            </Bouton>
          ) : null}
        </div>

        <p className="fiche-enchainement-meta texte-attenue">
          {date ? <span className="donnee">{date}</span> : null}
          <span>
            {nombre} passe{nombre > 1 ? 's' : ''}
          </span>
          {/* Sur la MEME ligne que la date et le nombre de passes : la fiche ne
              porte pas les marqueurs musique/vidéo de la carte (elle montre les
              liens eux-mêmes, plus bas), la ligne a donc la place, et l'auteur
              se lit d'un coup avec le reste de l'état civil de l'enchaînement. */}
          {auteur ? <span className="fiche-enchainement-auteur">par {auteur}</span> : null}
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

        {/* La musique se pose dans l'entête, avec le titre et la date, et non
            en section plus bas : on danse SUR un morceau, il fait partie de
            l'identité de l'enchaînement. Sur téléphone, c'est aussi ce qui le
            rend visible sans dérouler.
            Comme la vidéo, c'est un simple lien (FR-39) : aucun lecteur
            intégré, donc aucun tiers chargé sur la page de révision. */}
        {musique ? (
          <p className="fiche-enchainement-lien-media">
            <IconeNote taille={18} />
            {musique.lien ? (
              <a href={musique.lien} target="_blank" rel="noopener noreferrer">
                {musique.texte}
              </a>
            ) : (
              <span>{musique.texte}</span>
            )}
            {musique.complement ? (
              <span className="texte-attenue">sur {musique.complement}</span>
            ) : null}
          </p>
        ) : null}

        {/* La video se pose juste sous la musique, meme forme : ce sont les deux
            liens de l'enchainement, et les separer en sections eloignees ferait
            chercher l'un apres avoir trouve l'autre.
            Comme la musique, un simple lien (FR-39) : aucun lecteur integre,
            donc aucun tiers charge sur la page de revision. */}
        {video ? (
          <p className="fiche-enchainement-lien-media">
            <IconeVideo taille={18} />
            {video.lien ? (
              <a href={video.lien} target="_blank" rel="noopener noreferrer">
                {video.texte}
              </a>
            ) : (
              <span>{video.texte}</span>
            )}
          </p>
        ) : null}

        {favorisable ? (
          <BoutonFavori
            idEnchainement={enchainement.id}
            favoriInitial={dejaFavori}
            chemin={chemin}
            action={basculerFavori}
          />
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
    </div>
  )
}
