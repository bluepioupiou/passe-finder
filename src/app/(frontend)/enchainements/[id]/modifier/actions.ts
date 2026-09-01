'use server'

import { getPayload } from 'payload'

import { jourVersISO, type ResultatEnregistrement, type SaisieEnchainement } from '@/composition'
import { lienSur } from '@/liens'
import { VISIBILITES } from '@/collections/Enchainement'
import config from '@/payload.config'
import { sessionCourante } from '@/porte'

/**
 * Met a jour un enchainement — informations ET chaine (Story 4.5, FR-18).
 *
 * MEME DISCIPLINE QUE L'ENREGISTREMENT (Story 4.3), et pour la meme raison :
 * une action serveur est une porte publique, aussi atteignable qu'une route
 * d'API. Tout est donc reverifie ici, jamais seulement dans le compositeur.
 *
 *  - `overrideAccess: false` avec l'utilisateur de la SESSION : ce sont les
 *    `access` de la collection (`auteurOuAdmin`) qui decident, pas une seconde
 *    regle ecrite ici. Un compte qui n'est pas l'auteur ne trouve simplement
 *    pas le document — il ne recoit pas un refus qui lui apprendrait qu'il
 *    existe ;
 *  - l'AUTEUR n'est jamais dans les donnees ecrites : on ne peut pas se donner
 *    l'enchainement d'un autre, ni le donner a quelqu'un d'autre par megarde ;
 *  - la visibilite est ramenee a une valeur connue, defaut PRIVE : une valeur
 *    inattendue ne doit jamais aboutir a un partage (FR-17, AD-6).
 *
 * LA CHAINE EST DESORMAIS ENVOYEE, et elle REMPLACE l'ancienne. C'est ce que
 * fait un tableau dans Payload, et c'est ce qu'on veut : le compositeur tient
 * l'etat entier de la chaine a l'ecran, pas un ensemble de retouches. D'ou la
 * garde qui suit — une chaine vide ne doit jamais arriver jusqu'a l'ecriture,
 * sans quoi une requete malformee viderait un enchainement de ses passes tout
 * en le laissant en place.
 *
 * Renvoie un resultat plutot que de lever : un echec doit revenir au
 * compositeur, qui garde la chaine et la saisie a l'ecran (NFR-4, UX-DR16).
 */
export async function modifierEnchainement(
  id: number,
  saisie: SaisieEnchainement,
): Promise<ResultatEnregistrement> {
  const titre = saisie.titre.trim()
  if (titre === '') return { ok: false, message: 'Il manque un titre.' }
  if (saisie.passes.length === 0) {
    return { ok: false, message: 'Un enchaînement contient au moins une passe.' }
  }

  const musiqueLienSaisi = saisie.musique.lien.trim()
  const musiqueLien = lienSur(musiqueLienSaisi)
  if (musiqueLienSaisi !== '' && musiqueLien === null) {
    return {
      ok: false,
      message: 'Le lien de la musique doit être une adresse web (http:// ou https://).',
    }
  }

  const videoSaisie = saisie.video.trim()
  const video = lienSur(videoSaisie)
  if (videoSaisie !== '' && video === null) {
    return {
      ok: false,
      message: 'Le lien de la vidéo doit être une adresse web (http:// ou https://).',
    }
  }

  const visibilite = VISIBILITES.some((option) => option.value === saisie.visibilite)
    ? (saisie.visibilite as (typeof VISIBILITES)[number]['value'])
    : 'prive'

  try {
    const payload = await getPayload({ config: await config })
    const user = await sessionCourante()

    if (!user) {
      return {
        ok: false,
        message: 'Session expirée : reconnecte-toi, puis relance l’enregistrement.',
      }
    }

    await payload.update({
      collection: 'enchainements',
      id,
      overrideAccess: false,
      user,
      data: {
        titre,
        // `null` et non `undefined` : un champ vide doit EFFACER la valeur
        // precedente. `undefined` la laisserait telle quelle, et une
        // description supprimee reapparaitrait au rechargement.
        description: saisie.description.trim() || null,
        notes: saisie.notes.trim() || null,
        musique: { titre: saisie.musique.titre.trim() || null, lien: musiqueLien },
        // `urlVideo` en base, `video` a la saisie : le champ historique garde
        // son nom, l'interface ne parle plus de YouTube.
        urlVideo: video,
        date: jourVersISO(saisie.date) ?? null,
        visibilite,
        // L'index EST l'ordre (ADD-18) : la chaine arrive deja ordonnee.
        passes: saisie.passes.map((passe) => ({ passe })),
      },
    })

    return { ok: true, id }
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : ''
    return {
      ok: false,
      message: message || "La modification a échoué. Ta saisie est toujours là : réessaie.",
    }
  }
}

/** Ce que rend une suppression : rien a montrer si elle reussit. */
export type ResultatSuppression = { ok: true } | { ok: false; message: string }

/**
 * Supprime un enchainement (Story 4.5, FR-18).
 *
 * MEMES GARDES QUE LA MODIFICATION, et c'est le point : `overrideAccess: false`
 * avec l'utilisateur de la session laisse `auteurOuAdmin` decider. La regle
 * etant une CONTRAINTE DE REQUETE et non un booleen, elle vaut aussi pour
 * l'API : personne ne supprime le travail d'un autre eleve, quelle que soit la
 * porte empruntee.
 *
 * NE REDIRIGE PAS ELLE-MEME. Une redirection depuis une action serveur se
 * declenche par une exception, ce qui rendrait indistinguables un succes et un
 * echec cote appelant. Le composant navigue, et peut donc afficher un message
 * si ca n'aboutit pas.
 *
 * Le menage des FAVORIS qui pointaient dessus n'est PAS fait ici mais dans un
 * hook de la collection : /admin et l'API suppriment aussi, et une regle
 * ecrite dans une seule des trois portes n'en est pas une (ADD-5).
 */
export async function supprimerEnchainement(id: number): Promise<ResultatSuppression> {
  try {
    const payload = await getPayload({ config: await config })
    const user = await sessionCourante()

    if (!user) {
      return { ok: false, message: 'Session expirée : reconnecte-toi, puis réessaie.' }
    }

    await payload.delete({ collection: 'enchainements', id, overrideAccess: false, user })

    return { ok: true }
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : ''
    return { ok: false, message: message || 'La suppression a échoué. Réessaie.' }
  }
}
