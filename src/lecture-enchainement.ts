import type { Payload } from 'payload'

import { estIdentifiantPublic } from './identifiant-public'
import type { Enchainement, User } from './payload-types'
import { peutLire } from './visibilite'

/**
 * Les lectures d'enchainement qui passent par le LIEN
 * (action item `identifiant-opaque-et-visibilites`).
 *
 * SEPARE DE `visibilite.ts`, QUI PORTE LES REGLES, pour une raison concrete :
 * ce module-ci touche la base et tire `node:crypto` (par la verification de
 * forme de l'identifiant), alors que les regles partent dans le navigateur avec
 * le menu de visibilite du compositeur. Melanger les deux embarquerait Payload
 * et `node:crypto` dans le bundle client.
 *
 * TOUT CE QUI EST ICI CONTOURNE LES `access` A DESSEIN, et c'est le seul endroit
 * du projet qui le fasse pour cette collection. Y ajouter une fonction, c'est
 * ouvrir une porte : ne le faire qu'en sachant pourquoi, et en laissant
 * `peutLire` trancher a la fin.
 */

/**
 * L'enchainement designe par cet identifiant public, ou `null`.
 *
 * CONTOURNE LES `access` A DESSEIN, et c'est le seul endroit du projet qui le
 * fasse pour cette collection. La raison est celle de tout le modele : sous
 * `access.read`, un non-repertorie n'existe pour personne d'autre que son
 * auteur — c'est ce qui le tient hors des listes et hors de l'API. La fiche doit
 * donc lire autrement, et c'est `peutLire` qui tranche ensuite, sur la seule
 * base de ce que la visibilite promet.
 *
 * L'IDENTIFIANT EST VERIFIE AVANT LA REQUETE : ce qui n'a pas la forme d'un
 * identifiant public n'atteint jamais la base. Un numero d'autrefois
 * (`/enchainements/12`) tombe ici, et repond `null`.
 *
 * Rend `null` dans tous les cas de refus, jamais une erreur distincte :
 * « ca n'existe pas » et « tu n'y as pas droit » doivent se ressembler, sinon
 * l'un apprend l'autre.
 */
export async function lireParIdentifiantPublic(
  payload: Payload,
  idPublic: string,
  utilisateur: User | null,
): Promise<Enchainement | null> {
  if (!estIdentifiantPublic(idPublic)) return null

  const { docs } = await payload.find({
    collection: 'enchainements',
    where: { idPublic: { equals: idPublic } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const enchainement = docs[0]
  if (!enchainement) return null

  return peutLire(enchainement, utilisateur) ? enchainement : null
}

/**
 * Les enchainements designes par ces identifiants publics, dans l'ordre demande.
 *
 * LE PENDANT DE `lireParIdentifiantPublic` POUR UNE LISTE, et il n'existe que
 * pour UNE surface : « mes favoris ». Un favori garde le lien qu'on a recu
 * (voir la collection `Favori`), donc la page peut le rejouer — sans quoi un
 * non-repertorie mis en favori disparaitrait silencieusement de la liste.
 *
 * UNE SEULE REQUETE, quel que soit le nombre de favoris.
 *
 * LE FILTRE PAR `peutLire` EST CE QUI GARDE LA LISTE FRAICHE : un enchainement
 * que son auteur a repasse en PRIVE depuis la mise en favori disparait d'ici,
 * exactement comme avant. Ce qu'on rejoue, c'est le lien, pas un droit acquis.
 */
export async function lireParIdentifiantsPublics(
  payload: Payload,
  idsPublics: string[],
  utilisateur: User | null,
): Promise<Enchainement[]> {
  const valides = idsPublics.filter(estIdentifiantPublic)
  if (valides.length === 0) return []

  const { docs } = await payload.find({
    collection: 'enchainements',
    where: { idPublic: { in: valides } },
    limit: valides.length,
    depth: 0,
    overrideAccess: true,
  })

  const parIdentifiant = new Map(docs.map((doc) => [doc.idPublic, doc]))

  // L'ordre demande est celui des favoris (le plus recemment pose en premier),
  // que la requete ne connait pas : c'est la chronologie de MA mise de cote qui
  // fait sens, pas la date des enchainements.
  return valides.flatMap((idPublic) => {
    const enchainement = parIdentifiant.get(idPublic)

    return enchainement && peutLire(enchainement, utilisateur) ? [enchainement] : []
  })
}
