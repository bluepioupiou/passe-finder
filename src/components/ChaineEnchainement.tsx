import Link from 'next/link'
import React from 'react'

import { libelleDifficulte } from '@/collections/Passe'
import { typologie, type Maillon } from '@/enchainements'
import type { Position } from '@/payload-types'
import { ImagePosition } from './ImagePosition'
import './chaine-enchainement.css'

/** Les nombres de colonnes que la grille peut prendre, du téléphone au grand écran. */
const COLONNES = [1, 2, 3] as const

/** Bulle : une position réduite à son rôle d'articulation, nommée au survol. */
function Bulle({ position }: { position: Position }) {
  return (
    <span className="bulle">
      <Link className="bulle__lien" href={`/positions/${position.id}`} aria-label={position.nom}>
        <ImagePosition position={position} className="bulle__image" />
      </Link>
      <span className="bulle__info" role="tooltip">
        {position.nom}
      </span>
    </span>
  )
}

/**
 * Reprise : la position d'où l'on repart RECOUVRE celle sur laquelle on
 * arrivait, décalée en bas à droite.
 *
 * Le geste dit tout seul « on n'enchaîne pas d'ici, on repart de là », sans
 * encadré ni phrase au milieu de la chaîne. L'explication complète arrive au
 * survol (et au clavier, via `:focus-within`) : rien n'est perdu pour qui ne
 * lit pas la superposition.
 */
function PileReprise({
  arrivait,
  reprend,
}: {
  arrivait: Position | null
  reprend: Position | null
}) {
  if (!reprend) return null

  return (
    <span className="bulle pile">
      {arrivait ? <ImagePosition position={arrivait} className="pile__dessous" /> : null}

      <Link
        className="pile__dessus"
        href={`/positions/${reprend.id}`}
        aria-label={`Reprise en ${reprend.nom}`}
      >
        <ImagePosition position={reprend} className="bulle__image" />
      </Link>

      <span className="pile__marque" aria-hidden="true">
        ↻
      </span>

      <span className="bulle__info" role="tooltip">
        {arrivait ? (
          <>
            On arrivait en « {arrivait.nom} » — on repart de « {reprend.nom} »
          </>
        ) : (
          <>Reprise en « {reprend.nom} »</>
        )}
      </span>
    </span>
  )
}

/**
 * Rendu partagé de la chaîne d'un enchaînement (UX-DR10).
 *
 * CE QUI EST ENCHAÎNÉ, CE SONT LES PASSES. Chacune occupe une carte de même
 * largeur — c'est la carte, pas la longueur du mot, qui donne le rythme — et la
 * position redevient ce qu'elle est : une articulation, une bulle posée à
 * cheval sur le bord entre deux cartes. Elle appartient aux deux, et n'est
 * dessinée qu'une fois.
 *
 * La chaîne se lit en SERPENTIN (voir `typologie`) : la première ligne va vers
 * la droite, on descend à l'extrémité, la suivante repart vers la gauche. Un
 * demi-trait d'entrée et un demi-trait de sortie traversent chaque carte et se
 * rejoignent en son centre ; seule la sortie porte une tête, qui donne le sens
 * de lecture. Sur téléphone, la grille tombe à une colonne : il ne reste qu'un
 * fil du haut vers le bas, avec la bulle entre chaque paire de cartes.
 *
 * POURQUOI les traits sont rendus trois fois : leur orientation dépend du
 * nombre de colonnes, que seul le CSS connaît (il change avec la largeur de
 * l'écran). Plutôt que de réécrire la géométrie pour chaque point de rupture en
 * `nth-child`, chaque carte porte les trois versions et le CSS n'a plus qu'à
 * afficher la bonne. Les autres sont en `display: none`, donc absentes aussi de
 * l'arbre d'accessibilité : rien n'est annoncé en double.
 *
 * Chaque passe mène à sa fiche et chaque position à la sienne (FR-20) : on
 * circule dans le graphe depuis la révision.
 */
export function ChaineEnchainement({ maillons }: { maillons: Maillon[] }) {
  return (
    <ol className="chaine">
      {maillons.map((maillon, index) => {
        const suivant = maillons[index + 1]
        const difficulte = libelleDifficulte(maillon.passe.difficulte)
        const dernier = index === maillons.length - 1

        // On ne dessine une entrée que là où la chaîne commence, et là où elle
        // reprend ailleurs : partout ailleurs, cette bulle existe déjà — c'est
        // la bulle de sortie de la carte précédente.
        const entree =
          index === 0 ? (
            maillon.debut ? (
              <Bulle position={maillon.debut} />
            ) : null
          ) : maillon.rupture ? (
            <PileReprise arrivait={maillon.rupture.arrivait} reprend={maillon.rupture.reprend} />
          ) : null

        // Juste avant une reprise, l'arrivée n'est pas dessinée ici : c'est la
        // pile de la carte suivante qui la montre, écrasée par la nouvelle.
        const sortie = maillon.fin && !suivant?.rupture ? <Bulle position={maillon.fin} /> : null

        return (
          // L'index EST l'ordre (ADD-18) et une même passe peut revenir dans la
          // chaîne : c'est bien la position dans la suite qui identifie le pas.
          <li className="pas" key={index}>
            {COLONNES.map((colonnes) => {
              const sens = typologie(index, colonnes, dernier)

              return (
                <React.Fragment key={colonnes}>
                  <span className={`pas__voie seg--${sens.entree}`} data-colonnes={colonnes}>
                    {entree ? <span className="pas__ancre">{entree}</span> : null}
                  </span>

                  <span
                    className={`pas__voie pas__voie--sortie seg--${sens.sortie}`}
                    data-colonnes={colonnes}
                  >
                    {sortie ? <span className="pas__ancre">{sortie}</span> : null}
                  </span>
                </React.Fragment>
              )
            })}

            <Link className="pas__etiquette" href={`/passes/${maillon.passe.id}`}>
              <span className="pas__nom">{maillon.passe.nom}</span>
              {difficulte ? (
                <span className="pas__difficulte label-caps texte-attenue">{difficulte}</span>
              ) : null}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
