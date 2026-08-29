import Database from 'libsql'

/**
 * Force la base SQLite en mode WAL (Write-Ahead Logging).
 *
 * POURQUOI : Litestream, qui réplique la base vers S3, **exige** le mode WAL.
 * Payload crée la base en mode `delete` par défaut ; sans cette bascule, la
 * sauvegarde ne répliquerait rien — et on ne s'en apercevrait qu'au moment de
 * vouloir restaurer, c'est-à-dire trop tard.
 *
 * Le mode est inscrit dans l'en-tête du fichier : il persiste. Rejouer ce
 * script est sans effet, ce qui le rend sûr à chaque démarrage.
 */

const uri = process.env.DATABASE_URI || 'file:./passe-finder.db'
const chemin = uri.replace(/^file:/, '')

try {
  const db = new Database(chemin)
  const avant = db.prepare('PRAGMA journal_mode').get()

  if (avant?.journal_mode?.toLowerCase() !== 'wal') {
    db.exec('PRAGMA journal_mode = WAL')
    const apres = db.prepare('PRAGMA journal_mode').get()
    console.log(`Mode de journalisation : ${avant?.journal_mode} -> ${apres?.journal_mode}`)
  } else {
    console.log('Mode de journalisation : wal (déjà actif)')
  }

  db.close()
} catch (erreur) {
  // Ne jamais empêcher l'application de démarrer pour autant : un site qui
  // tourne sans réplication vaut mieux qu'un site qui refuse de démarrer.
  // L'avertissement reste visible dans les journaux.
  console.warn('Impossible de vérifier le mode WAL :', erreur.message)
  console.warn('La sauvegarde Litestream pourrait ne pas fonctionner.')
}
