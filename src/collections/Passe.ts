import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

/** Libellés de difficulté, décidés avec Alain (2026-08-26). */
export const DIFFICULTES = [
  { label: 'Débutant', value: '1' },
  { label: 'Facile', value: '2' },
  { label: 'Intermédiaire', value: '3' },
  { label: 'Avancé', value: '4' },
] as const

/**
 * Libellé lisible d'un niveau de difficulté ('1' à '4').
 *
 * Vit ici, à côté des valeurs : chaque surface d'affichage (liste, fiche,
 * résultats de recherche) doit lire le même libellé, sans le réécrire.
 */
export function libelleDifficulte(valeur?: string | null): string | null {
  if (!valeur) return null
  return DIFFICULTES.find((difficulte) => difficulte.value === valeur)?.label ?? null
}

/**
 * Passe — mouvement reliant une position de départ à une position d'arrivée.
 *
 * C'est ici que vit le graphe (AD-2) : les aretes sont `positionDebut` et
 * `positionFin`. Le futur moteur de composition (Epic 4) lira « les passes dont
 * positionDebut = position courante ».
 *
 * La danse n'est PAS stockée sur la passe : elle se déduit de ses positions
 * (AD-5). Un hook garantit que les deux positions appartiennent à la même danse.
 */
export const Passe: CollectionConfig = {
  slug: 'passes',
  labels: {
    singular: 'Passe',
    plural: 'Passes',
  },
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'positionDebut', 'positionFin', 'difficulte'],
  },
  access: {
    // Catalogue de reference : lecture publique (FR-21).
    read: () => true,
    // TODO (Story 3.4) : restreindre au drapeau `admin`. En attendant, ecriture
    // reservee aux utilisateurs authentifies. Regles ici uniquement (AD-3).
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        // AD-6 / FR-8 : une passe utilisée par un enchaînement ne se supprime
        // pas. Sans cette garde, la suppression viderait silencieusement un
        // maillon au milieu des enchaînements des élèves — leur contenu de
        // révision. Pendant de la garde de Position (Story 2.4).
        const utilisee = await req.payload.find({
          collection: 'enchainements',
          where: { 'passes.passe': { equals: id } },
          limit: 5,
          depth: 0,
          // La garde protège TOUS les enchaînements, y compris ceux que
          // l'appelant n'a pas le droit de lire (privés d'autrui).
          overrideAccess: true,
        })

        if (utilisee.totalDocs === 0) return

        const titres = utilisee.docs.map((enchainement) => `« ${enchainement.titre} »`)
        const reste = utilisee.totalDocs - titres.length
        const liste = titres.join(', ') + (reste > 0 ? ` et ${reste} autre${reste > 1 ? 's' : ''}` : '')

        throw new APIError(
          `Suppression impossible : cette passe est utilisée par ${utilisee.totalDocs} enchaînement` +
            `${utilisee.totalDocs > 1 ? 's' : ''} (${liste}). ` +
            "Retire d'abord la passe de ces enchaînements.",
          400,
        )
      },
    ],
    beforeValidate: [
      async ({ data, req }) => {
        // AD-5 / FR-5 : une passe ne relie jamais deux danses differentes.
        const debut = data?.positionDebut
        const fin = data?.positionFin
        if (!debut || !fin) return data

        const [positionDebut, positionFin] = await Promise.all([
          req.payload.findByID({
            collection: 'positions',
            id: debut,
            depth: 0,
            disableErrors: true,
          }),
          req.payload.findByID({
            collection: 'positions',
            id: fin,
            depth: 0,
            disableErrors: true,
          }),
        ])

        if (!positionDebut || !positionFin) return data

        if (positionDebut.danse !== positionFin.danse) {
          // `APIError` avec le statut 400 : l'appelant recoit un refus de
          // validation lisible, pas une erreur serveur opaque.
          throw new APIError(
            'Une passe doit relier deux positions de la même danse : ' +
              `« ${positionDebut.nom} » et « ${positionFin.nom} » appartiennent à des danses différentes.`,
            400,
          )
        }

        return data
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
      name: 'positionDebut',
      type: 'relationship',
      relationTo: 'positions',
      required: true,
      label: 'Position de départ',
      admin: {
        description: 'À choisir parmi les positions existantes (FR-4).',
      },
    },
    {
      name: 'positionFin',
      type: 'relationship',
      relationTo: 'positions',
      required: true,
      label: "Position d'arrivée",
      admin: {
        description: 'À choisir parmi les positions existantes (FR-4).',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Présentation générale de la passe.',
      },
    },
    {
      name: 'deroule',
      type: 'textarea',
      label: 'Déroulé',
      admin: {
        description: 'Comment exécuter la passe, temps par temps.',
      },
    },
    {
      name: 'difficulte',
      type: 'select',
      // FR : la difficulte est optionnelle (AC #3).
      required: false,
      label: 'Difficulté',
      options: [...DIFFICULTES],
    },

    // --- Champs d'archivage legacy (AD-8 / ADD-10) -------------------------
    // Conserves en base pour ne rien perdre de l'historique, mais JAMAIS
    // exposes en v1 : ni dans l'admin, ni dans l'UI.
    // `hidden: true` au niveau du CHAMP (et pas seulement de `admin`) : Payload
    // les retire alors AUSSI des reponses de l'API, ce qu'exige AD-8/ADD-10
    // (« non lus par l'API, l'admin ou l'UI »). Ils restent interrogeables par
    // l'API Local a condition de demander `showHiddenFields: true` — ce que
    // fait la migration pour assurer sa rejouabilite.
    {
      name: 'legacyYoutubeUrl',
      type: 'text',
      label: 'URL YouTube (historique)',
      hidden: true,
    },
    {
      name: 'legacyPersonnalisations',
      type: 'json',
      label: 'Personnalisations (historique)',
      hidden: true,
    },
    {
      name: 'legacyId',
      type: 'number',
      unique: true,
      label: 'Identifiant historique',
      hidden: true,
    },
  ],
}
