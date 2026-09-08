import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { IconeVideo } from '@/components/Icones'
import { ImagePosition } from '@/components/ImagePosition'
import { ListePasses, Transitions } from '@/components/Voisinage'
import { enchainementsUtilisant, EXEMPLES_PAR_PASSE, voisinesDePasse } from '@/catalogue'
import { libelleDifficulte } from '@/collections/Passe'
import { formaterDate, placeDansLaChaine, rangsDeLaPasse } from '@/enchainements'
import { lienListe } from '@/enchainements-liste'
import config from '@/payload.config'
import type { Enchainement, Position } from '@/payload-types'
import { sessionCourante } from '@/porte'
import { presenterVideo } from '@/video'
import './fiche-passe.css'

export const dynamic = 'force-dynamic'

/** Position cliquable vers sa fiche (FR-22). */
function MaillonPosition({ position, role }: { position: Position; role: string }) {
  return (
    <Link className="fiche-maillon" href={`/positions/${position.id}`}>
      <ImagePosition position={position} className="fiche-maillon__image" />
      <span className="fiche-maillon__role label-caps texte-attenue">{role}</span>
      <span className="fiche-maillon__nom">{position.nom}</span>
    </Link>
  )
}

/**
 * Un enchaînement donné en EXEMPLE de la passe (FR-24).
 *
 * TROIS CHOSES ET PAS UNE CARTE COMPLÈTE : le titre pour reconnaître, la place
 * de la passe dans la chaîne pour savoir où regarder en arrivant, la date pour
 * situer le cours. La carte de la liste (`CarteEnchainement`) montre en plus le
 * trajet et la description — il faudrait pour cela charger tout le catalogue de
 * référence sur une fiche qui n'en a aucun autre usage, et cinq cartes pleines
 * repousseraient les listes de voisinage encore plus bas.
 *
 * L'ICÔNE VIDÉO EST LA SEULE RETENUE, et pas celle de la musique : ici on
 * cherche à VOIR la passe dansée. Le morceau ne dit rien de la passe. C'est
 * aussi le premier pas vers FR-38, qui demande une liste de vidéos à part.
 */
function ExempleDEnchainement({
  enchainement,
  passe,
}: {
  enchainement: Enchainement
  passe: number
}) {
  const place = placeDansLaChaine(
    rangsDeLaPasse(enchainement.passes, passe),
    enchainement.passes.length,
  )
  const date = formaterDate(enchainement.date)
  const video = presenterVideo(enchainement.urlVideo)

  return (
    <li>
      {/* L'IDENTIFIANT PUBLIC, jamais le numéro de ligne : c'est la seule
          adresse que le site sert (action item `identifiant-opaque-et-visibilites`). */}
      <Link className="fiche-exemple" href={`/enchainements/${enchainement.idPublic}`}>
        <span className="fiche-exemple__titre">{enchainement.titre}</span>
        {place ? <span className="fiche-exemple__place texte-attenue">{place}</span> : null}
        {video ? (
          <span className="fiche-exemple__video">
            <IconeVideo taille={14} />
            <span className="fiche-exemple__intitule">Avec vidéo</span>
          </span>
        ) : null}
        {date ? <span className="fiche-exemple__date texte-attenue">{date}</span> : null}
      </Link>
    </li>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })
  const passe = await payload
    .findByID({ collection: 'passes', id, depth: 0, disableErrors: true })
    .catch(() => null)

  return { title: passe ? `${passe.nom} — Passe Finder` : 'Passe introuvable' }
}

/**
 * Fiche d'une passe (E4, UX-DR9) — lecture publique (FR-21).
 *
 * CE QUI SE DANSE AVANT ET APRES (2026-09-02, demande d'Alain). La fiche était
 * un cul-de-sac : elle montrait l'arête — départ → arrivée — et rien de ce qui
 * s'y raccroche. La question qu'on se pose devant une passe est pourtant la
 * même que devant une position : « et ensuite ? ». La règle des trois listes,
 * et ce qu'elle assume, sont dans `voisinesDePasse` (src/catalogue.ts).
 *
 * L'ORDRE DE LA PAGE est celui de la danse — ce qui mène ici, puis ce qui
 * enchaîne, puis les changements de prise — et les trois viennent APRES le
 * déroulé. Le déroulé est le contenu de cours, la raison d'être de la fiche :
 * trois listes qui peuvent compter des dizaines d'entrées (44 au pire) le
 * repousseraient hors de vue sur téléphone. Les deux listes de passes n'en
 * montrent donc plus que CINQ et replient le reste sur place (2026-09-07) : la
 * règle vit dans `ListePasses`, qui la porte aussi sur la fiche position.
 *
 * LES EXEMPLES S'INTERCALENT ENTRE LE DEROULE ET CES TROIS LISTES (FR-24,
 * 2026-09-07), et cette place est le seul endroit tenable. Placés après, ils
 * seraient sous 68 lignes de voisinage — au bas d'une fiche qui mesure 24 000 px
 * dans le pire cas, donc invisibles. Placés avant le déroulé, ils passeraient
 * devant le contenu de cours, qui est la raison d'être de la fiche. On lit donc
 * : voici la passe, voici comment elle se danse, voici où elle sert vraiment,
 * et voici comment le graphe continue.
 *
 * LA PRECISION SOUS CHAQUE TITRE NOMME LA POSITION concernée. Sur une fiche
 * position, « qui partent d'ici » se suffit ; ici les listes parlent de deux
 * positions différentes, dont aucune n'est le sujet de la page.
 *
 * Reste à faire ici (Story 5.6, FR-38) : la liste des VIDEOS, distincte de
 * celle des enchaînements.
 */
export default async function FichePasse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: await config })

  const passe = await payload
    // depth 2 : passe -> position -> image (voir la liste des passes).
    .findByID({ collection: 'passes', id, depth: 2, disableErrors: true })
    .catch(() => null)

  if (!passe) notFound()

  const debut = passe.positionDebut as Position | number
  const fin = passe.positionFin as Position | number
  const difficulte = libelleDifficulte(passe.difficulte)

  // LA SESSION EST LUE POUR LES SEULS EXEMPLES. La fiche reste publique
  // (FR-21) : elle n'exige rien, mais un élève connecté doit y retrouver SES
  // enchaînements, y compris privés. C'est la collection qui en décide
  // (`enchainementsUtilisant` lui passe l'utilisateur), pas cette page.
  const utilisateur = await sessionCourante()

  // La règle des trois listes vit dans `voisinesDePasse` : elle se teste, et
  // elle ne se recopiera pas le jour où une autre surface en aura besoin.
  const [{ menentIci, enchainentApres, prisesApres }, { exemples, total }] = await Promise.all([
    voisinesDePasse(payload, passe),
    enchainementsUtilisant(payload, passe.id, utilisateur),
  ])

  const nomDebut = typeof debut === 'object' ? debut.nom : null
  const nomFin = typeof fin === 'object' ? fin.nom : null

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/passes">Passes</Link>
      </p>

      <header className="fiche-passe-entete">
        <h1>{passe.nom}</h1>
        {difficulte ? <span className="fiche-passe-badge label-caps">{difficulte}</span> : null}
      </header>

      {/* FR-22 : les deux positions sont cliquables vers leur fiche. */}
      <section className="fiche-chaine">
        {typeof debut === 'object' ? <MaillonPosition position={debut} role="Départ" /> : null}
        <span className="fiche-chaine__fleche" aria-hidden="true">
          →
        </span>
        {typeof fin === 'object' ? <MaillonPosition position={fin} role="Arrivée" /> : null}
      </section>

      {passe.description ? (
        <section className="fiche-section">
          <h2 className="fiche-section__titre">Description</h2>
          <p className="fiche-texte">{passe.description}</p>
        </section>
      ) : null}

      {passe.deroule ? (
        <section className="fiche-section">
          <h2 className="fiche-section__titre">Déroulé</h2>
          {/* Texte temps par temps : les sauts de ligne d'origine font sens. */}
          <p className="fiche-texte fiche-texte--deroule">{passe.deroule}</p>
        </section>
      ) : null}

      {/* FR-24 — DES EXEMPLES D'UTILISATION, pas l'inventaire. Le compteur du
          titre est le TOTAL et la précision dit ce qui est montré : cinq lignes
          sans cette phrase se liraient comme une liste complète.
          CINQ COMME LES LISTES DE VOISINAGE plus bas (2026-09-08) : la fiche ne
          fait qu'une promesse de longueur, pas deux. Voir `EXEMPLES_PAR_PASSE`. */}
      <section className="fiche-section">
        <h2 className="fiche-section__titre">
          Enchaînements qui l&apos;utilisent <span className="texte-attenue">({total})</span>
        </h2>

        {exemples.length === 0 ? (
          // NE MENTIONNE PAS CE QU'ON NE VOIT PAS. « Aucun enchaînement
          // VISIBLE » laisserait entendre qu'il en existe d'autres, ce qui est
          // exactement ce que la visibilité sert à taire (AD-6). Pour ce
          // lecteur, il n'y en a pas — c'est tout ce que la phrase doit dire.
          <p className="texte-attenue">Aucun enchaînement ne l&apos;utilise pour le moment.</p>
        ) : (
          <>
            <p className="fiche-section__precision texte-attenue">
              {total > EXEMPLES_PAR_PASSE
                ? `Les ${EXEMPLES_PAR_PASSE} plus récents : de quoi voir la passe en situation.`
                : 'Du plus récent au plus ancien.'}
            </p>

            <ul className="fiche-exemples">
              {exemples.map((enchainement) => (
                <ExempleDEnchainement
                  key={enchainement.id}
                  enchainement={enchainement}
                  passe={passe.id}
                />
              ))}
            </ul>

            {/* LE COMPTE EST DIT UNE SEULE FOIS, et c'est ici : la phrase
                au-dessus annonce ce qu'on montre, ce lien annonce ce qu'il
                reste. Même formule que la page de recherche (« Voir les 12
                enchaînements ») — deux libellés voisins pour le même geste
                seraient du bruit gratuit.
                Il ne paraît QUE s'il cache quelque chose : sous la limite, tout
                est déjà à l'écran et le lien ne mènerait qu'à la même liste. */}
            {total > EXEMPLES_PAR_PASSE ? (
              <Link className="fiche-exemples__tout" href={lienListe({ passe: passe.id })}>
                Voir les {total} enchaînements
              </Link>
            ) : null}
          </>
        )}
      </section>

      {/* CE QUI VIENT AVANT, PUIS CE QUI VIENT APRES : l'ordre de la danse, et
          celui de la flèche affichée plus haut. */}
      <ListePasses
        titre="Passes qui mènent ici"
        precision={nomDebut ? `Elles arrivent en ${nomDebut}, d'où part cette passe.` : undefined}
        vide="Aucune passe n'arrive à cette position de départ."
        passes={menentIci}
        sens="entrante"
      />

      <ListePasses
        titre="Passes qui enchaînent après"
        precision={nomFin ? `Elles partent de ${nomFin}, où cette passe amène.` : undefined}
        vide="Aucune passe ne part de cette position d'arrivée."
        passes={enchainentApres}
        sens="sortante"
      />

      <Transitions
        titre="Transitions après cette passe"
        precision={
          nomFin
            ? `Depuis ${nomFin}, changer de prise sans danser de passe — donc sans prendre de temps sur la musique.`
            : 'Changer de prise sans danser de passe, donc sans prendre de temps sur la musique.'
        }
        depuis={prisesApres}
      />
    </div>
  )
}
