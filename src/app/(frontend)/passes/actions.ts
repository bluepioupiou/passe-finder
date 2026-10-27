'use server'

import { getPayload } from 'payload'

import { donneesDePasse, type ResultatPasse, type SaisiePasse } from '@/edition-passe'
import config from '@/payload.config'
import { sessionCourante } from '@/porte'
import {
  poserPosition,
  positionsIntermediairesDe,
  retirerPosition,
  type PositionIntermediaire,
} from '@/positions-intermediaires'
import {
  PIECES_MAX,
  schemaSur,
  type ResultatPosition,
  type SaisiePosition,
} from '@/schema-position'

/**
 * Enregistrer une passe modifiee depuis sa fiche, sans passer par /admin.
 *
 * MEME FORME QUE `enregistrerSchemaPosition` : validation pure d'abord, union
 * discriminee en retour, jamais de `redirect()` depuis l'action — un echec
 * revient au formulaire, qui garde la saisie a l'ecran.
 *
 * DEUXIEME DES TROIS GARDES. La page a filtre le parcours (`exigerSession` +
 * `estAdmin`) ; ici on revérifie la session et on passe `overrideAccess: false,
 * user`, pour que `Passe.access` (`adminSeul`) tranche en dernier ressort. Le
 * `beforeValidate` de la collection refuse aussi deux positions de danses
 * differentes : son message, ecrit pour un humain, remonte tel quel.
 */
export async function modifierPasse(saisie: SaisiePasse): Promise<ResultatPasse> {
  const lecture = donneesDePasse(saisie)
  if (!lecture.ok) return lecture

  try {
    const payload = await getPayload({ config: await config })
    const utilisateur = await sessionCourante()

    if (!utilisateur) {
      return {
        ok: false,
        message: 'Session expirée : reconnecte-toi, puis relance l’enregistrement.',
      }
    }

    const passe = await payload.update({
      collection: 'passes',
      id: saisie.id,
      overrideAccess: false,
      user: utilisateur,
      data: lecture.donnees,
    })

    return { ok: true, id: passe.id as number }
  } catch (erreur) {
    const message =
      erreur instanceof Error && erreur.message
        ? erreur.message
        : "L'enregistrement n'a pas abouti. Réessaie dans un instant."
    return { ok: false, message }
  }
}

/**
 * Reecrire les positions intermediaires d'une passe (Epic 8), avec les memes
 * gardes que `modifierPasse` : session revérifiee, `overrideAccess: false`, et
 * le hook de la collection qui tranche (instant dans la duree, un par instant).
 *
 * `changer` recoit les positions DEJA enregistrees et rend les nouvelles : on
 * ne fait jamais confiance a une liste envoyee par le navigateur, qui pourrait
 * dater d'avant une autre modification.
 */
async function reecrirePositions(
  passeId: number,
  changer: (positions: PositionIntermediaire[]) => PositionIntermediaire[],
): Promise<ResultatPasse> {
  try {
    const payload = await getPayload({ config: await config })
    const utilisateur = await sessionCourante()

    if (!utilisateur) {
      return {
        ok: false,
        message: 'Session expirée : reconnecte-toi, puis relance l’enregistrement.',
      }
    }

    const passe = await payload.findByID({ collection: 'passes', id: passeId, depth: 0 })
    const positions = changer(positionsIntermediairesDe(passe.positionsIntermediaires))

    await payload.update({
      collection: 'passes',
      id: passeId,
      overrideAccess: false,
      user: utilisateur,
      data: { positionsIntermediaires: positions },
    })

    return { ok: true, id: passeId }
  } catch (erreur) {
    const message =
      erreur instanceof Error && erreur.message
        ? erreur.message
        : "L'enregistrement n'a pas abouti. Réessaie dans un instant."
    return { ok: false, message }
  }
}

/**
 * Enregistrer le schema dessine dans l'atelier sur un instant de la passe.
 *
 * MEME SIGNATURE QUE `enregistrerSchemaPosition`, une fois `passeId` et
 * `instant` lies par la page (`bind`) : l'atelier ne sait pas qu'il dessine une
 * position intermediaire, il appelle son action et suit `id`. Le nom, la
 * description et la ligne de danse de la saisie sont ignores — une position
 * intermediaire n'en a pas.
 */
export async function enregistrerPositionIntermediaire(
  passeId: number,
  instant: number,
  saisie: SaisiePosition,
): Promise<ResultatPosition> {
  const schema = schemaSur(saisie.schema)
  if (!schema) {
    return { ok: false, message: 'Le schéma est illisible. Recharge la page et recommence.' }
  }
  if (schema.pieces.length === 0) return { ok: false, message: 'Pose au moins une pièce.' }
  if (schema.pieces.length > PIECES_MAX) {
    return { ok: false, message: `Ce schéma dépasse ${PIECES_MAX} pièces.` }
  }

  return reecrirePositions(passeId, (positions) => poserPosition(positions, instant, schema))
}

/** Retirer la position d'un instant — la frise a deja demande confirmation. */
export async function retirerPositionIntermediaire(
  passeId: number,
  instant: number,
): Promise<ResultatPasse> {
  return reecrirePositions(passeId, (positions) => retirerPosition(positions, instant))
}
