import { describe, expect, it } from 'vitest'

import {
  cibleDeSaisie,
  COULEUR,
  piecesDessinees,
  primitivesDePiece,
  R_BRAS_KIT,
  R_TETE,
  svgDeSchema,
  traceBras,
} from '@/dessin-position'
import { ajouter, schemaVide, type Piece, type PieceBras } from '@/schema-position'

/**
 * La geometrie du dessin.
 *
 * LE TEST QUI COMPTE LE PLUS EST L'ANCRAGE KIT. Le nouveau modele de bras
 * remplace les trois longueurs figees de `scripts/generer-kit.mjs` par deux
 * nombres continus. Rien ne garantirait, sans ces assertions, que le nouveau
 * modele CONTIENT l'ancien — or c'est la seule chose qui autorise a regenerer
 * les 195 pieces du kit sans les changer, et a considerer que quinze ans de
 * vignettes restent reproductibles.
 *
 * Les comparaisons se font sur les NOMBRES, pas sur les chaines : deux chemins
 * geometriquement identiques peuvent s'ecrire differemment (`150` contre
 * `150.00`), et une egalite de chaine se casserait sur un arrondi sans que le
 * dessin bouge d'un pixel.
 */

const bras = (champs: Partial<PieceBras> = {}): PieceBras => ({
  id: 'b',
  type: 'bras',
  longueur: 200,
  courbure: 0.5,
  couleur: 'noir',
  x: 0,
  y: 0,
  rotation: 0,
  ...champs,
})

/** Le point d'arrivee du bras tel que le calculait `scripts/generer-kit.mjs`. */
function finDuKit(angleDeg: number, sens: 'horaire' | 'antihoraire') {
  const signe = sens === 'horaire' ? 1 : -1
  const t = (angleDeg * Math.PI) / 180
  return {
    x: R_TETE + R_BRAS_KIT * Math.sin(t),
    y: signe * R_BRAS_KIT * (1 - Math.cos(t)),
  }
}

describe('traceBras — ancrage sur le kit historique', () => {
  const COURBURE_KIT = R_TETE / R_BRAS_KIT

  it.each([
    ['court', 50],
    ['moyen', 95],
    ['long', 145],
  ])('reproduit le bras %s du kit, dans les deux sens', (_nom, angleDeg) => {
    const longueur = R_BRAS_KIT * ((angleDeg * Math.PI) / 180)

    for (const sens of ['horaire', 'antihoraire'] as const) {
      const signe = sens === 'horaire' ? 1 : -1
      const { fin } = traceBras({ longueur, courbure: signe * COURBURE_KIT })
      const attendu = finDuKit(angleDeg, sens)

      expect(fin.x).toBeCloseTo(attendu.x, 6)
      expect(fin.y).toBeCloseTo(attendu.y, 6)
    }
  })

  it('garde le rayon du kit quand la courbure vaut R_TETE / R_BRAS_KIT', () => {
    const { d } = traceBras({ longueur: 200, courbure: COURBURE_KIT })
    expect(d).toContain('A 150 150 0')
  })
})

describe('traceBras — le nouveau modele', () => {
  it('trace un segment droit, et surtout pas un arc, quand la courbure est nulle', () => {
    // Un arc de rayon infini produit un `d` invalide que NI le navigateur NI
    // sharp ne signalent : le bras disparaitrait en silence.
    const { d, fin } = traceBras({ longueur: 150, courbure: 0 })
    expect(d).not.toContain('A ')
    expect(d.endsWith('L 250,0')).toBe(true)
    expect(fin).toEqual({ x: 250, y: 0 })
  })

  it('choisit le sens de balayage selon le signe de la courbure', () => {
    expect(traceBras({ longueur: 200, courbure: 0.5 }).fin.y).toBeGreaterThan(0)
    expect(traceBras({ longueur: 200, courbure: -0.5 }).fin.y).toBeLessThan(0)
    expect(traceBras({ longueur: 200, courbure: 0.5 }).d).toMatch(/0 [01] 1 /)
    expect(traceBras({ longueur: 200, courbure: -0.5 }).d).toMatch(/0 [01] 0 /)
  })

  it('leve le drapeau de grand arc au-dela d un demi-tour', () => {
    // longueur / rayon > pi : rayon 100 (courbure 1), longueur 400 -> 4 rad.
    expect(traceBras({ longueur: 400, courbure: 1 }).d).toMatch(/A 100 100 0 1 1/)
    expect(traceBras({ longueur: 100, courbure: 1 }).d).toMatch(/A 100 100 0 0 1/)
  })

  it('plafonne l enroulement pour que le bras ne se referme pas sur lui-meme', () => {
    // 330 degres = 5,7596 rad ; a rayon 100, un bras de 2000 depasserait deux tours.
    const serre = traceBras({ longueur: 2000, courbure: 1 })
    const juste = traceBras({ longueur: 100 * ((330 * Math.PI) / 180), courbure: 1 })
    expect(serre.fin.x).toBeCloseTo(juste.fin.x, 6)
    expect(serre.fin.y).toBeCloseTo(juste.fin.y, 6)
  })

  it('part de sous la tete pour que le bras semble sortir de derriere le corps', () => {
    expect(traceBras({ longueur: 200, courbure: 0.5 }).d.startsWith('M 75,0 L 100,0')).toBe(true)
  })
})

describe('primitivesDePiece', () => {
  it('pose la main exactement au bout du bras', () => {
    // L'invariant qui casse en silence des qu'on touche a la geometrie : le
    // trait et la main sont calcules separement, rien ne les relie sinon ceci.
    const piece = bras({ longueur: 260, courbure: -0.4 })
    const { fin } = traceBras(piece)
    const [, main] = primitivesDePiece(piece)

    expect(main.forme).toBe('chemin')
    // L'octogone est centre sur `fin` : son premier sommet en est distant du
    // rayon de la main, et sa moyenne retombe sur le centre.
    const sommets = (main as { d: string }).d
      .match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g)!
      .map((paire) => paire.split(',').map(Number))
    const moyenneX = sommets.reduce((total, [x]) => total + x, 0) / sommets.length
    const moyenneY = sommets.reduce((total, [, y]) => total + y, 0) / sommets.length

    expect(moyenneX).toBeCloseTo(fin.x, 3)
    expect(moyenneY).toBeCloseTo(fin.y, 3)
  })

  it('donne au cavalier son eclair et a la cavaliere sa queue de cheval', () => {
    const cavalier = primitivesDePiece({ id: 'a', type: 'tete', genre: 'cavalier', x: 0, y: 0, rotation: 0 })
    expect(cavalier).toHaveLength(2)
    expect(cavalier[0]).toMatchObject({ forme: 'cercle', remplissage: COULEUR.bleu })

    const cavaliere = primitivesDePiece({ id: 'b', type: 'tete', genre: 'cavaliere', x: 0, y: 0, rotation: 0 })
    expect(cavaliere).toHaveLength(3)
    expect(cavaliere[0]).toMatchObject({ forme: 'cercle', remplissage: COULEUR.rose })
  })

  it('distingue le bras noir du bras gris', () => {
    expect(primitivesDePiece(bras({ couleur: 'noir' }))[0]).toMatchObject({ contour: COULEUR.noir })
    expect(primitivesDePiece(bras({ couleur: 'gris' }))[0]).toMatchObject({ contour: COULEUR.gris })
  })
})

describe('cibleDeSaisie', () => {
  it('elargit largement le trait d un bras, sans le rendre visible', () => {
    const cible = cibleDeSaisie(bras())
    expect(cible).toMatchObject({ forme: 'chemin', remplissage: 'none', contour: 'transparent' })
    expect((cible as { epaisseur: number }).epaisseur).toBeGreaterThan(13)
  })

  it('couvre toute la tete', () => {
    const cible = cibleDeSaisie({ id: 'a', type: 'tete', genre: 'cavalier', x: 0, y: 0, rotation: 0 })
    expect(cible).toMatchObject({ forme: 'cercle', r: R_TETE, remplissage: 'transparent' })
  })
})

describe('svgDeSchema', () => {
  const piece = (id: string, x: number): Piece => ({
    id,
    type: 'tete',
    genre: 'cavalier',
    x,
    y: 0,
    rotation: 30,
  })
  const schema = ajouter(ajouter(schemaVide(640), piece('a', -150)), piece('b', 150))

  it('centre le viewBox et pose le fond vert', () => {
    const svg = svgDeSchema(schema, { cotePx: 800 })
    expect(svg).toContain('viewBox="-320 -320 640 640"')
    expect(svg).toContain(`fill="${COULEUR.vert}"`)
  })

  it('fixe width et height en dur, sans quoi librsvg choisit la taille a notre place', () => {
    const svg = svgDeSchema(schema, { cotePx: 800 })
    expect(svg).toContain('width="800"')
    expect(svg).toContain('height="800"')
  })

  it('emet les pieces dans l ordre du tableau, qui EST l ordre de superposition', () => {
    const svg = svgDeSchema(schema, { cotePx: 800 })
    expect(svg.indexOf('translate(-150 0)')).toBeLessThan(svg.indexOf('translate(150 0)'))
    expect(svg.match(/<g /g)).toHaveLength(2)
  })

  it('n emet ni calque ni zone de saisie, meme quand le schema en porte un', () => {
    // Structurel : `svgDeSchema` n'a pas de branche pour les inclure. Ce test
    // verrouille la propriete, pour qu'un ajout distrait la casse bruyamment.
    const avecCalque = { ...schema, calque: { src: '/api/media/file/vieille.jpg' } }
    const svg = svgDeSchema(avecCalque, { cotePx: 800 })

    expect(svg).not.toContain('<image')
    expect(svg).not.toContain('vieille.jpg')
    expect(svg).not.toContain('pointer-events')
    expect(svg).not.toContain('transparent')
  })
})

describe('piecesDessinees', () => {
  it('compose translation puis rotation, dans cet ordre', () => {
    // L'inverse ferait tourner la piece autour du centre de la TOILE au lieu
    // de son propre centre de tete.
    const schema = ajouter(schemaVide(), {
      id: 'a',
      type: 'tete',
      genre: 'cavalier',
      x: 40,
      y: -20,
      rotation: 90,
    })
    expect(piecesDessinees(schema)[0].transform).toBe('translate(40 -20) rotate(90)')
  })
})
