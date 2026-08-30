import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { adminSeul } from './acces'
import { DANSE_V1 } from './Danse'

/**
 * Position — etat statique de la danse (FR-1).
 *
 * L'image est OPTIONNELLE (FR-2) : une position sans image reste parfaitement
 * valide et s'affiche avec le placeholder `no_position`. L'image peut etre
 * ajoutee ou remplacee plus tard sans invalider la position.
 *
 * La danse est portee par la Position (AD-5) ; celle d'une Passe s'en deduira.
 */
export const Position: CollectionConfig = {
  slug: 'positions',
  labels: {
    singular: 'Position',
    plural: 'Positions',
  },
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'image', 'updatedAt'],
  },
  access: {
    // Catalogue de reference : lecture publique, visiteur anonyme inclus (FR-21).
    read: () => true,
    // Story 3.4 (FR-29) : l'ecriture du catalogue de reference est reservee au
    // drapeau `admin`. Regles ici uniquement, jamais dans l'UI (AD-3 / ADD-5).
    create: adminSeul,
    update: adminSeul,
    delete: adminSeul,
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        // AD-6 / FR-8 : on ne supprime jamais une position encore utilisee.
        // Sans cette garde, supprimer une position casserait toutes les passes
        // qui s'y rattachent — donc le contenu de revision des eleves.
        const utilisee = await req.payload.find({
          collection: 'passes',
          where: {
            or: [{ positionDebut: { equals: id } }, { positionFin: { equals: id } }],
          },
          limit: 5,
          depth: 0,
        })

        if (utilisee.totalDocs === 0) return

        // Message actionnable : on nomme les passes fautives pour que l'admin
        // sache exactement quoi retirer d'abord.
        const noms = utilisee.docs.map((passe) => `« ${passe.nom} »`)
        const reste = utilisee.totalDocs - noms.length
        const liste = noms.join(', ') + (reste > 0 ? ` et ${reste} autre${reste > 1 ? 's' : ''}` : '')

        throw new APIError(
          `Suppression impossible : cette position est utilisée par ${utilisee.totalDocs} passe` +
            `${utilisee.totalDocs > 1 ? 's' : ''} (${liste}). ` +
            "Retire d'abord ces passes, ou fais-les pointer vers une autre position.",
          400,
        )
      },
    ],
  },
  fields: [
    {
      name: 'nom',
      type: 'text',
      required: true,
      label: 'Nom',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Comment se placent les partenaires dans cette position.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      // FR-2 : jamais requis. Une position sans image utilise le placeholder.
      required: false,
      label: 'Image',
      admin: {
        description: "Optionnelle. A defaut, le placeholder « no_position » est affiche.",
      },
    },
    {
      name: 'legacyId',
      type: 'number',
      unique: true,
      label: 'Identifiant historique',
      // Trace technique de la migration (FR-32) : permet de rejouer l'import
      // sans creer de doublon. Sans interet fonctionnel : masque de l'admin ET
      // des reponses de l'API. La migration le relit via `showHiddenFields: true`.
      hidden: true,
    },
    {
      name: 'danse',
      type: 'relationship',
      relationTo: 'danses',
      required: true,
      label: 'Danse',
      admin: {
        // ADD-18 : selecteur masque en v1 (mono-danse). Le champ existe pour
        // l'extension future ; il est rempli automatiquement ci-dessous.
        hidden: true,
      },
      hooks: {
        beforeValidate: [
          async ({ value, req }) => {
            if (value) return value
            // v1 mono-danse : rattachement automatique a « rock 6 temps ».
            const danses = await req.payload.find({
              collection: 'danses',
              where: { nom: { equals: DANSE_V1 } },
              limit: 1,
              depth: 0,
            })
            return danses.docs[0]?.id ?? value
          },
        ],
      },
    },
  ],
}
