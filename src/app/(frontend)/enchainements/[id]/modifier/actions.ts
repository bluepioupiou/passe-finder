'use server'

import { getPayload } from 'payload'

import { jourVersISO, type ResultatEnregistrement, type SaisieMetadonnees } from '@/composition'
import { lienEcoutable } from '@/musique'
import { VISIBILITES } from '@/collections/Enchainement'
import config from '@/payload.config'
import { sessionCourante } from '@/porte'

/**
 * Met a jour les informations d'un enchainement (Story 4.5, FR-18).
 *
 * MEME DISCIPLINE QUE L'ENREGISTREMENT (Story 4.3), et pour la meme raison :
 * une action serveur est une porte publique, aussi atteignable qu'une route
 * d'API. Tout est donc reverifie ici, jamais seulement dans le formulaire.
 *
 *  - `overrideAccess: false` avec l'utilisateur de la SESSION : ce sont les
 *    `access` de la collection (`auteurOuAdmin`) qui decident, pas une seconde
 *    regle ecrite ici. Un compte qui n'est pas l'auteur ne trouve simplement
 *    pas le document — il ne recoit pas un refus qui lui apprendrait qu'il
 *    existe ;
 *  - l'AUTEUR n'est jamais dans les donnees ecrites : on ne peut pas se donner
 *    l'enchainement d'un autre, ni le donner a quelqu'un d'autre par megarde ;
 *  - la CHAINE n'est pas touchee. Cet ecran modifie les informations, pas la
 *    suite des passes (qui se compose, elle). Ne pas l'envoyer du tout est plus
 *    sur que de la renvoyer inchangee : rien ne peut la vider par accident ;
 *  - la visibilite est ramenee a une valeur connue, defaut PRIVE : une valeur
 *    inattendue ne doit jamais aboutir a un partage (FR-17, AD-6).
 *
 * Renvoie un resultat plutot que de lever : un echec doit revenir au formulaire,
 * qui garde la saisie a l'ecran (NFR-4, UX-DR16).
 */
export async function modifierEnchainement(
  id: number,
  saisie: SaisieMetadonnees,
): Promise<ResultatEnregistrement> {
  const titre = saisie.titre.trim()
  if (titre === '') return { ok: false, message: 'Il manque un titre.' }

  const musiqueLienSaisi = saisie.musique.lien.trim()
  const musiqueLien = lienEcoutable(musiqueLienSaisi)
  if (musiqueLienSaisi !== '' && musiqueLien === null) {
    return {
      ok: false,
      message: 'Le lien de la musique doit être une adresse web (http:// ou https://).',
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
        date: jourVersISO(saisie.date) ?? null,
        visibilite,
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
