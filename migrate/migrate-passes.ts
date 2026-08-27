import { getPayload } from 'payload'

import config from '../src/payload.config'
import { extraireTable, lireDump } from './dump-legacy'

/**
 * Migration one-off — TRANCHE « PASSES » (Epic 6).
 *
 * A executer APRES `migrate:positions` : les passes referencent des positions
 * deja migrees, retrouvees par leur `legacyId` (ordre de dependance, AD-14).
 *
 * Principes (FR-31, FR-32, AD-1, AD-8) :
 *  - ecriture exclusivement via l'API Local de Payload ;
 *  - REJOUABLE : `legacyId` empeche tout doublon ;
 *  - VERIFIABLE : comptage source vs cible en fin d'execution ;
 *  - champs legacy (`youtube_url`, personnalisations) archives mais non exposes.
 *
 * Perimetre : seules les passes de la danse rock sont migrees.
 *
 * Lancement : npm run migrate:passes
 */

const DANSE_ROCK_LEGACY_ID = '1'

type PasseLegacy = {
  id: string
  name: string
  positionStart_id: string
  positionEnd_id: string
  difficulty: string
  description: string
  progress: string
  danse_id: string
  youtube_url: string
}

type PersonnalisationLegacy = {
  id: string
  user_id: string
  passe_id: string
  name: string
}

const COLONNES_PASSE = [
  'id',
  'name',
  'positionStart_id',
  'positionEnd_id',
  'difficulty',
  'description',
  'progress',
  'dateMaj',
  'danse_id',
  'dateCreate',
  'userCreate_id',
  'pending',
  'published',
  'youtube_url',
]

const COLONNES_PERSONNALISATION = ['id', 'user_id', 'passe_id', 'name']

async function main() {
  const payload = await getPayload({ config })

  console.log('--- Migration des passes historiques ---')

  const sql = lireDump()
  const toutes = extraireTable<PasseLegacy>(sql, 'passe', COLONNES_PASSE)
  const aMigrer = toutes.filter((p) => p.danse_id === DANSE_ROCK_LEGACY_ID)
  const personnalisations = extraireTable<PersonnalisationLegacy>(
    sql,
    'personnalizepasse',
    COLONNES_PERSONNALISATION,
  )

  console.log('Passes dans le dump          : ' + toutes.length)
  console.log('Passes rock a migrer         : ' + aMigrer.length)
  console.log('Ecartees (autres danses)     : ' + (toutes.length - aMigrer.length))

  // Table de correspondance : identifiant legacy d'une position -> id Payload.
  // `showHiddenFields` : `legacyId` est masque des reponses d'API (AD-8), la
  // migration doit donc demander explicitement a le recevoir.
  const positions = await payload.find({
    collection: 'positions',
    limit: 1000,
    depth: 0,
    showHiddenFields: true,
  })
  const parLegacyId = new Map<number, number>()
  for (const position of positions.docs) {
    if (typeof position.legacyId === 'number') {
      parLegacyId.set(position.legacyId, position.id as number)
    }
  }

  if (parLegacyId.size === 0) {
    throw new Error(
      'Aucune position migree trouvee. Lancer `npm run migrate:positions` avant les passes.',
    )
  }
  console.log('Positions disponibles        : ' + parLegacyId.size)

  let creees = 0
  let ignorees = 0
  let archivees = 0
  const avertissements: string[] = []

  for (const legacy of aMigrer) {
    const legacyId = Number(legacy.id)

    // Rejouabilite (FR-32).
    const existante = await payload.find({
      collection: 'passes',
      where: { legacyId: { equals: legacyId } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
    if (existante.totalDocs > 0) {
      ignorees++
      continue
    }

    const idDebut = parLegacyId.get(Number(legacy.positionStart_id))
    const idFin = parLegacyId.get(Number(legacy.positionEnd_id))

    // Une passe sans ses deux extremites n'a pas de sens dans le graphe :
    // on la signale plutot que de creer une arete cassee.
    if (!idDebut || !idFin) {
      avertissements.push(
        `Passe ${legacyId} « ${legacy.name} » ignoree : position ` +
          `${!idDebut ? 'de depart ' + legacy.positionStart_id : "d'arrivee " + legacy.positionEnd_id} absente.`,
      )
      continue
    }

    // AD-8 : archivage sans exposition.
    const perso = personnalisations.filter((p) => p.passe_id === legacy.id)
    const youtube = legacy.youtube_url.trim()
    if (youtube || perso.length) archivees++

    // Le type genere n'accepte que '1' a '4' : on restreint explicitement.
    const niveaux = ['1', '2', '3', '4'] as const
    const difficulte = niveaux.find((n) => n === legacy.difficulty)

    await payload.create({
      collection: 'passes',
      data: {
        nom: legacy.name,
        positionDebut: idDebut,
        positionFin: idFin,
        description: legacy.description,
        deroule: legacy.progress,
        ...(difficulte ? { difficulte } : {}),
        ...(youtube ? { legacyYoutubeUrl: youtube } : {}),
        ...(perso.length
          ? { legacyPersonnalisations: perso.map((p) => ({ customName: p.name, userId: p.user_id })) }
          : {}),
        legacyId,
      },
    })
    creees++
  }

  const total = await payload.count({ collection: 'passes' })

  console.log('')
  console.log('--- Rapport ---')
  console.log('Creees cette fois            : ' + creees)
  console.log('Deja presentes (ignorees)    : ' + ignorees)
  console.log('Avec donnees archivees       : ' + archivees)
  console.log('Passes en base au total      : ' + total.totalDocs)
  if (avertissements.length) {
    console.log('')
    console.log('Avertissements :')
    avertissements.forEach((a) => console.log('  - ' + a))
  }

  const conforme = total.totalDocs === aMigrer.length - avertissements.length
  console.log('')
  console.log(
    conforme
      ? 'OK : le comptage cible correspond a la source.'
      : 'ECART : attendu ' + (aMigrer.length - avertissements.length) + ', obtenu ' + total.totalDocs,
  )

  process.exit(conforme ? 0 : 1)
}

main().catch((e) => {
  console.error('Echec de la migration :', e)
  process.exit(1)
})
