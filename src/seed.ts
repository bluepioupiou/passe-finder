import type { Payload } from 'payload'

import { DANSE_V1 } from './collections/Danse'

/**
 * Pendant `next build`, aucune base n'est disponible (et il n'y aurait rien a
 * semer) : toute ecriture echouerait sur un schema inexistant.
 */
function pendantLaConstruction(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

/**
 * Semis des donnees de reference indispensables au fonctionnement v1.
 *
 * IDEMPOTENT : relancer ne cree jamais de doublon. Passe exclusivement par
 * l'API Local de Payload, jamais par du SQL brut (AD-1 : Payload seul scribe).
 */
export async function seedDanseV1(payload: Payload): Promise<void> {
  if (pendantLaConstruction()) return

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

/**
 * Signale un catalogue que personne ne peut editer (Story 3.4).
 *
 * CE DEMARRAGE NE PROMEUT PERSONNE, et c'est deliberé : poser le drapeau `admin`
 * est un geste d'INITIALISATION, fait une fois, a la main
 * (`npm run promouvoir:admin`). Meme raisonnement que pour la reprise du
 * catalogue historique — automatiser au demarrage n'apporterait aucune securite
 * et ajouterait de la magie a chaque boot.
 *
 * Il reste un CONSTAT, parce qu'un verrouillage silencieux est le pire des deux
 * mondes : une instance sans administrateur fonctionne parfaitement pour les
 * visiteurs et pour les comptes qui composent, mais le catalogue y est en
 * lecture seule pour tout le monde. Sans ce message, la cause serait invisible
 * et se presenterait comme « je n'arrive plus a modifier une position ».
 */
export async function avertirSiAucunAdmin(payload: Payload): Promise<void> {
  if (pendantLaConstruction()) return

  const admins = await payload.find({
    collection: 'users',
    where: { admin: { equals: true } },
    limit: 0,
    depth: 0,
  })

  if (admins.totalDocs > 0) return

  payload.logger.warn(
    'Aucun administrateur : le catalogue (danses, positions, passes, fichiers) est en ' +
      'lecture seule pour tout le monde. Cree ton compte dans /admin puis lance ' +
      '`npm run promouvoir:admin -- ton.email@exemple.fr`.',
  )
}

/**
 * Point d'entree unique du demarrage (`onInit`).
 *
 * L'ordre compte peu ici, mais le regroupement, si : un seul `onInit` dans la
 * configuration evite qu'un futur semis soit ajoute en silence a cote d'un
 * autre et ne tourne jamais.
 */
export async function initialiser(payload: Payload): Promise<void> {
  await seedDanseV1(payload)
  await avertirSiAucunAdmin(payload)
}
