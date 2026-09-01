import { getPayload } from 'payload'

import config from '../src/payload.config'
import { extraireTable, lireDump } from './dump-legacy'

/**
 * Migration one-off du catalogue historique — TRANCHE « TRANSITIONS » (Story 4.7).
 *
 * La table `alternative` de l'ancienne appli EST l'objet Transition. Son
 * commentaire SQL dit « Table des choix possibles apres une passe », mais son
 * schema porte bien sur les positions :
 *
 *     alternative(id, positionStart_id, positionAlternative_id, description, ...)
 *
 * Dix lignes survivent dans le dump (ids 15 a 25, l'auto-increment est a 26 :
 * une quinzaine ont ete saisies puis effacees au fil des annees). Elles
 * expliquent a elles seules plus de quatre reprises sur cinq parmi celles que
 * les 120 enchainements repris contiennent. Les trous ne sont pas des cas
 * nouveaux, ce sont surtout des RECIPROQUES MANQUANTES —
 * `mains decroisees -> main droite / main gauche` est declaree, l'inverse non.
 * Le compte exact se lit avec `npm run rapport:transitions`, qui travaille sur
 * la base plutot que sur un chiffre fige dans un commentaire.
 *
 * Principes (AD-14 / FR-31, FR-32, FR-33) :
 *  - ecriture EXCLUSIVEMENT via l'API Local de Payload (AD-1 : seul scribe) ;
 *  - ordre de dependance respecte : Positions -> Transitions ;
 *  - REJOUABLE : `legacyId` empeche tout doublon ;
 *  - VERIFIABLE : comptage source vs cible affiche en fin d'execution.
 *
 * ON NE RIEN INVENTE (principe pose pour la migration de l'historique) : la
 * description part telle quelle et le NOM RESTE VIDE. Nommer les dix gestes est
 * un geste de prof, pas de migration — l'affichage dit « Changement de prise »
 * en attendant qu'Alain les nomme dans /admin.
 *
 * Lancement : npm run migrate:transitions
 */

type AlternativeLegacy = {
  id: string
  positionStart_id: string
  positionAlternative_id: string
  description: string
}

const COLONNES = [
  'id',
  'positionStart_id',
  'positionAlternative_id',
  'description',
  'dateCreate',
  'dateMaj',
]

async function main() {
  const payload = await getPayload({ config })

  console.log('--- Migration des transitions historiques (table `alternative`) ---')

  const sql = lireDump()
  const alternatives = extraireTable<AlternativeLegacy>(sql, 'alternative', COLONNES)

  console.log('Alternatives dans le dump   : ' + alternatives.length)

  // Les positions sont deja migrees, indexees par leur identifiant historique.
  // `showHiddenFields` est indispensable : `legacyId` est `hidden`, donc absent
  // des reponses par defaut.
  const { docs: positions } = await payload.find({
    collection: 'positions',
    limit: 500,
    depth: 0,
    showHiddenFields: true,
  })
  const parLegacyId = new Map<number, { id: number; nom: string }>(
    positions
      .filter((position) => typeof position.legacyId === 'number')
      .map((position) => [position.legacyId as number, { id: position.id, nom: position.nom }]),
  )

  if (parLegacyId.size === 0) {
    throw new Error(
      "Aucune position portant un identifiant historique : lancer d'abord " +
        '`npm run migrate:positions`.',
    )
  }

  let creees = 0
  let ignorees = 0
  let ecartees = 0
  const avertissements: string[] = []

  for (const legacy of alternatives) {
    const legacyId = Number(legacy.id)

    // Rejouabilite (FR-32) : deja migree ? on passe.
    const existante = await payload.find({
      collection: 'transitions',
      where: { legacyId: { equals: legacyId } },
      limit: 1,
      depth: 0,
      showHiddenFields: true,
    })
    if (existante.totalDocs > 0) {
      ignorees++
      continue
    }

    const debut = parLegacyId.get(Number(legacy.positionStart_id))
    const fin = parLegacyId.get(Number(legacy.positionAlternative_id))

    // Une transition dont une extremite n'a pas ete migree (position d'une
    // autre danse, ou position supprimee de l'ancienne base) est ECARTEE AVEC
    // UN MESSAGE : silencieusement passer sous silence une arete du graphe,
    // c'est exactement ce qui rendrait le rapport de couverture menteur.
    if (!debut || !fin) {
      ecartees++
      avertissements.push(
        'Alternative ' +
          legacyId +
          ' ecartee : position ' +
          (debut ? legacy.positionAlternative_id : legacy.positionStart_id) +
          ' absente du catalogue migre.',
      )
      continue
    }

    await payload.create({
      collection: 'transitions',
      data: {
        positionDebut: debut.id,
        positionFin: fin.id,
        description: legacy.description.trim(),
        legacyId,
      },
    })
    creees++
    console.log('  + ' + debut.nom + ' -> ' + fin.nom)
  }

  const total = await payload.count({ collection: 'transitions' })
  const attendu = alternatives.length - ecartees

  console.log('')
  console.log('--- Rapport ---')
  console.log('Creees cette fois           : ' + creees)
  console.log('Deja presentes (ignorees)   : ' + ignorees)
  console.log('Ecartees (position absente) : ' + ecartees)
  console.log('Transitions en base au total: ' + total.totalDocs)
  if (avertissements.length) {
    console.log('')
    console.log('Avertissements :')
    avertissements.forEach((a) => console.log('  - ' + a))
  }

  // Verification source vs cible (FR-32).
  const conforme = total.totalDocs === attendu
  console.log('')
  console.log(
    conforme
      ? 'OK : le comptage cible correspond a la source.'
      : 'ECART : attendu ' + attendu + ', obtenu ' + total.totalDocs,
  )
  console.log('')
  console.log('Etape suivante : `npm run rapport:transitions` pour voir ce qui manque encore.')

  process.exit(conforme ? 0 : 1)
}

main().catch((e) => {
  console.error('Echec de la migration :', e)
  process.exit(1)
})
