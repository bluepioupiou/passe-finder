import { DatabaseSync } from 'node:sqlite'

import { nouvelIdentifiantPublic } from '../src/identifiant-public'

/**
 * Reprise d'une base de DEVELOPPEMENT pour l'identifiant public et les trois
 * visibilites (action item `identifiant-opaque-et-visibilites`).
 *
 * POURQUOI CE SCRIPT EXISTE, alors que la migration
 * `20260901_200844_identifiant_public_et_visibilites` fait deja tout cela : en
 * developpement, Payload SYNCHRONISE le schema tout seul (mode « push ») et ne
 * joue pas les migrations — la table `payload_migrations` d'une base de dev ne
 * porte qu'une ligne `dev`. Le schema arrive donc, mais pas la reprise des
 * DONNEES : les 120 enchainements existants resteraient sans adresse, et les
 * 108 « partage » deviendraient invisibles puisque `access.read` ne connait
 * plus ce mot.
 *
 * La PRODUCTION, elle, n'a pas besoin de ce script : l'entrypoint du conteneur
 * lance `payload migrate`, qui fait exactement les memes gestes.
 *
 * IDEMPOTENT : il ajoute ce qui manque et ne touche a rien d'autre. Le relancer
 * ne fait rien.
 *
 * UN SEUL USAGE, ET IL EST DATE. Ce fichier peut disparaitre une fois la base
 * de developpement d'Alain reprise (2026-09-01) — il ne sert qu'a la
 * transition, et le garder ferait croire a un outil de maintenance.
 *
 *   npm run reprendre:visibilites
 *
 * A LANCER SERVEUR DE DEV ARRETE : SQLite n'aime pas deux ecrivains, et il faut
 * de toute facon redemarrer le serveur pour que le schema soit synchronise
 * avant la reprise des donnees.
 */

/** Le fichier SQLite designe par DATABASE_URI (`file:./passe-finder.db`). */
function fichierBase(): string {
  const uri = process.env.DATABASE_URI ?? 'file:./passe-finder.db'

  return uri.replace(/^file:/, '')
}

/** La table porte-t-elle cette colonne ? */
function aLaColonne(db: DatabaseSync, table: string, colonne: string): boolean {
  const colonnes = db.prepare(`SELECT name FROM pragma_table_info('${table}')`).all()

  return colonnes.some((ligne) => (ligne as { name: string }).name === colonne)
}

function reprendre(): void {
  const chemin = fichierBase()
  const db = new DatabaseSync(chemin)

  // --- Schema, si le serveur de dev ne l'a pas encore synchronise -----------
  if (!aLaColonne(db, 'enchainements', 'id_public')) {
    db.exec('ALTER TABLE `enchainements` ADD `id_public` text')
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS `enchainements_id_public_idx` ON `enchainements` (`id_public`)')
    console.log('Colonne `enchainements.id_public` ajoutée.')
  }

  if (!aLaColonne(db, 'favoris', 'id_public')) {
    db.exec('ALTER TABLE `favoris` ADD `id_public` text')
    db.exec('CREATE INDEX IF NOT EXISTS `favoris_id_public_idx` ON `favoris` (`id_public`)')
    console.log('Colonne `favoris.id_public` ajoutée.')
  }

  // --- « partage » devient « public » ---------------------------------------
  const renommes = db
    .prepare("UPDATE `enchainements` SET `visibilite` = 'public' WHERE `visibilite` = 'partage'")
    .run()
  console.log(`${renommes.changes} enchaînement(s) « partagé » → « public ».`)

  // --- Une adresse pour chaque enchainement ---------------------------------
  // Tirée en JS, avec LA MEME fonction que le hook de la collection : l'écrire
  // en SQL donnerait des identifiants d'une autre forme et d'une autre force.
  const sansAdresse = db
    .prepare('SELECT id FROM `enchainements` WHERE `id_public` IS NULL')
    .all() as { id: number }[]

  const poser = db.prepare('UPDATE `enchainements` SET `id_public` = ? WHERE `id` = ?')
  for (const ligne of sansAdresse) {
    poser.run(nouvelIdentifiantPublic(), ligne.id)
  }
  console.log(`${sansAdresse.length} enchaînement(s) adressé(s).`)

  // --- Le lien reçu, sur les favoris déjà posés -----------------------------
  const favoris = db
    .prepare(
      'UPDATE `favoris` SET `id_public` = (SELECT `e`.`id_public` FROM `enchainements` `e` ' +
        'WHERE `e`.`id` = `favoris`.`enchainement_id`) WHERE `id_public` IS NULL',
    )
    .run()
  console.log(`${favoris.changes} favori(s) rattaché(s) à leur lien.`)

  db.close()
  console.log(`Base reprise : ${chemin}`)
}

reprendre()
