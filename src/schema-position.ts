/**
 * Le SCHEMA d'une position : ce qui decrit une vignette, par opposition a
 * `dessin-position.ts` qui la dessine.
 *
 * A ne pas confondre avec `src/composition.ts`, qui compose des ENCHAINEMENTS
 * de passes. Ici on compose une IMAGE : des tetes et des bras poses sur un fond.
 *
 * POURQUOI STOCKER LE SCHEMA ET PAS SEULEMENT L'IMAGE. Une vignette PNG est un
 * cul-de-sac : corriger un bras six mois plus tard imposerait de tout refaire.
 * En gardant la liste des pieces, rouvrir et deplacer suffit. C'est aussi ce
 * qui permettra de reprendre les vignettes historiques une par une, sans jamais
 * perdre celles qui ne sont pas encore refaites.
 *
 * CE FICHIER PART DANS LE NAVIGATEUR. Aucun import de Payload, de `node:*` ni
 * de React : ce sont des fonctions pures, testables sans DOM — meme regle que
 * `src/visibilite.ts` et `src/composition.ts`.
 *
 * TOUTES LES MUTATIONS SONT ICI, ET NULLE PART AILLEURS. L'atelier ne fait
 * jamais d'arithmetique sur les pieces : il appelle ces fonctions. C'est ce qui
 * rend les regles verifiables sans monter le moindre composant.
 */

export type CouleurBras = 'noir' | 'gris'
export type GenreTete = 'cavalier' | 'cavaliere' | 'bleue-nue' | 'rose-nue'
export type MotifAccessoire = 'eclair' | 'queue-de-cheval' | 'main'

type Pose = {
  id: string
  /** Position du CENTRE DE TETE de la piece dans la toile, origine au centre. */
  x: number
  y: number
  /** Degres, sens horaire (comme `rotate()` en SVG), normalise dans [0, 360[. */
  rotation: number
}

export type Cote = 'gauche' | 'droite'

export type PieceTete = Pose & { type: 'tete'; genre: GenreTete }
export type PieceBras = Pose & {
  type: 'bras'
  /**
   * La tete a qui ce bras appartient, ou `null` pour un bras libre.
   *
   * Un bras rattache SUIT sa tete : la deplacer ou la faire pivoter emporte ses
   * bras. Il en prend aussi la teinte, ce qui rend l'appartenance lisible d'un
   * coup d'oeil sans avoir a suivre le trait jusqu'a l'epaule.
   *
   * Les bras LIBRES existent pour deux raisons : les schemas dessines avant ce
   * rattachement en sont faits, et rien ne doit interdire un cas hors norme.
   */
  tete: string | null
  /** Epaule d'attache. Nomme le bras et fixe son angle de depart. `null` si libre. */
  cote: Cote | null
  /** Couleur d'un bras LIBRE. Un bras rattache prend la teinte de sa tete. */
  couleur: CouleurBras
  /** Mesuree le long de l'arc, en unites de dessin. */
  longueur: number
  /** Signee : 0 = droit, > 0 = s'enroule dans le sens horaire. */
  courbure: number
  /**
   * Aplatissement de l'ellipse sur laquelle court le bras. 1 = arc de CERCLE
   * (le cas historique) ; en dessous, l'ellipse se pince et le bras fait une
   * epingle a cheveux qui ramene la main pres de l'epaule ; au-dessus, elle
   * s'etire et le bras s'ecarte davantage.
   */
  aplatissement: number
}
export type PieceAccessoire = Pose & { type: 'accessoire'; motif: MotifAccessoire }

export type Piece = PieceTete | PieceBras | PieceAccessoire

export type SchemaPosition = {
  version: 1
  /** Cote de la toile en unites de dessin (rayon de tete = 100). */
  taille: number
  /** L'INDEX EST L'ORDRE DE SUPERPOSITION : la derniere piece passe au-dessus. */
  pieces: Piece[]
  /** Decalque de l'ancienne vignette. Aide a dessiner, n'est JAMAIS exporte. */
  calque: { src: string } | null
}

/**
 * Ce que l'atelier envoie a l'action serveur, et ce qu'elle lui repond.
 *
 * Ces types vivent ici, et non dans le fichier d'actions, pour la meme raison
 * que `SaisieEnchainement` vit dans `composition.ts` : l'atelier est un
 * composant client, il ne peut pas importer un module `'use server'`.
 *
 * `id: null` signifie « creation ». C'est un seul type et une seule action pour
 * creer et pour modifier, parce que c'est un seul bouton dans la tete d'Alain.
 */
export type SaisiePosition = {
  id: number | null
  nom: string
  description: string
  schema: SchemaPosition
}

export type ResultatPosition = { ok: true; id: number } | { ok: false; message: string }

/**
 * Les tailles de toile proposees.
 *
 * Le nom decrit ce que voit Alain — des PERSONNAGES plus ou moins grands — et
 * non la toile, qui varie en sens inverse : plus la toile est petite, plus les
 * tetes (toujours de rayon 100) y occupent de place.
 *
 * Pourquoi trois et pas une constante : le kit dessine la tete a 25 % de la
 * toile, les vignettes historiques a 38,7 % du disque visible. Les figures
 * historiques sont donc bien plus grosses — au prix de mains coupees par le
 * recadrage rond du site. Les deux exigences sont contradictoires, aucune
 * valeur ne les satisfait ensemble. Chaque schema porte donc la sienne.
 */
export const TAILLES = { grand: 520, moyen: 640, petit: 760 } as const
export type NomTaille = keyof typeof TAILLES
export const TAILLE_PAR_DEFAUT = TAILLES.moyen

/** Pas de rotation par defaut. Maj donne un pas fin, cf. l'atelier. */
export const PAS_ROTATION = 30
export const PAS_ROTATION_FIN = 5

export const LONGUEUR_MIN = 40
export const LONGUEUR_MAX = 420
export const COURBURE_MAX = 1

/**
 * Bornes de l'ellipse. 1 est le cercle — donc la valeur par defaut, et celle
 * qui redonne exactement tous les bras dessines avant l'arrivee de ce reglage.
 *
 * Le bras part du MILIEU D'UN FLANC de l'ellipse : a mi-parcours, la main
 * revient donc juste a cote de l'epaule, decalee de `2 x ry`. En dessous de 1,
 * ce decalage se resserre — c'est l'epingle a cheveux. Au-dessus, il s'ecarte.
 */
export const APLATISSEMENT_MIN = 0.2
export const APLATISSEMENT_MAX = 2
export const APLATISSEMENT_ROND = 1

/** Au-dela, ce n'est plus un schema de position mais un accident. La borne
 *  protege le rendu serveur autant que la lisibilite. */
export const PIECES_MAX = 60

const TAILLE_MIN = 300
const TAILLE_MAX = 1200
const COORDONNEE_MAX = 2000

// ── Construction ───────────────────────────────────────────────────────────

export function schemaVide(taille: number = TAILLE_PAR_DEFAUT): SchemaPosition {
  return { version: 1, taille, pieces: [], calque: null }
}

/**
 * L'angle auquel un bras quitte la tete, selon l'epaule.
 *
 * VUE DE DESSUS. Une tete `rotation` regarde vers `rotation + 180` — l'eclair
 * du cavalier pointe vers l'arriere du repere. Vu d'en haut, avec l'axe des y
 * vers le bas, l'epaule GAUCHE du danseur est a 90 degres avant sa direction de
 * regard, la DROITE a 90 degres apres. D'ou :
 *
 *   gauche = rotation + 180 - 90 = rotation + 90
 *   droite = rotation + 180 + 90 = rotation + 270
 *
 * Ce n'est qu'un angle de DEPART : le bras garde ensuite sa propre rotation,
 * que l'atelier laisse regler librement. Faire pivoter la tete lui ajoute le
 * meme ecart, donc un reglage manuel n'est jamais perdu.
 */
export function angleDEpaule(rotationTete: number, cote: Cote): number {
  return angleNormalise(rotationTete + (cote === 'gauche' ? 90 : 270))
}

/** La tete a qui appartient un bras, si elle existe encore. */
export function teteDuBras(schema: SchemaPosition, bras: PieceBras): PieceTete | null {
  if (!bras.tete) return null
  const tete = schema.pieces.find((piece) => piece.id === bras.tete)
  return tete && tete.type === 'tete' ? tete : null
}

/** Les bras rattaches a une tete donnee. */
export function brasDeLaTete(schema: SchemaPosition, idTete: string): PieceBras[] {
  return schema.pieces.filter(
    (piece): piece is PieceBras => piece.type === 'bras' && piece.tete === idTete,
  )
}

/**
 * La pose standard d'un bras.
 *
 * Choisie a l'oeil, sur une planche d'essais : c'est celle ou les mains des
 * deux danseurs se REJOIGNENT en haut et en bas, comme dans une vraie prise, et
 * ou tout tient dans le disque que le site affiche. Les valeurs n'ont rien de
 * sacre — le premier reglage de curseur les remplace.
 */
const POSE_STANDARD = { longueur: 200, courbure: 0.8, aplatissement: 0.45 } as const

/** Un bras rattache a une tete, pose sur l'epaule demandee. */
export function brasPour(tete: PieceTete, cote: Cote, id: string): PieceBras {
  return {
    id,
    type: 'bras',
    longueur: POSE_STANDARD.longueur,
    // LES DEUX BRAS D'UN DANSEUR SE REFLETENT : ils s'enroulent en sens
    // inverse, ce qui les envoie tous deux vers le partenaire au lieu de faire
    // tourner la silhouette dans le meme sens.
    courbure: cote === 'gauche' ? POSE_STANDARD.courbure : -POSE_STANDARD.courbure,
    aplatissement: POSE_STANDARD.aplatissement,
    tete: tete.id,
    cote,
    // Sans interet tant que le bras est rattache : il prend la teinte de sa
    // tete. La valeur sert de repli s'il est un jour detache.
    couleur: 'noir',
    x: tete.x,
    y: tete.y,
    rotation: angleDEpaule(tete.rotation, cote),
  }
}

/**
 * La scene de depart : un cavalier et une cavaliere face a face, chacun ses
 * deux bras.
 *
 * POURQUOI UN DEFAUT ET NON UNE CONTRAINTE. Toutes les positions du catalogue
 * ont cette distribution, et la reconstruire a la main a chaque schema est
 * cinq gestes perdus. Mais rien n'empeche d'enlever un bras, d'en ajouter un
 * troisieme, ou de supprimer une tete : ce sont des pieces comme les autres.
 *
 * Les bras sont poses AVANT les tetes, pour que celles-ci masquent leur depart.
 */
export function scenePardefaut(
  taille: number = TAILLE_PAR_DEFAUT,
  identifiants: () => string = identifiant,
): SchemaPosition {
  const ecart = taille * 0.17

  const cavalier: PieceTete = {
    id: identifiants(),
    type: 'tete',
    genre: 'cavalier',
    x: -ecart,
    y: 0,
    // Il regarde vers sa cavaliere, a sa droite sur la toile.
    rotation: 180,
  }
  const cavaliere: PieceTete = {
    id: identifiants(),
    type: 'tete',
    genre: 'cavaliere',
    x: ecart,
    y: 0,
    rotation: 0,
  }

  const pieces: Piece[] = [
    brasPour(cavalier, 'gauche', identifiants()),
    brasPour(cavalier, 'droite', identifiants()),
    brasPour(cavaliere, 'gauche', identifiants()),
    brasPour(cavaliere, 'droite', identifiants()),
    cavalier,
    cavaliere,
  ]

  return { version: 1, taille, pieces, calque: null }
}

/**
 * Un identifiant de piece. Court, sans dependance, et unique en pratique : il
 * ne sert qu'a distinguer des pieces au sein d'un meme schema, jamais a
 * identifier quoi que ce soit en base.
 */
export function identifiant(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Lecture defensive ──────────────────────────────────────────────────────

const borner = (valeur: number, min: number, max: number) => Math.min(max, Math.max(min, valeur))

const nombreSur = (valeur: unknown, defaut: number, min: number, max: number): number =>
  typeof valeur === 'number' && Number.isFinite(valeur) ? borner(valeur, min, max) : defaut

const estObjet = (valeur: unknown): valeur is Record<string, unknown> =>
  typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)

const GENRES: GenreTete[] = ['cavalier', 'cavaliere', 'bleue-nue', 'rose-nue']
const MOTIFS: MotifAccessoire[] = ['eclair', 'queue-de-cheval', 'main']

/** Ramene un angle quelconque dans [0, 360[ — y compris negatif ou depassant
 *  plusieurs tours, ce que produit naturellement une suite de rotations. */
export function angleNormalise(degres: number): number {
  if (!Number.isFinite(degres)) return 0
  return ((degres % 360) + 360) % 360
}

function pieceSure(brut: unknown): Piece | null {
  if (!estObjet(brut)) return null
  if (typeof brut.id !== 'string' || brut.id === '') return null

  const pose = {
    id: brut.id,
    x: nombreSur(brut.x, 0, -COORDONNEE_MAX, COORDONNEE_MAX),
    y: nombreSur(brut.y, 0, -COORDONNEE_MAX, COORDONNEE_MAX),
    rotation: angleNormalise(nombreSur(brut.rotation, 0, -1e6, 1e6)),
  }

  if (brut.type === 'tete') {
    const genre = brut.genre as GenreTete
    return GENRES.includes(genre) ? { ...pose, type: 'tete', genre } : null
  }

  if (brut.type === 'bras') {
    const couleur = brut.couleur as CouleurBras
    if (couleur !== 'noir' && couleur !== 'gris') return null

    // Un bras sans `tete` est un bras LIBRE — c'est le cas de tous ceux
    // dessines avant le rattachement. On ne devine rien : il garde sa couleur
    // et son trace, donc les schemas d'avant se rouvrent a l'identique.
    const cote = brut.cote === 'gauche' || brut.cote === 'droite' ? brut.cote : null
    const tete = typeof brut.tete === 'string' && brut.tete !== '' ? brut.tete : null

    return {
      ...pose,
      type: 'bras',
      tete,
      // Un bras ne peut pas avoir une epaule sans avoir de tete : la paire est
      // solidaire, sinon le libelle promettrait un proprietaire inexistant.
      cote: tete ? (cote ?? 'gauche') : null,
      couleur,
      longueur: nombreSur(brut.longueur, LONGUEUR_MIN, LONGUEUR_MIN, LONGUEUR_MAX),
      courbure: nombreSur(brut.courbure, 0, -COURBURE_MAX, COURBURE_MAX),
      // Le repli est arrive APRES les premiers schemas : son absence vaut
      // « rond », ce qui redonne exactement le dessin d'origine. C'est ce qui
      // permet de l'ajouter sans changer la version du format ni toucher aux
      // compositions deja enregistrees.
      aplatissement: nombreSur(
        brut.aplatissement,
        APLATISSEMENT_ROND,
        APLATISSEMENT_MIN,
        APLATISSEMENT_MAX,
      ),
    }
  }

  if (brut.type === 'accessoire') {
    const motif = brut.motif as MotifAccessoire
    return MOTIFS.includes(motif) ? { ...pose, type: 'accessoire', motif } : null
  }

  return null
}

/**
 * Relit un schema venu de l'exterieur — la base, ou le corps d'une action
 * serveur. Ne leve JAMAIS ; renvoie `null` si la valeur est inexploitable.
 *
 * Meme esprit que `visibiliteSure` : ce qui traverse une frontiere n'est pas
 * cru sur parole. Deux frontieres ici, et elles ne se ressemblent pas — un
 * champ `json` de SQLite peut avoir ete ecrit par une version anterieure du
 * code, et le corps d'une action serveur peut avoir ete forge.
 *
 * DEUX REGIMES, DELIBEREMENT DIFFERENTS :
 *  - ce qui est STRUCTUREL (version, type de piece, genre inconnu, identifiant
 *    manquant) fait echouer la lecture entiere. Mieux vaut dire « illisible »
 *    que rendre un schema ampute : la page peut alors refuser d'ouvrir
 *    l'atelier, au lieu de laisser le prochain enregistrement ecraser un
 *    travail qu'elle n'a pas su relire ;
 *  - ce qui est NUMERIQUE (coordonnees, angle, longueur) est ramene dans les
 *    bornes. Une piece tiree hors du cadre n'est pas une corruption, et perdre
 *    tout le schema pour ca serait absurde.
 */
export function schemaSur(inconnu: unknown): SchemaPosition | null {
  let brut = inconnu

  // SQLite peut rendre un champ `json` sous forme de chaine selon le pilote.
  if (typeof brut === 'string') {
    try {
      brut = JSON.parse(brut)
    } catch {
      return null
    }
  }

  if (!estObjet(brut)) return null
  if (brut.version !== 1) return null
  if (!Array.isArray(brut.pieces)) return null
  if (brut.pieces.length > PIECES_MAX) return null

  const pieces: Piece[] = []
  for (const candidate of brut.pieces) {
    const piece = pieceSure(candidate)
    if (!piece) return null
    pieces.push(piece)
  }

  const calqueBrut = brut.calque
  const calque =
    estObjet(calqueBrut) && typeof calqueBrut.src === 'string' && calqueBrut.src !== ''
      ? { src: calqueBrut.src }
      : null

  return {
    version: 1,
    taille: nombreSur(brut.taille, TAILLE_PAR_DEFAUT, TAILLE_MIN, TAILLE_MAX),
    pieces,
    calque,
  }
}

// ── Mutations (toutes pures) ───────────────────────────────────────────────

const remplacer = (schema: SchemaPosition, id: string, transformer: (piece: Piece) => Piece) => ({
  ...schema,
  pieces: schema.pieces.map((piece) => (piece.id === id ? transformer(piece) : piece)),
})

export function ajouter(schema: SchemaPosition, piece: Piece): SchemaPosition {
  if (schema.pieces.length >= PIECES_MAX) return schema
  return { ...schema, pieces: [...schema.pieces, piece] }
}

/**
 * Ajoute une piece A SA PLACE NATURELLE dans la superposition : les bras sous
 * les tetes, tout le reste au-dessus.
 *
 * Sans cette regle, un bras ajoute apres une tete se poserait PAR-DESSUS elle,
 * et son depart — volontairement trace sous la tete pour donner l'impression
 * qu'il sort de derriere le corps — deviendrait visible. Le premier geste de
 * chaque bras serait de le redescendre d'un rang. Autant le poser bien.
 *
 * Les fleches de la pile restent souveraines : c'est un point de depart, pas
 * une contrainte.
 */
export function ajouterAuBonRang(schema: SchemaPosition, piece: Piece): SchemaPosition {
  if (schema.pieces.length >= PIECES_MAX) return schema
  if (piece.type !== 'bras') return ajouter(schema, piece)

  const premiereTete = schema.pieces.findIndex((autre) => autre.type === 'tete')
  if (premiereTete === -1) return ajouter(schema, piece)

  const pieces = [...schema.pieces]
  pieces.splice(premiereTete, 0, piece)
  return { ...schema, pieces }
}

/**
 * Retire une piece — et les bras d'une tete avec elle.
 *
 * Sans cela, supprimer un danseur laisserait ses deux bras flotter, rattaches a
 * une tete qui n'existe plus : ni teinte, ni nom, ni rien qui les emporte. Un
 * danseur se retire entier.
 */
export function retirer(schema: SchemaPosition, id: string): SchemaPosition {
  const cible = schema.pieces.find((piece) => piece.id === id)
  const estUneTete = cible?.type === 'tete'

  return {
    ...schema,
    pieces: schema.pieces.filter(
      (piece) => piece.id !== id && !(estUneTete && piece.type === 'bras' && piece.tete === id),
    ),
  }
}

/**
 * Applique un changement a une piece ET A SES BRAS si c'est une tete.
 *
 * C'EST ICI QUE LES BRAS SUIVENT LEUR TETE, ET C'EST PRESQUE GRATUIT. Le repere
 * local d'un bras EST le centre de sa tete : un bras rattache partage donc ses
 * coordonnees et vit dans son referentiel. Emporter les bras se reduit alors a
 * leur appliquer le meme ecart — le meme (dx, dy), le meme angle. Il n'y a
 * aucune trigonometrie a ecrire : la rotation autour du centre de la tete est
 * deja celle du bras.
 *
 * On ajoute un ECART plutot que d'imposer une valeur : un bras dont l'angle
 * d'epaule a ete regle a la main garde son reglage quand la tete pivote.
 */
function emporterLesBras(
  schema: SchemaPosition,
  id: string,
  ecart: (piece: Piece) => Partial<Pose>,
): SchemaPosition {
  const cible = schema.pieces.find((piece) => piece.id === id)
  if (!cible) return schema

  const delta = ecart(cible)
  const suit = (piece: Piece) =>
    piece.id === id || (cible.type === 'tete' && piece.type === 'bras' && piece.tete === id)

  return {
    ...schema,
    pieces: schema.pieces.map((piece) => {
      if (!suit(piece)) return piece
      return {
        ...piece,
        x: borner(piece.x + (delta.x ?? 0), -COORDONNEE_MAX, COORDONNEE_MAX),
        y: borner(piece.y + (delta.y ?? 0), -COORDONNEE_MAX, COORDONNEE_MAX),
        rotation: angleNormalise(piece.rotation + (delta.rotation ?? 0)),
      }
    }),
  }
}

/** Deplacement RELATIF — le geste du clavier (fleches) et du glisser. */
export function deplacer(schema: SchemaPosition, id: string, dx: number, dy: number) {
  return emporterLesBras(schema, id, () => ({ x: dx, y: dy }))
}

/** Placement ABSOLU — ce que produit un glisser au pointeur. */
export function placer(schema: SchemaPosition, id: string, x: number, y: number) {
  return emporterLesBras(schema, id, (piece) => ({
    x: borner(x, -COORDONNEE_MAX, COORDONNEE_MAX) - piece.x,
    y: borner(y, -COORDONNEE_MAX, COORDONNEE_MAX) - piece.y,
  }))
}

export function tourner(schema: SchemaPosition, id: string, pas: number) {
  return emporterLesBras(schema, id, () => ({ rotation: pas }))
}

/** Retouche les caracteristiques propres a une piece (longueur, couleur, genre…)
 *  sans jamais toucher a sa pose : le type garantit qu'on ne peut pas glisser
 *  un `x` ici par megarde. */
export function ajusterBras(
  schema: SchemaPosition,
  id: string,
  champs: Partial<Pick<PieceBras, 'longueur' | 'courbure' | 'aplatissement' | 'couleur'>>,
): SchemaPosition {
  return remplacer(schema, id, (piece) => {
    if (piece.type !== 'bras') return piece
    return {
      ...piece,
      longueur: nombreSur(champs.longueur ?? piece.longueur, piece.longueur, LONGUEUR_MIN, LONGUEUR_MAX),
      courbure: nombreSur(champs.courbure ?? piece.courbure, piece.courbure, -COURBURE_MAX, COURBURE_MAX),
      aplatissement: nombreSur(
        champs.aplatissement ?? piece.aplatissement,
        piece.aplatissement,
        APLATISSEMENT_MIN,
        APLATISSEMENT_MAX,
      ),
      couleur: champs.couleur ?? piece.couleur,
    }
  })
}

/** Deplace une piece d'un rang dans la superposition. `vers: 1` la rapproche du
 *  dessus (fin du tableau), `-1` du dessous. Aux bornes, ne fait rien — et
 *  surtout ne perd pas la piece. */
export function reordonner(schema: SchemaPosition, id: string, vers: 1 | -1): SchemaPosition {
  const depuis = schema.pieces.findIndex((piece) => piece.id === id)
  if (depuis === -1) return schema

  const jusqua = depuis + vers
  if (jusqua < 0 || jusqua >= schema.pieces.length) return schema

  const pieces = [...schema.pieces]
  ;[pieces[depuis], pieces[jusqua]] = [pieces[jusqua], pieces[depuis]]
  return { ...schema, pieces }
}

/** Duplique une piece, legerement decalee pour qu'elle ne se cache pas sous
 *  l'originale — sans ce decalage, on croirait que le bouton n'a rien fait. */
export function dupliquer(schema: SchemaPosition, id: string, nouvelId: string): SchemaPosition {
  const source = schema.pieces.find((piece) => piece.id === id)
  if (!source) return schema
  return ajouter(schema, { ...source, id: nouvelId, x: source.x + 40, y: source.y + 40 })
}

/**
 * Colle une piece sur le centre de tete le plus proche, si elle en est assez
 * pres.
 *
 * Quinze lignes qui suppriment le geste le plus penible du travail d'Alain.
 * Les bras sont dessines dans le repere de LEUR TETE : leur origine locale est
 * le centre de tete, et le trace demarre au bord. Un bras dont le `x`/`y` egale
 * celui d'une tete s'y emboite donc exactement — encore faut-il tomber juste au
 * pixel, ce qu'aucune souris ne fait.
 */
export function aimanter(schema: SchemaPosition, id: string, seuil = 30): SchemaPosition {
  const piece = schema.pieces.find((autre) => autre.id === id)
  if (!piece || piece.type === 'tete') return schema

  let meilleure: Piece | null = null
  let meilleureDistance = seuil

  for (const tete of schema.pieces) {
    if (tete.type !== 'tete') continue
    const distance = Math.hypot(tete.x - piece.x, tete.y - piece.y)
    if (distance <= meilleureDistance) {
      meilleure = tete
      meilleureDistance = distance
    }
  }

  return meilleure ? placer(schema, id, meilleure.x, meilleure.y) : schema
}

// ── Ecran vers toile ───────────────────────────────────────────────────────

/**
 * Convertit un point de l'ecran en coordonnees de toile.
 *
 * Extraite du composant, et exportee, POUR ETRE TESTABLE : jsdom ne met rien en
 * page, `getBoundingClientRect()` y renvoie des zeros, et le glisser reel ne
 * peut donc etre eprouve qu'en e2e. Isoler l'arithmetique permet au moins de
 * verrouiller la partie qui se trompe le plus souvent — le facteur d'echelle et
 * l'origine au centre.
 */
export function pointVersToile(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  taille: number,
): { x: number; y: number } {
  // Un rectangle de largeur nulle (element non mesure, jsdom) donnerait un
  // facteur infini : on rend le centre, qui est le repli le moins surprenant.
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }

  return {
    x: (clientX - rect.left - rect.width / 2) * (taille / rect.width),
    y: (clientY - rect.top - rect.height / 2) * (taille / rect.height),
  }
}
