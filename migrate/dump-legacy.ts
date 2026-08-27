import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

/**
 * Lecture du dump historique `passe-finder-saveDB.gz`.
 *
 * Le fichier est une archive tar.gz contenant un unique dump MySQL, encode en
 * UTF-8 (mysqldump a converti depuis les tables latin1 : aucun accent casse).
 *
 * Module partage par les scripts de migration, pour qu'ils lisent tous la
 * source de la meme facon.
 */

const RACINE = path.resolve(process.cwd())
const DUMP = path.join(RACINE, 'passe-finder-saveDB.gz')

/** Dossier des images historiques de positions. */
export const DOSSIER_IMAGES = path.join(RACINE, 'images', 'positions')

/** Extrait le dump SQL de l'archive tar.gz (un seul fichier a l'interieur). */
export function lireDump(): string {
  const tar = zlib.gunzipSync(fs.readFileSync(DUMP))
  // Format tar : en-tetes de 512 octets ; la taille du fichier est en octal a
  // l'offset 124. On lit le premier (et unique) membre de l'archive.
  const taille = parseInt(tar.toString('ascii', 124, 136).replace(/[^0-7]/g, ''), 8)
  return tar.toString('utf-8', 512, 512 + taille)
}

/** Decoupe les tuples d'un INSERT MySQL en tenant compte des quotes echappees. */
function parserTuples(valeurs: string): string[][] {
  const tuples: string[][] = []
  let courant: string[] = []
  let tampon = ''
  let dansQuote = false
  let echappe = false
  let profondeur = 0

  for (const c of valeurs) {
    if (echappe) {
      tampon += c
      echappe = false
      continue
    }
    if (c === '\\' && dansQuote) {
      tampon += c
      echappe = true
      continue
    }
    if (c === "'") {
      dansQuote = !dansQuote
      tampon += c
      continue
    }
    if (dansQuote) {
      tampon += c
      continue
    }
    if (c === '(') {
      profondeur++
      if (profondeur === 1) {
        courant = []
        tampon = ''
      }
      continue
    }
    if (c === ')') {
      profondeur--
      if (profondeur === 0) {
        courant.push(tampon.trim())
        tuples.push(courant)
        tampon = ''
      }
      continue
    }
    if (c === ',' && profondeur === 1) {
      courant.push(tampon.trim())
      tampon = ''
      continue
    }
    if (profondeur === 1) tampon += c
  }
  return tuples
}

/** Retire les quotes SQL et interprete les sequences echappees. */
function nettoyer(valeur: string): string {
  if (!valeur.startsWith("'") || !valeur.endsWith("'")) return valeur
  return valeur
    .slice(1, -1)
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\n/g, '\n')
}

/**
 * Extrait les lignes d'une table du dump, sous forme d'objets typés.
 * `colonnes` doit suivre l'ordre exact du CREATE TABLE d'origine.
 */
export function extraireTable<T>(sql: string, table: string, colonnes: string[]): T[] {
  const marqueur = 'INSERT INTO `' + table + '` VALUES '
  const debut = sql.indexOf(marqueur)
  if (debut === -1) throw new Error('Table `' + table + '` introuvable dans le dump.')
  const fin = sql.indexOf(';\n', debut)
  const valeurs = sql.slice(debut + marqueur.length, fin)

  return parserTuples(valeurs).map((tuple) => {
    const ligne: Record<string, string> = {}
    colonnes.forEach((col, i) => {
      ligne[col] = nettoyer(tuple[i] ?? '')
    })
    return ligne as unknown as T
  })
}
