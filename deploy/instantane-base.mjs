import { DatabaseSync } from 'node:sqlite'
import { existsSync, rmSync } from 'node:fs'

/**
 * Prend un instantané de la base, juste avant les migrations.
 *
 * C'EST LE FILET DU DÉPLOIEMENT (voir `deploy/mettre-en-prod.sh`). Sans lui, on
 * saurait revenir à l'ancienne image en cas d'échec, mais pas à l'ancien
 * schéma — et l'ancienne image ne sait pas lire le nouveau. Renommer une seule
 * valeur de visibilité suffit à la rendre aveugle sur la moitié du catalogue.
 *
 * `VACUUM INTO` ET PAS UNE COPIE DE FICHIER, et la différence n'est pas
 * théorique : la base tourne en mode WAL (Litestream l'exige). Les dernières
 * écritures vivent dans `passe-finder.db-wal`, pas dans `passe-finder.db`.
 * Copier le seul fichier principal donnerait une base amputée de tout ce qui
 * n'a pas encore été fusionné — c'est-à-dire, précisément, du travail le plus
 * récent. `VACUUM INTO` écrit UNE base cohérente, WAL compris.
 *
 * À lancer quand plus personne n'écrit (l'application et Litestream arrêtés) :
 * l'instantané est alors exactement l'état d'avant.
 */

const BASE = process.env.DATABASE_URI?.replace(/^file:/, '') ?? '/data/passe-finder.db'
const INSTANTANE = process.env.INSTANTANE ?? '/data/avant-deploiement.db'

// `VACUUM INTO` refuse d'écrire par-dessus un fichier existant : celui du
// déploiement précédent n'a plus d'intérêt, on ne garde qu'un cran de retour.
if (existsSync(INSTANTANE)) rmSync(INSTANTANE)

const db = new DatabaseSync(BASE)

try {
  // Le chemin passe par un paramètre lié plutôt que par une concaténation :
  // c'est SQLite qui l'échappe, et le script reste juste si le chemin change.
  db.prepare('VACUUM INTO ?').run(INSTANTANE)
} finally {
  db.close()
}

console.log(`Instantané pris : ${INSTANTANE}`)
