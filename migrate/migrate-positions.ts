import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { DANSE_V1 } from '../src/collections/Danse'

/**
 * Migration one-off du catalogue historique — TRANCHE « POSITIONS » (Epic 6).
 *
 * Source : `passe-finder-saveDB.gz` (archive tar.gz contenant un dump MySQL du
 * projet Yii, encode en UTF-8).
 *
 * Principes (AD-14 / FR-31, FR-32, FR-33) :
 *  - ecriture EXCLUSIVEMENT via l'API Local de Payload (AD-1 : seul scribe) ;
 *  - ordre de dependance respecte : Danse -> Positions ;
 *  - REJOUABLE : `legacyId` empeche tout doublon ;
 *  - VERIFIABLE : comptage source vs cible affiche en fin d'execution.
 *
 * Perimetre decide avec Alain (2026-08-26) : seule la danse rock est migree
 * (30 positions sur 32). Les passes et enchainements viendront plus tard.
 *
 * Lancement : npm run migrate:positions
 */

const DANSE_ROCK_LEGACY_ID = '1'
const RACINE = path.resolve(process.cwd())
const DUMP = path.join(RACINE, 'passe-finder-saveDB.gz')
const DOSSIER_IMAGES = path.join(RACINE, 'images', 'positions')

type PositionLegacy = {
  id: string
  name: string
  description: string
  image: string
  danse_id: string
}

/** Extrait le dump SQL de l'archive tar.gz (un seul fichier a l'interieur). */
function lireDump(): string {
  const tar = zlib.gunzipSync(fs.readFileSync(DUMP))
  // Format tar : en-tetes de 512 octets ; la taille du fichier est en octal a
  // l'offset 124. On lit le premier (et unique) membre de l'archive.
  const taille = parseInt(tar.toString('ascii', 124, 136).replace(/[^0-7]/g, ''), 8)
  return tar.toString('utf-8', 512, 512 + taille)
}

/** Decoupe les tuples d'un INSERT MySQL en tenant compte des quotes echappees. */
function parserTuples(valeurs: string): string[][] {
  const tuples: string[][] = []
  let courant: string[] = []
  let tampon = ''
  let dansQuote = false
  let echappe = false
  let profondeur = 0

  for (const c of valeurs) {
    if (echappe) {
      tampon += c
      echappe = false
      continue
    }
    if (c === '\\' && dansQuote) {
      tampon += c
      echappe = true
      continue
    }
    if (c === "'") {
      dansQuote = !dansQuote
      tampon += c
      continue
    }
    if (dansQuote) {
      tampon += c
      continue
    }
    if (c === '(') {
      profondeur++
      if (profondeur === 1) {
        courant = []
        tampon = ''
      }
      continue
    }
    if (c === ')') {
      profondeur--
      if (profondeur === 0) {
        courant.push(tampon.trim())
        tuples.push(courant)
        tampon = ''
      }
      continue
    }
    if (c === ',' && profondeur === 1) {
      courant.push(tampon.trim())
      tampon = ''
      continue
    }
    if (profondeur === 1) tampon += c
  }
  return tuples
}

/** Retire les quotes SQL et interprete les sequences echappees. */
function nettoyer(valeur: string): string {
  if (!valeur.startsWith("'") || !valeur.endsWith("'")) return valeur
  return valeur
    .slice(1, -1)
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
}

function extrairePositions(sql: string): PositionLegacy[] {
  const marqueur = 'INSERT INTO `position` VALUES '
  const debut = sql.indexOf(marqueur)
  if (debut === -1) throw new Error('Table `position` introuvable dans le dump.')
  const fin = sql.indexOf(';\n', debut)
  const valeurs = sql.slice(debut + marqueur.length, fin)

  const colonnes = ['id', 'name', 'description', 'image', 'dateCreate', 'dateMaj', 'danse_id']
  return parserTuples(valeurs).map((tuple) => {
    const ligne: Record<string, string> = {}
    colonnes.forEach((col, i) => {
      ligne[col] = nettoyer(tuple[i] ?? '')
    })
    return ligne as unknown as PositionLegacy
  })
}

async function main() {
  const payload = await getPayload({ config })

  console.log('--- Migration des positions historiques ---')

  const sql = lireDump()
  const toutes = extrairePositions(sql)
  const aMigrer = toutes.filter((p) => p.danse_id === DANSE_ROCK_LEGACY_ID)

  console.log('Positions dans le dump      : ' + toutes.length)
  console.log('Positions rock a migrer     : ' + aMigrer.length)
  console.log('Ecartees (autres danses)    : ' + (toutes.length - aMigrer.length))

  // La danse de reference est semee au demarrage (Story 2.1).
  const danses = await payload.find({
    collection: 'danses',
    where: { nom: { equals: DANSE_V1 } },
    limit: 1,
    depth: 0,
  })
  const danse = danses.docs[0]
  if (!danse) {
    throw new Error(
      'Danse « ' + DANSE_V1 + ' » absente : demarrer l\'application une fois avant la migration.',
    )
  }

  let creees = 0
  let ignorees = 0
  let sansImage = 0
  const avertissements: string[] = []

  for (const legacy of aMigrer) {
    const legacyId = Number(legacy.id)

    // Rejouabilite (FR-32) : deja migree ? on passe.
    const existante = await payload.find({
      collection: 'positions',
      where: { legacyId: { equals: legacyId } },
      limit: 1,
      depth: 0,
    })
    if (existante.totalDocs > 0) {
      ignorees++
      continue
    }

    // Image : FR-33, une image absente ou introuvable n'empeche jamais la creation.
    let imageId: number | undefined
    const nomFichier = legacy.image.trim()
    if (nomFichier) {
      const chemin = path.join(DOSSIER_IMAGES, nomFichier)
      if (fs.existsSync(chemin)) {
        const media = await payload.create({
          collection: 'media',
          data: { alt: legacy.name },
          filePath: chemin,
        })
        imageId = media.id as number
      } else {
        sansImage++
        avertissements.push(
          'Position ' + legacyId + ' « ' + legacy.name + ' » : fichier ' + nomFichier + ' introuvable -> placeholder',
        )
      }
    } else {
      sansImage++
      avertissements.push(
        'Position ' + legacyId + ' « ' + legacy.name + ' » : aucune image en base -> placeholder',
      )
    }

    await payload.create({
      collection: 'positions',
      data: {
        nom: legacy.name,
        description: legacy.description,
        danse: danse.id,
        legacyId,
        ...(imageId ? { image: imageId } : {}),
      },
    })
    creees++
  }

  const total = await payload.count({ collection: 'positions' })

  console.log('')
  console.log('--- Rapport ---')
  console.log('Creees cette fois           : ' + creees)
  console.log('Deja presentes (ignorees)   : ' + ignorees)
  console.log('Sans image -> placeholder   : ' + sansImage)
  console.log('Positions en base au total  : ' + total.totalDocs)
  if (avertissements.length) {
    console.log('')
    console.log('Avertissements :')
    avertissements.forEach((a) => console.log('  - ' + a))
  }

  // Verification source vs cible (FR-32).
  const conforme = total.totalDocs === aMigrer.length
  console.log('')
  console.log(
    conforme
      ? 'OK : le comptage cible correspond a la source.'
      : 'ECART : attendu ' + aMigrer.length + ', obtenu ' + total.totalDocs,
  )

  process.exit(conforme ? 0 : 1)
}

main().catch((e) => {
  console.error('Echec de la migration :', e)
  process.exit(1)
})
