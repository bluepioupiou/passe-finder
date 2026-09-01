import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

import { nouvelIdentifiantPublic } from '../identifiant-public'

/**
 * Identifiant public, troisieme visibilite, ET LA REPRISE DE L'EXISTANT.
 *
 * Trois changements qui ne peuvent pas se separer, parce que le site cesserait
 * de fonctionner entre les deux :
 *
 *  1. `enchainements.id_public` — l'adresse qui remplace le numero de ligne.
 *     SANS LA REPRISE, les 120 enchainements deja en base n'auraient AUCUNE
 *     URL : la fiche les cherche desormais par cette colonne, et la liste ne
 *     pointerait plus que vers `/enchainements/undefined`.
 *  2. `partage` devient `public` — le mot disait deux choses a la fois
 *     (« lisible » et « liste »), et la troisieme visibilite les separe.
 *     Sans cette reprise, les 90 enchainements partages deviendraient
 *     invisibles : `access.read` ne connait plus la valeur `partage`.
 *  3. `favoris.id_public` — le lien recu, que la page « mes favoris » rejoue
 *     pour afficher un non-repertorie. Repris depuis la relation existante.
 *
 * L'identifiant est tire en JS, avec LA MEME fonction que le hook de la
 * collection (`nouvelIdentifiantPublic`). L'ecrire en SQL — `hex(randomblob())`
 * ou equivalent — donnerait des identifiants d'une autre forme et d'une autre
 * force que ceux tires ensuite : deux regles pour une seule colonne.
 *
 * ---------------------------------------------------------------------------
 * ELLE EST REJOUABLE, ET CE N'EST PAS UN LUXE (constate en production le
 * 2026-09-01).
 *
 * Premiere version : une suite d'ordres nus. Un premier passage a applique le
 * schema puis s'est fait interrompre avant que Payload n'inscrive la migration
 * dans `payload_migrations` — sur Lightsail, le verrou de la base est dispute
 * par Litestream, et le conteneur redemarre. Au redemarrage suivant, la
 * migration repart de zero et bute sur SA PROPRE colonne :
 * « duplicate column name: id_public ». Le conteneur s'arrete (`set -e`), et il
 * s'arretera a chaque essai — la production ne redemarre plus.
 *
 * UNE MIGRATION QUI NE SAIT PAS SE REJOUER EST UNE MIGRATION QUI PEUT BLOQUER
 * DEFINITIVEMENT UN DEPLOIEMENT. Chaque geste de schema est donc precede de sa
 * question (« la colonne est-elle deja la ? »), et chaque geste de donnees
 * porte sa condition (`WHERE id_public IS NULL`). Relancee dix fois, elle
 * converge et ne change rien de plus.
 *
 * A RETENIR POUR LES SUIVANTES : `payload migrate:create` genere des ordres
 * nus. Les garder tels quels, c'est parier que rien ne s'interrompra jamais.
 * ---------------------------------------------------------------------------
 */

/** Les colonnes d'une table, telles que SQLite les declare. */
async function colonnes(
  db: MigrateUpArgs['db'] | MigrateDownArgs['db'],
  table: 'enchainements' | 'favoris',
): Promise<string[]> {
  // Deux requetes litterales plutot qu'un nom de table interpole : le nom ne
  // vient de nulle part d'autre que d'ici, autant que ca se voie.
  const resultat =
    table === 'enchainements'
      ? await db.run(sql`SELECT name FROM pragma_table_info('enchainements');`)
      : await db.run(sql`SELECT name FROM pragma_table_info('favoris');`)

  return (resultat.rows as unknown as { name: string }[]).map((ligne) => ligne.name)
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // --- Schema : la colonne `id_public` sur les favoris -----------------------
  // La relation `enchainement` devient nullable au passage : elle est desormais
  // DERIVEE du lien recu (voir la collection `Favori`).
  //
  // La reconstruction de table est le geste le plus fragile de cette migration
  // (SQLite ne sait pas relacher un NOT NULL autrement). On la saute entierement
  // si elle a deja eu lieu, et on nettoie la table intermediaire qu'un passage
  // interrompu aurait pu laisser derriere lui.
  if (!(await colonnes(db, 'favoris')).includes('id_public')) {
    await db.run(sql`DROP TABLE IF EXISTS \`__new_favoris\`;`)
    await db.run(sql`PRAGMA foreign_keys=OFF;`)
    await db.run(sql`CREATE TABLE \`__new_favoris\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`utilisateur_id\` integer NOT NULL,
  	\`enchainement_id\` integer,
  	\`id_public\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`utilisateur_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`enchainement_id\`) REFERENCES \`enchainements\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
    await db.run(sql`INSERT INTO \`__new_favoris\`("id", "utilisateur_id", "enchainement_id", "id_public", "updated_at", "created_at") SELECT "id", "utilisateur_id", "enchainement_id", NULL, "updated_at", "created_at" FROM \`favoris\`;`)
    await db.run(sql`DROP TABLE \`favoris\`;`)
    await db.run(sql`ALTER TABLE \`__new_favoris\` RENAME TO \`favoris\`;`)
    await db.run(sql`PRAGMA foreign_keys=ON;`)

    payload.logger.info('Table `favoris` reconstruite (colonne `id_public`).')
  }

  // `IF NOT EXISTS` : la reconstruction ci-dessus a pu deja les poser, ou un
  // passage precedent s'etre arrete entre deux.
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_utilisateur_idx\` ON \`favoris\` (\`utilisateur_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_enchainement_idx\` ON \`favoris\` (\`enchainement_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_id_public_idx\` ON \`favoris\` (\`id_public\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_updated_at_idx\` ON \`favoris\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_created_at_idx\` ON \`favoris\` (\`created_at\`);`)

  // --- Schema : l'identifiant public des enchainements -----------------------
  // L'index UNIQUE est pose AVANT la reprise, et c'est volontaire : SQLite
  // accepte autant de NULL qu'on veut dans un index unique, donc les 120 lignes
  // vides ne se genent pas — et c'est lui qui refusera une collision si le
  // remplissage en produisait une.
  if (!(await colonnes(db, 'enchainements')).includes('id_public')) {
    await db.run(sql`ALTER TABLE \`enchainements\` ADD \`id_public\` text;`)
    payload.logger.info('Colonne `enchainements.id_public` ajoutee.')
  }

  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`enchainements_id_public_idx\` ON \`enchainements\` (\`id_public\`);`)

  // --- Donnees : « partage » devient « public » ------------------------------
  await db.run(sql`UPDATE \`enchainements\` SET \`visibilite\` = 'public' WHERE \`visibilite\` = 'partage';`)

  // --- Donnees : une adresse pour chaque enchainement existant ---------------
  // `WHERE id_public IS NULL` fait tout le travail de reprise : un passage
  // interrompu au milieu de la boucle reprend exactement ou il s'etait arrete,
  // et ne redonne JAMAIS une nouvelle adresse a un enchainement qui en a une
  // (ce qui casserait les liens deja envoyes).
  const enchainements = await db.run(sql`SELECT id FROM \`enchainements\` WHERE \`id_public\` IS NULL;`)

  for (const ligne of enchainements.rows as unknown as { id: number }[]) {
    await db.run(
      sql`UPDATE \`enchainements\` SET \`id_public\` = ${nouvelIdentifiantPublic()} WHERE \`id\` = ${ligne.id};`,
    )
  }

  // --- Donnees : le lien recu, sur les favoris deja poses --------------------
  // Ils l'ont forcement recu, puisqu'ils existent : on le reconstitue depuis la
  // relation. C'est la SEULE fois ou ce champ se remplit autrement que par le
  // lien presente — apres cette migration, il n'y a plus d'autre porte.
  await db.run(sql`UPDATE \`favoris\` SET \`id_public\` = (
    SELECT \`e\`.\`id_public\` FROM \`enchainements\` \`e\` WHERE \`e\`.\`id\` = \`favoris\`.\`enchainement_id\`
  ) WHERE \`id_public\` IS NULL;`)

  payload.logger.info(
    `Identifiant public : ${enchainements.rows.length} enchainement(s) adresse(s), visibilites reprises.`,
  )
}

/**
 * Retour en arriere.
 *
 * LE NON REPERTORIE REDEVIENT PRIVE, et pas « partage ». Un retour en arriere ne
 * doit jamais ELARGIR ce qu'un auteur avait choisi de restreindre : entre
 * refermer et publier, on referme. Les liens deja envoyes cesseront de
 * fonctionner — c'est le prix du retour, et il est moins cher qu'une
 * publication involontaire.
 *
 * REJOUABLE ELLE AUSSI, pour la meme raison que `up` : elle peut etre appelee
 * sur un etat a moitie defait.
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`UPDATE \`enchainements\` SET \`visibilite\` = 'partage' WHERE \`visibilite\` = 'public';`)
  await db.run(sql`UPDATE \`enchainements\` SET \`visibilite\` = 'prive' WHERE \`visibilite\` = 'nonRepertorie';`)

  await db.run(sql`DROP INDEX IF EXISTS \`enchainements_id_public_idx\`;`)

  if ((await colonnes(db, 'enchainements')).includes('id_public')) {
    await db.run(sql`ALTER TABLE \`enchainements\` DROP COLUMN \`id_public\`;`)
  }

  if ((await colonnes(db, 'favoris')).includes('id_public')) {
    // Les favoris orphelins de relation (impossible avant cette migration, mais
    // possible si une donnee a ete bricolee) sont retires : la colonne redevient
    // NOT NULL et la copie echouerait sur eux.
    await db.run(sql`DELETE FROM \`favoris\` WHERE \`enchainement_id\` IS NULL;`)

    await db.run(sql`DROP TABLE IF EXISTS \`__new_favoris\`;`)
    await db.run(sql`PRAGMA foreign_keys=OFF;`)
    await db.run(sql`CREATE TABLE \`__new_favoris\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`utilisateur_id\` integer NOT NULL,
  	\`enchainement_id\` integer NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`utilisateur_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`enchainement_id\`) REFERENCES \`enchainements\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
    await db.run(sql`INSERT INTO \`__new_favoris\`("id", "utilisateur_id", "enchainement_id", "updated_at", "created_at") SELECT "id", "utilisateur_id", "enchainement_id", "updated_at", "created_at" FROM \`favoris\`;`)
    await db.run(sql`DROP TABLE \`favoris\`;`)
    await db.run(sql`ALTER TABLE \`__new_favoris\` RENAME TO \`favoris\`;`)
    await db.run(sql`PRAGMA foreign_keys=ON;`)
  }

  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_utilisateur_idx\` ON \`favoris\` (\`utilisateur_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_enchainement_idx\` ON \`favoris\` (\`enchainement_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_updated_at_idx\` ON \`favoris\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`favoris_created_at_idx\` ON \`favoris\` (\`created_at\`);`)
}
