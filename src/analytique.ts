/**
 * Mesure d'audience (Story 1.7, AD-15).
 *
 * Isole ici la SEULE decision de cette story : faut-il emettre le beacon
 * Cloudflare, et avec quels attributs ? Une fonction pure, testable sans
 * rendu — meme motif que `src/recherche.ts`.
 *
 * Ce qui n'est PAS ici, volontairement : aucun comptage maison, aucun stockage,
 * aucune lecture de session. La consultation se fait dans la console Cloudflare
 * (AD-15) ; l'application ne porte aucun ecran de statistiques en v1.
 */

/** Script officiel du beacon Cloudflare Web Analytics. */
export const SRC_BEACON_CLOUDFLARE = 'https://static.cloudflareinsights.com/beacon.min.js'

/** Ce qu'il faut poser dans le HTML pour que la visite soit remontee. */
export type BeaconCloudflare = {
  /** URL du script a charger. */
  readonly src: string
  /**
   * Type du script.
   *
   * `module` est ce que Cloudflare livre dans son propre snippet. Le bundle
   * actuel est un IIFE classique qui fonctionnerait aussi sans, mais coller au
   * snippet officiel evite de casser le jour ou Cloudflare y met de la vraie
   * syntaxe ES : un module charge en script classique echouerait alors sur une
   * erreur de syntaxe, et la mesure s'arreterait sans prevenir.
   */
  readonly type: 'module'
  /** Contenu de l'attribut `data-cf-beacon`, au format JSON. */
  readonly dataCfBeacon: string
}

/**
 * Le beacon a poser, ou `null` s'il n'y a pas de jeton configure.
 *
 * POURQUOI `null` plutot qu'une erreur : l'absence de jeton est un etat NORMAL
 * (developpement local, CI, test de fumee du conteneur). Elle ne met aucune
 * donnee en danger — contrairement a `DATABASE_URI`, qui echoue fort dans
 * `src/env.ts`. Le site doit tourner sans mesure d'audience, sans rien appeler
 * chez un tiers, et sans un message d'erreur qui ferait croire a une panne.
 *
 * POURQUOI `spa: true` : l'App Router navigue cote client (`<Link>`). Sans
 * cette option, Cloudflare ne compterait que la premiere page de chaque visite
 * — passer du catalogue a une fiche puis a une autre disparaitrait des
 * chiffres, et le KPI visiteurs/jour serait faux a la baisse en silence.
 * L'option fonctionne en surchargeant `history.pushState` cote navigateur.
 */
export function beaconCloudflare(jeton: string | undefined | null): BeaconCloudflare | null {
  const token = jeton?.trim()
  if (!token) return null

  return {
    src: SRC_BEACON_CLOUDFLARE,
    type: 'module',
    dataCfBeacon: JSON.stringify({ spa: true, token }),
  }
}
