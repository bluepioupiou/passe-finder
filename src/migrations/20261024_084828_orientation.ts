import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`positions\` ADD \`ligne_de_danse\` text;`)
  await db.run(sql`ALTER TABLE \`passes\` ADD \`pivot\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`positions\` DROP COLUMN \`ligne_de_danse\`;`)
  await db.run(sql`ALTER TABLE \`passes\` DROP COLUMN \`pivot\`;`)
}
