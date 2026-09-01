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
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // --- Schema : la colonne `id_public` sur les favoris -----------------------
  // La relation `enchainement` devient nullable au passage : elle est desormais
  // DERIVEE du lien recu (voir la collection `Favori`).
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
  await db.run(sql`CREATE INDEX \`favoris_utilisateur_idx\` ON \`favoris\` (\`utilisateur_id\`);`)
  await db.run(sql`CREATE INDEX \`favoris_enchainement_idx\` ON \`favoris\` (\`enchainement_id\`);`)
  await db.run(sql`CREATE INDEX \`favoris_id_public_idx\` ON \`favoris\` (\`id_public\`);`)
  await db.run(sql`CREATE INDEX \`favoris_updated_at_idx\` ON \`favoris\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`favoris_created_at_idx\` ON \`favoris\` (\`created_at\`);`)

  // --- Schema : l'identifiant public des enchainements -----------------------
  // L'index UNIQUE est pose AVANT la reprise, et c'est volontaire : SQLite
  // accepte autant de NULL qu'on veut dans un index unique, donc les 120 lignes
  // vides ne se genent pas — et c'est lui qui refusera une collision si le
  // remplissage en produisait une.
  await db.run(sql`ALTER TABLE \`enchainements\` ADD \`id_public\` text;`)
  await db.run(sql`CREATE UNIQUE INDEX \`enchainements_id_public_idx\` ON \`enchainements\` (\`id_public\`);`)

  // --- Donnees : « partage » devient « public » ------------------------------
  await db.run(sql`UPDATE \`enchainements\` SET \`visibilite\` = 'public' WHERE \`visibilite\` = 'partage';`)

  // --- Donnees : une adresse pour chaque enchainement existant ---------------
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
  );`)

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
 */
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`UPDATE \`enchainements\` SET \`visibilite\` = 'partage' WHERE \`visibilite\` = 'public';`)
  await db.run(sql`UPDATE \`enchainements\` SET \`visibilite\` = 'prive' WHERE \`visibilite\` = 'nonRepertorie';`)

  await db.run(sql`DROP INDEX \`enchainements_id_public_idx\`;`)
  await db.run(sql`ALTER TABLE \`enchainements\` DROP COLUMN \`id_public\`;`)

  // Les favoris orphelins de relation (impossible avant cette migration, mais
  // possible si une donnee a ete bricolee) sont retires : la colonne redevient
  // NOT NULL et la copie echouerait sur eux.
  await db.run(sql`DELETE FROM \`favoris\` WHERE \`enchainement_id\` IS NULL;`)

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
  await db.run(sql`CREATE INDEX \`favoris_utilisateur_idx\` ON \`favoris\` (\`utilisateur_id\`);`)
  await db.run(sql`CREATE INDEX \`favoris_enchainement_idx\` ON \`favoris\` (\`enchainement_id\`);`)
  await db.run(sql`CREATE INDEX \`favoris_updated_at_idx\` ON \`favoris\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`favoris_created_at_idx\` ON \`favoris\` (\`created_at\`);`)
}
