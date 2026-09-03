import React from 'react'

import { cibleDeSaisie, COULEUR, piecesDessinees, type Primitive } from '@/dessin-position'
import type { SchemaPosition } from '@/schema-position'

/**
 * Le rendu d'un schema de position, en SVG dans le DOM.
 *
 * L'un des deux traducteurs de `dessin-position.ts` — l'autre, `svgDeSchema`,
 * produit la meme chose en chaine pour `sharp`. Aucun des deux ne contient de
 * geometrie : ils ne font que mettre en balises une liste de `Primitive`. C'est
 * ce qui garantit que ce qu'Alain voit a l'ecran est exactement ce qui partira
 * dans le PNG.
 *
 * Sans etat, sans effet : elle sert aussi bien l'atelier que les micro-apercus
 * de sa palette — laquelle ne peut donc pas mentir sur ce qu'elle ajoute.
 *
 * `fond` et `dessus` sont deux emplacements libres dans le repere de la toile.
 * Ils existent pour ce qui AIDE A DESSINER sans FAIRE PARTIE du dessin : le
 * calque de decalque en dessous, la mire au-dessus. Les tenir hors de cette
 * fonction, et hors de `svgDeSchema`, est ce qui les empeche d'atterrir dans
 * l'image exportee.
 */

function Trait({ primitive }: { primitive: Primitive }) {
  const commun = {
    fill: primitive.remplissage,
    stroke: primitive.contour,
    strokeWidth: primitive.epaisseur,
  }

  if (primitive.forme === 'cercle') {
    return <circle cx={primitive.cx} cy={primitive.cy} r={primitive.r} {...commun} />
  }
  return <path d={primitive.d} {...commun} strokeLinecap={primitive.arrondi ? 'round' : undefined} />
}

/** La zone cliquable, invisible, et le halo de selection qui reprend sa forme. */
function Saisie({ primitive, selectionnee }: { primitive: Primitive; selectionnee: boolean }) {
  const halo = selectionnee ? (
    primitive.forme === 'cercle' ? (
      <circle
        className="scene__halo"
        cx={primitive.cx}
        cy={primitive.cy}
        r={primitive.r}
        strokeWidth={8}
      />
    ) : (
      <path className="scene__halo" d={primitive.d} strokeWidth={primitive.epaisseur} />
    )
  ) : null

  const cible =
    primitive.forme === 'cercle' ? (
      <circle cx={primitive.cx} cy={primitive.cy} r={primitive.r} fill="transparent" pointerEvents="all" />
    ) : (
      <path
        d={primitive.d}
        fill="none"
        stroke="transparent"
        strokeWidth={primitive.epaisseur}
        strokeLinecap="round"
        pointerEvents="stroke"
      />
    )

  return (
    <>
      {halo}
      {cible}
    </>
  )
}

export function ScenePosition({
  schema,
  selection = null,
  gestionnairesPiece,
  fond,
  dessus,
  className,
  titre,
}: {
  schema: SchemaPosition
  selection?: string | null
  /** Proprietes a poser sur le groupe d'une piece (pointeur, curseur…). Absent
   *  pour un rendu purement decoratif : aucune zone de saisie n'est alors
   *  produite du tout. */
  gestionnairesPiece?: (id: string) => React.SVGProps<SVGGElement>
  fond?: React.ReactNode
  dessus?: React.ReactNode
  className?: string
  /** Renseigne => le SVG est annonce comme une image aux lecteurs d'ecran.
   *  Absent => il est purement decoratif (cas des apercus de la palette, dont
   *  le bouton porte deja le libelle). */
  titre?: string
}) {
  const t = schema.taille
  const coin = -t / 2
  const interactif = Boolean(gestionnairesPiece)

  return (
    <svg
      className={['scene', className].filter(Boolean).join(' ')}
      viewBox={`${coin} ${coin} ${t} ${t}`}
      xmlns="http://www.w3.org/2000/svg"
      role={titre ? 'img' : undefined}
      aria-label={titre}
      aria-hidden={titre ? undefined : true}
    >
      <rect x={coin} y={coin} width={t} height={t} fill={COULEUR.vert} />
      {fond}

      {piecesDessinees(schema).map((dessinee, index) => {
        const piece = schema.pieces[index]
        return (
          <g
            key={dessinee.id}
            transform={dessinee.transform}
            {...(gestionnairesPiece ? gestionnairesPiece(dessinee.id) : {})}
          >
            {dessinee.primitives.map((primitive, rang) => (
              <Trait key={rang} primitive={primitive} />
            ))}
            {interactif ? (
              <Saisie primitive={cibleDeSaisie(piece)} selectionnee={selection === dessinee.id} />
            ) : null}
          </g>
        )
      })}

      {dessus}
    </svg>
  )
}
