import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`enchainements_passes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`passe_id\` integer NOT NULL,
  	FOREIGN KEY (\`passe_id\`) REFERENCES \`passes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`enchainements\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`enchainements_passes_order_idx\` ON \`enchainements_passes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`enchainements_passes_parent_id_idx\` ON \`enchainements_passes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`enchainements_passes_passe_idx\` ON \`enchainements_passes\` (\`passe_id\`);`)
  await db.run(sql`CREATE TABLE \`enchainements\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`titre\` text NOT NULL,
  	\`description\` text,
  	\`notes\` text,
  	\`date\` text,
  	\`auteur_id\` integer NOT NULL,
  	\`visibilite\` text DEFAULT 'prive' NOT NULL,
  	\`url_video\` text,
  	\`legacy_id\` numeric,
  	\`legacy_marqueurs\` text,
  	\`legacy_meta\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`auteur_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`enchainements_auteur_idx\` ON \`enchainements\` (\`auteur_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`enchainements_legacy_id_idx\` ON \`enchainements\` (\`legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`enchainements_updated_at_idx\` ON \`enchainements\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`enchainements_created_at_idx\` ON \`enchainements\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`enchainements_id\` integer REFERENCES enchainements(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_enchainements_id_idx\` ON \`payload_locked_documents_rels\` (\`enchainements_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`enchainements_passes\`;`)
  await db.run(sql`DROP TABLE \`enchainements\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`danses_id\` integer,
  	\`media_id\` integer,
  	\`positions_id\` integer,
  	\`passes_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`danses_id\`) REFERENCES \`danses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`positions_id\`) REFERENCES \`positions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`passes_id\`) REFERENCES \`passes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "danses_id", "media_id", "positions_id", "passes_id") SELECT "id", "order", "parent_id", "path", "users_id", "danses_id", "media_id", "positions_id", "passes_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_danses_id_idx\` ON \`payload_locked_documents_rels\` (\`danses_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_positions_id_idx\` ON \`payload_locked_documents_rels\` (\`positions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_passes_id_idx\` ON \`payload_locked_documents_rels\` (\`passes_id\`);`)
}
