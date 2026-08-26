import type { CollectionConfig } from 'payload'

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
    // TODO (Story 3.4) : restreindre au drapeau `admin` une fois celui-ci
    // introduit sur la collection users. En attendant, ecriture reservee aux
    // utilisateurs authentifies. Les regles vivent ici, jamais dans l'UI (AD-3).
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
