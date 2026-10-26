import { DIFFICULTES } from './collections/Passe'
import { PIVOTS } from './orientation'
import { DUREES, dureeDe } from './rythme'

/**
 * Modifier une passe depuis le site, sans passer par /admin.
 *
 * Fonctions PURES, sans Payload : le formulaire et l'action serveur lisent la
 * meme forme, et la validation se teste sans base.
 */

/** Ce que le formulaire envoie. Les selects arrivent en texte, `''` = vide. */
export type SaisiePasse = {
  id: number
  nom: string
  positionDebut: number
  positionFin: number
  description: string
  deroule: string
  difficulte: string
  pivot: string
  duree: string
}

/** Ce que rend l'enregistrement : jamais une exception, toujours un message. */
export type ResultatPasse = { ok: true; id: number } | { ok: false; message: string }

/** Les donnees pretes a ecrire, chaque champ vide ramene a `null`. */
export type DonneesPasse = {
  nom: string
  positionDebut: number
  positionFin: number
  description: string | null
  deroule: string | null
  difficulte: (typeof DIFFICULTES)[number]['value'] | null
  pivot: (typeof PIVOTS)[number]['value'] | null
  /** Jamais `null` : le formulaire montre toujours une duree, celle qu'on enregistre. */
  duree: (typeof DUREES)[number]['value']
}

/**
 * Valide la saisie et la ramene a ce qui s'ecrit.
 *
 * Une difficulte ou un pivot inattendu devient « non renseigne », jamais une
 * valeur devinee — meme regle que `pivotDe` a l'affichage. La duree, elle,
 * vaut 6 temps quand elle est vide ou inattendue, comme `dureeDe`. `null` et non
 * `undefined` pour les champs vides : un texte efface doit EFFACER la valeur.
 */
export function donneesDePasse(
  saisie: SaisiePasse,
): { ok: true; donnees: DonneesPasse } | { ok: false; message: string } {
  const nom = saisie.nom.trim()
  if (nom === '') return { ok: false, message: 'Il manque un nom à cette passe.' }

  if (!Number.isInteger(saisie.positionDebut) || !Number.isInteger(saisie.positionFin)) {
    return { ok: false, message: 'Choisis une position de départ et une position d’arrivée.' }
  }

  return {
    ok: true,
    donnees: {
      nom,
      positionDebut: saisie.positionDebut,
      positionFin: saisie.positionFin,
      description: saisie.description.trim() || null,
      deroule: saisie.deroule.trim() || null,
      difficulte: DIFFICULTES.find((option) => option.value === saisie.difficulte)?.value ?? null,
      pivot: PIVOTS.find((option) => option.value === saisie.pivot)?.value ?? null,
      duree: dureeDe(saisie.duree) === 10 ? '10' : '6',
    },
  }
}
