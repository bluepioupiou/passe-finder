import fs from 'node:fs'
import path from 'node:path'

import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { User } from '@/payload-types'
import { ajouter, schemaSur, schemaVide, type Piece } from '@/schema-position'

/**
 * L'atelier de schema de position : la chaine d'ecriture, sur un vrai Payload.
 *
 * CE FICHIER EXISTE POUR UNE INCONNUE PRECISE. Partout ailleurs dans ce depot,
 * un fichier arrive dans la collection `media` par un CHEMIN DISQUE :
 * `migrate/migrate-positions.ts` passe `filePath` parce qu'il lit un dossier.
 * L'atelier, lui, fabrique son PNG en memoire dans une action serveur : il n'a
 * aucun chemin a donner. Il doit donc passer `file: { data, mimetype, name,
 * size }`, une forme que rien ici n'avait encore exercee.
 *
 * Une doublure ne prouverait rien : ce qu'on veut savoir, c'est ce que Payload
 * 3.88 fait REELLEMENT de ce buffer — s'il l'ecrit sur le disque, s'il en
 * deduit les dimensions, s'il accepte le type sans `mimeTypes` declare sur la
 * collection. D'ou un vrai Payload, une vraie base, un vrai fichier.
 *
 * Si cette forme resistait, le repli est connu et sans mystere : ecrire le PNG
 * dans `os.tmpdir()` puis passer `filePath`, le chemin deja eprouve par la
 * migration.
 */

/** Un SVG minimal aux couleurs du domaine : c'est la forme que produira `svgDeSchema`. */
function svgDEssai(cote: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" ` +
    `viewBox="${-cote / 2} ${-cote / 2} ${cote} ${cote}">` +
    `<rect x="${-cote / 2}" y="${-cote / 2}" width="${cote}" height="${cote}" fill="#CCFFCC"/>` +
    `<circle cx="0" cy="0" r="100" fill="#B9E0E5" stroke="#000000" stroke-width="4"/>` +
    `</svg>`
  )
}

describe('Atelier de schema de position — ecriture du media', () => {
  let payload: Payload
  let admin: User
  const mediasCrees: number[] = []
  const fichiersEcrits: string[] = []

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    admin = await payload.create({
      collection: 'users',
      data: {
        email: 'test-atelier-admin@example.test',
        password: 'test-atelier-admin',
        admin: true,
      },
    })
  })

  afterAll(async () => {
    for (const id of mediasCrees) {
      // `payload.delete` retire aussi le fichier ; le nettoyage disque qui suit
      // n'est qu'un filet pour les cas ou la suppression a echoue en cours de
      // route. Sans lui, chaque execution laisserait un PNG dans `media/`, le
      // dossier d'uploads de DEVELOPPEMENT — les tests polluraient le travail.
      await payload.delete({ collection: 'media', id }).catch(() => {})
    }
    for (const chemin of fichiersEcrits) fs.rmSync(chemin, { force: true })
    if (admin) await payload.delete({ collection: 'users', id: admin.id })
  })

  it('rasterise un SVG en PNG avec sharp', async () => {
    // Meme chaine que `scripts/generer-kit.mjs`, qui produit deja les 195
    // pieces du kit : `Buffer.from(markup)` -> `sharp` -> PNG.
    const png = await sharp(Buffer.from(svgDEssai(640), 'utf8'))
      .png({ compressionLevel: 9 })
      .toBuffer()

    const metadonnees = await sharp(png).metadata()

    expect(metadonnees.format).toBe('png')
    // Les attributs `width`/`height` explicites sur le `<svg>` sont ce qui
    // evite le piege de la densite par defaut de librsvg : sans eux, la taille
    // de sortie ne serait pas celle du viewBox.
    expect(metadonnees.width).toBe(640)
    expect(metadonnees.height).toBe(640)
  })

  it('cree un media a partir d un buffer en memoire, sans passer par un chemin disque', async () => {
    const png = await sharp(Buffer.from(svgDEssai(640), 'utf8')).png().toBuffer()

    const media = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: admin,
      data: { alt: 'Schema d essai' },
      file: {
        data: png,
        mimetype: 'image/png',
        name: `essai-atelier-${Date.now()}.png`,
        size: png.byteLength,
      },
    })
    mediasCrees.push(media.id as number)

    expect(media.mimeType).toBe('image/png')
    expect(media.filename).toMatch(/\.png$/)
    // Les dimensions ne viennent pas de nous : c'est Payload qui les a lues
    // dans le buffer. Les verifier, c'est verifier qu'il a bien recu l'image
    // et non une enveloppe vide.
    expect(media.width).toBe(640)
    expect(media.height).toBe(640)
    expect(media.filesize).toBe(png.byteLength)
    // L'URL est ce que le site servira : `imageDePosition()` la recopie telle
    // quelle dans le `src` de la vignette.
    expect(media.url).toContain('/api/media/file/')
  })

  it('ecrit reellement le fichier dans le dossier des uploads', async () => {
    const png = await sharp(Buffer.from(svgDEssai(320), 'utf8')).png().toBuffer()

    const media = await payload.create({
      collection: 'media',
      overrideAccess: false,
      user: admin,
      data: { alt: 'Schema d essai sur disque' },
      file: {
        data: png,
        mimetype: 'image/png',
        name: `essai-atelier-disque-${Date.now()}.png`,
        size: png.byteLength,
      },
    })
    mediasCrees.push(media.id as number)

    // `Media` declare `upload: true` nu : le dossier est celui par defaut de
    // Payload, `media/` a la racine du projet — celui-la meme que le Dockerfile
    // monte en volume. Le test fige cette localisation : si un jour un
    // `staticDir` explicite la deplace, c'est ici qu'on l'apprendra.
    const chemin = path.resolve(process.cwd(), 'media', media.filename as string)
    fichiersEcrits.push(chemin)

    expect(fs.existsSync(chemin)).toBe(true)
    expect(fs.statSync(chemin).size).toBe(png.byteLength)
  })
})

/**
 * Le schema en base.
 *
 * Ce qui se joue ici : le champ `schemaCompose` doit revenir INTACT et
 * SPONTANEMENT. Le choix d'`admin.hidden` plutot que `hidden: true` vise
 * exactement ca — un champ absent des reponses ferait ouvrir l'atelier vierge
 * sur une position deja composee, et le premier enregistrement ecraserait tout.
 * Le test verrouille la propriete pour qu'un futur passage a `hidden: true`
 * casse un test au lieu de casser une composition.
 */
describe('Atelier de schema de position — le schema en base', () => {
  let payload: Payload
  let admin: User
  let eleve: User
  let idDanse: number
  const positionsCreees: number[] = []

  const tete = (id: string, x: number): Piece => ({
    id,
    type: 'tete',
    genre: 'cavalier',
    x,
    y: 0,
    rotation: 30,
  })
  const bras = (id: string): Piece => ({
    id,
    type: 'bras',
    longueur: 260,
    courbure: -0.45,
    aplatissement: 0.6,
    couleur: 'gris',
    x: 12,
    y: -8,
    rotation: 120,
  })

  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    admin = await payload.create({
      collection: 'users',
      data: {
        email: 'test-schema-admin@example.test',
        password: 'test-schema-admin',
        admin: true,
      },
    })
    eleve = await payload.create({
      collection: 'users',
      data: { email: 'test-schema-eleve@example.test', password: 'test-schema-eleve' },
    })

    const danses = await payload.find({ collection: 'danses', limit: 1, depth: 0 })
    idDanse = danses.docs[0].id as number
  })

  afterAll(async () => {
    for (const id of positionsCreees) {
      await payload.delete({ collection: 'positions', id }).catch(() => {})
    }
    if (admin) await payload.delete({ collection: 'users', id: admin.id })
    if (eleve) await payload.delete({ collection: 'users', id: eleve.id })
  })

  it('rend le schema tel quel, sans avoir a demander les champs caches', async () => {
    const schema = ajouter(ajouter(schemaVide(640), tete('t1', -120)), bras('b1'))

    const creee = await payload.create({
      collection: 'positions',
      overrideAccess: false,
      user: admin,
      data: { nom: 'Position avec schema', danse: idDanse, schemaCompose: schema },
    })
    positionsCreees.push(creee.id as number)

    const relue = await payload.findByID({ collection: 'positions', id: creee.id, depth: 0 })

    // Le point critique : PAS de `showHiddenFields: true` ci-dessus.
    expect(relue.schemaCompose).toBeTruthy()
    // Et ce qui revient repasse la lecture defensive sans perte : c'est
    // l'aller-retour complet, code -> SQLite -> code.
    expect(schemaSur(relue.schemaCompose)).toEqual(schema)
  })

  it('conserve le schema quand on ne modifie que le nom', async () => {
    const schema = ajouter(schemaVide(520), tete('t1', 0))

    const creee = await payload.create({
      collection: 'positions',
      overrideAccess: false,
      user: admin,
      data: { nom: 'Position renommee', danse: idDanse, schemaCompose: schema },
    })
    positionsCreees.push(creee.id as number)

    const modifiee = await payload.update({
      collection: 'positions',
      id: creee.id,
      overrideAccess: false,
      user: admin,
      data: { nom: 'Position renommee autrement' },
    })

    expect(schemaSur(modifiee.schemaCompose)).toEqual(schema)
  })

  it('refuse a un eleve d ecrire un schema, comme le reste du catalogue', async () => {
    // L'atelier est reserve aux admins en v1 : la page filtre, l'action
    // reverifie, et c'est cette regle-ci qui tranche en dernier ressort.
    await expect(
      payload.create({
        collection: 'positions',
        overrideAccess: false,
        user: eleve,
        data: { nom: 'Schema interdit', danse: idDanse, schemaCompose: schemaVide() },
      }),
    ).rejects.toThrow()
  })
})
