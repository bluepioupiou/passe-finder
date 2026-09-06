import React from 'react'

import { ScenePosition } from '@/components/ScenePosition'
import { COULEUR } from '@/dessin-position'
import { scenePardefaut, sceneDunDanseur, TAILLES } from '@/schema-position'
import './legende-schema.css'

/**
 * La legende des schemas de position, pour la page « Comment ça marche ? ».
 *
 * CE QUI EST DESSINE PAR LE SITE, ET CE QUI EST DESSINE A LA MAIN. Les disques
 * verts ne sont pas des illustrations : ce sont de vrais schemas, montes par
 * `sceneDunDanseur` et `scenePardefaut` puis rendus par `ScenePosition`, comme
 * n'importe quelle vignette du catalogue. Le jour ou la forme d'un bras change,
 * la legende change avec — elle ne peut pas se mettre a decrire un dessin qui
 * n'existe plus.
 *
 * Les silhouettes DEBOUT, elles, sont ecrites a la main un peu plus bas. Le
 * moteur ne sait produire qu'une vue de dessus ; une vue de face est une autre
 * projection, qu'aucune fonction du produit ne connait. Cette duplication est
 * donc assumee, et elle est sans risque : ces silhouettes ne servent qu'a dire
 * « ce sont des etres humains », jamais a decrire une position.
 *
 * POURQUOI DES SCENES INVENTEES ET NON UNE POSITION DU CATALOGUE. Une vraie
 * position ferait un meilleur exemple pendant cinq minutes, et une legende
 * fausse le jour ou Alain la retouche. Ces scenes-ci n'appartiennent qu'a cette
 * page.
 *
 * POURQUOI LE TEXTE RESTE DU HTML. Tout ce qui se lit — les titres, « devant »,
 * « derriere », la liste numerotee — est hors du SVG. Il suit donc le theme
 * clair ou sombre, la taille de police du lecteur, et se laisse lire par un
 * lecteur d'ecran. Un dessin qui porterait ses propres mots perdrait les trois.
 */

/** Un generateur d'identifiants STABLE : le meme rendu a chaque appel, donc
 *  aucun ecart entre le HTML du serveur et celui du navigateur. */
function identifiantsStables(prefixe: string): () => string {
  let rang = 0
  return () => `${prefixe}-${rang++}`
}

/** Une fleche verticale, purement decorative : le mot a cote porte le sens. */
function Fleche({ vers }: { vers: 'haut' | 'bas' }) {
  return (
    <svg className="legende-fleche" viewBox="0 0 12 20" aria-hidden="true">
      <path
        d={vers === 'bas' ? 'M 6,1 L 6,15 M 1,10 L 6,17 L 11,10' : 'M 6,19 L 6,5 M 1,10 L 6,3 L 11,10'}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── La vue de face, dessinee a la main ─────────────────────────────────────

/**
 * Le corps est dessine COMME LES BRAS des vignettes : une bande teintee cernee
 * de noir, terminee par une main en octogone blanc. Ce n'est pas une coquetterie
 * — c'est ce qui fait reconnaitre le meme personnage d'un dessin a l'autre.
 */
function membre(d: string, teinte: string, epaisseur = 15) {
  return (
    <>
      <path d={d} fill="none" stroke={COULEUR.noir} strokeWidth={epaisseur + 8} strokeLinecap="round" />
      <path d={d} fill="none" stroke={teinte} strokeWidth={epaisseur} strokeLinecap="round" />
    </>
  )
}

/** L'octogone des mains, repris du dessin de dessus. */
function octogone(cx: number, cy: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI / 8 + (i * Math.PI) / 4
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`)
  }
  return `M ${points.join(' L ')} Z`
}

function DanseurDebout({ genre }: { genre: 'cavalier' | 'cavaliere' }) {
  const cavalier = genre === 'cavalier'
  const teinte = cavalier ? COULEUR.bleu : COULEUR.rose

  return (
    <svg className="legende-debout" viewBox="0 0 260 340" aria-hidden="true">
      {/* La queue de cheval passe DERRIERE la tete, qui est dessinee en dernier. */}
      {cavalier ? null : (
        <path
          d="M 168,40 C 214,26 226,74 206,104 C 198,76 186,58 158,50 Z"
          fill={COULEUR.jaune}
          stroke={COULEUR.noir}
          strokeWidth={4}
        />
      )}

      {membre('M 130,108 L 130,236', teinte, 17)}
      {membre('M 100,238 L 86,324', teinte)}
      {membre('M 160,238 L 174,324', teinte)}
      {membre('M 100,238 L 160,238', teinte, 17)}
      {membre('M 98,152 L 162,152', teinte)}
      {membre('M 98,152 Q 60,184 56,248', teinte)}
      {membre('M 162,152 Q 200,184 204,248', teinte)}

      <path d={octogone(56, 256, 16)} fill={COULEUR.blanc} stroke={COULEUR.noir} strokeWidth={4} />
      <path d={octogone(204, 256, 16)} fill={COULEUR.blanc} stroke={COULEUR.noir} strokeWidth={4} />

      <circle cx={130} cy={62} r={46} fill={teinte} stroke={COULEUR.noir} strokeWidth={5} />

      {/* La banane : le rouleau de cheveux qui deborde du front. Vue de dessus,
          c'est l'eclair noir du schema ; de face, ce n'est qu'une bosse. */}
      {cavalier ? (
        <circle cx={130} cy={18} r={15} fill={COULEUR.noir} stroke={COULEUR.noir} strokeWidth={4} />
      ) : null}
    </svg>
  )
}

// ── Les deux figures ───────────────────────────────────────────────────────

/**
 * Un danseur, debout puis vu de dessus, avec son devant et son derriere.
 *
 * ILS SONT MONTRES SEULS, ET C'EST LE POINT. Sur une vraie vignette les deux
 * se font face : il n'y a donc pas UN devant, il y en a deux, opposes. Une
 * fleche posee sur le couple designerait forcement le derriere de l'un des deux.
 */
function ColonneDanseur({
  genre,
  titre,
  note,
}: {
  genre: 'cavalier' | 'cavaliere'
  titre: string
  note: string
}) {
  // Les deux regardent vers le BAS de l'image, donc vers le lecteur de la
  // silhouette debout juste au-dessus. La cavaliere prend l'angle oppose parce
  // que son repere est derriere sa tete (cf. `directionDuRegard`).
  const rotation = genre === 'cavalier' ? 90 : 270
  const schema = sceneDunDanseur(genre, rotation, TAILLES.grand, identifiantsStables(genre))

  return (
    <figure className="legende-danseur">
      <h3 className="legende-danseur__titre">{titre}</h3>

      {/* LE SCHEMA D'ABORD, LA PERSONNE ENSUITE. C'est le schema que le lecteur
          a sous les yeux quand il arrive ici avec sa question ; la silhouette
          est la reponse, pas le point de depart. */}
      <p className="legende-danseur__repere">
        derrière
        <Fleche vers="haut" />
      </p>

      <ScenePosition className="legende-danseur__dessus" schema={schema} titre={titre} />

      <p className="legende-danseur__repere">
        <Fleche vers="bas" />
        devant
      </p>

      <p className="legende-danseur__liaison texte-attenue">
        vue de face
        <Fleche vers="bas" />
      </p>

      <DanseurDebout genre={genre} />

      <figcaption className="legende-danseur__note texte-attenue">{note}</figcaption>
    </figure>
  )
}

export function LegendeDanseurs() {
  return (
    <div className="legende-danseurs">
      <ColonneDanseur
        genre="cavalier"
        titre="Le cavalier"
        note="Sa banane dépasse devant lui : c’est la forme noire du schéma."
      />
      <ColonneDanseur
        genre="cavaliere"
        titre="La cavalière"
        note="Sa queue de cheval est derrière sa tête, comme dans la vraie vie."
      />
    </div>
  )
}

/** Les reperes poses sur la vignette du couple, en unites de dessin (toile de
 *  640, origine au centre). Le rang de chacun est son numero dans la liste. */
const REPERES: { x: number; y: number; libelle: string }[] = [
  { x: -150, y: -55, libelle: 'La tête du cavalier, en bleu.' },
  { x: 150, y: -55, libelle: 'La tête de la cavalière, en rose.' },
  { x: -69, y: 160, libelle: 'Un bras. Il part de l’épaule et prend la couleur de sa tête.' },
  { x: 95, y: 248, libelle: 'Une main. Ici les deux danseurs se tiennent.' },
]

/**
 * Le couple, avec ses pieces nommees.
 *
 * DES PASTILLES NUMEROTEES PLUTOT QUE DES ETIQUETTES RELIEES PAR UN TRAIT. Le
 * texte reste du HTML, a la taille de lecture du site, et la liste se lit encore
 * sur un telephone ou une etiquette posee autour du dessin serait illisible.
 */
export function LegendeCouple() {
  const schema = scenePardefaut(undefined, identifiantsStables('couple'))

  return (
    <figure className="legende-couple">
      <ScenePosition
        className="legende-couple__vignette"
        schema={schema}
        titre="Un cavalier et une cavalière qui se font face, main dans la main"
        dessus={
          <g aria-hidden="true">
            {REPERES.map((repere, rang) => (
              <g key={repere.libelle} transform={`translate(${repere.x} ${repere.y})`}>
                <circle r={38} fill={COULEUR.blanc} stroke={COULEUR.noir} strokeWidth={5} />
                <text
                  className="legende-couple__numero"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={COULEUR.noir}
                >
                  {rang + 1}
                </text>
              </g>
            ))}
          </g>
        }
      />

      <figcaption>
        <ol className="legende-couple__liste">
          {REPERES.map((repere) => (
            <li key={repere.libelle}>{repere.libelle}</li>
          ))}
        </ol>
      </figcaption>
    </figure>
  )
}
