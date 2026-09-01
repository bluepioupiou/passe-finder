import { getPayload } from 'payload'

import config from '../src/payload.config'
import { extraireTable, lireDump } from './dump-legacy'

/**
 * Migration one-off — TRANCHE « ENCHAINEMENTS » (Story 6.3).
 *
 * A executer APRES `migrate:passes` : chaque maillon reference une passe deja
 * migree, retrouvee par son `legacyId` (ordre de dependance, AD-14).
 *
 * Principes (FR-31, FR-32, FR-36, AD-1, AD-8) :
 *  - ecriture exclusivement via l'API Local de Payload ;
 *  - REJOUABLE : `legacyId` empeche tout doublon ;
 *  - VERIFIABLE : comptage source vs cible en fin d'execution ;
 *  - tous les enchainements sont rattaches a Alain (FR-36) : les ~50 comptes
 *    historiques ne sont pas migres.
 *
 * DEUX PARTICULARITES DE LA SOURCE, tranchees avec Alain le 2026-08-30 :
 *
 * 1. La table `enchainement_passe` accepte un maillon qui n'est PAS une passe
 *    mais une POSITION seule (82 cas). Ce n'etait pas une erreur de saisie :
 *    c'est une TRANSITION de main (lacher une main pour passer de « mains
 *    decroisees » a « main droite / main gauche »), que l'ancienne appli notait
 *    en inscrivant la position reellement atteinte. Ces marqueurs tombent tous
 *    exactement la ou le graphe saute, et valent la position de DEPART de la
 *    passe suivante — l'information est donc deja deductible du graphe.
 *    Le modele cible ne les reprend pas comme maillons (ADD-18 : le tableau
 *    ordonne ne contient que des passes) ; ils sont archives dans
 *    `legacyMarqueurs`, matiere premiere de la future collection Transition.
 *
 * 2. 59 enchainements sur 119 sont DISCONTINUS au sens du graphe. La migration
 *    ne les repare pas et n'invente aucune passe : elle les cree tels quels.
 *    La vue lecture (Story 4.4) affichera la reprise explicitement.
 *
 * Lancement : npm run migrate:enchainements
 */

const DANSE_ROCK_LEGACY_ID = '1'

type EnchainementLegacy = {
  id: string
  name: string
  commentaire: string
  dateCreate: string
  dateEvent: string
  danse_id: string
  lesson_id: string
  userCreate_id: string
  dateMaj: string
  published: string
  private: string
  difficulty: string
}

type MaillonLegacy = {
  enchainement_id: string
  passe_id: string
  position_id: string
  order: string
}

const COLONNES_ENCHAINEMENT = [
  'id',
  'name',
  'commentaire',
  'dateCreate',
  'dateEvent',
  'danse_id',
  'lesson_id',
  'userCreate_id',
  'dateMaj',
  'published',
  'private',
  'difficulty',
]

const COLONNES_MAILLON = ['enchainement_id', 'passe_id', 'position_id', 'order']

/** `NULL` non quote dans le dump : on le ramene a `undefined`. */
function valeur(brut: string | undefined): string | undefined {
  if (!brut || brut === 'NULL' || brut.trim() === '') return undefined
  return brut
}

/** Date legacy (`YYYY-MM-DD`) vers l'ISO attendu par Payload. */
function versDateISO(brut: string | undefined): string | undefined {
  const jour = valeur(brut)
  if (!jour) return undefined
  const date = new Date(jour + 'T00:00:00.000Z')
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

async function main() {
  const payload = await getPayload({ config })

  console.log('--- Migration des enchainements historiques ---')

  const sql = lireDump()
  const tous = extraireTable<EnchainementLegacy>(sql, 'enchainement', COLONNES_ENCHAINEMENT)
  const maillons = extraireTable<MaillonLegacy>(sql, 'enchainement_passe', COLONNES_MAILLON)
  const aMigrer = tous.filter((e) => e.danse_id === DANSE_ROCK_LEGACY_ID)

  console.log('Enchainements dans le dump   : ' + tous.length)
  console.log('Enchainements rock a migrer  : ' + aMigrer.length)
  console.log('Ecartes (autres danses)      : ' + (tous.length - aMigrer.length))

  // Maillons regroupes par enchainement, dans l'ordre d'origine.
  const parEnchainement = new Map<string, MaillonLegacy[]>()
  for (const maillon of maillons) {
    const liste = parEnchainement.get(maillon.enchainement_id) ?? []
    liste.push(maillon)
    parEnchainement.set(maillon.enchainement_id, liste)
  }
  for (const liste of parEnchainement.values()) {
    liste.sort((a, b) => Number(a.order) - Number(b.order))
  }

  const idsConnus = new Set(aMigrer.map((e) => e.id))
  const maillonsOrphelins = maillons.filter((m) => !idsConnus.has(m.enchainement_id))
  const enchainementsSupprimes = [...new Set(maillonsOrphelins.map((m) => m.enchainement_id))]

  // FR-36 : un seul auteur pour tout l'historique.
  const emailAuteur = process.env.MIGRATION_AUTEUR_EMAIL
  const utilisateurs = await payload.find({
    collection: 'users',
    ...(emailAuteur ? { where: { email: { equals: emailAuteur } } } : {}),
    limit: 2,
    depth: 0,
  })
  if (utilisateurs.totalDocs === 0) {
    throw new Error(
      emailAuteur
        ? `Aucun utilisateur « ${emailAuteur} ». Cree le compte dans /admin avant de migrer.`
        : 'Aucun utilisateur en base. Cree le compte admin dans /admin avant de migrer.',
    )
  }
  if (utilisateurs.totalDocs > 1) {
    throw new Error(
      'Plusieurs utilisateurs en base : precise le proprietaire des enchainements ' +
        'via MIGRATION_AUTEUR_EMAIL (FR-36).',
    )
  }
  const auteur = utilisateurs.docs[0]
  console.log('Auteur des enchainements     : ' + auteur.email)

  // Correspondance passe legacy -> passe migree. `showHiddenFields` : `legacyId`
  // est masque des reponses d'API (AD-8), il faut le demander explicitement.
  const passes = await payload.find({
    collection: 'passes',
    limit: 1000,
    depth: 0,
    showHiddenFields: true,
  })
  const passeParLegacyId = new Map<number, number>()
  for (const passe of passes.docs) {
    if (typeof passe.legacyId === 'number') passeParLegacyId.set(passe.legacyId, passe.id as number)
  }
  if (passeParLegacyId.size === 0) {
    throw new Error('Aucune passe migree trouvee. Lancer `npm run migrate:passes` avant.')
  }
  console.log('Passes disponibles           : ' + passeParLegacyId.size)

  let creees = 0
  let ignorees = 0
  let prives = 0
  let avecMarqueurs = 0
  let maillonsCrees = 0
  const avertissements: string[] = []

  for (const legacy of aMigrer) {
    const legacyId = Number(legacy.id)

    // Rejouabilite (FR-32).
    const existant = await payload.find({
      collection: 'enchainements',
      where: { legacyId: { equals: legacyId } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
    if (existant.totalDocs > 0) {
      ignorees++
      continue
    }

    const suite = parEnchainement.get(legacy.id) ?? []
    const marqueurs = suite.filter((m) => !valeur(m.passe_id))
    const maillonsPasses = suite.filter((m) => valeur(m.passe_id))

    if (maillonsPasses.length === 0) {
      avertissements.push(`Enchainement ${legacyId} « ${legacy.name} » ignore : aucune passe.`)
      continue
    }

    const manquantes = maillonsPasses.filter((m) => !passeParLegacyId.get(Number(m.passe_id)))
    if (manquantes.length > 0) {
      // On ne cree JAMAIS une chaine amputee : un enchainement auquel il manque
      // un maillon est faux sans le dire. On le signale entier.
      avertissements.push(
        `Enchainement ${legacyId} « ${legacy.name} » ignore : ` +
          `${manquantes.length} passe(s) absente(s) du catalogue migre ` +
          `(${manquantes.map((m) => m.passe_id).join(', ')}).`,
      )
      continue
    }

    // Fidelite au legacy (decision Alain, 2026-08-30) : ce qui etait prive le
    // reste, le reste arrive en PUBLIC. Un enchainement non publie est traite
    // comme prive : il n'etait deja plus visible.
    //
    // « public » et non « non repertorie » (modele elargi du 2026-09-01) :
    // l'ancienne appli listait ces enchainements pour tout le monde, c'est donc
    // « public » qui reproduit ce qu'ils etaient. Le non-repertorie est un choix
    // que personne n'a jamais fait dans le legacy — l'inventer ici retirerait
    // 90 enchainements de la liste sans que personne ne l'ait demande.
    const prive = legacy.private === '1' || legacy.published === '0'
    if (prive) prives++
    if (marqueurs.length) avecMarqueurs++

    const date = versDateISO(legacy.dateEvent) ?? versDateISO(legacy.dateCreate)

    await payload.create({
      collection: 'enchainements',
      data: {
        titre: legacy.name,
        ...(valeur(legacy.commentaire) ? { description: legacy.commentaire } : {}),
        // `dateEvent` = date du cours ; a defaut, la date de creation.
        ...(date ? { date } : {}),
        auteur: auteur.id,
        visibilite: prive ? 'prive' : 'public',
        passes: maillonsPasses.map((m) => ({ passe: passeParLegacyId.get(Number(m.passe_id))! })),
        legacyId,
        ...(marqueurs.length
          ? {
              legacyMarqueurs: marqueurs.map((m) => ({
                ordre: Number(m.order),
                positionLegacyId: Number(m.position_id),
              })),
            }
          : {}),
        legacyMeta: {
          difficulty: Number(legacy.difficulty),
          lessonId: valeur(legacy.lesson_id) ? Number(legacy.lesson_id) : null,
          userCreateId: Number(legacy.userCreate_id),
          published: legacy.published === '1',
          private: legacy.private === '1',
          dateCreate: valeur(legacy.dateCreate) ?? null,
          dateMaj: valeur(legacy.dateMaj) ?? null,
        },
      },
    })
    creees++
    maillonsCrees += maillonsPasses.length
  }

  const total = await payload.count({ collection: 'enchainements' })

  console.log('')
  console.log('--- Rapport ---')
  console.log('Crees cette fois             : ' + creees)
  console.log('Deja presents (ignores)      : ' + ignorees)
  console.log('Maillons crees               : ' + maillonsCrees)
  console.log('Prives (fidelite au legacy)  : ' + prives)
  console.log('Avec marqueurs archives      : ' + avecMarqueurs)
  console.log('Enchainements en base        : ' + total.totalDocs)
  if (enchainementsSupprimes.length) {
    console.log(
      'Maillons orphelins ignores   : ' +
        maillonsOrphelins.length +
        ' (enchainements absents de la base d origine : ' +
        enchainementsSupprimes.join(', ') +
        ')',
    )
  }
  if (avertissements.length) {
    console.log('')
    console.log('Avertissements :')
    avertissements.forEach((a) => console.log('  - ' + a))
  }

  const attendu = aMigrer.length - avertissements.length
  const conforme = total.totalDocs === attendu
  console.log('')
  console.log(
    conforme
      ? 'OK : le comptage cible correspond a la source.'
      : 'ECART : attendu ' + attendu + ', obtenu ' + total.totalDocs,
  )

  process.exit(conforme ? 0 : 1)
}

main().catch((e) => {
  console.error('Echec de la migration :', e)
  process.exit(1)
})
