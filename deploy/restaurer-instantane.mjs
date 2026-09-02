import { copyFileSync, existsSync, rmSync } from 'node:fs'

/**
 * Remet la base dans l'état où l'instantané l'a trouvée.
 *
 * Appelé par le retour arrière de `deploy/mettre-en-prod.sh`, quand une
 * migration ou un démarrage échoue. À lancer l'application et Litestream
 * ARRÊTÉS : on remplace le fichier sous leurs pieds, sinon.
 *
 * LE WAL ET LE SHM PARTENT AVEC LA BASE QU'ILS ACCOMPAGNENT. Les laisser
 * derrière serait pire que de ne rien faire : SQLite les rejouerait par-dessus
 * l'instantané, réappliquant des écritures qui appartiennent à un schéma qui
 * n'existe plus. Le WAL sera recréé au premier démarrage (`activer-wal.mjs`).
 *
 * NE LÈVE PAS QUAND L'INSTANTANÉ MANQUE : ce n'est pas une erreur, c'est le cas
 * « on a échoué avant de l'avoir pris ». La base n'a alors pas été touchée, et
 * il n'y a rien à défaire.
 */

const BASE = process.env.DATABASE_URI?.replace(/^file:/, '') ?? '/data/passe-finder.db'
const INSTANTANE = process.env.INSTANTANE ?? '/data/avant-deploiement.db'

if (!existsSync(INSTANTANE)) {
  console.log("Aucun instantané : la base n'a pas été touchée, rien à restaurer.")
  process.exit(0)
}

for (const fichier of [BASE, `${BASE}-wal`, `${BASE}-shm`]) {
  if (existsSync(fichier)) rmSync(fichier)
}

copyFileSync(INSTANTANE, BASE)

console.log(`Base restaurée depuis ${INSTANTANE}`)
