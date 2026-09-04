/**
 * Planche de comparaison — a regarder AVANT d'ecrire la moindre interface.
 *
 *   npm run planche:comparaison
 *
 * Elle repond a deux questions qu'aucun raisonnement ne tranche, et qu'un
 * coup d'oeil tranche en trois secondes.
 *
 * 1. QUELLE TAILLE DONNER AUX PERSONNAGES ?
 *    Le kit dessine la tete a 25 % de la toile ; les vignettes historiques
 *    sont a 38,7 % du disque visible. Les figures historiques sont donc bien
 *    plus grosses — mais leurs mains sont coupees par le recadrage rond du
 *    site. Les deux exigences sont contradictoires : aucune constante ne les
 *    satisfait ensemble. La planche montre les trois candidates cote a cote.
 *
 * 2. DEUX CURSEURS SUFFISENT-ILS POUR LES BRAS ?
 *    « Il manque des possibilites de bras. » Le nouveau modele en offre une
 *    infinite, mais toutes sont des arcs de cercle : pas de bras en S, pas
 *    d'epaisseur variable. L'eventail du bas montre l'etendue reelle de ce que
 *    produisent `longueur` et `courbure`. Si ce qui manque n'y est pas, il
 *    faudra des courbes a poignees — beaucoup plus de code, autant le savoir
 *    maintenant.
 *
 * La planche montre aussi, en haut, quelque chose que personne n'avait encore
 * vu : CE QUE LE SITE AFFICHE REELLEMENT des vignettes actuelles. Toutes
 * passent par `ImagePosition`, donc par un recadrage carre au centre puis un
 * masque rond. Les bords gauche et droit des fichiers 3:2 ne sont jamais a
 * l'ecran, et les mains y disparaissent deja.
 *
 * Le script ne lit que `images/positions/` et n'ecrit que dans
 * `images/kit/planches/`.
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { COULEUR, svgDeSchema } from '../src/dessin-position'
import { ajouter, schemaVide, TAILLES, type Piece, type SchemaPosition } from '../src/schema-position'

const SOURCE = 'images/positions'
const SORTIE = 'images/kit/planches/comparaison-tailles.png'

const VIGNETTES = ['position_1', 'position_5', 'position_10', 'position_20', 'position_27', 'position_13']

const DISQUE = 240 // diametre d'un disque sur la planche
const MARGE = 28
const POLICE = 'font-family="Segoe UI, DejaVu Sans, sans-serif"'

/**
 * Le fond de la planche est NEUTRE, surtout pas vert.
 *
 * Avec un fond vert, les disques se confondaient avec la planche et le
 * recadrage rond — le sujet meme de la section 1 — devenait invisible. C'est
 * exactement l'erreur que la planche est censee reveler.
 */
const FOND_PLANCHE = '#F4F1EA'

const texte = (x: number, y: number, contenu: string, taille = 19, gras = false) =>
  `<text x="${x}" y="${y}" ${POLICE} font-size="${taille}"` +
  `${gras ? ' font-weight="700"' : ''} fill="#123456">${contenu}</text>`

/**
 * Une image, recadree et masquee EXACTEMENT comme `image-position.css` le fait :
 * `object-fit: cover` sur un carre, puis `border-radius: 50%`. Reproduire la
 * regle plutot que l'approcher est tout l'interet de la planche.
 */
async function disqueDuSite(chemin: string, diametre: number): Promise<Buffer> {
  const carre = await sharp(chemin)
    .resize(diametre, diametre, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer()

  const masque = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diametre}" height="${diametre}">` +
      `<circle cx="${diametre / 2}" cy="${diametre / 2}" r="${diametre / 2}" fill="#fff"/></svg>`,
  )

  return sharp(carre).composite([{ input: masque, blend: 'dest-in' }]).png().toBuffer()
}

/** Le fichier tel qu'il est sur le disque, ramene a la LARGEUR de la colonne.
 *  A hauteur egale, un fichier 3:2 deborderait sur son voisin — et la planche
 *  mentirait sur la comparaison qu'elle pretend faire. */
async function fichierEntier(chemin: string, largeur: number): Promise<Buffer> {
  return sharp(chemin).resize({ width: largeur }).png().toBuffer()
}

/**
 * Une composition de reference : deux danseurs face a face, bras qui se
 * rejoignent, comme sur les vignettes historiques. Ecrite en dur — c'est un
 * etalon, pas une donnee.
 *
 * L'ecart entre les tetes est proportionnel a la toile : c'est ce qui fait que
 * les trois tailles montrent la MEME scene plus ou moins serree, et non trois
 * scenes differentes.
 */
function compositionEtalon(taille: number): SchemaPosition {
  const ecart = taille * 0.21
  const pieces: Piece[] = [
    // Le bras gris passe DERRIERE : il est pose en premier, donc dessine dessous.
    { id: 'g1', type: 'bras', longueur: 300, courbure: 0.5, aplatissement: 1, tete: null, cote: null, couleur: 'gris', x: -ecart, y: 0, rotation: 40 },
    { id: 'n1', type: 'bras', longueur: 270, courbure: 0.5, aplatissement: 1, tete: null, cote: null, couleur: 'noir', x: -ecart, y: 0, rotation: 300 },
    { id: 'n2', type: 'bras', longueur: 270, courbure: 0.5, aplatissement: 1, tete: null, cote: null, couleur: 'noir', x: ecart, y: 0, rotation: 120 },
    // Les tetes en dernier : elles masquent le depart des bras.
    { id: 't1', type: 'tete', genre: 'cavalier', x: -ecart, y: 0, rotation: 180 },
    { id: 't2', type: 'tete', genre: 'cavaliere', x: ecart, y: 0, rotation: 20 },
  ]
  return pieces.reduce(ajouter, schemaVide(taille))
}

const COTE_BRAS = 780

/** Un bras seul pour l'eventail, sur sa tuile verte. */
function eventailBras(longueur: number, courbure: number, aplatissement = 1): string {
  const schema = ajouter(schemaVide(COTE_BRAS), {
    id: 'b',
    type: 'bras',
    longueur,
    courbure,
    aplatissement,
    tete: null,
    cote: null,
    couleur: 'noir',
    x: 0,
    y: 0,
    rotation: 0,
  })
  return svgDeSchema(schema, { cotePx: COTE_BRAS })
}

/** Le cercle de tete en pointille, superpose a une tuile de l'eventail : sans
 *  lui, on ne voit pas d'ou part le bras ni a quelle echelle il est. */
function reperDeTete(cotePx: number): Buffer {
  const r = (100 / COTE_BRAS) * cotePx
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cotePx}" height="${cotePx}">` +
      `<circle cx="${cotePx / 2}" cy="${cotePx / 2}" r="${r}" fill="none" ` +
      `stroke="#5c8a5c" stroke-width="2" stroke-dasharray="6 5"/></svg>`,
  )
}

async function principal() {
  const disponibles = VIGNETTES.map((nom) => path.join(SOURCE, `${nom}.jpg`)).filter((chemin) =>
    fs.existsSync(chemin),
  )
  if (disponibles.length === 0) throw new Error(`Aucune vignette trouvee dans ${SOURCE}/`)

  const colonnes = disponibles.length
  const largeur = MARGE * 2 + colonnes * (DISQUE + MARGE) - MARGE

  // ── Mise en page ─────────────────────────────────────────────────────────
  const LONGUEURS = [140, 260, 380]
  const COURBURES = [-0.9, -0.55, -0.2, 0, 0.35, 0.8]
  const MARGE_BRAS = 120 // laisse la place aux libelles de longueur, a gauche
  const CELLULE_BRAS = Math.floor((largeur - MARGE_BRAS - MARGE) / COURBURES.length)

  const yTitre1 = 46
  const yLigneFichiers = 92
  const yLigneDisques = yLigneFichiers + DISQUE + 58
  const yTitre2 = yLigneDisques + DISQUE + 76
  const yLigneTailles = yTitre2 + 62
  const REPLIS = [0.2, 0.35, 0.5, 0.7, 1, 1.6]

  const yTitre3 = yLigneTailles + DISQUE + 76
  const yEventail = yTitre3 + 54
  const yTitre4 = yEventail + LONGUEURS.length * CELLULE_BRAS + 60
  const yRepli = yTitre4 + 54
  const hauteur = yRepli + CELLULE_BRAS + MARGE

  const calques: sharp.OverlayOptions[] = []

  // Ligne 1 — les fichiers entiers.
  for (const [i, chemin] of disponibles.entries()) {
    calques.push({
      input: await fichierEntier(chemin, DISQUE),
      left: MARGE + i * (DISQUE + MARGE),
      top: yLigneFichiers + Math.round(DISQUE * 0.16),
    })
  }

  // Ligne 2 — ce que le site montre.
  for (const [i, chemin] of disponibles.entries()) {
    calques.push({
      input: await disqueDuSite(chemin, DISQUE),
      left: MARGE + i * (DISQUE + MARGE),
      top: yLigneDisques,
    })
  }

  // Ligne 3 — la meme composition aux trois tailles, sous le meme masque.
  const nomsTailles = Object.entries(TAILLES) as [keyof typeof TAILLES, number][]
  for (const [i, [, taille]] of nomsTailles.entries()) {
    const png = await sharp(Buffer.from(svgDeSchema(compositionEtalon(taille), { cotePx: DISQUE })))
      .png()
      .toBuffer()
    const masque = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${DISQUE}" height="${DISQUE}">` +
        `<circle cx="${DISQUE / 2}" cy="${DISQUE / 2}" r="${DISQUE / 2}" fill="#fff"/></svg>`,
    )
    calques.push({
      input: await sharp(png).composite([{ input: masque, blend: 'dest-in' }]).png().toBuffer(),
      left: MARGE + i * (DISQUE + MARGE),
      top: yLigneTailles,
    })
  }

  // Eventail de bras : 3 longueurs x 6 courbures, chacun sur sa tuile verte
  // avec le cercle de tete en pointille pour l'echelle.
  const tuile = CELLULE_BRAS - 12
  for (const [ligne, longueur] of LONGUEURS.entries()) {
    for (const [colonne, courbure] of COURBURES.entries()) {
      const rendu = await sharp(Buffer.from(eventailBras(longueur, courbure)))
        .resize(tuile)
        .png()
        .toBuffer()
      calques.push({
        input: await sharp(rendu)
          .composite([{ input: reperDeTete(tuile) }])
          .png()
          .toBuffer(),
        left: MARGE_BRAS + colonne * CELLULE_BRAS,
        top: yEventail + ligne * CELLULE_BRAS,
      })
    }
  }

  // L'ellipse : meme bras, meme longueur, meme courbure — seul l'aplatissement
  // change. Le bras part du milieu d'un flanc, donc plus l'ellipse est pincee,
  // plus la main revient pres de l'epaule.
  for (const [colonne, repli] of REPLIS.entries()) {
    const rendu = await sharp(Buffer.from(eventailBras(380, 0.55, repli)))
      .resize(tuile)
      .png()
      .toBuffer()
    calques.push({
      input: await sharp(rendu).composite([{ input: reperDeTete(tuile) }]).png().toBuffer(),
      left: MARGE_BRAS + colonne * CELLULE_BRAS,
      top: yRepli,
    })
  }

  // ── Le texte, en une seule couche SVG par-dessus ─────────────────────────
  let legendes =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}">` +
    texte(MARGE, yTitre1, '1 · Tes vignettes actuelles : le fichier, puis ce que le site en montre', 26, true) +
    texte(MARGE, yLigneFichiers - 10, 'Le fichier complet', 17) +
    texte(
      MARGE,
      yLigneDisques - 10,
      'Ce que le site affiche vraiment (carré centré + masque rond) — les bords et les mains disparaissent',
      17,
    ) +
    texte(MARGE, yTitre2, '2 · Quelle taille pour les personnages ?', 26, true)

  for (const [i, [nom, taille]] of nomsTailles.entries()) {
    const pourcentage = Math.round((200 / taille) * 100)
    legendes += texte(
      MARGE + i * (DISQUE + MARGE),
      yLigneTailles - 10,
      `${nom} — toile ${taille}, tête = ${pourcentage} %`,
      17,
    )
  }
  const xRepere = MARGE + 3 * (DISQUE + MARGE)
  legendes += texte(xRepere, yLigneTailles + 34, 'Repère : sur les vignettes historiques', 17)
  legendes += texte(xRepere, yLigneTailles + 58, 'ci-dessus, la tête occupe 39 % du', 17)
  legendes += texte(xRepere, yLigneTailles + 82, 'disque — mais les mains sont coupées.', 17)

  legendes += texte(
    MARGE,
    yTitre3,
    '3 · Tout ce que produisent les deux curseurs « longueur » et « courbure »',
    26,
    true,
  )
  for (const [colonne, courbure] of COURBURES.entries()) {
    const libelle = courbure === 0 ? 'droit' : `courbure ${String(courbure).replace('.', ',')}`
    legendes += texte(MARGE_BRAS + colonne * CELLULE_BRAS + 6, yEventail - 12, libelle, 16)
  }
  for (const [ligne, longueur] of LONGUEURS.entries()) {
    legendes += texte(MARGE, yEventail + ligne * CELLULE_BRAS + CELLULE_BRAS / 2, `longueur`, 16)
    legendes += texte(MARGE, yEventail + ligne * CELLULE_BRAS + CELLULE_BRAS / 2 + 22, `${longueur}`, 16)
  }

  legendes += texte(
    MARGE,
    yTitre4,
    '4 · L’ellipse : même longueur, même courbure — la main revient plus ou moins près de l’épaule',
    26,
    true,
  )
  for (const [colonne, repli] of REPLIS.entries()) {
    const libelle =
      repli === 1
        ? 'rond'
        : repli < 1
          ? `épingle ${String(repli).replace('.', ',')}`
          : `étiré ${String(repli).replace('.', ',')}`
    legendes += texte(MARGE_BRAS + colonne * CELLULE_BRAS + 6, yRepli - 12, libelle, 16)
  }
  legendes += texte(MARGE, yRepli + CELLULE_BRAS / 2, 'forme de', 16)
  legendes += texte(MARGE, yRepli + CELLULE_BRAS / 2 + 22, 'l’ellipse', 16)

  legendes += `</svg>`

  calques.push({ input: Buffer.from(legendes), left: 0, top: 0 })

  fs.mkdirSync(path.dirname(SORTIE), { recursive: true })
  await sharp({
    create: { width: largeur, height: hauteur, channels: 3, background: FOND_PLANCHE },
  })
    .composite(calques)
    .png()
    .toFile(SORTIE)

  console.log(`Planche écrite : ${SORTIE} (${largeur} × ${hauteur})`)
}

principal().catch((erreur) => {
  console.error(erreur)
  process.exit(1)
})
