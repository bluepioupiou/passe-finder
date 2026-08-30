import type { CollectionConfig } from 'payload'

import { adminSeul } from './acces'

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
 * Stockage : disque local, sur un volume persistant en production. Les fichiers
 * sont copies vers S3 toutes les heures (service `sauvegarde-medias`) : c'est
 * une sauvegarde, pas un deplacement du stockage. Le passage a S3 comme
 * stockage de reference (AD-11) reste un simple changement d'adaptateur.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Fichier',
    plural: 'Fichiers',
  },
  access: {
    read: () => true,
    // Story 3.4 : un fichier n'existe ici que pour illustrer une position, donc
    // il suit le meme regime que le catalogue. Laisser le televersement ouvert
    // a tout compte rendrait le verrou des positions decoratif : on ne pourrait
    // pas modifier la position, mais on pourrait remplacer l'image qu'elle
    // affiche.
    create: adminSeul,
    update: adminSeul,
    delete: adminSeul,
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
