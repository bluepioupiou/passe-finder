'use server'

import { getPayload } from 'payload'

import { donneesDePasse, type ResultatPasse, type SaisiePasse } from '@/edition-passe'
import config from '@/payload.config'
import { sessionCourante } from '@/porte'

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
