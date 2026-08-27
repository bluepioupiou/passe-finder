import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`passes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nom\` text NOT NULL,
  	\`position_debut_id\` integer NOT NULL,
  	\`position_fin_id\` integer NOT NULL,
  	\`description\` text,
  	\`deroule\` text,
  	\`difficulte\` text,
  	\`legacy_youtube_url\` text,
  	\`legacy_personnalisations\` text,
  	\`legacy_id\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`position_debut_id\`) REFERENCES \`positions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`position_fin_id\`) REFERENCES \`positions\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`passes_position_debut_idx\` ON \`passes\` (\`position_debut_id\`);`)
  await db.run(sql`CREATE INDEX \`passes_position_fin_idx\` ON \`passes\` (\`position_fin_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`passes_legacy_id_idx\` ON \`passes\` (\`legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`passes_updated_at_idx\` ON \`passes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`passes_created_at_idx\` ON \`passes\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`passes_id\` integer REFERENCES passes(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_passes_id_idx\` ON \`payload_locked_documents_rels\` (\`passes_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`passes\`;`)
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
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`danses_id\`) REFERENCES \`danses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`positions_id\`) REFERENCES \`positions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "danses_id", "media_id", "positions_id") SELECT "id", "order", "parent_id", "path", "users_id", "danses_id", "media_id", "positions_id" FROM \`payload_locked_documents_rels\`;`)
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
}
