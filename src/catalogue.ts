import type { Payload } from 'payload'

import { libelleDifficulte } from './collections/Passe'
import type { VuePasse, VuePosition } from './composition'
import { identifiant } from './enchainements'
import type { Pass, Position } from './payload-types'
import { imageDePosition } from './positions'

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

/**
 * Projection du catalogue pour le compositeur (Story 4.2).
 *
 * Ne traverse le reseau que ce que le compositeur affiche : nom, difficulte
 * lisible, les deux extremites, l'image deja resolue. Le catalogue complet
 * pese ~130 Ko de JSON dont il n'utilise rien — voir `VuePosition`.
 *
 * Vit ICI et pas dans `composition.ts` : la projection lit `libelleDifficulte`
 * et `imageDePosition`, cote serveur, alors que `composition.ts` part dans le
 * navigateur et doit rester libre de toute dependance a Payload.
 *
 * L'ordre des deux tables est celui du catalogue (tri par nom) : les listes du
 * compositeur se lisent donc dans l'ordre attendu sans retrier.
 */
export function vuesDuCatalogue(catalogue: Catalogue): {
  positions: VuePosition[]
  passes: VuePasse[]
} {
  const positions = [...catalogue.positions.values()].map((position) => ({
    id: position.id,
    nom: position.nom,
    src: imageDePosition(position).src,
  }))

  // Une passe dont une extremite manque n'est pas composable : elle ne peut ni
  // etre proposee depuis une position, ni faire avancer la chaine. Le cas est
  // impossible (les deux champs sont requis), mais le type les dit resolubles.
  const passes = [...catalogue.passes.values()].flatMap((passe) => {
    const debut = identifiant(passe.positionDebut)
    const fin = identifiant(passe.positionFin)
    if (debut === null || fin === null) return []

    return [
      {
        id: passe.id,
        nom: passe.nom,
        difficulte: libelleDifficulte(passe.difficulte),
        debut,
        fin,
      },
    ]
  })

  return { positions, passes }
}
