import fs from 'fs'
import path from 'path'

/**
 * Repart d'une base de test NEUVE a chaque execution.
 *
 * Pourquoi ce n'est pas du confort : un run interrompu (Ctrl+C, ou un echec
 * avant le `afterAll`) laisse ses fixtures en base. Le run SUIVANT echouait
 * alors sur un email en double — un echec qui ne dit rien du code et qu'il
 * fallait demeler a la main. Supprimer le fichier avant de commencer supprime
 * la classe entiere de ces faux echecs.
 *
 * Les fichiers `-wal` et `-shm` accompagnent la base en mode WAL : les laisser
 * derriere reviendrait a garder une partie de l'etat qu'on croit avoir efface.
 */
const DOSSIER = path.resolve(process.cwd(), '.tmp')
const BASE = path.join(DOSSIER, 'test.db')

export function setup() {
  fs.mkdirSync(DOSSIER, { recursive: true })

  for (const fichier of [BASE, `${BASE}-wal`, `${BASE}-shm`]) {
    // `force` : l'absence du fichier est le cas NORMAL (premiere execution,
    // machine propre, CI). Ce n'est pas une erreur a signaler.
    fs.rmSync(fichier, { force: true })
  }
}
