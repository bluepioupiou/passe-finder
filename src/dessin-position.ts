import type { Piece, PieceBras, SchemaPosition } from './schema-position'

/**
 * La GEOMETRIE des schemas de position : ce qui dessine, par opposition a
 * `schema-position.ts` qui decrit.
 *
 * D'OU VIENNENT CES CHIFFRES. Ils ne sont pas inventes : ils ont ete releves
 * sur les vignettes historiques de `images/positions/` (couleurs echantillonnees
 * pixel par pixel, proportions mesurees sur les silhouettes) puis figes dans
 * `scripts/generer-kit.mjs`, qui en a tire les 195 pieces du kit. Ce fichier en
 * est la reprise fidele : la convention de dessin d'Alain, ecrite pour la
 * premiere fois dans du code que le site execute.
 *
 * POURQUOI CE MODULE N'EMET PAS DE SVG. Il a DEUX consommateurs qui ne parlent
 * pas la meme langue : `ScenePosition.tsx` construit du JSX pour le navigateur,
 * `rendu-position-png.ts` construit une chaine pour `sharp`. Si le module
 * rendait du SVG, l'un des deux devrait le reparser ou le dupliquer — et le
 * jour ou un contour change, la moitie du produit changerait sans l'autre.
 *
 * Il emet donc une DESCRIPTION (`Primitive[]`), que chacun traduit en une
 * vingtaine de lignes sans une once de geometrie. Une retouche se fait ici, et
 * les deux sorties suivent.
 *
 * CE QUI N'EST PAS ICI, ET POURQUOI. Les cibles de saisie (zones cliquables
 * elargies) sont produites par `cibleDeSaisie`, que `svgDeSchema` n'appelle
 * jamais. Ce n'est pas de la discipline, c'est structurel : aucune zone
 * invisible ne peut fuir dans le PNG exporte. La mire et le calque de decalque
 * sont dessines par l'atelier, pour la meme raison.
 */

/** Palette relevee sur les vignettes d'origine. Ce sont des DONNEES du domaine,
 *  pas des couleurs d'interface : elles ne passent pas par `tokens.css` et ne
 *  changent pas avec le theme clair ou sombre. */
export const COULEUR = {
  vert: '#CCFFCC', // fond
  bleu: '#B9E0E5', // tete du cavalier
  rose: '#FF99CC', // tete de la cavaliere
  jaune: '#FFFF00', // queue de cheval
  blanc: '#FFFFFF', // mains
  noir: '#000000', // contours, et bras qui passe au-dessus
  gris: '#808080', // bras qui passe en dessous
} as const

// ── Proportions. L'unite de dessin est le RAYON DE TETE = 100. ──────────────
export const R_TETE = 100
const TRAIT = 4 // contour des formes pleines
const EP_BRAS = 13 // epaisseur d'un bras
const R_MAIN = 24 // rayon de la main (octogone)
const TRAIT_MAIN = 5

/** Rayon de courbure du kit historique. Sert d'ancrage : `courbure` vaut
 *  `R_TETE / R_BRAS_KIT` pour reproduire exactement les 144 bras du kit. */
export const R_BRAS_KIT = 150

/** Au-dela, le bras se referme sur lui-meme et le dessin devient illisible. */
const ANGLE_MAX = (330 * Math.PI) / 180

/**
 * Format numerique commun a toutes les sorties.
 *
 * `toFixed` seul laisserait trainer des `150.00` et surtout des
 * `150.00000000000003` : la division `R_TETE / courbure` ne tombe pas juste en
 * binaire. Le passage par `Number` retire les zeros inutiles, ce qui rend les
 * chemins lisibles et surtout COMPARABLES d'une execution a l'autre.
 */
const n = (valeur: number) => String(Number(valeur.toFixed(3)))

// ── Formes de base ─────────────────────────────────────────────────────────

/** L'eclair du cavalier : une fleche en zigzag qui indique le sens du regard.
 *  Trace releve sur les vignettes — trois chevrons qui s'epaississent, pointe
 *  a gauche, talon carre qui deborde de la tete. */
const ECLAIR =
  'M -70,-28 L 18,-57 L 24,-41 L 64,-53 L 70,-45 L 144,-57 L 144,19 ' +
  'L 70,1 L 64,-4 L 24,0 L 18,-19 Z'

/** La queue de cheval de la cavaliere : un croissant qui balaie vers l'exterieur. */
const CROISSANT =
  'M 20,-30 C 84,-78 172,-68 208,-6 C 221,20 219,48 210,72 ' +
  'C 202,40 172,27 120,19 C 76,12 41,-6 20,-30 Z'

function etoile(cx: number, cy: number, rExt: number, rInt: number, branches = 8): string {
  const points: string[] = []
  for (let i = 0; i < branches * 2; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / branches
    const r = i % 2 ? rInt : rExt
    points.push(`${n(cx + r * Math.cos(angle))},${n(cy + r * Math.sin(angle))}`)
  }
  return `M ${points.join(' L ')} Z`
}

function octogone(cx: number, cy: number, r: number): string {
  const points: string[] = []
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI / 8 + (i * Math.PI) / 4
    points.push(`${n(cx + r * Math.cos(angle))},${n(cy + r * Math.sin(angle))}`)
  }
  return `M ${points.join(' L ')} Z`
}

// ── Le bras ────────────────────────────────────────────────────────────────

/**
 * Le trace d'un bras, et le point ou se pose sa main.
 *
 * LE MODELE A CHANGE, ET C'EST LE COEUR DE CE CHANTIER. Le kit figeait trois
 * longueurs, deux sens et un rayon unique : six formes, et aucun moyen de
 * dessiner un bras droit. Alain le resumait par « il manque des possibilites
 * de bras ». Ici, deux nombres suffisent et couvrent tout arc de cercle :
 *
 *  - `longueur` se mesure LE LONG DE L'ARC, parce que c'est ce qu'un humain
 *    percoit d'un bras. Un angle balaye, non : a 45 degres, un bras peut etre
 *    minuscule ou immense selon le rayon.
 *  - `courbure` est SIGNEE et absorbe l'ancien `sens` : 0 = bras droit,
 *    positif = s'enroule dans le sens horaire, negatif = antihoraire. Un seul
 *    curseur, gradue d'un sens a l'autre en passant par le droit, rend le sens
 *    VISIBLE — la ou une case a cocher demandait de deviner.
 *
 * L'ancien kit reste atteignable : `courbure = R_TETE / R_BRAS_KIT` redonne
 * exactement ses 144 bras, ce que verrouille `tests/unit/dessin-position.spec.ts`.
 *
 * LE CAS DEGENERE DOIT ETRE ECRIT. Avec `courbure = 0`, le rayon devient infini
 * et l'arc `A` produit un `d` invalide que NI le navigateur NI sharp ne
 * signalent : le bras disparait, sans erreur, sans trace. D'ou le `L` explicite.
 *
 * Le trace demarre 25 unites AVANT le bord de la tete pour se glisser dessous :
 * c'est ce qui donne l'impression que le bras sort de derriere le corps, a
 * condition de dessiner la tete par-dessus (cf. l'ordre de la pile).
 */
export function traceBras({ longueur, courbure }: Pick<PieceBras, 'longueur' | 'courbure'>): {
  d: string
  fin: { x: number; y: number }
} {
  const depart = `M ${R_TETE - 25},0 L ${R_TETE},0`

  if (courbure === 0) {
    const fin = { x: R_TETE + longueur, y: 0 }
    return { d: `${depart} L ${n(fin.x)},${n(fin.y)}`, fin }
  }

  const signe = Math.sign(courbure)
  const rayon = R_TETE / Math.abs(courbure)
  const angle = Math.min(longueur / rayon, ANGLE_MAX)

  const fin = {
    x: R_TETE + rayon * Math.sin(angle),
    y: signe * rayon * (1 - Math.cos(angle)),
  }
  const grandArc = angle > Math.PI ? 1 : 0
  const balayage = signe > 0 ? 1 : 0

  return {
    d:
      `${depart} A ${n(rayon)} ${n(rayon)} 0 ${grandArc} ${balayage} ` +
      `${n(fin.x)},${n(fin.y)}`,
    fin,
  }
}

// ── Primitives ─────────────────────────────────────────────────────────────

export type Primitive =
  | {
      forme: 'cercle'
      cx: number
      cy: number
      r: number
      remplissage: string
      contour?: string
      epaisseur?: number
    }
  | {
      forme: 'chemin'
      d: string
      remplissage: string
      contour?: string
      epaisseur?: number
      arrondi?: boolean
    }

export type PieceDessinee = { id: string; transform: string; primitives: Primitive[] }

const cercleTete = (remplissage: string): Primitive => ({
  forme: 'cercle',
  cx: 0,
  cy: 0,
  r: R_TETE,
  remplissage,
  contour: COULEUR.noir,
  epaisseur: TRAIT,
})

const eclair = (): Primitive => ({ forme: 'chemin', d: ECLAIR, remplissage: COULEUR.noir })

const queueDeCheval = (): Primitive[] => [
  {
    forme: 'chemin',
    d: CROISSANT,
    remplissage: COULEUR.jaune,
    contour: COULEUR.noir,
    epaisseur: TRAIT,
  },
  {
    forme: 'chemin',
    d: etoile(30, -6, 40, 14),
    remplissage: COULEUR.jaune,
    contour: COULEUR.noir,
    epaisseur: 3,
  },
]

const mainEn = (cx: number, cy: number): Primitive => ({
  forme: 'chemin',
  d: octogone(cx, cy, R_MAIN),
  remplissage: COULEUR.blanc,
  contour: COULEUR.noir,
  epaisseur: TRAIT_MAIN,
})

/** Les traits d'une piece, dans son repere local (origine = centre de tete). */
export function primitivesDePiece(piece: Piece): Primitive[] {
  if (piece.type === 'bras') {
    const { d, fin } = traceBras(piece)
    return [
      {
        forme: 'chemin',
        d,
        remplissage: 'none',
        contour: COULEUR[piece.couleur],
        epaisseur: EP_BRAS,
        arrondi: true,
      },
      mainEn(fin.x, fin.y),
    ]
  }

  if (piece.type === 'accessoire') {
    if (piece.motif === 'eclair') return [eclair()]
    if (piece.motif === 'queue-de-cheval') return queueDeCheval()
    return [mainEn(0, 0)]
  }

  if (piece.genre === 'cavalier') return [cercleTete(COULEUR.bleu), eclair()]
  if (piece.genre === 'cavaliere') return [cercleTete(COULEUR.rose), ...queueDeCheval()]
  if (piece.genre === 'bleue-nue') return [cercleTete(COULEUR.bleu)]
  return [cercleTete(COULEUR.rose)]
}

/**
 * La zone cliquable d'une piece, ELARGIE.
 *
 * Un bras fait 13 unites d'epaisseur : a l'ecran, quelques pixels. Viser le
 * trait lui-meme serait un exercice d'adresse. On rend donc, en transparent,
 * le meme chemin avec un trait bien plus epais.
 *
 * Cette zone reste tres en-deca des 44 px recommandes au doigt, et c'est
 * assume : elle ne PEUT pas les atteindre sans recouvrir ses voisines. C'est
 * la pile des pieces, sous le canevas, qui offre le chemin de selection fiable
 * — au doigt comme au clavier.
 */
export function cibleDeSaisie(piece: Piece): Primitive {
  if (piece.type === 'bras') {
    return {
      forme: 'chemin',
      d: traceBras(piece).d,
      remplissage: 'none',
      contour: 'transparent',
      epaisseur: 36,
      arrondi: true,
    }
  }
  return { forme: 'cercle', cx: 0, cy: 0, r: R_TETE, remplissage: 'transparent' }
}

/** Place chaque piece dans la toile. L'ORDRE DU TABLEAU EST L'ORDRE DE
 *  SUPERPOSITION : en SVG, ce qui vient apres passe par-dessus. */
export function piecesDessinees(schema: SchemaPosition): PieceDessinee[] {
  return schema.pieces.map((piece) => ({
    id: piece.id,
    transform: `translate(${n(piece.x)} ${n(piece.y)}) rotate(${n(piece.rotation)})`,
    primitives: primitivesDePiece(piece),
  }))
}

// ── Sortie chaine, pour sharp ──────────────────────────────────────────────

const attribut = (nom: string, valeur: string | number | undefined) =>
  valeur === undefined ? '' : ` ${nom}="${valeur}"`

function baliseDe(primitive: Primitive): string {
  const commun =
    attribut('fill', primitive.remplissage) +
    attribut('stroke', primitive.contour) +
    attribut('stroke-width', primitive.epaisseur)

  if (primitive.forme === 'cercle') {
    return (
      `<circle${attribut('cx', primitive.cx)}${attribut('cy', primitive.cy)}` +
      `${attribut('r', primitive.r)}${commun}/>`
    )
  }
  return (
    `<path${attribut('d', primitive.d)}${commun}` +
    `${primitive.arrondi ? ' stroke-linecap="round"' : ''}/>`
  )
}

/**
 * Les balises d'une liste de primitives.
 *
 * Exportee pour `scripts/generer-kit.ts`, qui produit les 195 pieces PNG du kit
 * hors ligne : il a sa propre mise en page (une piece par fichier, des planches
 * de contact) mais il ne doit surtout pas avoir sa propre GEOMETRIE — c'est de
 * lui que celle-ci vient, et deux copies finiraient par diverger.
 */
export function markupDePrimitives(primitives: Primitive[]): string {
  return primitives.map(baliseDe).join('')
}

/**
 * Le SVG complet d'un schema — la seule chose qui finira en PNG.
 *
 * `cotePx` fixe `width` et `height` en dur. Ce n'est pas cosmetique : sans eux,
 * librsvg dimensionne la sortie a partir de sa densite par defaut et non du
 * `viewBox`, et le PNG sort a une taille qu'on n'a pas choisie.
 *
 * Ce que cette fonction IGNORE volontairement : `schema.calque`, le decalque de
 * l'ancienne vignette. Il aide a dessiner, il n'appartient pas au dessin. Le
 * fait qu'il n'y ait meme pas de branche pour l'inclure est ce qui garantit
 * qu'il ne sera jamais cuit dans l'image exportee.
 */
export function svgDeSchema(schema: SchemaPosition, { cotePx }: { cotePx: number }): string {
  const t = schema.taille
  const coin = -t / 2

  const corps = piecesDessinees(schema)
    .map((piece) => `<g transform="${piece.transform}">${markupDePrimitives(piece.primitives)}</g>`)
    .join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cotePx}" height="${cotePx}" ` +
    `viewBox="${n(coin)} ${n(coin)} ${n(t)} ${n(t)}">` +
    `<rect x="${n(coin)}" y="${n(coin)}" width="${n(t)}" height="${n(t)}" fill="${COULEUR.vert}"/>` +
    corps +
    `</svg>`
  )
}
