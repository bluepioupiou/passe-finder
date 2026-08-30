import type { CollectionConfig } from 'payload'

/** Visibilité d'un enchaînement (FR-17, AD-6). */
export const VISIBILITES = [
  { label: 'Privé', value: 'prive' },
  { label: 'Partagé', value: 'partage' },
] as const

/**
 * Enchaînement — suite ORDONNÉE de passes (FR-14, ADD-18).
 *
 * L'ordre est porté par le tableau `passes` lui-même : l'index EST l'ordre.
 * Aucun champ « rang » à maintenir en parallèle, donc aucun risque de
 * désynchronisation entre deux sources de vérité (ADD-18).
 *
 * La chaîne ne stocke PAS les positions : elles se déduisent des passes
 * (`positionDebut` / `positionFin`), qui portent le graphe (AD-2). Une seule
 * source de vérité pour le parcours.
 *
 * IMPORTANT — la continuité n'est PAS imposée ici. Le compositeur (Story 4.2)
 * ne proposera que des passes qui partent de la position courante, donc les
 * enchaînements créés dans l'app sont continus par construction. Mais
 * l'historique migré, lui, contient 59 enchaînements où la passe suivante ne
 * part pas de la position d'arrivée de la précédente : ce sont des
 * TRANSITIONS de main réelles (lâcher une main pour passer de « mains
 * décroisées » à « main droite / main gauche »), que l'ancienne appli notait
 * en insérant une position seule dans la chaîne. Interdire la discontinuité
 * ici reviendrait à refuser la moitié de l'historique d'Alain.
 * La vue lecture affichera ces sauts explicitement (« reprise en X »), et un
 * futur objet Transition les rendra composables — voir le backlog.
 */
export const Enchainement: CollectionConfig = {
  slug: 'enchainements',
  labels: {
    singular: 'Enchaînement',
    plural: 'Enchaînements',
  },
  admin: {
    useAsTitle: 'titre',
    defaultColumns: ['titre', 'date', 'visibilite', 'auteur'],
  },
  access: {
    // FR-17 / AD-6 : un visiteur anonyme ne voit QUE les enchaînements
    // partagés. La règle est une contrainte de requête, pas un filtre d'UI :
    // elle s'applique aussi à l'API et à la recherche (AD-3).
    read: ({ req }) => {
      if (req.user) return true // TODO (Story 4.4) : limiter aux siens + partagés d'autrui.
      return { visibilite: { equals: 'partage' } }
    },
    // Tout compte connecté crée SON enchaînement : c'est le geste central du
    // produit, il n'est pas réservé à l'admin (contrairement au catalogue).
    create: ({ req }) => Boolean(req.user),
    // TODO (Story 4.5) : restreindre à l'auteur. AUJOURD'HUI TOUT COMPTE
    // CONNECTÉ PEUT MODIFIER L'ENCHAÎNEMENT D'UN AUTRE. Inoffensif tant que
    // personne ne peut se connecter hors /admin, mais cette règle DOIT être
    // posée avant la Story 3.1 (inscription publique), sinon le premier
    // inscrit peut réécrire le travail des autres élèves.
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'titre',
      type: 'text',
      required: true,
      label: 'Titre',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: "Ce qu'il faut retenir de l'enchaînement.",
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notes',
      admin: {
        description: 'Notes personnelles (points de vigilance, variantes).',
      },
    },
    {
      name: 'date',
      type: 'date',
      label: 'Date',
      admin: {
        description: 'Date du cours ou de la soirée.',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
      },
    },
    {
      name: 'auteur',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Auteur',
      admin: {
        // TODO (Story 4.3) : rempli automatiquement avec l'utilisateur connecté.
        description: "Propriétaire de l'enchaînement.",
      },
    },
    {
      name: 'visibilite',
      type: 'select',
      required: true,
      // AD-6 : on ne partage JAMAIS par accident. Le défaut est privé, y
      // compris pour toute création qui oublierait de renseigner le champ.
      defaultValue: 'prive',
      label: 'Visibilité',
      options: [...VISIBILITES],
    },
    {
      name: 'passes',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Passes',
      labels: { singular: 'Passe', plural: 'Passes' },
      admin: {
        description: "L'ordre des lignes EST l'ordre de l'enchaînement.",
      },
      fields: [
        {
          name: 'passe',
          type: 'relationship',
          relationTo: 'passes',
          required: true,
          label: 'Passe',
        },
      ],
    },
    {
      name: 'urlVideo',
      type: 'text',
      label: 'Vidéo YouTube',
      admin: {
        description: "Facultative. Lien vers la vidéo de l'enchaînement (FR-37).",
      },
    },

    // --- Champs d'archivage legacy (AD-8 / ADD-10) -------------------------
    // Conservés en base, jamais exposés : `hidden` au niveau du CHAMP retire
    // aussi la valeur des réponses de l'API. La migration les relit avec
    // `showHiddenFields: true`.
    {
      name: 'legacyId',
      type: 'number',
      unique: true,
      label: 'Identifiant historique',
      hidden: true,
    },
    {
      name: 'legacyMarqueurs',
      type: 'json',
      label: 'Marqueurs de transition (historique)',
      // Les positions insérées seules dans les chaînes de l'ancienne appli.
      // Redondantes aujourd'hui (elles valent la position de départ de la passe
      // suivante, donc déductibles du graphe), mais conservées telles quelles :
      // elles sont la trace des transitions de main, matière première de la
      // future collection Transition.
      hidden: true,
    },
    {
      name: 'legacyMeta',
      type: 'json',
      label: 'Métadonnées historiques',
      // difficulté, lesson_id, auteur d'origine, published, dates : hors modèle
      // v1 mais rien ne se perd.
      hidden: true,
    },
  ],
}
