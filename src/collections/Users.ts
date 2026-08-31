import type { CollectionConfig } from 'payload'

import { champAdminSeul, estAdmin, soiMemeOuAdmin } from './acces'

/**
 * Users — collection d'authentification de Payload (AD-9).
 *
 * `auth: true` fournit deja les comptes, les sessions, le hachage des mots de
 * passe et les operations `forgot-password` / `reset-password`. Les ecrans
 * publics qui les consomment arrivent aux Stories 3.1 a 3.3 ; cette story-ci ne
 * traite que la GOUVERNANCE : qui a le droit d'editer le catalogue.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Utilisateur',
    plural: 'Utilisateurs',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'admin', 'updatedAt'],
  },
  auth: true,
  access: {
    // INSCRIPTION PUBLIQUE (Story 3.1) : c'est la seule ecriture ouverte a un
    // visiteur anonyme de tout le projet. Elle ne donne aucun pouvoir : le
    // champ `admin` reste hors de portee (acces de champ, plus bas), et un
    // compte neuf a exactement les droits de tout autre compte connecte.
    create: () => true,
    // CHACUN SON COMPTE. Les droits par defaut de Payload laissent tout compte
    // connecte lire et modifier TOUS les autres : la liste des emails de la
    // classe d'un cote, le changement de mot de passe d'autrui de l'autre.
    read: soiMemeOuAdmin,
    update: soiMemeOuAdmin,
    delete: soiMemeOuAdmin,
    // ACCES AU BACK-OFFICE, reserve aux administrateurs (decision d'Alain,
    // 2026-08-31). Possible seulement maintenant : jusqu a la Story 3.2,
    // /admin etait l'unique porte de connexion du site, la fermer aurait prive
    // les eleves de tout moyen de se connecter. Ils ont desormais /connexion.
    admin: ({ req }) => estAdmin(req.user),
  },
  fields: [
    // L'email et le mot de passe sont ajoutes par `auth: true`.
    {
      name: 'admin',
      type: 'checkbox',
      defaultValue: false,
      label: 'Administrateur',
      // AUCUNE AUTO-PROMOTION (Story 3.4). L'acces de CHAMP est le verrou : il
      // refuse la valeur quel que soit le document vise, donc un utilisateur ne
      // peut ni se promouvoir lui-meme, ni promouvoir quelqu'un d'autre, ni
      // glisser `admin: true` dans le corps d'une inscription (Story 3.1).
      //
      // Verrouiller l'INTERFACE n'aurait rien verrouille du tout : l'API REST et
      // l'API GraphQL de Payload exposent le meme champ. C'est bien ici que la
      // regle doit vivre (ADD-5).
      //
      // Consequence assumee : le drapeau s'attribue donc HORS application, par
      // le semis (variable ADMIN_EMAIL, cf. src/seed.ts) ou par un admin deja
      // en place depuis /admin. C'est exactement ce que demande la story.
      access: {
        create: champAdminSeul,
        update: champAdminSeul,
      },
      admin: {
        description:
          "Donne le droit d'editer le catalogue (danses, positions, passes, fichiers). " +
          "S'attribue hors de l'application : ne peut etre coche que par un administrateur.",
      },
    },
  ],
  versions: false,
}
