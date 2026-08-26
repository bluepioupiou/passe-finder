import type { CollectionConfig } from 'payload'

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
    // TODO (Story 3.4) : restreindre au drapeau `admin`. En attendant, ecriture
    // reservee aux utilisateurs authentifies. Regles ici uniquement (AD-3).
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
      admin: {
        // Trace technique de la migration (FR-32) : permet de rejouer l'import
        // sans creer de doublon. Sans interet fonctionnel, donc masque.
        hidden: true,
      },
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
