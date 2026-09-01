import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { adminSeul } from './acces'

/**
 * Transition — changement de prise entre deux positions, SANS passe (Story 4.7).
 *
 * Une transition ne comble pas un trou du graphe : elle EVITE DE DEPENSER UNE
 * PASSE. Dix des dix-huit trajets de rupture releves dans l'historique ont deja
 * une passe qui fait exactement ce chemin — « main gauche / main droite » vers
 * « main droite / main droite » est aussi ce que fait « Changement de cote
 * changement de main ». Ce qui distingue la transition, c'est qu'elle ne prend
 * PAS DE TEMPS MUSICAL : on lache une main a la fin de la passe precedente, et
 * on repart. D'ou la consequence de modele : on ne resout pas les ruptures en
 * ajoutant des passes au catalogue, et une transition n'est jamais un maillon
 * d'enchainement.
 *
 * L'ARETE PORTE SUR LES POSITIONS, PAS SUR LES PASSES, et c'est l'historique qui
 * l'a tranche : dix-neuf passes differentes arrivent en « main gauche / main
 * droite » et rupturent, et toutes visent le meme petit groupe de cibles —
 * aucune exception. Le determinant est la position d'arrivee. Declarer la meme
 * regle sur les quarante-quatre passes qui aboutissent la serait la recopier au
 * lieu de la dire. Le jour ou une passe interdira reellement toute transition
 * apres elle, la reponse sera une LISTE NOIRE sur cette passe : on modelise la
 * regle generale la ou elle est generale, l'exception la ou elle est
 * exceptionnelle.
 *
 * L'arete est DIRIGEE. « Mains croisees (main gauche au dessus) » vers « main
 * droite / main droite » existe quatorze fois dans l'historique, l'inverse
 * jamais. Declarer un sens n'ouvre donc pas l'autre.
 *
 * Reprend la table `alternative` de l'ancienne appli (2009), migree telle quelle
 * par `migrate/migrate-transitions.ts` — dix aretes, avec leur texte de prof.
 */
export const Transition: CollectionConfig = {
  slug: 'transitions',
  labels: {
    singular: 'Transition',
    plural: 'Transitions',
  },
  admin: {
    useAsTitle: 'nom',
    defaultColumns: ['nom', 'positionDebut', 'positionFin'],
    description:
      'Changer de prise sans danser de passe — « lâcher la main gauche ». Le sens compte : ' +
      "déclarer A → B n'ouvre pas B → A.",
  },
  access: {
    // Catalogue de reference : lecture publique (FR-21), comme Position et Passe.
    read: () => true,
    // FR-29 / AD-3 / ADD-5 : l'ecriture du catalogue est reservee au drapeau
    // `admin`, et la regle vit ici seulement — jamais dans l'UI.
    create: adminSeul,
    update: adminSeul,
    delete: adminSeul,
  },
  hooks: {
    // Pas de `beforeDelete`, contrairement a Position et Passe : une transition
    // n'est REFERENCEE NULLE PART. Les enchainements ne stockent que des passes,
    // et la transition entre deux maillons se DEDUIT du couple (position
    // d'arrivee, position de depart suivante). La supprimer ne casse donc aucun
    // enchainement : la reprise cesse simplement d'etre nommee, et redevient ce
    // qu'elle est aujourd'hui pour les ruptures historiques non declarees.
    beforeValidate: [
      async ({ data, req, originalDoc }) => {
        const debut = data?.positionDebut ?? originalDoc?.positionDebut
        const fin = data?.positionFin ?? originalDoc?.positionFin
        if (!debut || !fin) return data

        // Une transition vers soi-meme ne veut rien dire, et elle serait
        // invisible : aucune rupture ne se declencherait pour la nommer.
        if (debut === fin) {
          throw new APIError(
            'Une transition doit relier deux positions différentes : le départ et ' +
              "l'arrivée sont la même position.",
            400,
          )
        }

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

        // Meme regle que la passe (AD-5) : une transition ne relie jamais deux
        // danses differentes.
        if (positionDebut.danse !== positionFin.danse) {
          throw new APIError(
            'Une transition doit relier deux positions de la même danse : ' +
              `« ${positionDebut.nom} » et « ${positionFin.nom} » appartiennent à des ` +
              'danses différentes.',
            400,
          )
        }

        // UNICITE DE A -> B : c'est l'invariant qui rend la lecture possible. La
        // vue retrouve la transition d'une reprise par son SEUL couple de
        // positions (rien n'est stocke dans l'enchainement) ; avec deux
        // transitions A -> B, elle ne saurait laquelle nommer.
        const doublons = await req.payload.find({
          collection: 'transitions',
          where: {
            and: [{ positionDebut: { equals: debut } }, { positionFin: { equals: fin } }],
          },
          limit: 2,
          depth: 0,
          overrideAccess: true,
        })

        const autre = doublons.docs.find((transition) => transition.id !== originalDoc?.id)
        if (autre) {
          throw new APIError(
            `Une transition « ${positionDebut.nom} » → « ${positionFin.nom} » existe déjà. ` +
              "Modifie-la plutôt que d'en créer une seconde.",
            400,
          )
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'positionDebut',
      type: 'relationship',
      relationTo: 'positions',
      required: true,
      label: 'Position de départ',
      admin: {
        description: "La position où l'on arrive à la fin de la passe précédente.",
      },
    },
    {
      name: 'positionFin',
      type: 'relationship',
      relationTo: 'positions',
      required: true,
      label: "Position d'arrivée",
      admin: {
        description: "La position d'où l'on repart, sans avoir dansé de passe.",
      },
    },
    {
      // FACULTATIF, et c'est delibere : la migration reprend les dix textes de
      // 2009 sans leur inventer de nom (« tout migrer, ne rien inventer »,
      // principe pose pour la migration de l'historique). A defaut, l'affichage
      // dit « Changement de prise » — voir `nomDeTransition`.
      name: 'nom',
      type: 'text',
      label: 'Nom',
      admin: {
        description: "Court, à l'impératif. Ex. « Lâcher la main gauche ». Facultatif.",
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Comment faire le changement de prise, en une phrase.',
      },
    },
    {
      name: 'legacyId',
      type: 'number',
      unique: true,
      label: 'Identifiant historique',
      // Trace de la migration de la table `alternative` : permet de rejouer
      // l'import sans creer de doublon. Masque de l'admin ET des reponses de
      // l'API ; la migration le relit avec `showHiddenFields: true`.
      hidden: true,
    },
  ],
}

/** Ce qu'on affiche d'une transition sans nom (le cas des dix migrées de 2009). */
export const TRANSITION_SANS_NOM = 'Changement de prise'

/**
 * Libellé d'une transition : son nom, ou le libellé par défaut.
 *
 * Vit ici, à côté du champ facultatif qui la rend nécessaire : la vue lecture et
 * le compositeur affichent tous les deux une transition, et ne doivent pas
 * écrire deux fois la même règle de repli.
 */
export function nomDeTransition(nom?: string | null): string {
  const propre = (nom ?? '').trim()
  return propre === '' ? TRANSITION_SANS_NOM : propre
}
