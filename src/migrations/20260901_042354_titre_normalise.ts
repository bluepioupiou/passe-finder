import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

import { normaliserTexte } from '../recherche'

/**
 * Titre normalise : la colonne, l'index, ET LA REPRISE DE L'EXISTANT.
 *
 * La colonne seule ne servirait a rien : les enchainements deja en base ne
 * repasseront pas par le hook qui la remplit, et la liste — qui cherche
 * desormais dessus — ne trouverait plus AUCUN des 120 enchainements migres.
 * Une migration de schema qui laisse les donnees derriere elle est une panne a
 * retardement, pas une migration.
 *
 * La normalisation se fait en JS, avec la MEME fonction que la recherche
 * (`normaliserTexte`) : recopier la regle en SQL, c'est se garantir deux regles
 * qui divergent.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`enchainements\` ADD \`titre_normalise\` text;`)
  await db.run(sql`CREATE INDEX \`enchainements_titre_normalise_idx\` ON \`enchainements\` (\`titre_normalise\`);`)

  const existants = await db.run(sql`SELECT id, titre FROM \`enchainements\`;`)

  for (const ligne of existants.rows as unknown as { id: number; titre: string }[]) {
    await db.run(
      sql`UPDATE \`enchainements\` SET \`titre_normalise\` = ${normaliserTexte(ligne.titre ?? '')} WHERE \`id\` = ${ligne.id};`,
    )
  }

  payload.logger.info(`Titre normalise : ${existants.rows.length} enchainement(s) repris.`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`enchainements_titre_normalise_idx\`;`)
  await db.run(sql`ALTER TABLE \`enchainements\` DROP COLUMN \`titre_normalise\`;`)
}
