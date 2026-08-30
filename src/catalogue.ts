import type { Payload } from 'payload'

import type { Pass, Position } from './payload-types'

/** Les deux tables de référence, indexées par identifiant. */
export type Catalogue = {
  passes: Map<number, Pass>
  positions: Map<number, Position>
}

/**
 * Charge le catalogue entier en mémoire, en deux requêtes.
 *
 * POURQUOI ne pas laisser Payload résoudre la profondeur : afficher un
 * enchaînement demande enchaînement -> passe -> position -> image, soit une
 * profondeur 3. Sur une liste de 119 enchaînements d'une dizaine de maillons,
 * cela fait des milliers de requêtes pour relire sans cesse les 30 mêmes
 * positions. Le catalogue de référence est petit et commun à tous : on le lit
 * une fois par page, et les enchaînements se lisent à profondeur 0.
 *
 * Les positions sont chargées à profondeur 1 : leur image doit être résolue
 * pour que `ImagePosition` affiche autre chose que le placeholder.
 */
export async function chargerCatalogue(payload: Payload): Promise<Catalogue> {
  const [{ docs: positions }, { docs: passes }] = await Promise.all([
    payload.find({ collection: 'positions', limit: 500, depth: 1, sort: 'nom' }),
    payload.find({ collection: 'passes', limit: 500, depth: 0, sort: 'nom' }),
  ])

  return {
    positions: new Map(positions.map((position: Position) => [position.id, position])),
    passes: new Map(passes.map((passe: Pass) => [passe.id, passe])),
  }
}
