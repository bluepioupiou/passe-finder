import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`transitions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`position_debut_id\` integer NOT NULL,
  	\`position_fin_id\` integer NOT NULL,
  	\`nom\` text,
  	\`description\` text,
  	\`legacy_id\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`position_debut_id\`) REFERENCES \`positions\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`position_fin_id\`) REFERENCES \`positions\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`transitions_position_debut_idx\` ON \`transitions\` (\`position_debut_id\`);`)
  await db.run(sql`CREATE INDEX \`transitions_position_fin_idx\` ON \`transitions\` (\`position_fin_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`transitions_legacy_id_idx\` ON \`transitions\` (\`legacy_id\`);`)
  await db.run(sql`CREATE INDEX \`transitions_updated_at_idx\` ON \`transitions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`transitions_created_at_idx\` ON \`transitions\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`transitions_id\` integer REFERENCES transitions(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_transitions_id_idx\` ON \`payload_locked_documents_rels\` (\`transitions_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`transitions\`;`)
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
  	\`enchainements_id\` integer,
  	\`favoris_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`danses_id\`) REFERENCES \`danses\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`positions_id\`) REFERENCES \`positions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`passes_id\`) REFERENCES \`passes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`enchainements_id\`) REFERENCES \`enchainements\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`favoris_id\`) REFERENCES \`favoris\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "danses_id", "media_id", "positions_id", "passes_id", "enchainements_id", "favoris_id") SELECT "id", "order", "parent_id", "path", "users_id", "danses_id", "media_id", "positions_id", "passes_id", "enchainements_id", "favoris_id" FROM \`payload_locked_documents_rels\`;`)
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
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_enchainements_id_idx\` ON \`payload_locked_documents_rels\` (\`enchainements_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_favoris_id_idx\` ON \`payload_locked_documents_rels\` (\`favoris_id\`);`)
}
