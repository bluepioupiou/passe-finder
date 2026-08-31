import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import { estAdmin } from './acces'

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

        if (!enchainement || enchainement.visibilite !== 'partage') {
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
      name: 'enchainement',
      type: 'relationship',
      relationTo: 'enchainements',
      required: true,
      index: true,
      label: 'Enchaînement',
    },
  ],
  versions: false,
}
