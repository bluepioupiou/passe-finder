/**
 * Moteur de composition (Story 4.1) et vues qu'il manipule.
 *
 * Fonctions PURES, sans Payload et sans React : ce fichier part AUSSI dans le
 * navigateur (le compositeur s'en sert a chaque clic), il ne doit donc rien
 * importer qui embarquerait Payload dans le bundle client.
 *
 * Le graphe n'est pas reconstruit ici : il est deja porte par les passes
 * (`positionDebut` / `positionFin`, AD-2). « Les passes possibles d'ici » n'est
 * qu'une lecture de ce graphe, ecrite une seule fois et partagee par le serveur
 * (premier rendu) et le client (chaque ajout) — jamais deux implementations qui
 * pourraient diverger (ADD-4).
 */

/**
 * Position reduite a ce que le compositeur affiche.
 *
 * POURQUOI une vue et pas la `Position` de Payload : le compositeur vit dans le
 * navigateur, donc tout ce qu'il recoit traverse le reseau. Le catalogue
 * complet pese ~130 Ko de JSON (descriptions, deroules, metadonnees) dont il
 * n'affiche rien ; ces vues pesent ~10 Ko. L'image est deja resolue (vraie image
 * ou placeholder), pour que la regle de `imageDePosition` reste au meme endroit.
 */
export type VuePosition = { id: number; nom: string; src: string }

/** Passe reduite a ce que le compositeur affiche, plus ses deux extremites. */
export type VuePasse = {
  id: number
  nom: string
  /** Libelle lisible (« Debutant »…), deja resolu ; `null` si non renseignee. */
  difficulte: string | null
  debut: number
  fin: number
}

/**
 * Transition reduite a ce que le compositeur et la lecture affichent.
 *
 * Le `nom` est facultatif en base (les dix transitions de 2009 n'en ont pas) :
 * il arrive ici DEJA RESOLU par `nomDeTransition`, pour que la regle de repli
 * (« Changement de prise ») vive au meme endroit que le champ.
 */
export type VueTransition = {
  debut: number
  fin: number
  nom: string
  description: string | null
}

/**
 * Un maillon en cours de composition : la passe, et la transition posee juste
 * AVANT elle.
 *
 * POURQUOI « avant » et pas « apres » : une transition ne vaut que par la passe
 * qu'elle permet d'atteindre. Rattachee a la passe suivante, elle disparait
 * exactement quand cette passe est retiree — il n'existe jamais de transition
 * orpheline au bout de la chaine.
 *
 * `transitionAvant` porte la position vers laquelle on a change de prise, et
 * c'est redondant avec `passe.debut` : c'est voulu. La redondance dit
 * l'INTENTION (« ici, on a change de prise ») la ou `passe.debut` ne dit qu'un
 * fait. A l'enregistrement elle disparait de toute facon — seules les passes
 * sont stockees, et la lecture rededuit la rupture du couple de positions.
 */
export type MaillonCompose = { passe: VuePasse; transitionAvant: number | null }

/**
 * Les passes qui partent d'ici (FR-10, ADD-4) — le differenciateur du produit :
 * le compositeur ne propose jamais un mouvement impossible.
 *
 * Sans position courante (aucun depart choisi), la reponse est vide : ce n'est
 * pas « toutes les passes », c'est « on ne sait pas encore d'ou l'on part ».
 * Une position sans passe sortante renvoie egalement une liste vide, dont le
 * compositeur deduit le cul-de-sac.
 */
export function passesDepuis(passes: VuePasse[], position: number | null): VuePasse[] {
  if (position === null) return []
  return passes.filter((passe) => passe.debut === position)
}

/**
 * Les changements de prise possibles d'ici (FR-45, Story 4.7).
 *
 * Une transition mene d'une position a une autre SANS PASSE : on lache une main
 * a la fin de la passe precedente, et on repart. Elle ne prend pas de temps
 * musical, donc elle ne compte pas comme un pas — mais elle deplace la position
 * courante, et c'est ce qui rouvre le catalogue quand on est arrive dans un
 * cul-de-sac (« Berceau gauche » et « Enroulee gauche » n'ont aucune passe
 * sortante ; l'historique n'en sort que par une transition).
 *
 * UTILES, et pas « toutes » : une transition qui mene vers une position d'ou
 * aucune passe ne part n'offre rien — on aurait seulement echange un cul-de-sac
 * contre un autre. Meme raison que le filtre des positions de depart du
 * compositeur.
 */
export function transitionsUtiles(
  transitions: VueTransition[],
  passes: VuePasse[],
  position: number | null,
): VueTransition[] {
  if (position === null) return []

  return transitions.filter(
    (transition) =>
      transition.debut === position && passes.some((passe) => passe.debut === transition.fin),
  )
}

/**
 * Ou en est le danseur : la position vers laquelle on vient de changer de prise,
 * sinon la position d'arrivee de la derniere passe posee, sinon la position de
 * depart tant que la chaine est vide.
 *
 * C'est la seule source de la « position courante » : elle se DEDUIT de l'etat
 * compose, elle n'est jamais recalculee a cote (ce qui pourrait diverger a
 * l'annulation d'une passe).
 *
 * POURQUOI LA TRANSITION EN ATTENTE EST UN PARAMETRE ET NON UN CALCUL DU
 * COMPOSANT (Story 4.7) : entre le moment ou l'on choisit un changement de prise
 * et celui ou l'on pose la passe qui le consomme, la position courante n'est
 * plus deductible de la chaine seule. Ce choix FAIT PARTIE de l'etat compose.
 * Le laisser au composant recreerait exactement la seconde source de verite que
 * cette fonction existe pour eviter.
 */
export function positionCourante(
  depart: number | null,
  chaine: MaillonCompose[],
  transitionEnAttente: number | null = null,
): number | null {
  if (transitionEnAttente !== null) return transitionEnAttente
  if (chaine.length === 0) return depart
  return chaine[chaine.length - 1].passe.fin
}

/**
 * L'etat compose : d'ou part la chaine, et la suite des maillons.
 *
 * C'est tout ce qu'il faut pour REPRENDRE une composition la ou elle en est —
 * le reste (position courante, passes possibles, changements proposes) s'en
 * deduit.
 */
export type EtatCompose = { depart: number | null; chaine: MaillonCompose[] }

/**
 * Remet un enchainement enregistre dans l'etat ou le compositeur le tenait
 * (Story 4.5, FR-18).
 *
 * CE QUI EST STOCKE EST PLUS PAUVRE QUE CE QUI A ETE COMPOSE : seules les
 * passes sont enregistrees, jamais les changements de prise. On les REDEDUIT
 * ici, par la meme regle que la lecture (`construireChaine`) : une passe qui ne
 * part pas de la position d'arrivee de la precedente a ete atteinte par un
 * changement de prise.
 *
 * La regle est donc ecrite deux fois, sur deux formes differentes — les `Pass`
 * de Payload en lecture, les `VuePasse` allegees ici, qui partent dans le
 * navigateur. Les unifier obligerait la lecture a se priver des positions
 * resolues dont elle a besoin pour afficher les deux bulles d'une rupture.
 *
 * REPRENDRE PEUT RENDRE UNE CHAINE QUE LE COMPOSITEUR N'AURAIT PAS SU
 * CONSTRUIRE : une quinzaine d'enchainements de l'historique ont une rupture
 * dont la transition n'est pas encore declaree au catalogue. On la garde telle
 * quelle plutot que de la refuser — rouvrir un enchainement pour corriger son
 * titre ne doit pas amputer sa chaine. Le compositeur affiche alors la reprise
 * sans la nommer, exactement comme la vue lecture.
 */
export function reprendreChaine(passes: VuePasse[]): EtatCompose {
  if (passes.length === 0) return { depart: null, chaine: [] }

  const chaine = passes.map((passe, index) => {
    const precedente = index > 0 ? passes[index - 1] : null
    const rupture = precedente !== null && precedente.fin !== passe.debut

    return { passe, transitionAvant: rupture ? passe.debut : null }
  })

  return { depart: passes[0].debut, chaine }
}

/**
 * Les informations d'un enchainement : tout ce qui se SAISIT (Stories 4.3/4.5).
 *
 * A part de la chaine, et ce decoupage porte une distinction reelle : ceci se
 * tape dans des champs, la chaine se COMPOSE (le compositeur ne propose que des
 * passes qui partent de la position courante, FR-10). La page de modification
 * reprend donc les informations sans toucher a la chaine, et le formulaire est
 * le meme des deux cotes (`ChampsEnchainement`).
 */
export type SaisieMetadonnees = {
  titre: string
  /** Jour au format `AAAA-MM-JJ`, tel que le rend un `<input type="date">`. */
  date: string
  description: string
  /**
   * Le morceau sur lequel l'enchainement se danse — les deux moities
   * facultatives. Le TITRE est ce qui survit au lien mort, le LIEN ce qui
   * evite de retaper le nom dans une appli de streaming.
   */
  musique: { titre: string; lien: string }
  /**
   * Lien vers la video de l'enchainement. UN SEUL champ, contrairement a la
   * musique : un morceau se nomme, une video de cours se regarde (FR-37).
   */
  video: string
  notes: string
  visibilite: string
}

/** Ce que le compositeur envoie au serveur pour enregistrer (Story 4.3). */
export type SaisieEnchainement = SaisieMetadonnees & {
  /** Identifiants des passes, DANS L'ORDRE : l'index EST l'ordre (ADD-18). */
  passes: number[]
}

/**
 * Reponse de l'enregistrement.
 *
 * Un echec revient au compositeur au lieu de faire tomber la page : la chaine
 * composee reste a l'ecran et rien n'est perdu (NFR-4, UX-DR16).
 *
 * LE SUCCES REND L'IDENTIFIANT PUBLIC, jamais le numero de la ligne : c'est
 * l'adresse ou le compositeur doit atterrir, et la seule que les URL du site
 * connaissent (action item `identifiant-opaque-et-visibilites`).
 */
export type ResultatEnregistrement =
  | { ok: true; idPublic: string }
  | { ok: false; message: string }

/**
 * Le jour d'aujourd'hui a Paris, au format `AAAA-MM-JJ`.
 *
 * Calcule dans le fuseau de la danse, pas dans celui de la machine : en
 * production le conteneur tourne en UTC, et un cours note a 1 h du matin aurait
 * porte la date de la veille. Meme raison que le formatage force en UTC de
 * `formaterDate` — la date d'un cours est un JOUR, pas un instant.
 *
 * `en-CA` rend `AAAA-MM-JJ`, exactement ce qu'attend `<input type="date">`.
 */
export function dateDuJour(maintenant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(maintenant)
}

/**
 * Jour saisi -> instant stocke par Payload (minuit UTC).
 *
 * Meme convention que la migration de l'historique : une date « jour seul » est
 * stockee a minuit UTC, et relue en UTC. Toute autre convention ferait glisser
 * la moitie des dates d'un jour a l'affichage.
 *
 * Renvoie `undefined` si la saisie n'est pas un jour valide : la date est
 * facultative, une saisie douteuse ne doit pas faire echouer l'enregistrement.
 */
export function jourVersISO(jour: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return undefined

  const date = new Date(`${jour}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * Instant stocke -> jour a remettre dans `<input type="date">` (Story 4.5).
 *
 * Le retour de `jourVersISO`, et LU EN UTC pour la meme raison que
 * `formaterDate` : la date d'un cours est un JOUR, stocke a minuit UTC. Relue
 * dans le fuseau du serveur, une date d'hiver reculerait d'un jour — rouvrir un
 * enchainement pour changer son titre ferait glisser sa date au passage, sans
 * que personne ne s'en apercoive.
 *
 * Une date absente ou illisible rend une chaine vide : le champ s'ouvre vide,
 * ce qui est exactement ce que l'on veut montrer.
 */
export function isoVersJour(valeur?: string | null): string {
  if (!valeur) return ''

  const date = new Date(valeur)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}
