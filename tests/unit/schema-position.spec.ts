import { describe, expect, it } from 'vitest'

import {
  aimanter,
  ajouter,
  ajusterBras,
  angleDEpaule,
  brasDeLaTete,
  directionDuRegard,
  brasPour,
  scenePardefaut,
  teteDuBras,
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
  type PieceTete,
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
  aplatissement: 1,
  tete: null,
  cote: null,
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

  it('donne un repli « rond » aux bras enregistres avant ce reglage', () => {
    // LA GARANTIE DE COMPATIBILITE. Le repli est arrive apres les premieres
    // compositions : un bras qui n'en porte pas doit revenir exactement comme
    // il a ete dessine, c'est-a-dire en arc de cercle. C'est ce qui permet
    // d'avoir ajoute le reglage sans changer la version du format.
    const ancien = {
      version: 1,
      taille: 640,
      calque: null,
      pieces: [{ id: 'b', type: 'bras', longueur: 200, courbure: 0.5, couleur: 'noir', x: 0, y: 0, rotation: 0 }],
    }

    const lu = schemaSur(ancien)
    expect(lu).not.toBeNull()
    expect(lu!.pieces[0]).toMatchObject({ aplatissement: 1 })
  })

  it('borne un repli aberrant au lieu de perdre le schema', () => {
    const avec = (aplatissement: unknown) =>
      schemaSur({
        version: 1,
        taille: 640,
        calque: null,
        pieces: [{ ...bras('b'), aplatissement }],
      })

    expect(avec(99)!.pieces[0]).toMatchObject({ aplatissement: 2 })
    expect(avec(-3)!.pieces[0]).toMatchObject({ aplatissement: 0.2 })
    expect(avec('rond')!.pieces[0]).toMatchObject({ aplatissement: 1 })
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
    expect(ajusterBras(base, 'b', { aplatissement: 9 }).pieces[1]).toMatchObject({ aplatissement: 2 })
    expect(ajusterBras(base, 'b', { aplatissement: 0 }).pieces[1]).toMatchObject({ aplatissement: 0.2 })
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

describe('le rattachement des bras', () => {
  const teteDe = (genre: 'cavalier' | 'cavaliere', rotation: number): PieceTete => ({
    id: 't',
    type: 'tete',
    genre,
    x: 0,
    y: 0,
    rotation,
  })

  it('fait regarder les deux danseurs en sens OPPOSES a angle egal', () => {
    // L'eclair du cavalier est son nez, la queue de cheval de la cavaliere est
    // derriere sa tete : le meme angle de piece ne veut pas dire le meme regard.
    // C'est ce qui donnait un cavalier tournant le dos a sa partenaire.
    expect(directionDuRegard(teteDe('cavalier', 0))).toBe(0)
    expect(directionDuRegard(teteDe('cavaliere', 0))).toBe(180)
  })

  it('pose les epaules a 90 degres de part et d autre du regard', () => {
    expect(angleDEpaule(teteDe('cavalier', 0), 'gauche')).toBe(270)
    expect(angleDEpaule(teteDe('cavalier', 0), 'droite')).toBe(90)
    // La cavaliere regarde a l'oppose : ses epaules sont donc inversees, ce qui
    // est exactement ce qu'on veut de deux personnes face a face.
    expect(angleDEpaule(teteDe('cavaliere', 0), 'gauche')).toBe(90)
    expect(angleDEpaule(teteDe('cavaliere', 0), 'droite')).toBe(270)
    // Et l'angle reste dans [0, 360[, meme quand la somme deborde.
    expect(angleDEpaule(teteDe('cavalier', 300), 'droite')).toBe(30)
  })

  it('pose un couple complet, bras sous les tetes', () => {
    let n = 0
    const schema = scenePardefaut(640, () => `p${n++}`)

    expect(schema.pieces).toHaveLength(6)
    // Les quatre premieres sont des bras : les tetes doivent passer par-dessus.
    expect(schema.pieces.slice(0, 4).every((p) => p.type === 'bras')).toBe(true)
    expect(schema.pieces.slice(4).every((p) => p.type === 'tete')).toBe(true)

    const tetes = schema.pieces.filter((p) => p.type === 'tete')
    for (const t of tetes) expect(brasDeLaTete(schema, t.id)).toHaveLength(2)
  })

  it('emboite le bras sur le centre de sa tete', () => {
    const t = { id: 't', type: 'tete', genre: 'cavaliere', x: 40, y: -20, rotation: 60 } as const
    const b = brasPour(t, 'droite', 'b')

    // Meme centre : c'est ce qui fait que le bras s'emboite sans reglage.
    expect(b).toMatchObject({ x: 40, y: -20, tete: 't', cote: 'droite' })
    expect(b.rotation).toBe(angleDEpaule(t, 'droite'))
  })

  it('emporte les bras quand la tete pivote ou se deplace', () => {
    let n = 0
    const schema = scenePardefaut(640, () => `p${n++}`)
    const t = schema.pieces.find((p) => p.type === 'tete')!
    const avant = brasDeLaTete(schema, t.id).map((b) => b.rotation)

    const pivote = tourner(schema, t.id, 30)
    const apres = brasDeLaTete(pivote, t.id).map((b) => b.rotation)
    // L'ECART est reporte, pas une valeur imposee : un reglage manuel survit.
    expect(apres).toEqual(avant.map((r) => (r + 30) % 360))

    const bouge = deplacer(pivote, t.id, 25, -10)
    const teteBougee = bouge.pieces.find((p) => p.id === t.id)!
    for (const b of brasDeLaTete(bouge, t.id)) {
      expect(b.x).toBe(teteBougee.x)
      expect(b.y).toBe(teteBougee.y)
    }
  })

  it('ne touche pas aux bras des AUTRES tetes', () => {
    let n = 0
    const schema = scenePardefaut(640, () => `p${n++}`)
    const [premiere, seconde] = schema.pieces.filter((p) => p.type === 'tete')
    const intacts = brasDeLaTete(schema, seconde.id)

    const apres = tourner(schema, premiere.id, 90)
    expect(brasDeLaTete(apres, seconde.id)).toEqual(intacts)
  })

  it('retire les bras avec leur tete', () => {
    let n = 0
    const schema = scenePardefaut(640, () => `p${n++}`)
    const t = schema.pieces.find((p) => p.type === 'tete')!

    const apres = retirer(schema, t.id)
    expect(apres.pieces).toHaveLength(3)
    expect(brasDeLaTete(apres, t.id)).toHaveLength(0)
  })

  it('relit un bras d avant le rattachement comme un bras LIBRE', () => {
    // Les deux seuls schemas deja enregistres en sont faits : ils doivent se
    // rouvrir exactement comme ils ont ete dessines, gris compris.
    const ancien = {
      version: 1,
      taille: 640,
      calque: null,
      pieces: [
        { id: 'b', type: 'bras', longueur: 200, courbure: 0.5, couleur: 'gris', x: 10, y: 20, rotation: 40 },
      ],
    }

    const lu = schemaSur(ancien)!
    expect(lu.pieces[0]).toMatchObject({ tete: null, cote: null, couleur: 'gris' })
    expect(teteDuBras(lu, lu.pieces[0] as never)).toBeNull()
  })

  it('refuse une epaule sans tete, qui promettrait un proprietaire inexistant', () => {
    const lu = schemaSur({
      version: 1,
      taille: 640,
      calque: null,
      pieces: [{ ...bras('b'), cote: 'droite', tete: null }],
    })!
    expect(lu.pieces[0]).toMatchObject({ tete: null, cote: null })
  })
})
