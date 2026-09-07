import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter, Payload } from 'payload'

import {
  SITE_URL,
  SMTP_EXPEDITEUR,
  SMTP_HOTE,
  SMTP_MOT_DE_PASSE,
  SMTP_PORT,
  SMTP_UTILISATEUR,
} from './env'

/**
 * Acheminement des e-mails sortants (Story 3.3, FR-28).
 *
 * Payload FABRIQUE le message de reinitialisation ; il ne le LIVRE pas. Sans
 * adaptateur, il l'ecrit dans les journaux du serveur — utile en
 * developpement, silencieux et trompeur en production. Ce module est le seul
 * endroit du projet qui sait comment un message sort.
 *
 * REVERSIBLE PAR CONSTRUCTION : Gmail, Resend, Brevo ou Amazon SES parlent tous
 * le meme SMTP. Changer de fournisseur, c'est changer trois variables
 * d'environnement, pas une ligne de code. C'etait l'argument qui a permis de
 * reporter ce choix jusqu'ici (voir l'artefact de la Story 3.4).
 */

/** Chemin public de l'ecran qui accepte un jeton et demande un nouveau mot de passe. */
export const CHEMIN_REINITIALISATION = '/reinitialiser'

/**
 * L'envoi est-il reellement possible ?
 *
 * DEUX CONDITIONS, et il faut les deux : de quoi parler a un serveur SMTP, et
 * l'adresse publique du site. Un message qui part avec un lien vers
 * `http://localhost:3000` ne vaut pas mieux qu'un message qui ne part pas.
 *
 * CE QUE CE DRAPEAU NE DIT PAS : que les identifiants sont BONS. L'adaptateur
 * verifie bien le transport au demarrage, mais il se contente de journaliser
 * l'echec — le serveur demarre quel que soit le resultat, et c'est voulu (un
 * mot de passe d'application fautif ne doit pas priver les eleves du
 * catalogue). Un identifiant errone se constate donc a l'envoi, pas ici.
 */
export const envoiConfigure: boolean = Boolean(
  SMTP_HOTE && SMTP_UTILISATEUR && SMTP_MOT_DE_PASSE && SITE_URL,
)

/**
 * Signale une configuration a MOITIE remplie, qui est presque toujours un oubli.
 *
 * On ne leve pas : la decision d'Alain (2026-09-07) est que l'absence d'envoi
 * degrade la fonction et n'arrete pas le site. Mais on ne se tait pas non plus,
 * sinon la seule trace d'une variable oubliee serait un formulaire qui affiche
 * « indisponible » sans dire pourquoi.
 */
function signalerConfigurationIncomplete(): void {
  const renseignees = [SMTP_HOTE, SMTP_UTILISATEUR, SMTP_MOT_DE_PASSE].filter(Boolean).length
  if (renseignees === 0 || envoiConfigure) return

  const manquantes = [
    SMTP_HOTE ? null : 'SMTP_HOTE',
    SMTP_UTILISATEUR ? null : 'SMTP_UTILISATEUR',
    SMTP_MOT_DE_PASSE ? null : 'SMTP_MOT_DE_PASSE',
    SITE_URL ? null : 'SITE_URL (ou DOMAINE)',
  ].filter((nom): nom is string => nom !== null)

  console.warn(
    "Envoi d'e-mails desactive : configuration SMTP incomplete. " +
      `Variable(s) manquante(s) : ${manquantes.join(', ')}. ` +
      'La reinitialisation de mot de passe restera indisponible.',
  )
}

/**
 * L'adaptateur a poser dans la configuration Payload, ou `undefined`.
 *
 * `undefined` N'EST PAS UN OUBLI, c'est le mode par defaut de Payload : le
 * message part dans les journaux. Il faut surtout eviter d'appeler
 * `nodemailerAdapter()` SANS ARGUMENT pour autant — cette forme-la ouvre un
 * compte de test chez ethereal.email, donc un appel reseau vers un tiers a
 * chaque demarrage, y compris en CI et dans le test de fumee du conteneur.
 */
export function adaptateurCourriel(): Promise<EmailAdapter> | undefined {
  signalerConfigurationIncomplete()

  if (!envoiConfigure) return undefined

  return nodemailerAdapter({
    // L'adaptateur OUVRE UNE CONNEXION au demarrage pour verifier les
    // identifiants. C'est utile en production — un mot de passe d'application
    // fautif se voit alors dans les journaux du conteneur, et non le jour ou un
    // eleve essaie de reinitialiser. Mais chaque processus de test ferait le
    // meme appel des qu'un `.env` local porte les variables SMTP : la suite
    // dependrait du reseau et du quota Gmail. On coupe la verification pour les
    // tests, et pour eux seulement.
    skipVerify: process.env.NODE_ENV === 'test',
    defaultFromName: 'Passe Finder',
    defaultFromAddress: SMTP_EXPEDITEUR as string,
    transportOptions: {
      host: SMTP_HOTE,
      port: SMTP_PORT,
      // 465 est chiffre de bout en bout ; 587 commence en clair puis bascule
      // (STARTTLS). Se tromper de couple donne une erreur de negociation
      // illisible, alors que le numero de port suffit a decider.
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_UTILISATEUR, pass: SMTP_MOT_DE_PASSE },
    },
  })
}

/**
 * L'adresse complete sur laquelle le destinataire va cliquer.
 *
 * FABRIQUEE ICI ET PAS PAR PAYLOAD, et c'est le vrai piege de cette story : le
 * message par defaut pointe vers `/admin/reset/<jeton>`, c'est-a-dire le
 * back-office — reserve aux administrateurs depuis la Story 3.2. Un eleve y
 * arriverait devant une porte fermee, avec un jeton valide gache.
 */
export function lienDeReinitialisation(jeton: string): string {
  return `${SITE_URL ?? ''}${CHEMIN_REINITIALISATION}?jeton=${encodeURIComponent(jeton)}`
}

/** Sujet du message. Court, en francais, et il dit de quel site il parle. */
export function sujetDeReinitialisation(): string {
  return 'Passe Finder — nouveau mot de passe'
}

/**
 * Corps du message.
 *
 * DU HTML VOLONTAIREMENT PAUVRE : pas d'image, pas de mise en page en tableau,
 * une seule couleur. Un message de reinitialisation se lit en dix secondes sur
 * un telephone, souvent dans un client qui bloque les images ; et plus il
 * ressemble a une lettre commerciale, plus il finit dans les indesirables.
 *
 * LE LIEN EST ECRIT EN TOUTES LETTRES sous le bouton : un client qui n'affiche
 * pas le HTML, ou une personne qui prefere verifier ou elle va, doit pouvoir
 * lire l'adresse.
 */
export function messageDeReinitialisation(jeton: string): string {
  const lien = lienDeReinitialisation(jeton)

  return [
    '<p>Bonjour,</p>',
    '<p>Tu as demandé un nouveau mot de passe pour ton compte Passe Finder.',
    ' Ce lien est valable une heure :</p>',
    `<p><a href="${lien}">Choisir un nouveau mot de passe</a></p>`,
    `<p style="word-break:break-all">${lien}</p>`,
    "<p>Si tu n'es pas à l'origine de cette demande, ignore ce message :",
    ' ton mot de passe actuel reste valable.</p>',
    '<p>— Passe Finder</p>',
  ].join('')
}

/** Ce qu'on affiche quand l'envoi d'e-mails n'est pas configure sur ce serveur. */
export const ENVOI_INDISPONIBLE =
  "L'envoi d'e-mails n'est pas configuré sur ce serveur : la réinitialisation " +
  'est momentanément indisponible. Contacter l\'administrateur, il remettra ton accès à la main.'

/**
 * Duree de validite d'un jeton, telle que Payload la fixe par defaut.
 *
 * RECOPIEE ICI POUR UNE SEULE RAISON : retrouver la date d'EMISSION du jeton,
 * que Payload ne stocke pas. Il n'enregistre que l'expiration ; l'emission,
 * c'est l'expiration moins cette duree. Si un jour on configure une autre duree
 * dans `Users.ts`, il faudra la reporter ici — les deux commentaires se
 * renvoient l'un a l'autre.
 */
const VALIDITE_DU_JETON_MS = 3_600_000

/** Delai minimal entre deux envois pour un meme compte. */
export const DELAI_ENTRE_DEUX_ENVOIS_MS = 60_000

/**
 * Un jeton a-t-il deja ete emis pour ce compte il y a moins d'une minute ?
 *
 * GARDE-FOU CONTRE LE MARTELEMENT (decision d'Alain, 2026-09-07). Sans lui,
 * n'importe qui peut noyer la boite d'un eleve sous les demandes et epuiser au
 * passage le quota d'envoi quotidien du compte expediteur, ce qui priverait
 * TOUT LE MONDE de la fonction.
 *
 * Aucune table nouvelle : la date d'expiration deja stockee suffit. Les champs
 * de reinitialisation sont `hidden` dans Payload, d'ou `showHiddenFields`.
 *
 * EFFET DE BORD UTILE : il protege aussi le PREMIER lien. Payload remplace le
 * jeton a chaque demande ; deux clics de suite sur « Recevoir un lien » sans ce
 * garde-fou tueraient le message deja parti, et c'est en general celui-la que
 * la personne finira par ouvrir.
 */
export async function envoiTropRecent(payload: Payload, email: string): Promise<boolean> {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    showHiddenFields: true,
  })

  const expiration = docs[0]?.resetPasswordExpiration
  if (typeof expiration !== 'string') return false

  const emisLe = new Date(expiration).getTime() - VALIDITE_DU_JETON_MS
  if (Number.isNaN(emisLe)) return false

  return Date.now() - emisLe < DELAI_ENTRE_DEUX_ENVOIS_MS
}
