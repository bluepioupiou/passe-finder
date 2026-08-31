import type { Payload } from 'payload'

import type { Enchainement, User } from './payload-types'

/**
 * Lecture des favoris (Story 5.1, FR-25).
 *
 * Le predicat est PUR et vit ici, a cote de la lecture, pour une raison : la
 * meme question — « peut-on mettre ceci en favori ? » — est posee a trois
 * endroits (la fiche, la liste, l'action serveur). Ecrite trois fois, elle
 * derive. Elle reste neanmoins un DOUBLON DELIBERE de la regle portee par la
 * collection `Favori` : celle-ci decide, celle-la evite de proposer un bouton
 * qui serait refuse. L'interface anticipe, la collection tranche.
 */

/** L'identifiant d'une relation, qu'elle soit resolue ou non (depth 0 ou 1). */
function idDe(relation: number | { id: number } | null | undefined): number | null {
  if (relation === null || relation === undefined) return null

  return typeof relation === 'object' ? relation.id : relation
}

/**
 * Peut-on mettre CET enchainement en favori (ADD-9) ?
 *
 * Trois conditions : etre connecte, que l'enchainement soit partage, et ne pas
 * en etre l'auteur. La derniere surprend au premier abord — elle dit qu'un
 * favori sert a retrouver le travail DES AUTRES ; le sien se retrouve dans
 * « mes enchainements » (Story 5.2).
 */
export function peutEtreMisEnFavori(
  enchainement: Pick<Enchainement, 'visibilite' | 'auteur'>,
  utilisateur: User | null,
): boolean {
  if (!utilisateur) return false
  if (enchainement.visibilite !== 'partage') return false

  return idDe(enchainement.auteur) !== utilisateur.id
}

/**
 * Les identifiants d'enchainements mis en favori par cet utilisateur.
 *
 * Un ENSEMBLE plutot qu'une liste : la question posee par l'interface est
 * toujours « celui-ci en fait-il partie ? », une fois par carte de la liste.
 *
 * Une seule requete pour toute la page. Interroger favori par favori
 * fonctionnerait aussi, mais poserait une requete par carte affichee.
 */
export async function idsFavoris(payload: Payload, utilisateur: User | null): Promise<Set<number>> {
  if (!utilisateur) return new Set()

  const { docs } = await payload.find({
    collection: 'favoris',
    where: { utilisateur: { equals: utilisateur.id } },
    limit: 500,
    depth: 0,
    overrideAccess: false,
    user: utilisateur,
  })

  const ids = new Set<number>()
  for (const favori of docs) {
    const id = idDe(favori.enchainement)
    if (id !== null) ids.add(id)
  }

  return ids
}
