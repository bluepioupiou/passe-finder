import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { PIVOTS } from '../orientation'
import { erreurPositionsIntermediaires } from '../positions-intermediaires'
import { DUREES, dureeDe } from '../rythme'
import { adminSeul } from './acces'

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
  // Une passe PEUPLEE (dans un enchainement, une transition…) n'emporte pas
  // ses positions intermediaires : elles ne servent que sur sa fiche (AD-16).
  defaultPopulate: { positionsIntermediaires: false },
  admin: {
    useAsTitle: 'nom',
    // `pivot` en colonne : avec le filtre « n'existe pas », c'est la liste de
    // saisie des passes encore sans orientation (Epic 7).
    // `duree` en colonne : les rares passes de 10 temps se reperent d'un coup
    // d'oeil (Epic 8) ; vide = 6 temps.
    defaultColumns: ['nom', 'positionDebut', 'positionFin', 'difficulte', 'pivot', 'duree'],
  },
  access: {
    // Catalogue de reference : lecture publique (FR-21).
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
      ({ data, originalDoc }) => {
        // AD-16 / FR-50 : les positions intermediaires tiennent dans la duree,
        // une par instant. Une mise a jour PARTIELLE (la duree seule, depuis
        // le formulaire de la fiche) se juge sur ce qui est deja enregistre :
        // c'est le cas qui protege un dessin d'une duree reduite.
        const recues = data && 'positionsIntermediaires' in data
        const lignes =
          (recues ? data.positionsIntermediaires : originalDoc?.positionsIntermediaires) ?? []
        const duree = dureeDe(data && 'duree' in data ? data.duree : originalDoc?.duree)

        const erreur = erreurPositionsIntermediaires(lignes, duree)
        if (erreur) throw new APIError(erreur, 400)

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
    {
      name: 'pivot',
      type: 'select',
      // Epic 7 : facultatif, et une absence n'est JAMAIS lue comme 0 — au
      // deploiement aucune passe n'en a (voir `pivotDe`, src/orientation.ts).
      required: false,
      label: 'Pivot du couple',
      options: [...PIVOTS],
      admin: {
        description:
          "De combien le couple a tourné par rapport à la ligne de danse entre le départ et l'arrivée. " +
          'Le résultat, pas le sens dans lequel on tourne. Laisser vide tant que ce n’est pas vérifié.',
      },
    },
    {
      name: 'duree',
      type: 'select',
      // Epic 8 : facultatif, et ici l'absence VAUT 6 temps (voir `dureeDe`,
      // src/rythme.ts) — c'est la duree de la tres grande majorite des passes.
      required: false,
      label: 'Durée',
      options: [...DUREES],
      admin: {
        description:
          'Vide = 6 temps. 10 temps répète « 3 et 4 . 5 et 6 . » pour une passe ralentie.',
      },
    },
    {
      name: 'positionsIntermediaires',
      type: 'array',
      label: 'Positions intermédiaires',
      // Epic 8 (AD-16) : des schemas d'atelier poses sur les instants du
      // comptage, sans nom ni fiche. `admin.hidden` et NON `hidden: true` : la
      // fiche publique doit les lire, mais l'admin ne sait pas afficher
      // l'atelier — ils se gerent depuis la page « Modifier » de la fiche.
      admin: { hidden: true },
      fields: [
        {
          name: 'instant',
          type: 'number',
          required: true,
          admin: { description: 'Index du demi-temps dans le comptage (0 = « 1 »).' },
        },
        {
          name: 'schema',
          type: 'json',
          required: true,
        },
      ],
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
