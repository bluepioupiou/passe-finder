import type { Enchainement, User } from './payload-types'

/**
 * Le modele de visibilite d'un enchainement (action item
 * `identifiant-opaque-et-visibilites`, demande d'Alain 2026-08-31).
 *
 * DEUX AXES, ET C'EST TOUTE LA DIFFICULTE. Le « partage » d'avant les
 * confondait — il rendait lisible ET il faisait apparaitre dans les listes :
 *
 *   (1) QUI a le droit de lire        : moi seul / qui a le lien / tout le monde
 *   (2) COMMENT on arrive dessus      : en cherchant (liste) / seulement par le lien
 *
 * Les trois cas du v1 sont les trois combinaisons qui ont un sens :
 *
 *   prive          | moi seul        | —
 *   nonRepertorie  | qui a le lien   | jamais liste
 *   public         | tout le monde   | liste et cherchable
 *
 * Le quatrieme cas demande — « au sein d'une ecole ou d'un cours » — reste HORS
 * V1 (tranche par Alain le 2026-08-31, confirme le 2026-09-01). Ce n'est pas un
 * oubli : ce serait une entite Ecole, une entite Cours, une appartenance, et la
 * regle se propagerait a la recherche, aux listes, aux favoris et au profil.
 * L'enum ci-dessous lui laisse la place — une valeur de plus, pas un modele
 * different.
 *
 * OU VIT CHAQUE AXE, et il faut le savoir avant de toucher a quoi que ce soit :
 *
 *  - L'AXE (2) EST PORTE PAR `access.read` DE LA COLLECTION. Cette regle refuse
 *    le non-repertorie comme elle refuse le prive. C'est ce qui protege les
 *    listes ET l'API : sans cela, `GET /api/enchainements` rendrait a tout
 *    visiteur la liste complete des non-repertories, et la fonction serait vide
 *    de sens. Aucune surface de liste n'a donc a se souvenir d'exclure quoi que
 *    ce soit — c'est structurel, pas une discipline.
 *
 *  - L'AXE (1) EST PORTE PAR `peutLire`, ci-dessous, et n'est consulte QUE par
 *    les chemins qui presentent l'IDENTIFIANT PUBLIC : la fiche, et la page des
 *    favoris. Dans ce modele, l'URL elle-meme est la cle — la connaitre, c'est
 *    l'autorisation. C'est exactement le « lien de partage » de YouTube.
 *
 * LE DOUBLON EST DONC DELIBERE, et il n'est pas symetrique : `access.read` est
 * PLUS STRICT que `peutLire`. Un oubli de ce cote-ci ne peut jamais elargir ce
 * que les listes montrent — au pire, une fiche legitime repond 404.
 *
 * CE FICHIER NE CONTIENT QUE DES REGLES, et il doit le rester : il part dans le
 * NAVIGATEUR (le menu de visibilite du compositeur y lit ses libelles et ses
 * promesses). Les lectures qui touchent la base vivent a cote, dans
 * `lecture-enchainement.ts` — y ramener `identifiant-public.ts` embarquerait
 * `node:crypto` dans le bundle client, ou il n'a rien a faire.
 */

/** Les visibilites proposees a la saisie, dans l'ordre du plus ferme au plus ouvert. */
export const VISIBILITES = [
  { label: 'Privé', value: 'prive' },
  { label: 'Non répertorié', value: 'nonRepertorie' },
  { label: 'Public', value: 'public' },
] as const

export type Visibilite = (typeof VISIBILITES)[number]['value']

/**
 * Ce que chaque visibilite promet, en une phrase, a qui choisit dans le menu.
 *
 * A COTE DE L'ENUM et pas dans le composant : trois valeurs et trois promesses
 * qui vivraient dans deux fichiers finiraient par ne plus se correspondre, et
 * c'est l'ecran qui mentirait.
 */
export const PROMESSES: Record<Visibilite, string> = {
  prive: 'Toi seul le vois.',
  nonRepertorie:
    'Visible par qui a le lien. Il n’apparaît ni dans la liste, ni dans la recherche.',
  public: 'Visible par tout le monde, et présent dans la liste et la recherche.',
}

/** Le libelle d'une visibilite, ou `null` si la valeur est inconnue. */
export function libelleVisibilite(valeur: string): string | null {
  return VISIBILITES.find((option) => option.value === valeur)?.label ?? null
}

/**
 * Ramene une saisie a une visibilite connue, defaut PRIVE.
 *
 * LE DEFAUT N'EST PAS NEUTRE (FR-17, AD-6) : une valeur inattendue — un
 * formulaire bricole, une version d'API plus ancienne, une faute de frappe dans
 * un script — ne doit JAMAIS aboutir a un partage. Elle aboutit au cas le plus
 * ferme.
 */
export function visibiliteSure(valeur: unknown): Visibilite {
  return VISIBILITES.some((option) => option.value === valeur) ? (valeur as Visibilite) : 'prive'
}

/**
 * Cet enchainement est-il lisible par cette personne, SACHANT QU'ELLE EN
 * PRESENTE L'IDENTIFIANT PUBLIC ?
 *
 * C'est l'axe (1), et rien d'autre. Ne pas l'appeler sur un document obtenu
 * autrement que par son identifiant public : ce serait accorder au hasard d'une
 * requete ce que ce predicat n'accorde qu'a la possession du lien.
 *
 * PUR, donc testable sans base : la regle qui decide qui lit quoi est trop
 * importante pour n'exister que dans le chemin d'une page.
 */
export function peutLire(
  enchainement: Pick<Enchainement, 'visibilite' | 'auteur'>,
  utilisateur: User | null,
): boolean {
  if (enchainement.visibilite === 'public') return true
  if (enchainement.visibilite === 'nonRepertorie') return true

  // Reste le prive : son auteur, ou un administrateur.
  if (!utilisateur) return false
  if (utilisateur.admin) return true

  const auteur = enchainement.auteur
  const idAuteur = typeof auteur === 'object' && auteur !== null ? auteur.id : auteur

  return idAuteur === utilisateur.id
}
