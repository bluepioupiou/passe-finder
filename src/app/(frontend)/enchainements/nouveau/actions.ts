'use server'

import { getPayload } from 'payload'

import { jourVersISO, type ResultatEnregistrement, type SaisieEnchainement } from '@/composition'
import { lienSur } from '@/liens'
import { VISIBILITES } from '@/collections/Enchainement'
import config from '@/payload.config'
import { sessionCourante } from '@/porte'

/**
 * Enregistre un enchainement compose (Story 4.3, FR-14).
 *
 * TOUT est reverifie ici, jamais seulement dans le compositeur : une action
 * serveur est une porte publique, aussi atteignable qu'une route d'API.
 *  - l'AUTEUR vient de la session, jamais de la saisie — sinon n'importe qui
 *    deposerait un enchainement au nom d'un autre ;
 *  - `overrideAccess: false` laisse les `access` de la collection decider de
 *    l'ecriture (ADD-5), au lieu d'une seconde regle ecrite ici ;
 *  - la visibilite est ramenee a une valeur connue, defaut PRIVE : une valeur
 *    inattendue ne doit jamais aboutir a un partage (FR-17, AD-6).
 *
 * Renvoie un resultat plutot que de lever : un echec doit revenir au
 * compositeur, qui garde la chaine a l'ecran (NFR-4, UX-DR16).
 */
export async function enregistrerEnchainement(
  saisie: SaisieEnchainement,
): Promise<ResultatEnregistrement> {
  const titre = saisie.titre.trim()
  if (titre === '') return { ok: false, message: 'Il manque un titre.' }
  if (saisie.passes.length === 0) {
    return { ok: false, message: 'Un enchaînement contient au moins une passe.' }
  }

  // Le lien de la musique est revalide ICI, jamais seulement dans le
  // compositeur : il finira en `<a href>` sur une fiche que d'autres lisent.
  // La collection le refuse aussi de son cote — trois gardes, independantes.
  const musiqueTitre = saisie.musique.titre.trim()
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
    // Forme « action » de la porte (Story 3.5) : elle RENVOIE la session au lieu
    // de rediriger. Rediriger ici jetterait la chaine deja composee a l ecran.
    const user = await sessionCourante()

    if (!user) {
      return {
        ok: false,
        message: 'Session expirée : reconnecte-toi, puis relance l’enregistrement.',
      }
    }

    const enchainement = await payload.create({
      collection: 'enchainements',
      overrideAccess: false,
      user,
      data: {
        titre,
        description: saisie.description.trim() || undefined,
        musique: { titre: musiqueTitre || undefined, lien: musiqueLien ?? undefined },
        // `urlVideo` en base, `video` a la saisie : le champ historique garde
        // son nom, l'interface ne parle plus de YouTube.
        urlVideo: video ?? undefined,
        notes: saisie.notes.trim() || undefined,
        date: jourVersISO(saisie.date),
        auteur: user.id,
        visibilite,
        // L'index EST l'ordre (ADD-18) : la chaine arrive deja ordonnee.
        passes: saisie.passes.map((passe) => ({ passe })),
      },
    })

    return { ok: true, id: enchainement.id }
  } catch (erreur) {
    // Le message de Payload est deja redige pour un humain (validation,
    // relation introuvable) : le montrer vaut mieux qu'un « erreur serveur ».
    const message = erreur instanceof Error ? erreur.message : ''
    return {
      ok: false,
      message: message || "L'enregistrement a échoué. Ton enchaînement est toujours là : réessaie.",
    }
  }
}
