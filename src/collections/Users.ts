import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { erreurPseudo, nettoyerPseudo, pseudoComparable } from '../auteurs'
import { champAdminSeul, estAdmin, soiMemeOuAdmin } from './acces'

/**
 * Range le pseudo saisi et recalcule sa forme comparable.
 *
 * DERIVEE, JAMAIS SAISIE — meme discipline que `titreNormalise` sur les
 * enchainements : une seule source de verite (le pseudo), plus un index unique.
 *
 * Ne touche a rien quand `pseudo` n'est pas dans les donnees ecrites. Payload
 * ecrit sur cette collection a chaque connexion (compteur de tentatives, date
 * de derniere connexion) : sans ce garde-fou, chaque connexion effacerait le
 * pseudo du compte qui vient de se connecter.
 *
 * Le vide devient `null` et non `''` : la colonne `pseudoNormalise` porte un
 * index UNIQUE, et SQLite tolere autant de NULL qu'on veut mais une seule
 * chaine vide. Sans cette conversion, le deuxieme compte sans pseudo serait
 * refuse a l'enregistrement.
 */
const rangerLePseudo: CollectionBeforeChangeHook = async ({ data }) => {
  if (data === undefined || !('pseudo' in data)) return data

  const pseudo = nettoyerPseudo((data as { pseudo?: string | null }).pseudo)

  return {
    ...data,
    pseudo: pseudo === '' ? null : pseudo,
    pseudoNormalise: pseudo === '' ? null : pseudoComparable(pseudo),
  }
}

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
    defaultColumns: ['email', 'pseudo', 'admin', 'updatedAt'],
  },
  auth: true,
  hooks: {
    beforeChange: [rangerLePseudo],
  },
  access: {
    // INSCRIPTION PUBLIQUE (Story 3.1) : c'est la seule ecriture ouverte a un
    // visiteur anonyme de tout le projet. Elle ne donne aucun pouvoir : le
    // champ `admin` reste hors de portee (acces de champ, plus bas), et un
    // compte neuf a exactement les droits de tout autre compte connecte.
    create: () => true,
    // CHACUN SON COMPTE. Les droits par defaut de Payload laissent tout compte
    // connecte lire et modifier TOUS les autres : la liste des emails de la
    // classe d'un cote, le changement de mot de passe d'autrui de l'autre.
    //
    // C'est aussi ce qui garde le PSEUDO a l'abri : il est public a la lecture
    // (il s'affiche sous chaque enchainement), mais son ECRITURE passe par
    // cette meme regle — personne ne renomme l'auteur d'a cote.
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
      // LE NOM D'AUTEUR CHOISI (action item `pseudo-et-page-auteur`). Facultatif :
      // laisse vide, l'affichage retombe sur la partie de l'adresse qui precede
      // l'arobase, comme avant (voir `src/auteurs.ts`, qui est le seul endroit
      // ou cet arbitrage se fait).
      //
      // C'est le SEUL champ PUBLIC d'un compte : il est destine a etre lu par
      // n'importe quel visiteur, sous les enchainements partages. Ecrit ici en
      // clair pour qu'on n'y ajoute jamais, par habitude, une information qui
      // n'a pas vocation a sortir.
      name: 'pseudo',
      type: 'text',
      label: 'Pseudo',
      // PAS de `maxLength` : il compterait en unites UTF-16 quand `erreurPseudo`
      // compte en caracteres. Deux regles de longueur qui ne comptent pas
      // pareil finissent par se contredire sur un cas rare, et c'est la plus
      // stricte qui gagne sans que le message le dise.
      admin: {
        description:
          "Le nom affiché comme auteur de tes enchaînements. Laissé vide, c'est le début de ton adresse e-mail qui s'affiche.",
      },
      // La MEME fonction que le formulaire public : deux regles ecrites
      // separement auraient fini par diverger, et c'est l'API (REST, GraphQL,
      // /admin) qui aurait la plus permissive des deux.
      validate: (valeur: string | null | undefined) => erreurPseudo(nettoyerPseudo(valeur)) ?? true,
    },
    {
      // Copie normalisee du pseudo (sans accent ni casse), qui porte l'UNICITE.
      //
      // L'unicite se decide maintenant ou jamais : elle est indolore a dix
      // comptes et penible a mille (voir la nuance notee au backlog). Deux
      // « alain » dans une liste d'enchainements ne designent plus personne, et
      // le filtre par auteur proposerait deux entrees identiques.
      //
      // PAS `hidden: true` : un champ `hidden` n'est pas queryable dans Payload,
      // et celui-ci existe pour etre interroge (verification de disponibilite).
      // Cache de /admin seulement, ou il inviterait a le corriger a la main
      // alors qu'il se recalcule tout seul.
      name: 'pseudoNormalise',
      type: 'text',
      unique: true,
      index: true,
      label: 'Pseudo normalisé',
      admin: { hidden: true, readOnly: true },
    },
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
