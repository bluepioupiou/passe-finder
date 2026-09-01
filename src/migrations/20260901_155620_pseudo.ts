import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD \`pseudo\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`pseudo_normalise\` text;`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_pseudo_normalise_idx\` ON \`users\` (\`pseudo_normalise\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`users_pseudo_normalise_idx\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`pseudo\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`pseudo_normalise\`;`)
}
