import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  Where,
} from 'payload'

import { nouvelIdentifiantPublic } from '../identifiant-public'
import { lienSur } from '../liens'
import { normaliserTexte } from '../recherche'
import { titreDuMorceau } from '../musique-oembed'
import { VISIBILITES } from '../visibilite'
import { auteurOuAdmin, estAdmin, peutCreerEnchainement } from './acces'

/** Les deux moitiés du champ musique, telles qu'elles arrivent à l'écriture. */
type SaisieMusique = { titre?: string | null; lien?: string | null }

/**
 * Complète le TITRE de la musique quand seul le lien a été donné (demande
 * d'Alain, 2026-08-31).
 *
 * POSÉ SUR LA COLLECTION, et non dans l'action du compositeur : /admin, l'API
 * et le compositeur écrivent tous les trois, et une règle écrite trois fois
 * dérive. Ici elle vaut pour toute écriture, quelle que soit la porte.
 *
 * Il ne se déclenche QUE si l'écriture porte un lien et qu'aucun titre n'est
 * connu — ni dans la saisie, ni sur le document existant. Autrement dit : on
 * ne recouvre jamais ce qu'un humain a écrit, et une modification qui ne
 * touche pas à la musique n'appelle personne.
 *
 * L'échec est un NON-ÉVÉNEMENT : `titreDuMorceau` ne lève jamais et rend `null`
 * si le fournisseur ne répond pas. L'enregistrement continue avec le lien seul,
 * la fiche affiche « Écouter sur Spotify » comme avant.
 */
const completerTitreMusique: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const saisie = (data as { musique?: SaisieMusique | null }).musique
  const lien = saisie?.lien
  if (!lien) return data

  const existant = (originalDoc as { musique?: SaisieMusique | null } | undefined)?.musique
  const dejaConnu = (saisie?.titre ?? existant?.titre ?? '').trim()
  if (dejaConnu !== '') return data

  const titre = await titreDuMorceau(lien)
  if (titre === null) return data

  return { ...data, musique: { ...saisie, titre } }
}

/**
 * Tient à jour le TITRE NORMALISÉ, sur lequel la liste cherche.
 *
 * POURQUOI UNE COLONNE ET PAS UN `like` SUR LE TITRE : la recherche du site est
 * insensible aux accents depuis la Story 5.4 — « chore » trouve
 * « Chorégraphie », et c'est délibéré (on tape sans accents). Le `LIKE` de
 * SQLite, lui, est accentué : `chore` n'y trouve pas `Choré`. Tant que la liste
 * filtrait en mémoire, la question ne se posait pas ; le jour où elle pagine,
 * le filtre DOIT devenir une contrainte de requête — sinon on ne filtrerait que
 * la page affichée. Cette colonne est ce qui permet les deux à la fois.
 *
 * Dérivée, jamais saisie : elle se recalcule à chaque écriture du titre. C'est
 * une seule source de vérité (le titre), plus un index.
 */
const normaliserLeTitre: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const titre = (data as { titre?: string }).titre ?? (originalDoc as { titre?: string })?.titre

  if (typeof titre !== 'string') return data

  return { ...data, titreNormalise: normaliserTexte(titre) }
}

/**
 * Donne son IDENTIFIANT PUBLIC à un enchaînement qui n'en a pas encore
 * (action item `identifiant-opaque-et-visibilites`).
 *
 * SUR LA COLLECTION, donc pour toute écriture : /admin, l'API, le compositeur
 * et les scripts de migration créent tous des enchaînements. Un identifiant
 * posé dans une seule de ces portes laisserait les autres produire des
 * documents inatteignables — ils n'auraient aucune URL.
 *
 * NE LE RÉÉCRIT JAMAIS. Un identifiant public est une adresse : la changer
 * casserait tous les liens déjà envoyés, et c'est précisément le contraire de
 * ce que cette colonne existe pour offrir. D'où la garde sur `originalDoc`.
 */
const donnerUnIdentifiantPublic: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const existant = (originalDoc as { idPublic?: string | null } | undefined)?.idPublic
  const propose = (data as { idPublic?: string | null }).idPublic

  if (existant) return { ...data, idPublic: existant }
  if (propose) return data

  return { ...data, idPublic: nouvelIdentifiantPublic() }
}

/**
 * Retire les FAVORIS qui pointaient sur l'enchaînement, AVANT de le supprimer
 * (Story 4.5).
 *
 * `beforeDelete` ET PAS `afterDelete`, et ce n'est pas un détail de style : la
 * colonne `favoris.enchainement_id` est NOT NULL, et la clé étrangère la met à
 * NULL quand la cible disparaît. Sans ce ménage préalable, SQLite REFUSE la
 * suppression (`SQLITE_CONSTRAINT_NOTNULL`) — autrement dit, un auteur ne
 * pouvait pas supprimer un enchaînement que quelqu'un avait mis en favori. Un
 * `afterDelete` ne s'exécuterait même jamais : la ligne n'est pas partie.
 * Constaté en test d'intégration, pas déduit.
 *
 * SUR LA COLLECTION ET NON DANS L'ACTION : /admin, l'API et le site suppriment
 * tous les trois. Un ménage écrit dans une seule de ces portes laisserait les
 * deux autres buter sur la même contrainte (ADD-5).
 *
 * `overrideAccess: true` : le ménage n'appartient à personne en particulier. Ce
 * sont les favoris D'AUTRES COMPTES qu'on retire, et l'auteur qui supprime son
 * enchaînement n'a évidemment pas le droit de les lire.
 */
const retirerLesFavoris: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'favoris',
    where: { enchainement: { equals: id } },
    overrideAccess: true,
  })
}

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
    // FR-17 / AD-6 : un visiteur anonyme ne voit QUE les enchaînements PUBLICS.
    // La règle est une contrainte de requête, pas un filtre d'UI : elle
    // s'applique aussi à l'API et à la recherche (AD-3).
    //
    // ELLE REFUSE LE NON-RÉPERTORIÉ COMME ELLE REFUSE LE PRIVÉ, et c'est ce qui
    // porte tout le modèle (voir `src/visibilite.ts`). Sans cela,
    // `GET /api/enchainements` rendrait à n'importe quel visiteur la liste
    // complète des non-répertoriés, et « non répertorié » ne voudrait plus rien
    // dire. Conséquence à connaître : la fiche NE PEUT PAS lire par ici — elle
    // passe par `lireParIdentifiantPublic`, où c'est la possession du lien qui
    // autorise.
    read: ({ req }) => {
      if (estAdmin(req.user)) return true
      // Un compte connecté voit les publics de tous, PLUS les siens quelle
      // que soit leur visibilité. Sans la seconde branche, un auteur perdrait
      // de vue ses propres brouillons privés ; sans la première, il ne verrait
      // plus rien des autres.
      if (req.user) {
        // Annotation explicite : sans elle, TypeScript deduit de ce `or` une
        // union de formes distinctes plutot que le type `Where` de Payload.
        const siensOuPublics: Where = {
          or: [{ visibilite: { equals: 'public' } }, { auteur: { equals: req.user.id } }],
        }
        return siensOuPublics
      }
      return { visibilite: { equals: 'public' } }
    },
    // GEL TEMPORAIRE (2026-08-31) : la création est refermée aux seuls
    // administrateurs, le temps de trancher le modèle de visibilité. Le geste
    // central du produit n'est pas censé être réservé à l'admin — voir
    // `peutCreerEnchainement`, qui porte la raison et la ligne à changer pour
    // rouvrir.
    create: peutCreerEnchainement,
    // Seul l'auteur modifie et supprime (FR-18 / ADD-5). Prérequis de la
    // Story 3.1 : sans cette règle, l'ouverture de l'inscription laisserait le
    // premier inscrit réécrire le travail des autres élèves.
    update: auteurOuAdmin,
    delete: auteurOuAdmin,
  },
  hooks: {
    beforeChange: [donnerUnIdentifiantPublic, completerTitreMusique, normaliserLeTitre],
    beforeDelete: [retirerLesFavoris],
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
      name: 'musique',
      type: 'group',
      label: 'Musique',
      admin: {
        description:
          "Le morceau sur lequel l'enchaînement se danse. Un titre, un lien, ou les deux.",
      },
      fields: [
        {
          name: 'titre',
          type: 'text',
          label: 'Titre',
          admin: {
            description:
              'Ex. « Gene Vincent — Be-Bop-A-Lula ». Survit au lien mort. Laissé vide, il est ' +
              'récupéré depuis le lien quand le fournisseur le publie.',
          },
        },
        {
          name: 'lien',
          type: 'text',
          label: 'Lien',
          admin: {
            description: 'Spotify, Deezer, YouTube… Facultatif.',
          },
          // Ce champ sera rempli par les élèves, et il est RENDU COMME UN LIEN :
          // on refuse ici tout ce qui n'est pas http(s) plutôt que de compter sur
          // l'affichage pour s'en méfier. La fiche reverifie de son côté
          // (`presenterMusique`) — les deux, indépendamment.
          validate: (valeur: string | null | undefined) => {
            if (!valeur || valeur.trim() === '') return true

            return (
              lienSur(valeur) !== null ||
              'Le lien doit être une adresse web (commençant par http:// ou https://).'
            )
          },
        },
      ],
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
      admin: {
        description:
          'Privé : toi seul. Non répertorié : visible par qui a le lien, absent des listes et ' +
          'de la recherche. Public : listé et cherchable.',
      },
    },
    {
      // L'IDENTIFIANT QUI VIT DANS L'URL — voir `src/identifiant-public.ts`.
      // Posé par le hook `donnerUnIdentifiantPublic`, jamais saisi, jamais
      // réécrit : c'est une adresse, et une adresse qui change casse les liens
      // déjà envoyés.
      //
      // PAS `hidden: true` : un champ `hidden` n'est pas queryable dans Payload,
      // et celui-ci n'existe QUE pour être interrogé (c'est par lui que la fiche
      // retrouve l'enchaînement). Masqué de /admin seulement, où il inviterait à
      // le corriger à la main.
      name: 'idPublic',
      type: 'text',
      unique: true,
      index: true,
      label: 'Identifiant public',
      admin: { hidden: true, readOnly: true },
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
      // Le NOM du champ reste `urlVideo` : le renommer imposerait une migration
      // de colonne pour un gain nul — c'est le LIBELLÉ qui parlait de YouTube,
      // et rien n'oblige à passer par lui.
      name: 'urlVideo',
      type: 'text',
      label: 'Vidéo',
      admin: {
        description:
          "Facultatif. Lien vers la vidéo de l'enchaînement — YouTube, Vimeo, " +
          'Dailymotion… (FR-37).',
      },
      // Meme garde que le lien de la musique, et pour la meme raison : la fiche
      // en fait un `<a href>` que d'autres cliquent.
      validate: (valeur: string | null | undefined) => {
        if (!valeur || valeur.trim() === '') return true

        return (
          lienSur(valeur) !== null ||
          'Le lien doit être une adresse web (commençant par http:// ou https://).'
        )
      },
    },

    {
      // Copie normalisée du titre (sans accent ni casse), sur laquelle la liste
      // cherche — voir `normaliserLeTitre`.
      //
      // PAS `hidden: true`, malgré l'envie : un champ `hidden` n'est pas
      // QUERYABLE dans Payload (« The following path cannot be queried »), et ce
      // champ n'existe que pour être interrogé. On le cache donc de /admin
      // seulement, où il inviterait à le corriger à la main alors qu'il se
      // recalcule tout seul. Rien à protéger par ailleurs : c'est le titre
      // public, sans ses accents.
      name: 'titreNormalise',
      type: 'text',
      index: true,
      label: 'Titre normalisé',
      admin: { hidden: true, readOnly: true },
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
