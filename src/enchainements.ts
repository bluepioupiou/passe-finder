import type { Pass, Position } from './payload-types'

/**
 * Lecture d'un enchaînement : la chaîne et ses ruptures (Stories 4.4 / 6.3).
 *
 * Fonctions PURES, sans Payload : le chargement vit dans `catalogue.ts`, la
 * mise en forme dans `components/ChaineEnchainement.tsx`. Isolées ici, elles se
 * testent sans base ni rendu — et le compositeur (Story 4.2) construira sa
 * chaîne avec les mêmes règles plutôt qu'avec une seconde implémentation.
 */

/** Identifiant d'une relation, qu'elle soit résolue ou non. */
export function identifiant(valeur: number | Position | null | undefined): number | null {
  if (typeof valeur === 'number') return valeur
  if (valeur && typeof valeur === 'object') return valeur.id
  return null
}

/** L'objet d'une relation, ou `null` si elle n'a pas été résolue. */
export function positionDe(valeur: number | Position | null | undefined): Position | null {
  return valeur && typeof valeur === 'object' ? valeur : null
}

/**
 * Un maillon : la passe et ses deux extrémités, prêtes à afficher.
 */
export type Maillon = {
  passe: Pass
  debut: Position | null
  fin: Position | null
  /**
   * Rupture de continuité : cette passe ne part PAS de la position d'arrivée
   * de la précédente. `null` dans le cas normal (chaîne continue).
   *
   * Ce n'est pas une anomalie de données : l'ancienne appli notait ainsi les
   * TRANSITIONS de main (lâcher une main pour changer de prise), et 59 des 119
   * enchaînements repris en portent. La vue lecture les nomme au lieu de les
   * masquer — voir la note « Transitions » du sprint-status.
   */
  rupture: { arrivait: Position | null; reprend: Position | null } | null
}

/**
 * Suite ordonnée des maillons, ruptures repérées au passage.
 *
 * Les passes arrivent dans l'ordre du tableau de l'enchaînement (l'index EST
 * l'ordre — ADD-18) ; leurs positions doivent être résolues au préalable
 * (`resoudrePasse`) pour être affichables.
 */
export function construireChaine(passes: Pass[]): Maillon[] {
  return passes.map((passe, index) => {
    const precedente = index > 0 ? passes[index - 1] : null
    const finPrecedente = precedente ? identifiant(precedente.positionFin) : null
    const debut = identifiant(passe.positionDebut)

    return {
      passe,
      debut: positionDe(passe.positionDebut),
      fin: positionDe(passe.positionFin),
      rupture:
        precedente && finPrecedente !== debut
          ? {
              arrivait: positionDe(precedente.positionFin),
              reprend: positionDe(passe.positionDebut),
            }
          : null,
    }
  })
}

/**
 * Passe dont les positions sont remplacées par les objets du catalogue.
 *
 * Permet de charger passes et positions en deux requêtes (voir `catalogue.ts`)
 * au lieu de laisser Payload résoudre la profondeur maillon par maillon.
 */
export function resoudrePasse(passe: Pass, positions: Map<number, Position>): Pass {
  const resoudre = (valeur: number | Position): number | Position => {
    const id = identifiant(valeur)
    return (id !== null ? positions.get(id) : null) ?? valeur
  }

  return {
    ...passe,
    positionDebut: resoudre(passe.positionDebut),
    positionFin: resoudre(passe.positionFin),
  }
}

/**
 * Où l'enchaînement commence et où il finit.
 *
 * Sert à la carte du catalogue : deux noms disent d'un coup d'œil de quoi part
 * l'enchaînement et où il mène, sans dérouler la chaîne entière.
 */
export function extremites(passes: Pass[]): { depart: Position | null; arrivee: Position | null } {
  if (passes.length === 0) return { depart: null, arrivee: null }

  return {
    depart: positionDe(passes[0].positionDebut),
    arrivee: positionDe(passes[passes.length - 1].positionFin),
  }
}

/**
 * Date lisible en français (« 12 mars 2026 »), ou `null` si absente.
 *
 * Lue en UTC À DESSEIN : Payload stocke une date « jour seul » à minuit UTC.
 * Formatée dans le fuseau du serveur, une date d'hiver reculerait d'un jour
 * pour tout lecteur à l'ouest de Greenwich — le cours du 12 deviendrait le 11.
 */
export function formaterDate(valeur?: string | null): string | null {
  if (!valeur) return null

  const date = new Date(valeur)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/**
 * Passes d'un enchaînement, dans l'ordre, positions résolues.
 *
 * Le tableau de l'enchaînement ne porte que des identifiants ; les deux tables
 * du catalogue tiennent en mémoire (30 positions, ~110 passes). Un identifiant
 * introuvable est ignoré plutôt que de faire tomber la page : la garde de
 * suppression (FR-8) rend le cas improbable, mais une chaîne amputée d'un
 * maillon reste plus utile qu'une erreur.
 */
export function chaineDe(
  maillons: { passe: number | Pass }[],
  passes: Map<number, Pass>,
  positions: Map<number, Position>,
): Pass[] {
  return maillons
    .map((maillon) => {
      const id = typeof maillon.passe === 'number' ? maillon.passe : maillon.passe.id
      return passes.get(id) ?? null
    })
    .filter((passe): passe is Pass => passe !== null)
    .map((passe) => resoudrePasse(passe, positions))
}

/** Par ou l'on entre dans une carte, ou par ou l'on en sort. */
export type Sens = 'gauche' | 'droite' | 'haut' | 'bas'

/**
 * Typologie d'une carte de la chaine : d'ou l'on entre, par ou l'on sort.
 *
 * La chaine se lit en SERPENTIN : la premiere ligne va de gauche a droite, la
 * suivante repart de droite a gauche, et ainsi de suite. Le passage d'une ligne
 * a l'autre se fait par le BAS, a l'extremite ou l'on vient d'arriver — jamais
 * par un retour a la ligne « comme du texte », qui obligerait l'oeil a traverser
 * tout l'ecran pour retrouver la suite.
 *
 * Il n'existe donc que sept cartes possibles : gauche->droite, gauche->bas,
 * haut->droite, droite->gauche, droite->bas, haut->gauche, et haut->bas (la
 * colonne unique du telephone).
 *
 * Fonction PURE, et volontairement parametree par le nombre de colonnes : c'est
 * la mise en page qui change avec la largeur de l'ecran, pas la chaine.
 */
export function typologie(
  index: number,
  colonnes: number,
  dernier: boolean,
): { entree: Sens; sortie: Sens } {
  // Colonne unique (telephone) : un seul flux, du haut vers le bas.
  if (colonnes <= 1) return { entree: 'haut', sortie: 'bas' }

  const rang = index % colonnes
  const aller = Math.floor(index / colonnes) % 2 === 0

  // On entre par le haut des qu'on ouvre une ligne, sauf la toute premiere
  // carte : celle-la, on y entre par le cote, comme on commence a lire.
  const entree: Sens = rang === 0 && index > 0 ? 'haut' : aller ? 'gauche' : 'droite'

  // On sort par le bas en fin de ligne — sauf la derniere carte de la chaine,
  // qui n'a pas de ligne suivante : sa position d'arrivee se pose au bout du
  // fil, dans le sens de lecture.
  const sortie: Sens = rang === colonnes - 1 && !dernier ? 'bas' : aller ? 'droite' : 'gauche'

  return { entree, sortie }
}
