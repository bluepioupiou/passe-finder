import { comptage, libelleInstant, type Duree } from './rythme'
import { schemaSur, type SchemaPosition } from './schema-position'

/**
 * Les positions intermediaires d'une passe (Epic 8) : des schemas d'atelier
 * poses sur les instants de son comptage.
 *
 * ELLES N'EXISTENT QUE PAR LEUR PASSE. Ni nom, ni description, ni fiche : elles
 * vivent dans un champ tableau de `Passe` (AD-16), naissent et meurent avec
 * elle, et ne peuvent donc apparaitre nulle part ailleurs — ni dans le
 * catalogue, ni dans la recherche, ni dans le graphe du compositeur.
 *
 * DANS LE REPERE DU DEPART. Alain les dessine par-dessus la position de depart
 * en calque : elles s'affichent telles que dessinees, sans aucun angle de
 * l'Epic 7.
 *
 * Fonctions PURES, sans Payload et sans React : le hook de la collection, les
 * actions serveur et la frise lisent les memes regles.
 */

export type PositionIntermediaire = {
  /** Index du demi-temps dans le comptage de la passe (0 = « 1 »). */
  instant: number
  schema: SchemaPosition
}

/**
 * A passer en `select` a toute LISTE de passes : les schemas ne servent que sur
 * la fiche d'une passe, et une liste n'a pas a les charger (AD-16). Une passe
 * peuplee, elle, en est privee par le `defaultPopulate` de la collection.
 */
export const SANS_POSITIONS_INTERMEDIAIRES = { positionsIntermediaires: false } as const

/** Une ligne telle que la collection la recoit ou la rend : rien n'est sur. */
type Ligne = { instant?: unknown; schema?: unknown }

/** L'ordre des positions est celui du rythme, jamais celui du tableau. */
const parInstant = (a: PositionIntermediaire, b: PositionIntermediaire) => a.instant - b.instant

/**
 * Le calque aide a dessiner et ne fait pas partie du dessin (meme regle que
 * l'atelier) : il n'est jamais stocke.
 */
const sansCalque = (schema: SchemaPosition): SchemaPosition => ({ ...schema, calque: null })

/**
 * Le nom d'un instant pour les messages. Le comptage de 6 temps est le debut de
 * celui de 10 : nommer en 10 temps reste juste quelle que soit la duree.
 */
const nomInstant = (instant: number) => libelleInstant(10, instant) ?? String(instant)

/**
 * Relit les positions stockees sur une passe, triees par instant.
 *
 * Une ligne illisible est ECARTEE plutot que de faire tomber la fiche : le
 * hook a l'ecriture les refuse, ce cas ne peut venir que d'une base modifiee
 * a la main.
 */
export function positionsIntermediairesDe(brut: unknown): PositionIntermediaire[] {
  if (!Array.isArray(brut)) return []

  const lues: PositionIntermediaire[] = []
  for (const ligne of brut as Ligne[]) {
    if (!ligne || !Number.isInteger(ligne.instant) || (ligne.instant as number) < 0) continue
    const schema = schemaSur(ligne.schema)
    if (schema) lues.push({ instant: ligne.instant as number, schema: sansCalque(schema) })
  }

  return lues.sort(parInstant)
}

/**
 * Pourquoi ces positions ne peuvent pas s'enregistrer sur une passe de cette
 * duree, ou `null` si elles le peuvent.
 *
 * Chaque message dit QUOI FAIRE : c'est le hook de la collection qui le
 * renvoie, et il remonte tel quel jusqu'au formulaire d'Alain.
 */
export function erreurPositionsIntermediaires(lignes: Ligne[], duree: Duree): string | null {
  const instants = comptage(duree).length
  const vus = new Set<number>()

  for (const ligne of lignes) {
    const instant = ligne.instant
    if (typeof instant !== 'number' || !Number.isInteger(instant) || instant < 0) {
      return 'Une position intermédiaire est posée sur un instant qui n’existe pas.'
    }

    if (instant >= instants) {
      // LE CAS QUI COMPTE : reduire la duree d'une passe deja dessinee. On ne
      // supprime rien en silence (FR-50) : on dit quelle position gene.
      return (
        `En ${duree} temps, la passe s’arrête à « ${libelleInstant(duree, instants - 1)} » : ` +
        `retire d’abord la position posée sur « ${nomInstant(instant)} ».`
      )
    }

    if (vus.has(instant)) {
      return `Deux positions sont posées sur « ${nomInstant(instant)} » : une seule par instant.`
    }
    vus.add(instant)

    const schema = schemaSur(ligne.schema)
    if (!schema) return `La position posée sur « ${nomInstant(instant)} » est illisible.`
    if (schema.pieces.length === 0) {
      return `La position posée sur « ${nomInstant(instant)} » ne contient aucune pièce.`
    }
  }

  return null
}

/** Pose (ou remplace) la position d'un instant. Le calque n'est pas garde. */
export function poserPosition(
  positions: PositionIntermediaire[],
  instant: number,
  schema: SchemaPosition,
): PositionIntermediaire[] {
  return [
    ...positions.filter((position) => position.instant !== instant),
    { instant, schema: sansCalque(schema) },
  ].sort(parInstant)
}

/** Retire la position d'un instant, et seulement elle. */
export function retirerPosition(
  positions: PositionIntermediaire[],
  instant: number,
): PositionIntermediaire[] {
  return positions.filter((position) => position.instant !== instant)
}
