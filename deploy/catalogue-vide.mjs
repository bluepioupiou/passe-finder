import Database from 'libsql'

/**
 * Répond « vide » ou « peuple » selon que le catalogue contient des positions.
 *
 * POURQUOI CE GARDE-FOU : l'import du catalogue historique s'exécute au
 * démarrage du conteneur, donc à chaque déploiement. S'il tournait sans
 * condition, une position supprimée volontairement depuis le back-office
 * réapparaîtrait au déploiement suivant — comportement déroutant.
 *
 * En n'important que sur une base vide, on obtient :
 *  - zéro geste manuel au premier déploiement ;
 *  - aucune résurrection de contenu supprimé ensuite.
 *
 * L'import reste rejouable à la demande (`npm run migrate:all`).
 */

const uri = process.env.DATABASE_URI || 'file:./passe-finder.db'
const chemin = uri.replace(/^file:/, '')

try {
  const db = new Database(chemin)
  const ligne = db.prepare('SELECT COUNT(*) AS n FROM positions').get()
  db.close()
  console.log(Number(ligne?.n) === 0 ? 'vide' : 'peuple')
} catch {
  // Table absente ou base illisible : anormal après les migrations.
  // On répond « inconnu » pour que l'appelant s'abstienne plutôt que d'écrire
  // dans une base dont on ne comprend pas l'état.
  console.log('inconnu')
}
