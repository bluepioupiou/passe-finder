/**
 * Le kit de pieces PNG a decouper — l'ANCETRE de l'atelier.
 *
 *   npm run generer:kit
 *
 * Il produit 195 fichiers dans `images/kit/` pour composer un schema a la main
 * dans Paint, paint.net ou PowerPoint. Depuis que `/positions/nouvelle` existe,
 * ce detour n'est plus necessaire — mais le kit reste utile hors du site, et
 * surtout il sert de TEMOIN : regenere, il doit rendre exactement les memes
 * images qu'avant, ce qui prouve que la geometrie n'a pas bouge.
 *
 * IL NE CONTIENT PLUS UNE SEULE LIGNE DE GEOMETRIE. Les formes, les couleurs et
 * les proportions viennent de `src/dessin-position.ts`, ou l'atelier les prend
 * aussi. C'est ce qui empeche les deux de diverger : jusqu'ici ce fichier etait
 * la source, il n'en est plus qu'un consommateur.
 */
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import {
  COULEUR,
  markupDePrimitives,
  primitivesDePiece,
  R_BRAS_KIT,
  R_TETE,
} from '../src/dessin-position'
import { APLATISSEMENT_ROND, type CouleurBras, type Piece } from '../src/schema-position'

const TOILE = 800 // cote de chaque PNG, en unites de dessin
const RACINE = 'images/kit'
const ROTATIONS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

/**
 * Les trois longueurs historiques du kit, exprimees dans le NOUVEAU modele.
 *
 * Elles etaient des angles balayes a rayon fixe ; elles sont maintenant une
 * longueur d'arc et une courbure. La conversion est exacte — `longueur = R x
 * angle`, `courbure = R_TETE / R` — et `tests/unit/dessin-position.spec.ts` la
 * verrouille : c'est ce qui garantit que le nouveau modele CONTIENT l'ancien.
 */
const COURBURE_KIT = R_TETE / R_BRAS_KIT
const LONGUEURS = {
  court: R_BRAS_KIT * ((50 * Math.PI) / 180),
  moyen: R_BRAS_KIT * ((95 * Math.PI) / 180),
  long: R_BRAS_KIT * ((145 * Math.PI) / 180),
}
const SENS = { horaire: 1, antihoraire: -1 }

/** Une piece posee a l'origine : c'est la forme que le kit exporte. */
const pose = { id: 'kit', x: 0, y: 0, rotation: 0 } as const

const PIECES: Record<string, Piece> = {
  'tete-homme': { ...pose, type: 'tete', genre: 'cavalier' },
  'tete-cavaliere': { ...pose, type: 'tete', genre: 'cavaliere' },
  'tete-bleue-nue': { ...pose, type: 'tete', genre: 'bleue-nue' },
  'tete-rose-nue': { ...pose, type: 'tete', genre: 'rose-nue' },
  eclair: { ...pose, type: 'accessoire', motif: 'eclair' },
  'queue-de-cheval': { ...pose, type: 'accessoire', motif: 'queue-de-cheval' },
  main: { ...pose, type: 'accessoire', motif: 'main' },
}

const bras = (longueur: number, sens: keyof typeof SENS, couleur: CouleurBras): Piece => ({
  ...pose,
  type: 'bras',
  longueur,
  courbure: SENS[sens] * COURBURE_KIT,
  // Le kit historique ne connaissait que l'arc de CERCLE : le repli est arrive
  // apres, avec l'atelier. `APLATISSEMENT_ROND` le redonne a l'identique.
  aplatissement: APLATISSEMENT_ROND,
  couleur,
})

const markup = (piece: Piece) => markupDePrimitives(primitivesDePiece(piece))

function svg(contenu: string, { rotation = 0, fond = '', cote = TOILE } = {}) {
  const d = cote / 2
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cote}" height="${cote}" ` +
    `viewBox="${-d} ${-d} ${cote} ${cote}">` +
    (fond ? `<rect x="${-d}" y="${-d}" width="${cote}" height="${cote}" fill="${fond}"/>` : '') +
    `<g transform="rotate(${rotation})">${contenu}</g></svg>`
  )
}

const png = (balises: string, fichier: string) =>
  sharp(Buffer.from(balises)).png({ compressionLevel: 9 }).toFile(fichier)

const cle = (n: number) => String(n).padStart(3, '0')

// ── Planches de contact ────────────────────────────────────────────────────
const POLICE = 'font-family="Segoe UI, DejaVu Sans, sans-serif"'

type Colonne = { titre: string; rotation: number }
type Ligne = { titre: string; contenu: string }

function planche({
  titre,
  colonnes,
  lignes,
  cellule = 200,
  marge = 150,
  boite = TOILE,
}: {
  titre: string
  colonnes: Colonne[]
  lignes: Ligne[]
  cellule?: number
  marge?: number
  boite?: number
}) {
  const L = marge + colonnes.length * cellule
  const H = 100 + lignes.length * cellule + 20
  const k = cellule / boite

  let s =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}" viewBox="0 0 ${L} ${H}">` +
    `<rect width="${L}" height="${H}" fill="${COULEUR.vert}"/>` +
    `<text x="20" y="44" ${POLICE} font-size="30" font-weight="700" fill="#123456">${titre}</text>`

  colonnes.forEach((c, i) => {
    s += `<text x="${marge + i * cellule + cellule / 2}" y="88" ${POLICE} font-size="18" fill="#445566" text-anchor="middle">${c.titre}</text>`
  })

  lignes.forEach((ligne, j) => {
    const y = 100 + j * cellule
    ligne.titre.split('\n').forEach((mot, m) => {
      s += `<text x="14" y="${y + cellule / 2 + m * 20 - 8}" ${POLICE} font-size="17" fill="#445566">${mot}</text>`
    })
    colonnes.forEach((c, i) => {
      const x = marge + i * cellule
      s +=
        `<g transform="translate(${x + cellule / 2} ${y + cellule / 2}) scale(${k})">` +
        `<g transform="rotate(${c.rotation})">${ligne.contenu}</g></g>` +
        `<rect x="${x}" y="${y}" width="${cellule}" height="${cellule}" fill="none" stroke="#99CC99" stroke-width="1"/>`
    })
  })

  return s + '</svg>'
}

// ── Génération ─────────────────────────────────────────────────────────────
async function generer() {
  // On ne vide que les dossiers de pieces : LISEZ-MOI.md est ecrit a la main,
  // et `planches/comparaison-tailles.png` vient d'un autre script.
  for (const d of ['tetes', 'bras', 'accessoires', 'fonds']) {
    await rm(path.join(RACINE, d), { recursive: true, force: true })
    await mkdir(path.join(RACINE, d), { recursive: true })
  }
  await mkdir(path.join(RACINE, 'planches'), { recursive: true })

  let n = 0

  for (const nom of ['tete-homme', 'tete-cavaliere']) {
    for (const r of ROTATIONS) {
      await png(svg(markup(PIECES[nom]), { rotation: r }), `${RACINE}/tetes/${nom}-${cle(r)}.png`)
      n++
    }
  }
  for (const nom of ['tete-bleue-nue', 'tete-rose-nue']) {
    await png(svg(markup(PIECES[nom])), `${RACINE}/tetes/${nom}.png`)
    n++
  }

  for (const nom of ['eclair', 'queue-de-cheval']) {
    for (const r of ROTATIONS) {
      await png(
        svg(markup(PIECES[nom]), { rotation: r }),
        `${RACINE}/accessoires/${nom}-${cle(r)}.png`,
      )
      n++
    }
  }
  await png(
    `<svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="-35 -35 70 70">` +
      `${markup(PIECES.main)}</svg>`,
    `${RACINE}/accessoires/main.png`,
  )
  n++

  for (const [nomLong, longueur] of Object.entries(LONGUEURS)) {
    for (const nomCoul of ['noir', 'gris'] as CouleurBras[]) {
      for (const sens of Object.keys(SENS) as (keyof typeof SENS)[]) {
        for (const r of ROTATIONS) {
          await png(
            svg(markup(bras(longueur, sens, nomCoul)), { rotation: r }),
            `${RACINE}/bras/bras-${nomLong}-${nomCoul}-${sens}-${cle(r)}.png`,
          )
          n++
        }
      }
    }
  }

  for (const [w, h] of [
    [800, 800],
    [1400, 900],
    [980, 660],
  ]) {
    await sharp({ create: { width: w, height: h, channels: 3, background: COULEUR.vert } })
      .png()
      .toFile(`${RACINE}/fonds/fond-vert-${w}x${h}.png`)
  }

  // ── Planches de contact ──────────────────────────────────────────────────
  const colRot: Colonne[] = ROTATIONS.map((r) => ({ titre: `${r}°`, rotation: r }))

  await png(
    planche({
      titre: 'Têtes et accessoires — chaque colonne = la fin du nom de fichier',
      colonnes: colRot,
      cellule: 220,
      boite: 560,
      lignes: [
        { titre: 'tête\nhomme', contenu: markup(PIECES['tete-homme']) },
        { titre: 'tête\ncavalière', contenu: markup(PIECES['tete-cavaliere']) },
        { titre: 'éclair\nseul', contenu: markup(PIECES.eclair) },
        { titre: 'queue de\ncheval seule', contenu: markup(PIECES['queue-de-cheval']) },
      ],
    }),
    `${RACINE}/planches/planche-tetes.png`,
  )

  const repere = `<circle r="${R_TETE}" fill="none" stroke="#77AA77" stroke-width="4" stroke-dasharray="16 12"/>`

  for (const nomCoul of ['noir', 'gris'] as CouleurBras[]) {
    await png(
      planche({
        titre:
          nomCoul === 'noir'
            ? 'Bras noirs (le bras passe au-dessus) — le cercle pointillé montre où se pose la tête'
            : 'Bras gris (le bras passe en dessous) — le cercle pointillé montre où se pose la tête',
        colonnes: colRot,
        cellule: 230,
        boite: 790,
        lignes: Object.entries(LONGUEURS).flatMap(([nomLong, longueur]) =>
          (Object.keys(SENS) as (keyof typeof SENS)[]).map((sens) => ({
            titre: `${nomLong}\n${sens}`,
            contenu: repere + markup(bras(longueur, sens, nomCoul)),
          })),
        ),
      }),
      `${RACINE}/planches/planche-bras-${nomCoul}.png`,
    )
  }

  // Exemple : une position recomposee uniquement a partir des pieces du kit.
  const pose800 = (fichier: string, cx: number, cy: number) => ({
    input: fichier,
    left: Math.round(cx - TOILE / 2),
    top: Math.round(cy - TOILE / 2),
  })
  await sharp(`${RACINE}/fonds/fond-vert-1400x900.png`)
    .composite([
      pose800(`${RACINE}/bras/bras-long-gris-horaire-030.png`, 500, 450),
      pose800(`${RACINE}/bras/bras-moyen-noir-antihoraire-300.png`, 500, 450),
      pose800(`${RACINE}/bras/bras-moyen-noir-horaire-210.png`, 900, 450),
      pose800(`${RACINE}/tetes/tete-homme-180.png`, 500, 450),
      pose800(`${RACINE}/tetes/tete-cavaliere-000.png`, 900, 450),
    ])
    .png()
    .toFile(`${RACINE}/planches/exemple-composition.png`)

  console.log(`${n} pièces générées dans ${RACINE}/`)
}

generer().catch((erreur) => {
  console.error(erreur)
  process.exit(1)
})
