import type { Payload } from 'payload'

import { ADMIN_EMAIL } from './env'
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
 * Attribution du drapeau `admin`, HORS application (Story 3.4, FR-29).
 *
 * POURQUOI PASSER PAR LE SEMIS. L'acces de champ sur `users.admin` refuse la
 * valeur a quiconque n'est pas deja administrateur — c'est ce qui interdit
 * l'auto-promotion. Il en decoule un probleme d'amorcage classique : sur une
 * instance neuve, PERSONNE ne peut creer le premier administrateur depuis
 * l'application. Ce semis est la porte prevue pour cela, et elle est hors de
 * portee d'un visiteur : elle exige l'acces au fichier d'environnement du
 * serveur.
 *
 * Il PROMEUT un compte existant, il n'en cree pas : le compte se cree
 * normalement (assistant /admin, puis inscription a la Story 3.1). Cela evite
 * d'avoir un mot de passe dans une variable d'environnement, et c'est ce qui
 * rend la variable utile en production, ou le compte d'Alain existe deja.
 *
 * IDEMPOTENT : sans effet si le compte est deja administrateur.
 */
export async function promouvoirAdmin(payload: Payload): Promise<void> {
  if (pendantLaConstruction()) return

  if (!ADMIN_EMAIL) {
    // Silence si des administrateurs existent deja : la variable n'a alors
    // aucune raison d'etre renseignee. On n'alerte que sur l'etat reellement
    // problematique — un catalogue que personne ne peut editer.
    const admins = await payload.find({
      collection: 'users',
      where: { admin: { equals: true } },
      limit: 0,
      depth: 0,
    })

    if (admins.totalDocs === 0) {
      payload.logger.warn(
        "Aucun administrateur : le catalogue (danses, positions, passes, fichiers) est en " +
          'lecture seule pour tout le monde. Renseigne ADMIN_EMAIL avec un compte existant ' +
          'puis redemarre (voir .env.example).',
      )
    }
    return
  }

  const comptes = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
    depth: 0,
  })

  const compte = comptes.docs[0]

  if (!compte) {
    payload.logger.warn(
      `ADMIN_EMAIL vaut « ${ADMIN_EMAIL} » mais aucun compte ne porte cet email. ` +
        "Cree le compte (assistant /admin), puis redemarre : le drapeau sera pose.",
    )
    return
  }

  if (compte.admin) return

  await payload.update({
    collection: 'users',
    id: compte.id,
    data: { admin: true },
  })

  payload.logger.info(`Compte promu administrateur : ${ADMIN_EMAIL}`)
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
  await promouvoirAdmin(payload)
}
