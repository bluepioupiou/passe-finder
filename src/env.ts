/**
 * Validation des variables d'environnement requises.
 *
 * Objectif : un échec **clair et immédiat** si une variable indispensable
 * manque au démarrage (message nommant la variable), plutôt qu'un secret vide
 * silencieux ou un plantage obscur plus loin. On ne logge JAMAIS la valeur
 * d'un secret, seulement le nom de la variable manquante.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `Variable d'environnement manquante : ${name}. ` +
        `Renseigne-la (voir .env.example) avant de démarrer l'application.`,
    )
  }
  return value
}

/** Clé secrète Payload (sessions/tokens). Obligatoire — aucune valeur par défaut. */
export const PAYLOAD_SECRET = requireEnv('PAYLOAD_SECRET')

/**
 * Emplacement de la base SQLite (libSQL).
 *
 * En production, la variable est **obligatoire** : un repli silencieux ferait
 * écrire la base dans la couche éphémère du conteneur au lieu du volume
 * persistant — les données seraient perdues à la recréation du conteneur, sans
 * aucun message (AD-10). Une valeur présente mais vide est également refusée.
 * En développement, un fichier local sert de défaut pratique.
 */
function resolveDatabaseUri(): string {
  const raw = process.env.DATABASE_URI

  // Variable fournie mais vide → erreur de configuration explicite.
  if (raw !== undefined && raw.trim() === '') {
    throw new Error(
      "Variable d'environnement vide : DATABASE_URI. " +
        'Renseigne un chemin libSQL (ex. file:/data/passe-finder.db) ou retire la variable.',
    )
  }

  if (raw) return raw.trim()

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      "Variable d'environnement manquante : DATABASE_URI. " +
        'En production, elle doit pointer vers le volume persistant ' +
        '(ex. file:/data/passe-finder.db) — voir .env.example.',
    )
  }

  return 'file:./passe-finder.db'
}

export const DATABASE_URI = resolveDatabaseUri()

/**
 * Lit une variable FACULTATIVE : absente ou vide, elle vaut `undefined`.
 *
 * Le pendant de `requireEnv`. Deux comportements opposés, et c'est voulu : on
 * échoue fort quand l'absence met les données ou les sessions en danger, on
 * dégrade en silence quand elle ne prive que d'un confort.
 */
function optionalEnv(name: string): string | undefined {
  const value = process.env[name]
  if (!value || value.trim() === '') return undefined

  return value.trim()
}

/**
 * Jeton du site Cloudflare Web Analytics (Story 1.7, AD-15).
 *
 * FACULTATIF : sans lui, aucun script d'audience n'est émis et le site
 * fonctionne normalement. C'est l'état du développement local, de la CI et du
 * test de fumée du conteneur — aucun d'eux ne doit dépendre d'un appel réseau
 * vers un tiers.
 *
 * PAS de préfixe `NEXT_PUBLIC_`, et c'est important : la valeur est lue au
 * RENDU, côté serveur. Une variable `NEXT_PUBLIC_` serait figée à la
 * CONSTRUCTION de l'image, dans GitHub Actions, où le jeton n'existe pas — le
 * beacon partirait vide en production sans qu'aucune erreur ne le signale.
 */
export const CLOUDFLARE_ANALYTICS_TOKEN = optionalEnv('CLOUDFLARE_ANALYTICS_TOKEN')

/**
 * Origine publique du site, ex. `https://passe-finder.fr` (Story 3.3).
 *
 * INDISPENSABLE AU MAIL DE REINITIALISATION, et c'est son seul usage cote
 * produit : le lien part dans un message, donc il se fabrique SUR LE SERVEUR.
 * Le `location.origin` du navigateur, qui sert ailleurs a copier un lien, n'est
 * d'aucun secours ici — personne n'a de navigateur ouvert au moment de l'envoi.
 *
 * Deux sources, dans cet ordre : `SITE_URL` si on veut la forcer (une
 * pre-production, un tunnel de developpement), sinon `DOMAINE`, la variable que
 * le deploiement connait deja et qui sert a Caddy. On evite ainsi de saisir le
 * meme domaine deux fois, a deux endroits qui finiraient par diverger.
 *
 * Absente, elle ne fait PAS echouer le demarrage : elle rend seulement la
 * reinitialisation indisponible, ce que la page concernee annonce alors
 * franchement (voir `src/courriel.ts`). Couper tout le site pour une fonction
 * annexe serait une punition disproportionnee pour les eleves qui consultent.
 */
function resolveSiteUrl(): string | undefined {
  const explicite = optionalEnv('SITE_URL')
  if (explicite) return explicite.replace(/\/+$/, '')

  const domaine = optionalEnv('DOMAINE')
  if (domaine) return `https://${domaine.replace(/\/+$/, '')}`

  // Developpement : le port par defaut de `next dev`, pour que le lien du mail
  // journalise en console soit cliquable sans configuration.
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'

  return undefined
}

export const SITE_URL = resolveSiteUrl()

/**
 * Acheminement des e-mails sortants (Story 3.3).
 *
 * FACULTATIF, comme le jeton d'audience et pour la meme raison : le
 * developpement local, la CI et le test de fumee du conteneur ne doivent
 * dependre d'aucun service tiers. Sans ces variables, Payload garde son
 * comportement par defaut — il ECRIT le message dans les journaux au lieu de
 * le livrer — et la page « mot de passe oublie » le dit au visiteur.
 *
 * `SMTP_EXPEDITEUR` est facultative dans le facultatif : chez Google,
 * l'expediteur DOIT etre le compte authentifie (toute autre adresse est
 * reecrite), donc le defaut le plus utile est `SMTP_UTILISATEUR` lui-meme.
 */
export const SMTP_HOTE = optionalEnv('SMTP_HOTE')
export const SMTP_UTILISATEUR = optionalEnv('SMTP_UTILISATEUR')
export const SMTP_MOT_DE_PASSE = optionalEnv('SMTP_MOT_DE_PASSE')
export const SMTP_EXPEDITEUR = optionalEnv('SMTP_EXPEDITEUR') ?? SMTP_UTILISATEUR

/**
 * Port SMTP. 465 par defaut : le port chiffre de bout en bout (`secure`), celui
 * que Gmail documente en premier. Le 587 (STARTTLS) reste possible en le
 * renseignant — le mode se deduit du numero, plus bas.
 */
export const SMTP_PORT = Number(optionalEnv('SMTP_PORT') ?? '465')
