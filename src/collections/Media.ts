import type { CollectionConfig } from 'payload'

/**
 * Media — collection technique portant les fichiers televerses.
 *
 * Payload exige une collection `upload` dediee pour stocker des fichiers. Ce
 * n'est pas une entite du domaine (elle ne figure donc pas dans ADD-2) : c'est
 * le support de l'image d'une Position.
 *
 * Pourquoi pas `upload: true` directement sur Position ? Parce que le fichier
 * deviendrait obligatoire a la creation, ce qui violerait FR-2 (l'image ne doit
 * jamais bloquer la creation d'une position).
 *
 * Stockage : disque local en v1 locale. Le passage a S3 (ADD-13) est un simple
 * changement d'adaptateur, a traiter avec la mise en production.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Fichier',
    plural: 'Fichiers',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texte alternatif',
      admin: {
        description: "Decrit l'image pour l'accessibilite. Pour une position, c'est son nom.",
      },
    },
  ],
  upload: true,
}
