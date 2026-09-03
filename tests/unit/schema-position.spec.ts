import { describe, expect, it } from 'vitest'

import {
  aimanter,
  ajouter,
  ajusterBras,
  deplacer,
  dupliquer,
  PIECES_MAX,
  placer,
  pointVersToile,
  reordonner,
  retirer,
  schemaSur,
  schemaVide,
  TAILLE_PAR_DEFAUT,
  tourner,
  type Piece,
  type SchemaPosition,
} from '@/schema-position'

/**
 * Les regles du schema, sans DOM ni Payload.
 *
 * L'essentiel du filet est ici, et non dans le test du composant : c'est
 * justement parce que l'atelier ne fait aucune arithmetique lui-meme que les
 * regles peuvent etre eprouvees a ce niveau, ou elles sont rapides et lisibles.
 *
 * `schemaSur` occupe la plus grosse part parce qu'il garde la frontiere la plus
 * dangereuse du chantier : un schema mal relu, c'est un atelier qui s'ouvre
 * vierge sur un travail existant, et un enregistrement qui l'ecrase.
 */

const tete = (id: string, x = 0, y = 0): Piece => ({ id, type: 'tete', genre: 'cavalier', x, y, rotation: 0 })
const bras = (id: string, x = 0, y = 0): Piece => ({
  id,
  type: 'bras',
  longueur: 200,
  courbure: 0.5,
  couleur: 'noir',
  x,
  y,
  rotation: 0,
})

describe('schemaSur — lecture defensive', () => {
  it('rejette ce qui ne peut pas etre un schema, sans jamais lever', () => {
    for (const valeur of [null, undefined, 0, '', 'pas du json', [], {}, { version: 99 }]) {
      expect(() => schemaSur(valeur)).not.toThrow()
      expect(schemaSur(valeur)).toBeNull()
    }
  })

  it('accepte une chaine JSON, parce que le pilote SQLite peut en rendre une', () => {
    const schema = ajouter(schemaVide(), tete('a'))
    expect(schemaSur(JSON.stringify(schema))).toEqual(schema)
  })

  it('survit a l aller-retour JSON, qui est exactement ce que fait la base', () => {
    const schema = ajouter(ajouter(schemaVide(), tete('a', 10, -20)), bras('b', 30, 40))
    expect(schemaSur(JSON.parse(JSON.stringify(schema)))).toEqual(schema)
  })

  it('echoue en entier sur une piece structurellement fausse', () => {
    // Mieux vaut « illisible » qu'un schema ampute : la page peut alors refuser
    // d'ouvrir l'atelier au lieu de laisser l'enregistrement suivant tout ecraser.
    const avec = (piece: unknown) => schemaSur({ version: 1, taille: 640, pieces: [piece], calque: null })

    expect(avec({ ...tete('a'), type: 'inconnu' })).toBeNull()
    expect(avec({ ...tete('a'), genre: 'martien' })).toBeNull()
    expect(avec({ ...bras('b'), couleur: 'rouge' })).toBeNull()
    expect(avec({ ...tete('a'), id: '' })).toBeNull()
    expect(avec({ ...tete('a'), id: undefined })).toBeNull()
    expect(avec('une piece')).toBeNull()
  })

  it('rejette un schema qui depasse le plafond de pieces', () => {
    const pieces = Array.from({ length: PIECES_MAX + 1 }, (_, i) => tete(`t${i}`))
    expect(schemaSur({ version: 1, taille: 640, pieces, calque: null })).toBeNull()
  })

  it('ramene les nombres dans les bornes au lieu de tout perdre', () => {
    // Une piece tiree hors du cadre n'est pas une corruption.
    const lu = schemaSur({
      version: 1,
      taille: 999999,
      calque: null,
      pieces: [{ ...tete('a'), x: Number.NaN, y: Infinity, rotation: 390 }],
    })

    expect(lu).not.toBeNull()
    expect(lu!.taille).toBeLessThanOrEqual(1200)
    expect(lu!.pieces[0].x).toBe(0)
    expect(Number.isFinite(lu!.pieces[0].y)).toBe(true)
    expect(lu!.pieces[0].rotation).toBe(30)
  })

  it('ignore un calque malforme sans faire echouer la lecture', () => {
    const lu = schemaSur({ version: 1, taille: 640, pieces: [], calque: { src: 42 } })
    expect(lu?.calque).toBeNull()
  })

  it('conserve un calque valide', () => {
    const lu = schemaSur({ version: 1, taille: 640, pieces: [], calque: { src: '/api/media/file/x.jpg' } })
    expect(lu?.calque).toEqual({ src: '/api/media/file/x.jpg' })
  })
})

describe('mutations', () => {
  const base: SchemaPosition = ajouter(ajouter(schemaVide(), tete('a')), bras('b', 300, 0))

  it('cree un schema vide a la taille par defaut', () => {
    expect(schemaVide()).toEqual({ version: 1, taille: TAILLE_PAR_DEFAUT, pieces: [], calque: null })
  })

  it('refuse d ajouter au-dela du plafond', () => {
    let schema = schemaVide()
    for (let i = 0; i < PIECES_MAX + 5; i++) schema = ajouter(schema, tete(`t${i}`))
    expect(schema.pieces).toHaveLength(PIECES_MAX)
  })

  it('retire une piece et laisse les autres', () => {
    expect(retirer(base, 'a').pieces.map((p) => p.id)).toEqual(['b'])
  })

  it('tourne en restant dans [0, 360[', () => {
    expect(tourner(tourner(base, 'a', 30), 'a', 30).pieces[0].rotation).toBe(60)
    expect(tourner(base, 'a', -30).pieces[0].rotation).toBe(330)

    let schema = base
    for (let i = 0; i < 12; i++) schema = tourner(schema, 'a', 30)
    expect(schema.pieces[0].rotation).toBe(0)
  })

  it('deplace relativement et place absolument', () => {
    expect(deplacer(base, 'a', 10, -5).pieces[0]).toMatchObject({ x: 10, y: -5 })
    expect(placer(base, 'b', 12, 34).pieces[1]).toMatchObject({ x: 12, y: 34 })
  })

  it('reordonne sans jamais perdre de piece, y compris aux bornes', () => {
    expect(reordonner(base, 'a', 1).pieces.map((p) => p.id)).toEqual(['b', 'a'])
    // 'a' est deja tout en bas : la demande est sans effet, pas destructrice.
    expect(reordonner(base, 'a', -1).pieces.map((p) => p.id)).toEqual(['a', 'b'])
    expect(reordonner(base, 'b', 1).pieces).toHaveLength(2)
    expect(reordonner(base, 'inconnu', 1)).toBe(base)
  })

  it('duplique avec un identifiant neuf et un decalage visible', () => {
    const apres = dupliquer(base, 'a', 'copie')
    expect(apres.pieces).toHaveLength(3)
    expect(apres.pieces[2].id).toBe('copie')
    // Sans decalage, la copie se cacherait sous l'originale et le bouton
    // semblerait n'avoir rien fait.
    expect(apres.pieces[2].x).not.toBe(base.pieces[0].x)
  })

  it('ajuste un bras en bornant, et ne touche pas aux tetes', () => {
    expect(ajusterBras(base, 'b', { longueur: 99999 }).pieces[1]).toMatchObject({ longueur: 420 })
    expect(ajusterBras(base, 'b', { courbure: -5 }).pieces[1]).toMatchObject({ courbure: -1 })
    expect(ajusterBras(base, 'b', { couleur: 'gris' }).pieces[1]).toMatchObject({ couleur: 'gris' })
    expect(ajusterBras(base, 'a', { couleur: 'gris' }).pieces[0]).toEqual(base.pieces[0])
  })
})

describe('aimanter', () => {
  it('colle un bras sur la tete proche', () => {
    const schema = ajouter(ajouter(schemaVide(), tete('t', 100, 100)), bras('b', 110, 115))
    expect(aimanter(schema, 'b').pieces[1]).toMatchObject({ x: 100, y: 100 })
  })

  it('laisse le bras tranquille au-dela du seuil', () => {
    const schema = ajouter(ajouter(schemaVide(), tete('t', 0, 0)), bras('b', 300, 0))
    expect(aimanter(schema, 'b').pieces[1]).toMatchObject({ x: 300, y: 0 })
  })

  it('ne deplace jamais une tete', () => {
    const schema = ajouter(ajouter(schemaVide(), tete('t1', 0, 0)), tete('t2', 5, 5))
    expect(aimanter(schema, 't2')).toBe(schema)
  })
})

describe('pointVersToile', () => {
  const rect = { left: 100, top: 50, width: 400, height: 400 }

  it('met l origine au centre du canevas', () => {
    expect(pointVersToile(rect, 300, 250, 640)).toEqual({ x: 0, y: 0 })
  })

  it('applique le facteur d echelle entre pixels et unites de dessin', () => {
    // Coin haut-gauche du canevas = coin haut-gauche de la toile.
    expect(pointVersToile(rect, 100, 50, 640)).toEqual({ x: -320, y: -320 })
    expect(pointVersToile(rect, 500, 450, 640)).toEqual({ x: 320, y: 320 })
  })

  it('rend le centre plutot qu un infini quand l element n est pas mesure', () => {
    // Le cas de jsdom, ou `getBoundingClientRect()` renvoie des zeros.
    expect(pointVersToile({ left: 0, top: 0, width: 0, height: 0 }, 10, 10, 640)).toEqual({ x: 0, y: 0 })
  })
})
