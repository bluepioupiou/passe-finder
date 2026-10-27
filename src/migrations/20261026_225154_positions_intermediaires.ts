import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`passes_positions_intermediaires\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`instant\` numeric NOT NULL,
  	\`schema\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`passes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`passes_positions_intermediaires_order_idx\` ON \`passes_positions_intermediaires\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`passes_positions_intermediaires_parent_id_idx\` ON \`passes_positions_intermediaires\` (\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`passes_positions_intermediaires\`;`)
}
