import type { Payload } from 'payload'

import type { Enchainement, Pass, Position } from './payload-types'

/**
 * Le fil des nouveautés de l'accueil (Story 5.3, E1).
 *
 * TROIS COLLECTIONS, UNE SEULE LISTE. Positions, passes et enchaînements n'ont
 * ni les mêmes champs ni les mêmes URL, mais l'accueil ne veut en savoir qu'une
 * chose : « quoi de neuf ». On les ramène donc à une forme commune — un type,
 * un titre, un lien, une date — et tout le reste du fil ignore d'où vient la
 * ligne qu'il affiche.
 *
 * LE TRI SE FAIT ICI, EN MÉMOIRE, et pas dans la base : SQLite ne sait pas
 * trier trois tables ensemble sans une union écrite à la main, hors de l'API de
 * Payload. Le coût est nul tant qu'on ne lit que les dix plus récents de
 * chaque collection — trente lignes à trier pour en garder dix.
 */

/** Les trois natures d'objet qui peuvent apparaître dans le fil. */
export type TypeNouveaute = 'position' | 'passe' | 'enchainement'

/**
 * Le mot qui nomme chaque type, à l'écran.
 *
 * ICI ET PAS DANS LA PAGE : c'est le libellé public d'un type, au même titre
 * que `libelleDifficulte` ou `libelleVisibilite`. Une deuxième surface qui
 * afficherait le fil (un profil, une page auteur) doit lire les mêmes mots.
 */
export const LIBELLES: Record<TypeNouveaute, string> = {
  position: 'Position',
  passe: 'Passe',
  enchainement: 'Enchaînement',
}

/** Une entrée du fil, quelle que soit la collection dont elle vient. */
export type Nouveaute = {
  type: TypeNouveaute
  /** Identifiant DANS SA COLLECTION : sert de départage au tri, jamais d'URL. */
  id: number
  titre: string
  /** L'adresse de la fiche. Pour un enchaînement, son identifiant PUBLIC. */
  lien: string
  /** Date de création, en ISO. C'est elle qui ordonne le fil. */
  creeLe: string
}

/**
 * Combien de lignes le fil montre. Volontairement court (UX : 5-10) — l'accueil
 * donne un coup d'œil, le catalogue donne la liste.
 */
export const NOMBRE_DE_NOUVEAUTES = 10

/**
 * Fusionne des listes déjà formées, garde les plus récentes.
 *
 * PURE, donc testable sans base : c'est la seule règle du module qui puisse se
 * tromper, et elle décide de ce que voit un visiteur en arrivant.
 *
 * DÉPARTAGE PAR IDENTIFIANT DÉCROISSANT quand deux dates sont égales, et ce
 * n'est pas un détail théorique : les 119 enchaînements, 30 positions et ~110
 * passes repris de l'ancienne appli ont été créés par le MÊME script, donc à la
 * même seconde. Sans départage, leur ordre dépendrait de l'ordre d'arrivée des
 * trois requêtes, et le fil changerait à chaque rechargement sans que rien
 * n'ait bougé.
 */
export function fusionner(listes: Nouveaute[][], combien = NOMBRE_DE_NOUVEAUTES): Nouveaute[] {
  return listes
    .flat()
    .sort((a, b) => {
      const ecart = Date.parse(b.creeLe) - Date.parse(a.creeLe)
      if (ecart !== 0 && !Number.isNaN(ecart)) return ecart
      return b.id - a.id
    })
    .slice(0, combien)
}

/**
 * Lit les dernières nouveautés des trois collections.
 *
 * `limit: combien` PAR COLLECTION, et c'est suffisant : les dix plus récentes
 * au total ne peuvent pas contenir plus de dix éléments d'une même collection.
 *
 * LES ENCHAÎNEMENTS SONT FILTRÉS DEUX FOIS, délibérément (voir
 * `src/visibilite.ts`) :
 *  - `overrideAccess: false` sans utilisateur applique l'`access.read` de la
 *    collection, qui ne rend que le public à un visiteur anonyme. C'est lui qui
 *    décide en dernier ressort (ADD-5) ;
 *  - le `where` explicite dit la même chose dans le code du fil, pour que la
 *    règle reste lisible ici et qu'une évolution des accès (un jour où un
 *    connecté verrait les siens) ne fasse pas apparaître un privé sur l'accueil.
 *
 * Positions et passes n'ont pas cette question : le catalogue de référence est
 * public par nature (FR-21).
 */
export async function chargerNouveautes(
  payload: Payload,
  combien = NOMBRE_DE_NOUVEAUTES,
): Promise<Nouveaute[]> {
  const [positions, passes, enchainements] = await Promise.all([
    payload.find({ collection: 'positions', limit: combien, depth: 0, sort: '-createdAt' }),
    payload.find({ collection: 'passes', limit: combien, depth: 0, sort: '-createdAt' }),
    payload.find({
      collection: 'enchainements',
      where: { visibilite: { equals: 'public' } },
      limit: combien,
      depth: 0,
      sort: '-createdAt',
      overrideAccess: false,
    }),
  ])

  return fusionner(
    [
      positions.docs.map((position: Position) => ({
        type: 'position' as const,
        id: position.id,
        titre: position.nom,
        lien: `/positions/${position.id}`,
        creeLe: position.createdAt,
      })),
      passes.docs.map((passe: Pass) => ({
        type: 'passe' as const,
        id: passe.id,
        titre: passe.nom,
        lien: `/passes/${passe.id}`,
        creeLe: passe.createdAt,
      })),
      // Un enchaînement sans identifiant public n'a pas d'adresse : le hook
      // `donnerUnIdentifiantPublic` en pose un à chaque écriture, mais le fil
      // préfère sauter une ligne plutôt que servir un lien mort.
      enchainements.docs.flatMap((enchainement: Enchainement) =>
        enchainement.idPublic
          ? [
              {
                type: 'enchainement' as const,
                id: enchainement.id,
                titre: enchainement.titre,
                lien: `/enchainements/${enchainement.idPublic}`,
                creeLe: enchainement.createdAt,
              },
            ]
          : [],
      ),
    ],
    combien,
  )
}
