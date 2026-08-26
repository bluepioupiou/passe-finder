import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`positions\` ADD \`legacy_id\` numeric;`)
  await db.run(sql`CREATE UNIQUE INDEX \`positions_legacy_id_idx\` ON \`positions\` (\`legacy_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`positions_legacy_id_idx\`;`)
  await db.run(sql`ALTER TABLE \`positions\` DROP COLUMN \`legacy_id\`;`)
}
