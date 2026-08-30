import type { CollectionConfig } from 'payload'

import { adminSeul } from './acces'

/**
 * Danse — dimension de premier ordre du modele (FR-6).
 *
 * En v1 une seule danse existe (« rock 6 temps ») et le selecteur est masque
 * dans l'interface (ADD-18). Le modele accepte neanmoins plusieurs danses sans
 * changement de schema, pour l'extension future.
 */
export const Danse: CollectionConfig = {
  slug: 'danses',
  labels: {
    singular: 'Danse',
    plural: 'Danses',
  },
  admin: {
    useAsTitle: 'nom',
    // v1 mono-danse : rien a gerer au quotidien, on n'encombre pas la barre laterale.
    hidden: true,
  },
  access: {
    // Le catalogue de reference est public en lecture (FR-7, FR-21).
    read: () => true,
    // Story 3.4 (FR-29) : l'ecriture du catalogue de reference est reservee au
    // drapeau `admin`. Regles ici uniquement, jamais dans l'UI (AD-3 / ADD-5).
    create: adminSeul,
    update: adminSeul,
    delete: adminSeul,
  },
  fields: [
    {
      name: 'nom',
      type: 'text',
      required: true,
      unique: true,
      label: 'Nom',
    },
  ],
}

/** Nom de la seule danse presente en v1. */
export const DANSE_V1 = 'rock 6 temps'
