'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { sessionCourante } from '@/porte'

/**
 * Poser ou retirer un favori (Story 5.1, FR-25).
 *
 * UNE SEULE ACTION POUR LES DEUX SENS. Le bouton est une bascule : demander au
 * navigateur de choisir entre « ajouter » et « retirer » ferait dependre le
 * resultat de ce qu'il croit savoir de l'etat. Le serveur regarde ce qui existe
 * et fait l'inverse — deux clics rapides ne peuvent donc pas creer un doublon
 * ni supprimer deux fois.
 *
 * Elle ne redirige pas (forme « action » de la porte, Story 3.5) : on reste sur
 * la fiche ou la liste, et seul l'etat du bouton change.
 */
export type ResultatFavori = { ok: true; favori: boolean } | { ok: false; message: string }

export async function basculerFavori(
  idPublic: string,
  cheminARafraichir: string,
): Promise<ResultatFavori> {
  const utilisateur = await sessionCourante()

  if (!utilisateur) {
    return { ok: false, message: 'Connecte-toi pour mettre un enchaînement en favori.' }
  }

  const payload = await getPayload({ config: await config })

  try {
    const existants = await payload.find({
      collection: 'favoris',
      where: {
        and: [{ utilisateur: { equals: utilisateur.id } }, { idPublic: { equals: idPublic } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: utilisateur,
    })

    if (existants.totalDocs > 0) {
      await payload.delete({
        collection: 'favoris',
        id: existants.docs[0].id,
        overrideAccess: false,
        user: utilisateur,
      })

      revalidatePath(cheminARafraichir)
      return { ok: true, favori: false }
    }

    // `overrideAccess: false` : ce sont les regles de la collection qui
    // refusent le prive, le sien, et le doublon (ADD-9). On ne les recopie pas
    // ici — leur message d'erreur est deja redige pour un humain.
    //
    // ON N'ENVOIE PAS LA RELATION mais le LIEN : c'est la collection qui
    // retrouve l'enchainement (`retrouverParLeLien`), et n'accepter que cette
    // adresse-la est ce qui empeche de se constituer un favori sur un
    // non-repertorie qu'on n'aurait jamais recu.
    await payload.create({
      collection: 'favoris',
      data: { utilisateur: utilisateur.id, idPublic },
      overrideAccess: false,
      user: utilisateur,
    })

    revalidatePath(cheminARafraichir)
    return { ok: true, favori: true }
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : ''
    return { ok: false, message: message || "L'action a échoué. Réessaie." }
  }
}
