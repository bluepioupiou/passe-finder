import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { DANSE_V1 } from '../src/collections/Danse'
import { DOSSIER_IMAGES, extraireTable, lireDump } from './dump-legacy'

/**
 * Migration one-off du catalogue historique — TRANCHE « POSITIONS » (Epic 6).
 *
 * Principes (AD-14 / FR-31, FR-32, FR-33) :
 *  - ecriture EXCLUSIVEMENT via l'API Local de Payload (AD-1 : seul scribe) ;
 *  - ordre de dependance respecte : Danse -> Positions ;
 *  - REJOUABLE : `legacyId` empeche tout doublon ;
 *  - VERIFIABLE : comptage source vs cible affiche en fin d'execution.
 *
 * Perimetre decide avec Alain (2026-08-26) : seule la danse rock est migree
 * (30 positions sur 32).
 *
 * Lancement : npm run migrate:positions
 */

const DANSE_ROCK_LEGACY_ID = '1'

type PositionLegacy = {
  id: string
  name: string
  description: string
  image: string
  danse_id: string
}

const COLONNES = ['id', 'name', 'description', 'image', 'dateCreate', 'dateMaj', 'danse_id']

async function main() {
  const payload = await getPayload({ config })

  console.log('--- Migration des positions historiques ---')

  const sql = lireDump()
  const toutes = extraireTable<PositionLegacy>(sql, 'position', COLONNES)
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
      showHiddenFields: true,
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
