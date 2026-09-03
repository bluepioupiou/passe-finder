import type { CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'

import { adminSeul } from './acces'
import { DANSE_V1 } from './Danse'
import { nomDeTransition } from './Transition'

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
        //
        // LES DEUX ARETES DU GRAPHE SONT GARDEES, pas seulement les passes : une
        // transition (Story 4.7) pointe elle aussi vers deux positions, et rien
        // ne la protegerait sinon. Elle survivrait a la suppression en pointant
        // dans le vide, et le compositeur proposerait un changement de prise
        // vers une position qui n'existe plus.
        // Annotation explicite : sans elle, TypeScript deduit de ce `or` une
        // union de formes distinctes plutot que le type `Where` de Payload.
        const aretes: Where = {
          or: [{ positionDebut: { equals: id } }, { positionFin: { equals: id } }],
        }

        const [passes, transitions] = await Promise.all([
          req.payload.find({ collection: 'passes', where: aretes, limit: 5, depth: 0 }),
          req.payload.find({ collection: 'transitions', where: aretes, limit: 5, depth: 0 }),
        ])

        if (passes.totalDocs === 0 && transitions.totalDocs === 0) return

        // Message actionnable : on nomme les documents fautifs pour que l'admin
        // sache exactement quoi retirer d'abord.
        const enumerer = (total: number, noms: string[]) => {
          const reste = total - noms.length
          return noms.join(', ') + (reste > 0 ? ` et ${reste} autre${reste > 1 ? 's' : ''}` : '')
        }

        const griefs: string[] = []

        if (passes.totalDocs > 0) {
          const noms = passes.docs.map((passe) => `« ${passe.nom} »`)
          griefs.push(
            `${passes.totalDocs} passe${passes.totalDocs > 1 ? 's' : ''} ` +
              `(${enumerer(passes.totalDocs, noms)})`,
          )
        }

        if (transitions.totalDocs > 0) {
          // Le nom d'une transition est facultatif : on la designe par son
          // trajet, qui l'identifie toujours (l'unicite de A -> B y veille).
          const noms = transitions.docs.map(
            (transition) => `« ${nomDeTransition(transition.nom)} »`,
          )
          griefs.push(
            `${transitions.totalDocs} transition${transitions.totalDocs > 1 ? 's' : ''} ` +
              `(${enumerer(transitions.totalDocs, noms)})`,
          )
        }

        throw new APIError(
          `Suppression impossible : cette position est utilisée par ${griefs.join(' et ')}. ` +
            "Retire d'abord ces éléments, ou fais-les pointer vers une autre position.",
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
        description: 'Optionnelle. A defaut, le placeholder « no_position » est affiche.',
      },
    },
    {
      name: 'schemaCompose',
      type: 'json',
      label: 'Schéma composé',
      admin: {
        // Illisible a l'oeil nu et edite par l'atelier, pas au clavier : il n'a
        // rien a faire dans le formulaire du back-office.
        hidden: true,
        description: "Composition de l'atelier de schema. Rempli automatiquement.",
      },
      // POURQUOI `admin.hidden` ET NON `hidden: true`, contrairement a
      // `legacyId` juste en dessous.
      //
      // `hidden: true` sort AUSSI le champ des reponses de l'API : il faut
      // alors `showHiddenFields: true` a chaque relecture. C'est sans risque
      // pour `legacyId`, que seuls des scripts de migration relisent. Ici, le
      // champ est relu par une PAGE, a chaque edition — et un oubli n'echouerait
      // pas : l'atelier s'ouvrirait VIERGE sur une position deja composee, et le
      // premier enregistrement ecraserait le travail sans un mot.
      //
      // Le prix de ce choix est le poids du JSON dans les listes. S'il devient
      // sensible, la parade est `select` sur les `payload.find` concernes — un
      // reglage local, reversible, et qui ne peut pas detruire de donnees.
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
