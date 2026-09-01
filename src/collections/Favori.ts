import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { estIdentifiantPublic } from '../identifiant-public'
import { estAdmin } from './acces'

/**
 * Retrouve l'enchaînement à partir du LIEN REÇU, et remplit la relation.
 *
 * ON N'ENTRE PAS ICI PAR UN NUMÉRO, et c'est ce qui rend le non-répertorié
 * tenable. Si un favori pouvait se poser sur `enchainement: 42`, n'importe quel
 * compte connecté énumérerait 1, 2, 3… pour se constituer un favori sur chaque
 * non-répertorié — et comme « mes favoris » rejoue le lien pour les afficher,
 * il les lirait tous. La seule adresse acceptée est donc l'identifiant public,
 * qui ne se devine pas (voir `src/identifiant-public.ts`).
 *
 * `beforeValidate` et non `beforeChange` : la relation `enchainement` est
 * `required`, sa validation passe AVANT `beforeChange`. La remplir plus tard
 * ferait échouer toute création, y compris légitime.
 *
 * LE DOCUMENT EST LU EN CONTOURNANT LES `access`, à dessein : sous `access.read`
 * un non-répertorié n'existe pour personne d'autre que son auteur. C'est le
 * lien présenté qui autorise — ici comme sur la fiche. Les règles de ce qu'on a
 * le droit de mettre en favori restent en aval, dans `beforeChange`.
 */
const retrouverParLeLien: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== 'create' || !data) return data

  const idPublic = typeof data.idPublic === 'string' ? data.idPublic : ''
  if (!estIdentifiantPublic(idPublic)) {
    throw new APIError('Il faut le lien de l’enchaînement pour le mettre en favori.', 400)
  }

  const { docs } = await req.payload.find({
    collection: 'enchainements',
    where: { idPublic: { equals: idPublic } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  // ON ÉCRASE TOUJOURS `enchainement`, même quand la résolution échoue. Sans
  // cet écrasement, un appelant qui enverrait À LA FOIS un identifiant public
  // bidon et un numéro de ligne verrait son numéro survivre — et le verrou
  // décrit plus haut sauterait.
  if (!docs[0]) {
    throw new APIError("Ce lien ne correspond à aucun enchaînement.", 404)
  }

  return { ...data, enchainement: docs[0].id }
}

/**
 * Favori — mise en signet d'un enchainement partage d'autrui (Story 5.1,
 * FR-25 / AD-7 / ADD-9).
 *
 * UN LIEN, JAMAIS UNE COPIE. Mettre en favori ne duplique pas l'enchainement :
 * si son auteur le corrige, le favori suit. C'est la raison d'etre de cette
 * collection plutot que d'un champ « copie » sur l'utilisateur.
 *
 * TROIS REGLES, toutes portees ici et pas dans l'interface (ADD-5) :
 *   1. on ne met en favori QUE du partage — un enchainement prive n'est pas
 *      visible, le mettre en signet n'aurait pas de sens ;
 *   2. on ne met PAS en favori le sien — le profil (Story 5.2) montre deja
 *      « mes enchainements » a part ; melanger les deux listes ferait perdre
 *      la distinction entre ce qu'on a ecrit et ce qu'on a mis de cote ;
 *   3. AU PLUS UN favori par couple (utilisateur, enchainement).
 *
 * Payload ne sait pas declarer un index unique composite : l'unicite est donc
 * verifiee dans un hook. A l'echelle du projet (une classe de danse), la course
 * entre deux clics simultanes sur le meme bouton est theorique, et son pire
 * effet serait un doublon sans consequence — que la lecture par couple
 * absorberait de toute facon.
 */
export const Favori: CollectionConfig = {
  slug: 'favoris',
  labels: {
    singular: 'Favori',
    plural: 'Favoris',
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['utilisateur', 'enchainement', 'createdAt'],
    // Rien a gerer a la main : un favori se pose et se retire depuis le site.
    hidden: true,
  },
  access: {
    // CHACUN SES FAVORIS. Ce ne sont pas des donnees publiques : la liste de ce
    // qu'un eleve met de cote le regarde seul.
    read: ({ req }) => {
      if (estAdmin(req.user)) return true
      if (!req.user) return false

      return { utilisateur: { equals: req.user.id } }
    },
    create: ({ req }) => Boolean(req.user),
    // Un favori n'a rien de modifiable : il existe ou il n'existe pas. Fermer
    // `update` evite d'avoir a se demander plus tard ce qu'une mise a jour
    // devrait faire — on retire et on repose.
    update: () => false,
    delete: ({ req }) => {
      if (estAdmin(req.user)) return true
      if (!req.user) return false

      return { utilisateur: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeValidate: [retrouverParLeLien],
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data

        if (!req.user) {
          throw new APIError('Il faut un compte pour mettre en favori.', 401)
        }

        // Le proprietaire vient de la SESSION, jamais de la saisie — sinon on
        // deposerait un favori dans la liste de quelqu'un d'autre. Meme regle
        // que l'auteur d'un enchainement.
        data.utilisateur = req.user.id

        const enchainement = await req.payload
          .findByID({
            collection: 'enchainements',
            id: data.enchainement,
            depth: 0,
            // On lit sans les droits pour pouvoir REFUSER en connaissance de
            // cause. La reponse renvoyee ne distingue pas « prive » de
            // « inexistant » : rien ne doit apprendre qu'un enchainement prive
            // existe (FR-17).
            overrideAccess: true,
          })
          .catch(() => null)

        // PUBLIC OU NON RÉPERTORIÉ (décision d'Alain, 2026-09-01) : ce qu'on
        // reçoit, on peut le ranger. Le non-répertorié est arrivé jusqu'ici par
        // son lien — `retrouverParLeLien` n'accepte pas d'autre adresse — donc
        // la personne l'avait bien. Le PRIVÉ reste refusé : il n'est le lien de
        // personne.
        if (
          !enchainement ||
          (enchainement.visibilite !== 'public' && enchainement.visibilite !== 'nonRepertorie')
        ) {
          throw new APIError("Cet enchaînement ne peut pas être mis en favori.", 403)
        }

        const idAuteur =
          typeof enchainement.auteur === 'object' && enchainement.auteur !== null
            ? enchainement.auteur.id
            : enchainement.auteur

        if (idAuteur === req.user.id) {
          throw new APIError(
            "On ne met pas en favori son propre enchaînement : il est déjà dans « mes enchaînements ».",
            400,
          )
        }

        const deja = await req.payload.find({
          collection: 'favoris',
          where: {
            and: [
              { utilisateur: { equals: req.user.id } },
              { enchainement: { equals: data.enchainement } },
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })

        if (deja.totalDocs > 0) {
          throw new APIError('Cet enchaînement est déjà dans tes favoris.', 400)
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'utilisateur',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Utilisateur',
      admin: {
        description: 'Rempli automatiquement depuis la session.',
      },
    },
    {
      // PAS `required`, et ce n'est pas un relâchement : le champ est DÉRIVÉ
      // (`retrouverParLeLien` le remplit, et refuse la création s'il ne le peut
      // pas). Le déclarer requis obligerait chaque appelant à fournir un numéro
      // de ligne — c'est-à-dire exactement l'adresse qu'on refuse d'accepter.
      name: 'enchainement',
      type: 'relationship',
      relationTo: 'enchainements',
      index: true,
      label: 'Enchaînement',
      admin: {
        readOnly: true,
        description: 'Déduit du lien reçu.',
      },
    },
    {
      // LE LIEN REÇU, gardé tel quel.
      //
      // Il sert deux fois : à l'écriture, c'est la SEULE adresse acceptée pour
      // poser un favori (`retrouverParLeLien`) ; à la lecture, c'est ce que
      // « mes favoris » rejoue pour afficher un non-répertorié, que les `access`
      // de la collection Enchaînement ne rendent à personne d'autre qu'à son
      // auteur.
      //
      // Le garder plutôt que de le recalculer depuis la relation n'est pas une
      // commodité : il DIT comment ce favori a été obtenu. Le recalculer
      // reviendrait à accorder à tout favori ce que seule la possession du lien
      // devait accorder.
      //
      // PAS `required` : la garde est le hook, qui refuse la création AVANT la
      // validation. Le déclarer requis n'ajouterait rien — et obligerait la
      // migration à remplir la colonne pour les favoris déjà posés avant de
      // pouvoir la créer.
      name: 'idPublic',
      type: 'text',
      index: true,
      label: 'Lien reçu',
      admin: { readOnly: true },
    },
  ],
  versions: false,
}
