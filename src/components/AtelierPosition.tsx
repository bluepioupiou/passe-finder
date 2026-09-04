'use client'

import { useRouter } from 'next/navigation'
import React, { useId, useRef, useState } from 'react'

import {
  aimanter,
  ajouterAuBonRang,
  ajusterBras,
  APLATISSEMENT_MAX,
  APLATISSEMENT_MIN,
  APLATISSEMENT_ROND,
  COURBURE_MAX,
  deplacer,
  dupliquer,
  identifiant,
  LONGUEUR_MAX,
  LONGUEUR_MIN,
  PAS_ROTATION,
  PAS_ROTATION_FIN,
  PIECES_MAX,
  placer,
  pointVersToile,
  reordonner,
  retirer,
  schemaVide,
  TAILLES,
  tourner,
  type CouleurBras,
  type GenreTete,
  type Piece,
  type ResultatPosition,
  type SaisiePosition,
  type SchemaPosition,
} from '@/schema-position'
import { ScenePosition } from './ScenePosition'
import './atelier-position.css'

/**
 * L'atelier de schema de position : on pose des tetes et des bras, on les
 * deplace, on decide qui passe par-dessus qui, et on enregistre.
 *
 * Il remplace un detour par Paint que decrivait Alain : sortir du site, se
 * tromper de dimensions, recommencer. Le meme composant sert a CREER et a
 * MODIFIER — `initial` change les libelles, rien d'autre (meme parti que
 * `Compositeur`, pour les enchainements).
 *
 * TROIS PARTIS PRIS D'INTERFACE, ET LEURS RAISONS.
 *
 * 1. LE CANEVAS EST UNE VUE, LA PILE EST LA COMMANDE. Un bras fait 13 unites
 *    d'epaisseur : quelques pixels a l'ecran. On peut le viser a la souris,
 *    mais pas au doigt, et surtout pas au clavier — le focus sur un noeud SVG
 *    est un champ de mines d'un navigateur a l'autre. La pile des pieces, sous
 *    le canevas, offre donc le chemin fiable : chaque ligne est un vrai bouton,
 *    et tout ce qu'on peut faire a la souris s'y fait au clavier.
 *
 * 2. LES FLECHES DE LA PILE PORTENT L'ORDRE DE SUPERPOSITION. C'est le geste
 *    qu'Alain faisait deja dans PowerPoint pour dire « qui passe par-dessus
 *    qui », avec le meme vocabulaire.
 *
 * 3. AUCUN ETAT DERIVE. Les mutations passent toutes par les fonctions pures de
 *    `schema-position.ts` ; ce composant ne fait pas d'arithmetique sur les
 *    pieces. C'est ce qui permet d'eprouver les regles sans monter le DOM.
 */

type Informations = { nom: string; description: string }

const NOUVEAU_BRAS = { longueur: 260, courbure: 0.5, aplatissement: APLATISSEMENT_ROND } as const

// ── Libelles ───────────────────────────────────────────────────────────────

const GENRES: { valeur: GenreTete; libelle: string }[] = [
  { valeur: 'cavalier', libelle: 'Cavalier' },
  { valeur: 'cavaliere', libelle: 'Cavalière' },
  { valeur: 'bleue-nue', libelle: 'Tête bleue nue' },
  { valeur: 'rose-nue', libelle: 'Tête rose nue' },
]

function nomDePiece(piece: Piece): string {
  if (piece.type === 'tete') {
    return GENRES.find((genre) => genre.valeur === piece.genre)?.libelle ?? 'Tête'
  }
  if (piece.type === 'accessoire') {
    if (piece.motif === 'eclair') return 'Éclair'
    if (piece.motif === 'queue-de-cheval') return 'Queue de cheval'
    return 'Main'
  }
  const taille = piece.longueur < 190 ? 'court' : piece.longueur < 320 ? 'moyen' : 'long'
  const forme = piece.courbure === 0 ? 'droit' : piece.courbure > 0 ? 'horaire' : 'antihoraire'
  // L'ellipse ne se dit que lorsqu'elle s'ecarte du rond : sinon chaque libelle
  // porterait un mot qui n'apprend rien.
  const ellipse =
    piece.aplatissement < 0.75 ? ' · épingle' : piece.aplatissement > 1.3 ? ' · étiré' : ''
  return `Bras ${piece.couleur} · ${taille} · ${forme}${ellipse}`
}

/** Le libelle complet d'une ligne de pile, aussi utilise pour les annonces. */
const descriptionDePiece = (piece: Piece) =>
  `${nomDePiece(piece)} · ${Math.round(piece.rotation)}°`

// ── La mire ────────────────────────────────────────────────────────────────

/**
 * Ce que le site montrera vraiment, dessine par-dessus le canevas.
 *
 * `image-position.css` recadre toute vignette en carre puis l'arrondit : seul
 * le disque inscrit est jamais a l'ecran. Les quatre coins assombris ne sont
 * pas un cache — ils SERONT bien exportes en vert — ils disent simplement que
 * personne ne les verra. Le second cercle marque une marge de securite, et la
 * croix le centre exact, celui qu'Alain reclamait.
 */
function Mire({ taille }: { taille: number }) {
  const demi = taille / 2
  const contour =
    `M ${-demi},${-demi} H ${demi} V ${demi} H ${-demi} Z ` +
    `M ${demi},0 A ${demi} ${demi} 0 1 0 ${-demi},0 A ${demi} ${demi} 0 1 0 ${demi},0 Z`

  return (
    <g className="atelier__mire" pointerEvents="none" aria-hidden="true">
      <path className="atelier__mire-hors-champ" d={contour} fillRule="evenodd" />
      <circle className="atelier__mire-bord" r={demi - 1} />
      <circle className="atelier__mire-sure" r={demi * 0.92} />
      <path className="atelier__mire-centre" d={`M ${-demi * 0.05},0 H ${demi * 0.05} M 0,${-demi * 0.05} V ${demi * 0.05}`} />
    </g>
  )
}

// ── Le composant ───────────────────────────────────────────────────────────

export function AtelierPosition({
  initial,
  enregistrer,
  retour,
}: {
  initial?: { id: number | null; schema: SchemaPosition; informations: Informations }
  enregistrer: (saisie: SaisiePosition) => Promise<ResultatPosition>
  retour: string
}) {
  const router = useRouter()
  const champ = useId()
  const cadre = useRef<HTMLDivElement>(null)
  /** Le glisser en cours vit hors de React : un `setState` par `pointermove`
   *  ferait rendre tout l'atelier des dizaines de fois par seconde. */
  const glisser = useRef<{ id: string; dx: number; dy: number } | null>(null)

  const [schema, setSchema] = useState<SchemaPosition>(initial?.schema ?? schemaVide())
  const [informations, setInformations] = useState<Informations>(
    initial?.informations ?? { nom: '', description: '' },
  )
  const [selection, setSelection] = useState<string | null>(null)
  const [annonce, setAnnonce] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [opaciteCalque, setOpaciteCalque] = useState(35)

  const modification = Boolean(initial?.id)
  const pieceSelectionnee = schema.pieces.find((piece) => piece.id === selection) ?? null
  const plein = schema.pieces.length >= PIECES_MAX

  /** Toute mutation passe par ici : elle applique, et elle ANNONCE. Sans la
   *  seconde moitie, un editeur graphique est muet pour qui ne voit pas. */
  const appliquer = (suivant: SchemaPosition, message: string) => {
    setSchema(suivant)
    setAnnonce(message)
  }

  // ── Ajouts ───────────────────────────────────────────────────────────────

  const ajouterTete = (genre: GenreTete) => {
    // Les deux premieres tetes se posent de part et d'autre du centre : c'est
    // la disposition de presque toutes les vignettes, autant l'offrir.
    const deja = schema.pieces.filter((piece) => piece.type === 'tete').length
    const ecart = schema.taille * 0.17
    const x = deja === 0 ? -ecart : deja === 1 ? ecart : 0

    const piece: Piece = {
      id: identifiant(),
      type: 'tete',
      genre,
      x,
      y: 0,
      // Le cavalier regarde vers la droite, ou l'attend generalement sa
      // cavaliere ; elle, vers la gauche.
      rotation: genre === 'cavalier' ? 180 : 0,
    }
    setSelection(piece.id)
    appliquer(ajouterAuBonRang(schema, piece), `${nomDePiece(piece)} ajouté.`)
  }

  const ajouterBras = (couleur: CouleurBras) => {
    // Un bras appartient a une tete : on le pose sur celle qui est selectionnee,
    // sinon sur la derniere ajoutee. Il est ainsi deja emboite, et il ne reste
    // qu'a l'orienter.
    const hote =
      (pieceSelectionnee?.type === 'tete' ? pieceSelectionnee : null) ??
      [...schema.pieces].reverse().find((piece) => piece.type === 'tete') ??
      null

    const piece: Piece = {
      id: identifiant(),
      type: 'bras',
      ...NOUVEAU_BRAS,
      couleur,
      x: hote?.x ?? 0,
      y: hote?.y ?? 0,
      rotation: 0,
    }
    setSelection(piece.id)
    appliquer(
      ajouterAuBonRang(schema, piece),
      `Bras ${couleur} ajouté${hote ? ' sur la tête' : ''}.`,
    )
  }

  // ── Gestes sur une piece ─────────────────────────────────────────────────

  const pivoter = (id: string, sens: 1 | -1, fin: boolean) => {
    const pas = (fin ? PAS_ROTATION_FIN : PAS_ROTATION) * sens
    const suivant = tourner(schema, id, pas)
    const piece = suivant.pieces.find((autre) => autre.id === id)!
    appliquer(suivant, `${nomDePiece(piece)} tourné à ${Math.round(piece.rotation)} degrés.`)
  }

  const bouger = (id: string, dx: number, dy: number) => {
    const suivant = deplacer(schema, id, dx, dy)
    const piece = suivant.pieces.find((autre) => autre.id === id)!
    appliquer(suivant, `${nomDePiece(piece)} déplacé, x ${Math.round(piece.x)}, y ${Math.round(piece.y)}.`)
  }

  const deplacerDansLaPile = (id: string, vers: 1 | -1) => {
    const piece = schema.pieces.find((autre) => autre.id === id)
    if (!piece) return
    appliquer(
      reordonner(schema, id, vers),
      `${nomDePiece(piece)} ${vers === 1 ? 'monté' : 'descendu'} d’un rang.`,
    )
  }

  const supprimer = (id: string) => {
    const piece = schema.pieces.find((autre) => autre.id === id)
    if (!piece) return
    if (selection === id) setSelection(null)
    appliquer(retirer(schema, id), `${nomDePiece(piece)} supprimé.`)
  }

  const copier = (id: string) => {
    const nouvel = identifiant()
    setSelection(nouvel)
    appliquer(dupliquer(schema, id, nouvel), 'Pièce dupliquée.')
  }

  // ── Glisser au pointeur ──────────────────────────────────────────────────

  const gestionnairesPiece = (id: string): React.SVGProps<SVGGElement> => ({
    className: 'scene__piece',
    onPointerDown: (evenement) => {
      // Sans cela, le navigateur demarre une selection de texte ou un
      // glisser-deposer natif d'image par-dessus le notre.
      evenement.preventDefault()
      setSelection(id)

      const rect = cadre.current?.getBoundingClientRect()
      const piece = schema.pieces.find((autre) => autre.id === id)
      if (!rect || !piece) return

      const point = pointVersToile(rect, evenement.clientX, evenement.clientY, schema.taille)
      // On memorise l'ECART entre le doigt et le centre de la piece : sans lui,
      // la piece sauterait pour se centrer sous le doigt au premier mouvement.
      glisser.current = { id, dx: piece.x - point.x, dy: piece.y - point.y }

      // `?.` indispensable : jsdom ne fournit pas `setPointerCapture`, et le
      // test unitaire mourrait a la premiere ligne du geste.
      evenement.currentTarget.setPointerCapture?.(evenement.pointerId)
    },
    onPointerMove: (evenement) => {
      const en_cours = glisser.current
      if (!en_cours || en_cours.id !== id) return

      const rect = cadre.current?.getBoundingClientRect()
      if (!rect) return

      const point = pointVersToile(rect, evenement.clientX, evenement.clientY, schema.taille)
      setSchema((actuel) => placer(actuel, id, point.x + en_cours.dx, point.y + en_cours.dy))
    },
    onPointerUp: (evenement) => {
      if (glisser.current?.id !== id) return
      glisser.current = null
      evenement.currentTarget.releasePointerCapture?.(evenement.pointerId)

      // L'aimantation au relachement : un bras lache pres d'une tete s'y colle
      // exactement, ce qu'aucune souris ne fait au pixel.
      setSchema((actuel) => {
        const suivant = aimanter(actuel, id)
        const piece = suivant.pieces.find((autre) => autre.id === id)
        if (piece) setAnnonce(`${nomDePiece(piece)} posé, x ${Math.round(piece.x)}, y ${Math.round(piece.y)}.`)
        return suivant
      })
    },
  })

  // ── Clavier ──────────────────────────────────────────────────────────────

  const auClavier = (evenement: React.KeyboardEvent<HTMLDivElement>) => {
    // Les fleches appartiennent aux champs de saisie et aux curseurs : on ne
    // les leur prend jamais.
    const cible = evenement.target as HTMLElement
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(cible.tagName)) return
    if (!selection) return

    const pas = evenement.shiftKey ? 40 : 10
    const gestes: Record<string, () => void> = {
      ArrowLeft: () => bouger(selection, -pas, 0),
      ArrowRight: () => bouger(selection, pas, 0),
      ArrowUp: () => bouger(selection, 0, -pas),
      ArrowDown: () => bouger(selection, 0, pas),
      Delete: () => supprimer(selection),
      PageUp: () => deplacerDansLaPile(selection, 1),
      PageDown: () => deplacerDansLaPile(selection, -1),
      Escape: () => setSelection(null),
    }

    const geste = gestes[evenement.key]
    if (!geste) return
    evenement.preventDefault()
    geste()
  }

  // ── Enregistrement ───────────────────────────────────────────────────────

  const soumettre = async (evenement: React.FormEvent) => {
    evenement.preventDefault()
    if (enCours || schema.pieces.length === 0) return

    setEnCours(true)
    setErreur(null)
    try {
      const resultat = await enregistrer({
        id: initial?.id ?? null,
        nom: informations.nom,
        description: informations.description,
        schema,
      })

      if (!resultat.ok) {
        // L'echec RESTE A L'ECRAN : le schema n'est jamais vide, jamais perdu.
        setErreur(resultat.message)
        setEnCours(false)
        return
      }

      router.push(`/positions/${resultat.id}`)
      router.refresh()
    } catch {
      setErreur("L'enregistrement n'a pas abouti. Réessaie dans un instant.")
      setEnCours(false)
    }
  }

  // ── Rendu ────────────────────────────────────────────────────────────────

  const pileHautEnBas = [...schema.pieces].reverse()

  return (
    <div className="atelier" onKeyDown={auClavier}>
      <div className="atelier__plan">
        <div className="atelier__canevas" ref={cadre}>
          <ScenePosition
            schema={schema}
            selection={selection}
            gestionnairesPiece={gestionnairesPiece}
            titre={`Aperçu du schéma — ${schema.pieces.length} pièce${schema.pieces.length > 1 ? 's' : ''}`}
            fond={
              schema.calque && opaciteCalque > 0 ? (
                <image
                  href={schema.calque.src}
                  x={-schema.taille / 2}
                  y={-schema.taille / 2}
                  width={schema.taille}
                  height={schema.taille}
                  // `slice` reproduit exactement le `object-fit: cover` du site :
                  // ce qu'on decalque est ce que le site montrait.
                  preserveAspectRatio="xMidYMid slice"
                  opacity={opaciteCalque / 100}
                  pointerEvents="none"
                />
              ) : null
            }
            dessus={<Mire taille={schema.taille} />}
          />
        </div>

        <p className="atelier__aide">
          Le cercle en pointillé montre ce que le site affichera : tout ce qui est en dehors sera
          coupé. Clique une pièce pour la sélectionner, puis fais-la glisser — ou utilise la liste
          ci-dessous et les flèches du clavier.
        </p>
      </div>

      <div className="atelier__commandes">
        {/* ── 1. Ajouter ─────────────────────────────────────────────── */}
        <section className="atelier__bloc">
          <h2 className="atelier__titre">1. Ajouter une pièce</h2>

          <div className="atelier__palette">
            {(['cavalier', 'cavaliere'] as GenreTete[]).map((genre) => (
              <button
                key={genre}
                type="button"
                className="atelier__ajout"
                onClick={() => ajouterTete(genre)}
                disabled={plein}
              >
                <ScenePosition
                  className="atelier__apercu"
                  schema={{
                    version: 1,
                    taille: 560,
                    calque: null,
                    pieces: [{ id: 'apercu', type: 'tete', genre, x: 0, y: 0, rotation: 0 }],
                  }}
                />
                {GENRES.find((autre) => autre.valeur === genre)!.libelle}
              </button>
            ))}

            {(['noir', 'gris'] as CouleurBras[]).map((couleur) => (
              <button
                key={couleur}
                type="button"
                className="atelier__ajout"
                onClick={() => ajouterBras(couleur)}
                disabled={plein}
              >
                <ScenePosition
                  className="atelier__apercu"
                  schema={{
                    version: 1,
                    taille: 760,
                    calque: null,
                    pieces: [
                      { id: 'apercu', type: 'bras', ...NOUVEAU_BRAS, couleur, x: 0, y: 0, rotation: 0 },
                    ],
                  }}
                />
                Bras {couleur}
              </button>
            ))}
          </div>

          <p className="atelier__note">
            Un bras <strong>gris</strong> passe en dessous, un bras <strong>noir</strong> au-dessus.
            Le bras ajouté se pose sur la tête sélectionnée.
          </p>

          <fieldset className="atelier__tailles">
            <legend className="atelier__legende">Taille des personnages</legend>
            {(Object.entries(TAILLES) as [keyof typeof TAILLES, number][]).map(([nom, valeur]) => (
              <button
                key={nom}
                type="button"
                className="atelier__taille"
                aria-pressed={schema.taille === valeur}
                onClick={() => appliquer({ ...schema, taille: valeur }, `Taille ${nom}.`)}
              >
                {nom}
              </button>
            ))}
          </fieldset>
        </section>

        {/* ── 2. La pile ─────────────────────────────────────────────── */}
        <section className="atelier__bloc">
          <h2 className="atelier__titre">2. Les pièces, du dessus vers le dessous</h2>

          {schema.pieces.length === 0 ? (
            <p className="atelier__vide">Aucune pièce pour l’instant. Commence par une tête.</p>
          ) : (
            <ol className="atelier__pile">
              {pileHautEnBas.map((piece, rang) => {
                const dessus = rang === 0
                const dessous = rang === pileHautEnBas.length - 1
                return (
                  <li
                    key={piece.id}
                    className={`atelier__rang${selection === piece.id ? ' atelier__rang--choisi' : ''}`}
                  >
                    <button
                      type="button"
                      className="atelier__choisir"
                      aria-pressed={selection === piece.id}
                      onClick={() => setSelection(piece.id)}
                    >
                      <ScenePosition
                        className="atelier__vignette"
                        schema={{ version: 1, taille: 900, calque: null, pieces: [{ ...piece, x: 0, y: 0 }] }}
                      />
                      <span>{descriptionDePiece(piece)}</span>
                    </button>

                    <span className="atelier__outils">
                      <button
                        type="button"
                        onClick={() => deplacerDansLaPile(piece.id, 1)}
                        disabled={dessus}
                        aria-label={`Monter ${nomDePiece(piece)} d’un rang`}
                        title="Monter d’un rang"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => deplacerDansLaPile(piece.id, -1)}
                        disabled={dessous}
                        aria-label={`Descendre ${nomDePiece(piece)} d’un rang`}
                        title="Descendre d’un rang"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => copier(piece.id)}
                        disabled={plein}
                        aria-label={`Dupliquer ${nomDePiece(piece)}`}
                        title="Dupliquer"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        className="atelier__retirer"
                        onClick={() => supprimer(piece.id)}
                        aria-label={`Supprimer ${nomDePiece(piece)}`}
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* ── 3. Régler la pièce choisie ─────────────────────────────── */}
        {pieceSelectionnee ? (
          <section className="atelier__bloc">
            <h2 className="atelier__titre">3. Régler « {nomDePiece(pieceSelectionnee)} »</h2>

            <div className="atelier__ligne">
              <button
                type="button"
                onClick={(evenement) => pivoter(pieceSelectionnee.id, -1, evenement.shiftKey)}
                aria-label="Tourner vers la gauche"
              >
                <span aria-hidden="true">⟲</span>
              </button>
              <span className="atelier__valeur">{Math.round(pieceSelectionnee.rotation)}°</span>
              <button
                type="button"
                onClick={(evenement) => pivoter(pieceSelectionnee.id, 1, evenement.shiftKey)}
                aria-label="Tourner vers la droite"
              >
                <span aria-hidden="true">⟳</span>
              </button>
              <span className="atelier__note">
                pas de {PAS_ROTATION}° — maintiens Maj pour {PAS_ROTATION_FIN}°
              </span>
            </div>

            {pieceSelectionnee.type === 'bras' ? (
              <>
                <div className="atelier__reglage">
                  <label htmlFor={`${champ}-longueur`}>
                    Longueur <span className="atelier__valeur">{pieceSelectionnee.longueur}</span>
                  </label>
                  <input
                    id={`${champ}-longueur`}
                    type="range"
                    min={LONGUEUR_MIN}
                    max={LONGUEUR_MAX}
                    step={10}
                    value={pieceSelectionnee.longueur}
                    onChange={(evenement) =>
                      appliquer(
                        ajusterBras(schema, pieceSelectionnee.id, {
                          longueur: Number(evenement.target.value),
                        }),
                        `Longueur ${evenement.target.value}.`,
                      )
                    }
                  />
                </div>

                <div className="atelier__reglage">
                  <label htmlFor={`${champ}-courbure`}>
                    Courbure{' '}
                    <span className="atelier__valeur">
                      {pieceSelectionnee.courbure === 0
                        ? 'droit'
                        : pieceSelectionnee.courbure.toFixed(2).replace('.', ',')}
                    </span>
                  </label>
                  <input
                    id={`${champ}-courbure`}
                    type="range"
                    min={-COURBURE_MAX}
                    max={COURBURE_MAX}
                    step={0.05}
                    value={pieceSelectionnee.courbure}
                    onChange={(evenement) =>
                      appliquer(
                        ajusterBras(schema, pieceSelectionnee.id, {
                          courbure: Number(evenement.target.value),
                        }),
                        `Courbure ${evenement.target.value}.`,
                      )
                    }
                  />
                  {/* Un seul curseur qui va d'un sens a l'autre en passant par le
                      bras droit : le sens devient VISIBLE, la ou une case a
                      cocher demandait de le deviner. */}
                  <p className="atelier__graduation" aria-hidden="true">
                    <span>↺</span>
                    <span>droit</span>
                    <span>↻</span>
                  </p>
                </div>

                <div className="atelier__reglage">
                  <label htmlFor={`${champ}-ellipse`}>
                    Ellipse{' '}
                    <span className="atelier__valeur">
                      {pieceSelectionnee.aplatissement === APLATISSEMENT_ROND
                        ? 'rond'
                        : pieceSelectionnee.aplatissement.toFixed(2).replace('.', ',')}
                    </span>
                  </label>
                  <input
                    id={`${champ}-ellipse`}
                    type="range"
                    min={APLATISSEMENT_MIN}
                    max={APLATISSEMENT_MAX}
                    step={0.05}
                    // Sans effet sur un bras droit : il n'y a pas d'ellipse a
                    // pincer, et un curseur qui ne fait rien vaut mieux desactive
                    // qu'inexplicablement inerte.
                    disabled={pieceSelectionnee.courbure === 0}
                    value={pieceSelectionnee.aplatissement}
                    onChange={(evenement) =>
                      appliquer(
                        ajusterBras(schema, pieceSelectionnee.id, {
                          aplatissement: Number(evenement.target.value),
                        }),
                        `Ellipse ${evenement.target.value}.`,
                      )
                    }
                  />
                  <p className="atelier__graduation" aria-hidden="true">
                    <span>épingle</span>
                    <span>rond</span>
                    <span>étiré</span>
                  </p>
                  <p className="atelier__note">
                    Le bras court sur une ellipse au lieu d’un cercle, et il part du milieu d’un
                    flanc : à mi-longueur, il a contourné la pointe et la main revient juste à côté
                    de l’épaule.
                  </p>
                </div>

                <div className="atelier__ligne">
                  {(['noir', 'gris'] as CouleurBras[]).map((couleur) => (
                    <button
                      key={couleur}
                      type="button"
                      aria-pressed={pieceSelectionnee.couleur === couleur}
                      onClick={() =>
                        appliquer(
                          ajusterBras(schema, pieceSelectionnee.id, { couleur }),
                          `Bras ${couleur}.`,
                        )
                      }
                    >
                      {couleur === 'noir' ? 'Noir (au-dessus)' : 'Gris (en dessous)'}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <p className="atelier__note">
              Les flèches du clavier déplacent la pièce ; Maj pour aller plus vite. Suppr l’efface.
            </p>
          </section>
        ) : null}

        {/* ── 4. Enregistrer ─────────────────────────────────────────── */}
        <section className="atelier__bloc">
          <h2 className="atelier__titre">
            {modification ? '4. Enregistrer les modifications' : '4. Nommer et enregistrer'}
          </h2>

          <form className="atelier__formulaire" onSubmit={soumettre}>
            <div className="atelier__champ">
              <label htmlFor={`${champ}-nom`}>Nom de la position</label>
              <input
                id={`${champ}-nom`}
                type="text"
                value={informations.nom}
                onChange={(evenement) =>
                  setInformations((actuel) => ({ ...actuel, nom: evenement.target.value }))
                }
                required
              />
            </div>

            <div className="atelier__champ">
              <label htmlFor={`${champ}-description`}>Description</label>
              <textarea
                id={`${champ}-description`}
                rows={3}
                value={informations.description}
                onChange={(evenement) =>
                  setInformations((actuel) => ({ ...actuel, description: evenement.target.value }))
                }
              />
            </div>

            {schema.calque ? (
              <div className="atelier__reglage">
                <label htmlFor={`${champ}-calque`}>
                  Ancienne image en calque{' '}
                  <span className="atelier__valeur">{opaciteCalque} %</span>
                </label>
                <input
                  id={`${champ}-calque`}
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={opaciteCalque}
                  onChange={(evenement) => setOpaciteCalque(Number(evenement.target.value))}
                />
              </div>
            ) : null}

            {erreur ? (
              <p className="atelier__erreur" role="alert">
                {erreur}
              </p>
            ) : null}

            <div className="atelier__actions">
              <button
                type="submit"
                className="atelier__enregistrer"
                disabled={enCours || schema.pieces.length === 0}
              >
                {enCours ? 'Enregistrement…' : modification ? 'Enregistrer' : 'Créer la position'}
              </button>
              <a className="atelier__annuler" href={retour}>
                Annuler
              </a>
            </div>

            {schema.pieces.length === 0 ? (
              <p className="atelier__note">Ajoute au moins une pièce pour pouvoir enregistrer.</p>
            ) : null}
          </form>
        </section>
      </div>

      {/* Sans cette region, l'atelier serait entierement muet pour qui ne voit
          pas le canevas : chaque geste n'y produit qu'un changement graphique. */}
      <p className="atelier__annonce" role="status" aria-live="polite">
        {annonce}
      </p>
    </div>
  )
}
