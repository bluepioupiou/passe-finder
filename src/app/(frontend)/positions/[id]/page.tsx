import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { IconeTransition } from '@/components/Icones'
import { ImagePosition } from '@/components/ImagePosition'
import { libelleDifficulte } from '@/collections/Passe'
import { nomDeTransition } from '@/collections/Transition'
import { positionDe } from '@/enchainements'
import config from '@/payload.config'
// Payload singularise le slug `passes` en `Pass` dans les types generes.
import type { Pass, Position, Transition } from '@/payload-types'
import './fiche-position.css'

export const dynamic = 'force-dynamic'

/** L'autre extrémité d'une passe, selon le sens de lecture. */
function extremite(passe: Pass, sens: 'sortante' | 'entrante'): Position | null {
  const cible = sens === 'sortante' ? passe.positionFin : passe.positionDebut
  return typeof cible === 'object' ? cible : null
}

/**
 * Liste de passes reliées à la position courante (FR-23).
 * `sortante` : elles partent d'ici. `entrante` : elles arrivent ici.
 */
function ListePasses({
  titre,
  vide,
  passes,
  sens,
}: {
  titre: string
  vide: string
  passes: Pass[]
  sens: 'sortante' | 'entrante'
}) {
  return (
    <section className="fiche-section">
      <h2 className="fiche-section__titre">
        {titre} <span className="texte-attenue">({passes.length})</span>
      </h2>

      {passes.length === 0 ? (
        <p className="texte-attenue">{vide}</p>
      ) : (
        <ul className="fiche-passes">
          {passes.map((passe) => {
            const autre = extremite(passe, sens)
            const difficulte = libelleDifficulte(passe.difficulte)

            return (
              <li key={passe.id}>
                <Link className="fiche-passe-lien" href={`/passes/${passe.id}`}>
                  <span className="fiche-passe-nom">{passe.nom}</span>
                  {autre ? (
                    <span className="fiche-passe-cible texte-attenue">
                      {sens === 'sortante' ? '→ ' : '← '}
                      {autre.nom}
                    </span>
                  ) : null}
                  {difficulte ? (
                    <span className="fiche-passe-difficulte label-caps">{difficulte}</span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Une transition, lue DANS LE SENS DE LA DANSE (Story 4.7).
 *
 * La fleche pointe toujours vers la droite, et c'est ce qui permet de melanger
 * les deux sens dans une seule liste : ce qui change de place, c'est le geste.
 *
 *   sortante :  « Changement de prise » -> Espagnole
 *   entrante :  Berceau gauche -> « Changement de prise »
 *
 * On lit donc toujours « d'ou l'on vient, ou l'on va », comme une chaine
 * d'enchainement. La typographie porte le reste : le GESTE est en gras, la
 * POSITION est un lien attenue — d'un coup d'oeil on voit de quel cote de la
 * fleche on se trouve, sans avoir a lire.
 *
 * Le geste n'est pas cliquable : une transition n'a pas de fiche, ce n'est pas
 * un objet qu'on consulte. La position, elle, l'est — c'est elle qui prolonge
 * l'exploration du graphe, comme les passes le font (FR-20).
 */
function LigneTransition({
  transition,
  sens,
}: {
  transition: Transition
  sens: 'sortante' | 'entrante'
}) {
  const autre = positionDe(sens === 'sortante' ? transition.positionFin : transition.positionDebut)

  const geste = <span className="fiche-passe-nom">{nomDeTransition(transition.nom)}</span>
  const position = autre ? (
    <Link className="fiche-transition__cible" href={`/positions/${autre.id}`}>
      {autre.nom}
    </Link>
  ) : null

  return (
    <li className="fiche-transition">
      <p className="fiche-transition__ligne">
        {sens === 'sortante' ? geste : position}
        <span className="fiche-transition__fleche" aria-hidden="true">
          &rarr;
        </span>
        {sens === 'sortante' ? position : geste}
      </p>

      {/* Le deroule du geste : c'est le contenu de cours, la vraie raison
          d'etre de l'objet. Affiche en toutes lettres et pas derriere un
          survol — sur une fiche on a la place, et c'est ce qu'on vient y
          chercher. */}
      {transition.description ? (
        <p className="fiche-transition__deroule texte-attenue">{transition.description}</p>
      ) : null}
    </li>
  )
}

/**
 * Les changements de prise SANS PASSE lies a cette position (FR-45).
 *
 * UN SEUL GROUPE pour les deux sens, la ou les passes en font deux. Les passes
 * sont le corps du catalogue : on les cherche separement selon qu'on veut
 * partir d'ici ou savoir comment on y arrive. Les transitions sont rares — une
 * ou deux par position — et les separer en deux sections a moitie vides
 * decoupait pour rien. Rassemblees, elles se lisent d'un bloc, et la fleche
 * suffit a dire le sens.
 *
 * Rendu seulement si le groupe n'est pas vide, contrairement aux listes de
 * passes qui affichent toujours leur message. La difference n'est pas un
 * caprice : « aucune passe ne part d'ici » est une information rare et utile —
 * c'est un cul-de-sac du catalogue. « Aucune transition ici » est le cas
 * ORDINAIRE (les changements de prise vivent presque tous dans le petit groupe
 * des prises de main) : l'ecrire sur les trois quarts des fiches n'apprendrait
 * rien et noierait celles qui en ont.
 */
function Transitions({ depuis, vers }: { depuis: Transition[]; vers: Transition[] }) {
  const total = depuis.length + vers.length
  if (total === 0) return null

  return (
    <section className="fiche-section">
      <h2 className="fiche-section__titre">
        <IconeTransition className="fiche-section__icone" taille={18} />
        Transitions <span className="texte-attenue">({total})</span>
      </h2>

      <p className="fiche-transition__intro texte-attenue">
        Changer de prise sans danser de passe, donc sans prendre de temps sur la musique.
      </p>

      <ul className="fiche-passes">
        {/* Ce qui PART d'ici en premier : c'est la reponse a « qu'est-ce que je
            peux faire maintenant ? », la question qu'on se pose sur une fiche
            de position. */}
        {depuis.map((transition) => (
          <LigneTransition
            key={`depuis-${transition.id}`}
            transition={transition}
            sens="sortante"
          />
        ))}
        {vers.map((transition) => (
          <LigneTransition key={`vers-${transition.id}`} transition={transition} sens="entrante" />
        ))}
      </ul>
    </section>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })
  const position = await payload
    .findByID({ collection: 'positions', id, depth: 0, disableErrors: true })
    .catch(() => null)

  return { title: position ? `${position.nom} — Passe Finder` : 'Position introuvable' }
}

/**
 * Fiche d'une position (E3, UX-DR8) — lecture publique (FR-21).
 *
 * Les listes sont les lectures inverses des DEUX arêtes du graphe : les passes
 * (AD-2) — ce qui part d'ici, ce qui y mène — et les transitions (Story 4.7),
 * les changements de prise qui ne coûtent pas de temps musical. C'est ce qui
 * rend le catalogue navigable de proche en proche.
 *
 * Le groupe des transitions ne s'affiche que s'il a quelque chose à dire ;
 * les listes de passes s'affichent toujours. Voir `Transitions`.
 */
export default async function FichePosition({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })

  const position = await payload
    .findByID({ collection: 'positions', id, depth: 1, disableErrors: true })
    .catch(() => null)

  if (!position) notFound()

  const [sortantes, entrantes, prisesDepuis, prisesVers] = await Promise.all([
    payload.find({
      collection: 'passes',
      where: { positionDebut: { equals: position.id } },
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
    payload.find({
      collection: 'passes',
      where: { positionFin: { equals: position.id } },
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
    // Les deux lectures inverses de l'AUTRE arete du graphe (Story 4.7) : celle
    // qui ne coute pas de temps musical. Meme forme de requete que les passes —
    // c'est le meme graphe, lu deux fois.
    payload.find({
      collection: 'transitions',
      where: { positionDebut: { equals: position.id } },
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
    payload.find({
      collection: 'transitions',
      where: { positionFin: { equals: position.id } },
      limit: 200,
      depth: 1,
      sort: 'nom',
    }),
  ])

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/positions">Positions</Link>
      </p>

      <header className="fiche-entete">
        <ImagePosition position={position} className="fiche-image" />
        <div className="fiche-entete__texte">
          <h1>{position.nom}</h1>
          {position.description ? (
            <p className="fiche-description texte-attenue">{position.description}</p>
          ) : null}
        </div>
      </header>

      <ListePasses
        titre="Passes qui partent d'ici"
        vide="Aucune passe ne part de cette position."
        passes={sortantes.docs}
        sens="sortante"
      />

      <ListePasses
        titre="Passes qui arrivent ici"
        vide="Aucune passe n'arrive à cette position."
        passes={entrantes.docs}
        sens="entrante"
      />

      {/* Les transitions APRES les deux listes de passes : c'est l'exception du
          graphe, pas son corps. La seule fiche ou elles passent devant est
          celle d'un cul-de-sac — et la, la liste des passes sortantes est vide,
          donc elles arrivent tout de suite sous les yeux. */}
      <Transitions depuis={prisesDepuis.docs} vers={prisesVers.docs} />
    </div>
  )
}
