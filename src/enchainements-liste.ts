import type { Where } from 'payload'

import { normaliserTexte } from './recherche'

/**
 * Les critères de la liste des enchaînements : ce que l'URL porte, et ce que la
 * requête en fait (Story 5.4 étendue, demande d'Alain 2026-08-31).
 *
 * TOUT PASSE PAR L'URL, et c'est ce qui rend la pagination possible : une page
 * de résultats se partage, le retour du navigateur y revient, et un rechargement
 * ne perd pas le filtre. Un état gardé dans le composant ne ferait rien de tout
 * cela.
 *
 * LES CRITÈRES DEVIENNENT DES CONTRAINTES DE REQUÊTE, jamais un tri en mémoire
 * après coup : filtrer côté client obligerait à charger toute la liste, ce qui
 * annulerait exactement ce que la pagination vient chercher. C'est aussi
 * pourquoi la recherche porte sur `titreNormalise` et non sur `titre` — voir la
 * note du hook `normaliserLeTitre`.
 *
 * Fonctions PURES : elles se testent sans base ni rendu, et la page comme le
 * formulaire lisent les mêmes règles.
 */

/**
 * Cartes par page.
 *
 * 24 = un multiple de 2 et 3, les deux largeurs de grille (téléphone, écran) :
 * la dernière ligne est pleine dans les deux cas. Assez pour balayer, assez peu
 * pour que la page reste légère quand le catalogue aura grossi.
 */
export const PAR_PAGE = 24

export type Criteres = {
  /** Recherche par titre, telle que saisie (non normalisée). */
  requete: string
  /** Page demandée, toujours ≥ 1. */
  page: number
  /** Ne montrer que mes favoris (Story 5.1). */
  favorisSeuls: boolean
  /** Ne montrer que ceux qui portent une musique. */
  avecMusique: boolean
  /** Ne montrer que ceux qui portent une vidéo. */
  avecVideo: boolean
  /** Ne montrer que ceux de cet auteur ; `null` = tous. */
  auteur: number | null
}

/** Ce que l'URL peut porter. */
export type ParametresURL = Record<string, string | string[] | undefined>

/** La première valeur d'un paramètre, quand l'URL le répète. */
function valeur(parametres: ParametresURL, nom: string): string {
  const brut = parametres[nom]

  return (Array.isArray(brut) ? brut[0] : brut) ?? ''
}

/**
 * Lit les critères depuis l'URL.
 *
 * TOLÉRANTE PAR CONSTRUCTION : une URL se bricole à la main, se tronque dans un
 * message, se répète (`?page=2&page=9`). Rien de tout cela ne doit produire
 * d'erreur — une valeur illisible vaut « pas de filtre », et une page absurde
 * vaut la première.
 */
export function lireCriteres(parametres: ParametresURL): Criteres {
  const page = Number.parseInt(valeur(parametres, 'page'), 10)
  const auteur = Number.parseInt(valeur(parametres, 'auteur'), 10)

  return {
    requete: valeur(parametres, 'q').trim(),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    favorisSeuls: valeur(parametres, 'favoris') === '1',
    avecMusique: valeur(parametres, 'musique') === '1',
    avecVideo: valeur(parametres, 'video') === '1',
    auteur: Number.isFinite(auteur) && auteur > 0 ? auteur : null,
  }
}

/**
 * Les critères remis en URL, pour les liens de pagination et les formulaires.
 *
 * Les valeurs par défaut sont OMISES : `/enchainements` reste `/enchainements`
 * plutôt que `/enchainements?q=&page=1&favoris=0`. Une URL propre se partage et
 * se lit ; celle qui traîne ses valeurs vides ressemble à une fuite de code.
 */
export function versParametres(criteres: Partial<Criteres>): URLSearchParams {
  const parametres = new URLSearchParams()

  if (criteres.requete && criteres.requete.trim() !== '') {
    parametres.set('q', criteres.requete.trim())
  }
  if (criteres.favorisSeuls) parametres.set('favoris', '1')
  if (criteres.avecMusique) parametres.set('musique', '1')
  if (criteres.avecVideo) parametres.set('video', '1')
  if (criteres.auteur) parametres.set('auteur', String(criteres.auteur))
  if (criteres.page && criteres.page > 1) parametres.set('page', String(criteres.page))

  return parametres
}

/** L'adresse de la liste pour ces critères. */
export function lienListe(criteres: Partial<Criteres>): string {
  const parametres = versParametres(criteres).toString()

  return parametres === '' ? '/enchainements' : `/enchainements?${parametres}`
}

/** Au moins un critère est-il posé ? */
export function auMoinsUnCritere(criteres: Criteres): boolean {
  return (
    criteres.requete !== '' ||
    criteres.favorisSeuls ||
    criteres.avecMusique ||
    criteres.avecVideo ||
    criteres.auteur !== null
  )
}

/**
 * « Ce champ porte quelque chose ».
 *
 * DEUX CONDITIONS ET NON UNE : `exists` écarte les `NULL`, `not_equals` les
 * chaînes VIDES. Les deux existent en base — une écriture récente met `null`,
 * mais l'historique migré et /admin peuvent laisser `''`. Ne tester que l'un
 * des deux ferait apparaître dans « avec musique » des enchaînements qui n'en
 * ont pas, ce qui ne se remarque qu'en ouvrant la fiche.
 */
function renseigne(chemin: string): Where {
  return { and: [{ [chemin]: { exists: true } }, { [chemin]: { not_equals: '' } }] }
}

/**
 * Les critères traduits en contrainte Payload, ou `undefined` s'il n'y en a
 * aucune.
 *
 * NE PORTE PAS LA VISIBILITÉ : celle-ci vient des `access` de la collection
 * (ADD-5), que Payload combine avec cette contrainte. La réécrire ici en ferait
 * une seconde règle, qui dériverait de la première.
 */
export function conditions(criteres: Criteres, favoris: number[]): Where | undefined {
  const et: Where[] = []

  if (criteres.requete !== '') {
    et.push({ titreNormalise: { like: normaliserTexte(criteres.requete) } })
  }

  if (criteres.avecMusique) {
    // « A une musique » = l'UN OU L'AUTRE des deux champs, exactement comme
    // l'icône de la carte (décision d'Alain) : c'est la présence de
    // l'information qui compte, pas celle du lien. Un titre sans lien reste une
    // musique — c'est même le cas des quatre montages de l'historique, dont le
    // fichier a disparu avec l'ancien site.
    et.push({ or: [renseigne('musique.titre'), renseigne('musique.lien')] })
  }

  if (criteres.avecVideo) et.push(renseigne('urlVideo'))

  if (criteres.auteur !== null) et.push({ auteur: { equals: criteres.auteur } })

  if (criteres.favorisSeuls) {
    // Sans aucun favori, on veut une liste VIDE, pas la liste entière : un
    // `in: []` selon les bases veut dire l'un ou l'autre. Les identifiants
    // étant tous positifs, `equals: 0` ne peut rien ramener — c'est explicite.
    et.push(favoris.length === 0 ? { id: { equals: 0 } } : { id: { in: favoris } })
  }

  if (et.length === 0) return undefined

  return et.length === 1 ? et[0] : { and: et }
}
