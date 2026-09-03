import sharp from 'sharp'

import { svgDeSchema } from './dessin-position'
import type { SchemaPosition } from './schema-position'

/**
 * La rasterisation d'un schema — le seul fichier du produit qui importe `sharp`.
 *
 * IL TOURNE SUR LE SERVEUR, ET C'EST DELIBERE. Le navigateur saurait aussi
 * produire un PNG (`canvas` + `toBlob`), mais alors ce serait l'IMAGE qui
 * remonterait dans la requete : quelques centaines de kilo-octets, une limite
 * de taille de corps a surveiller, et une image dont le serveur ne pourrait
 * rien dire. Ici c'est le SCHEMA qui monte — quelques kilo-octets de JSON — et
 * le PNG nait de ce cote-ci. C'est aussi ce qui garantit que le fichier
 * enregistre correspond exactement au schema enregistre.
 *
 * `sharp` est deja une dependance du projet (Payload s'en sert pour ses
 * uploads) et `withPayload` le declare deja dans `serverExternalPackages` :
 * l'importer ici n'ajoute ni paquet ni configuration.
 */

/**
 * Cote du PNG produit, en pixels.
 *
 * Independant de `schema.taille`, qui est une echelle de DESSIN : la toile peut
 * valoir 520 ou 760 unites, le fichier fait toujours 800 px de cote. C'est
 * environ trois fois la taille des vignettes historiques — assez pour rester
 * net sur un ecran dense, et le site n'affiche jamais plus de 220 px.
 */
export const EXPORT_PX = 800

export async function pngDeSchema(schema: SchemaPosition): Promise<Buffer> {
  return sharp(Buffer.from(svgDeSchema(schema, { cotePx: EXPORT_PX }), 'utf8'))
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/** Bornes des marques diacritiques combinantes, en Unicode. */
const ACCENT_MIN = 0x300
const ACCENT_MAX = 0x36f

/**
 * Un nom de fichier sur : lisible dans le dossier des uploads, et horodate.
 *
 * L'horodatage n'est pas decoratif. Sans lui, reenregistrer deux fois la meme
 * position produirait deux fois le meme nom, et Payload renommerait le second
 * selon une regle qui lui appartient. Le decider ici rend le resultat previsible.
 *
 * Les accents sont retires par COMPARAISON DE CODES et non par une classe de
 * caracteres : ecrite en clair, elle contiendrait des marques combinantes
 * invisibles dans un editeur, qu'un copier-coller perd sans rien signaler.
 */
export function nomDeFichier(nom: string): string {
  const sansAccents = [...nom.normalize('NFD')]
    .filter((caractere) => {
      const code = caractere.codePointAt(0) ?? 0
      return code < ACCENT_MIN || code > ACCENT_MAX
    })
    .join('')

  const ardoise = sansAccents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return `${ardoise || 'schema'}-${Date.now()}.png`
}
