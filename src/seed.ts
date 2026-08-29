import type { Payload } from 'payload'

import { DANSE_V1 } from './collections/Danse'

/**
 * Semis des donnees de reference indispensables au fonctionnement v1.
 *
 * IDEMPOTENT : relancer ne cree jamais de doublon. Passe exclusivement par
 * l'API Local de Payload, jamais par du SQL brut (AD-1 : Payload seul scribe).
 */
export async function seedDanseV1(payload: Payload): Promise<void> {
  // Pendant `next build`, aucune base n'est disponible (et il n'y aurait rien a
  // semer) : toute ecriture echouerait sur un schema inexistant. On sort tot.
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  const existantes = await payload.find({
    collection: 'danses',
    where: { nom: { equals: DANSE_V1 } },
    limit: 1,
    depth: 0,
  })

  if (existantes.totalDocs > 0) return

  await payload.create({
    collection: 'danses',
    data: { nom: DANSE_V1 },
  })

  payload.logger.info(`Danse de reference creee : ${DANSE_V1}`)
}
