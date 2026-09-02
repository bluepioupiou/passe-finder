import Link from 'next/link'
import React from 'react'

import { libelleDifficulte } from '@/collections/Passe'
import { nomDeTransition } from '@/collections/Transition'
import { positionDe } from '@/enchainements'
// Payload singularise le slug `passes` en `Pass` dans les types generes.
import type { Pass, Position, Transition } from '@/payload-types'
import { IconeTransition } from './Icones'
import './voisinage.css'

/**
 * Le VOISINAGE d'un noeud du graphe : ce qui mene la, ce qui en part.
 *
 * Extrait de la fiche position le 2026-09-02, quand la fiche PASSE a demande
 * exactement les memes listes. Une passe est une ARETE, pas un noeud : ses
 * voisines se lisent depuis ses deux extremites — ce qui arrive a sa position
 * de depart, ce qui part de sa position d'arrivee. Les composants ne savent
 * donc rien de la page qui les rend : ils recoivent des passes deja trouvees et
 * le SENS dans lequel il faut les lire.
 *
 * Recopier ces listes sur la seconde fiche les aurait laissees deriver — le
 * jour ou l'une change l'ordre de ses colonnes, l'autre reste en arriere et le
 * catalogue perd le rythme commun qui le rend balayable. Meme raison que pour
 * `CarteEnchainement`.
 */

/** L'autre extremite d'une passe, selon le sens de lecture. */
function extremite(passe: Pass, sens: 'sortante' | 'entrante'): Position | null {
  const cible = sens === 'sortante' ? passe.positionFin : passe.positionDebut
  return typeof cible === 'object' ? cible : null
}

/**
 * Liste de passes reliees a une position (FR-23).
 * `sortante` : elles partent de cette position. `entrante` : elles y arrivent.
 *
 * `precision` NOMME la position concernee quand elle n'est pas le sujet de la
 * page. Sur une fiche position, « qui partent d'ici » se suffit : « ici », c'est
 * ce qu'on regarde. Sur une fiche passe, la meme liste parle d'une position qui
 * n'est PAS le sujet — sans la nommer, on ne sait pas de quel bout de l'arete
 * on parle.
 */
export function ListePasses({
  titre,
  precision,
  vide,
  passes,
  sens,
}: {
  titre: string
  precision?: React.ReactNode
  vide: string
  passes: Pass[]
  sens: 'sortante' | 'entrante'
}) {
  return (
    <section className="fiche-section">
      <h2 className="fiche-section__titre">
        {titre} <span className="texte-attenue">({passes.length})</span>
      </h2>

      {precision ? <p className="fiche-section__precision texte-attenue">{precision}</p> : null}

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
 * Les changements de prise SANS PASSE lies a une position (FR-45).
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
 *
 * LA FICHE PASSE N'EN PASSE QU'UN SEUL SENS (`depuis`, lu depuis sa position
 * d'arrivee) : apres une passe, la question est « et maintenant ? ». Le sens
 * entrant y repondrait a une question qui ne se pose plus — on est arrive.
 */
export function Transitions({
  titre = 'Transitions',
  precision = 'Changer de prise sans danser de passe, donc sans prendre de temps sur la musique.',
  depuis,
  vers = [],
}: {
  titre?: string
  precision?: React.ReactNode
  depuis: Transition[]
  vers?: Transition[]
}) {
  const total = depuis.length + vers.length
  if (total === 0) return null

  return (
    <section className="fiche-section">
      <h2 className="fiche-section__titre">
        <IconeTransition className="fiche-section__icone" taille={18} />
        {titre} <span className="texte-attenue">({total})</span>
      </h2>

      <p className="fiche-section__precision texte-attenue">{precision}</p>

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
