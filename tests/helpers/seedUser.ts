import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export interface Identifiants {
  email: string
  password: string
  /** Drapeau admin (Story 3.4). Necessaire pour entrer dans /admin. */
  admin?: boolean
}

export const testUser: Identifiants = {
  email: 'dev@payloadcms.com',
  password: 'test',
}

/**
 * Seeds a test user for e2e tests.
 *
 * Chaque fichier de test qui a besoin d'une session doit passer SES PROPRES
 * identifiants : deux fichiers qui partagent le meme compte se le suppriment
 * mutuellement quand ils tournent en parallele, et la session de l'un tombe au
 * milieu du scenario de l'autre.
 */
export async function seedTestUser(user: Identifiants = testUser): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: user.email,
      },
    },
  })

  // Create fresh test user
  // `admin` porte un acces de CHAMP qui le refuse a qui n'est pas deja
  // administrateur. Le semis passe par l'API Local sans `overrideAccess:
  // false`, donc les droits sont court-circuites : le drapeau est bien pose.
  await payload.create({
    collection: 'users',
    data: user,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(user: Identifiants = testUser): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: user.email,
      },
    },
  })
}
