import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`enchainements\` ADD \`musique_titre\` text;`)
  await db.run(sql`ALTER TABLE \`enchainements\` ADD \`musique_lien\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`enchainements\` DROP COLUMN \`musique_titre\`;`)
  await db.run(sql`ALTER TABLE \`enchainements\` DROP COLUMN \`musique_lien\`;`)
}
