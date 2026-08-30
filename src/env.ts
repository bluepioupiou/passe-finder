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
 * Email du compte a promouvoir administrateur au demarrage (Story 3.4, FR-29).
 *
 * FACULTATIF, et c'est le point important : le drapeau `admin` ne s'attribue
 * PAS depuis l'application (aucune auto-promotion possible, cf. l'acces de champ
 * sur la collection users). Il faut donc un canal exterieur, et c'en est un —
 * l'autre etant un administrateur deja en place qui coche la case depuis /admin.
 *
 * Sans cette variable, une instance neuve n'a aucun administrateur : le
 * catalogue est en lecture seule pour tout le monde, y compris pour le premier
 * compte cree. Ce n'est pas une panne, c'est le comportement voulu — mais le
 * semis le signale dans les logs pour que la cause soit lisible.
 *
 * Idempotent : le semis promeut le compte s'il existe et ne fait rien sinon.
 * Laisser la variable en place apres coup est sans effet.
 */
export const ADMIN_EMAIL = optionalEnv('ADMIN_EMAIL')?.toLowerCase()
