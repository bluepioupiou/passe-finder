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
import { lireParIdentifiantPublic } from '@/lecture-enchainement'
import { libelleVisibilite } from '@/visibilite'
import config from '@/payload.config'
import './fiche-enchainement.css'

export const dynamic = 'force-dynamic'

/**
 * Lit l'enchaînement désigné par le lien.
 *
 * LE LIEN EST LA CLÉ, et c'est LA page qui l'admet — la seule du projet (voir
 * `src/visibilite.ts`). Les `access` de la collection refusent le
 * non-répertorié comme le privé, ce qui le tient hors des listes ET hors de
 * l'API ; ici, présenter l'identifiant public vaut autorisation, et `peutLire`
 * tranche ensuite.
 *
 * Un ancien numéro (`/enchainements/12`) n'a pas la forme d'un identifiant
 * public : il n'atteint jamais la base et répond 404, comme décidé le
 * 2026-09-01. Le laisser vivre annulerait tout ce modèle — on retrouverait
 * n'importe quel non-répertorié en comptant.
 */
async function lireEnchainement(idPublic: string) {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  const enchainement = await lireParIdentifiantPublic(payload, idPublic, user)

  return { payload, enchainement, user }
}

export async function generateMetadata({ params }: { params: Promise<{ idPublic: string }> }) {
  const { idPublic } = await params
  const { enchainement } = await lireEnchainement(idPublic)

  return {
    title: enchainement ? `${enchainement.titre} — Passe Finder` : 'Enchaînement introuvable',
  }
}

/**
 * Vue lecture d'un enchaînement (E5, UX-DR10) — le cœur du besoin élève :
 * ouvrir le lien reçu et réviser, sans compte (FR-18, FR-19).
 *
 * UN SEUL GESTE D'AUTEUR EN HAUT DE PAGE : « Modifier », qui mène à l'écran où
 * tout se change — la chaîne, les informations, la visibilité — et où la
 * suppression attend, tout en bas (Story 4.5). Poser ici un second bouton pour
 * supprimer mettrait un geste irréversible à portée de pouce sur une page qu'on
 * relit en cours, parfois en dansant.
 *
 * Le FAVORI (Story 5.1) n'est proposé que s'il peut aboutir : connecté, pas
 * privé, et pas le sien. Un non-répertorié s'y met désormais aussi — on est ici
 * parce qu'on en a reçu le lien (décision d'Alain, 2026-09-01).
 *
 * RIEN N'EST PROPOSÉ À UN VISITEUR ANONYME — décision d'Alain, 2026-08-31.
 * L'AC de la Story 5.1 prévoyait de l'inviter à se connecter puis de le
 * ramener ici ; le bouton encombrait la fiche pour un geste que personne ne
 * vient chercher en lecture. La porte n'est pas perdue pour autant : la barre
 * de navigation propose « Se connecter » sur toutes les pages, et le favori
 * apparaît dès qu'on l'est.
 */
export default async function FicheEnchainement({
  params,
}: {
  params: Promise<{ idPublic: string }>
}) {
  const { idPublic } = await params
  const { payload, enchainement, user } = await lireEnchainement(idPublic)

  if (!enchainement) notFound()

  const chemin = `/enchainements/${enchainement.idPublic}`
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
    catalogue.transitions,
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
          {/* CE QUE CE LIEN VAUT POUR LES AUTRES, dit à celui qui le tient.
              « Privé » ne s'affiche que pour son auteur (personne d'autre ne
              reçoit un privé) et lui rappelle que le lien ne mène nulle part
              pour ses élèves. « Non répertorié » s'affiche pour TOUT LE MONDE,
              et c'est délibéré : le lecteur doit savoir qu'il tient une adresse
              qu'on ne retrouvera pas dans la liste — s'il la perd, il la perd.
              Le public ne porte pas de badge : c'est le cas ordinaire. */}
          {enchainement.visibilite !== 'public' ? (
            <span className="fiche-enchainement-badge label-caps">
              {libelleVisibilite(enchainement.visibilite)}
            </span>
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
            idPublic={enchainement.idPublic ?? ''}
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
