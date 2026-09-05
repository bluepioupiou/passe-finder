import Link from 'next/link'
import React from 'react'

import type { Catalogue } from '@/catalogue'
import { chaineDe, extremites, formaterDate } from '@/enchainements'
import { presenterMusique } from '@/musique'
import { presenterVideo } from '@/video'
import { libelleVisibilite } from '@/visibilite'
import type { Enchainement } from '@/payload-types'
import { IconeNote, IconeVideo } from './Icones'

/**
 * Carte d'un enchainement dans une grille (Stories 5.1 / 5.4).
 *
 * Extraite parce que DEUX pages la rendent maintenant — la liste des
 * enchainements et celle des favoris — et qu'une carte recopiee derive : le
 * jour ou l'ordre des informations change d'un cote, l'autre reste en arriere,
 * et la grille perd le rythme commun qui la rend balayable.
 *
 * Meme ordre que les cartes Position et Passe : le titre d'abord, car c'est lui
 * qu'on cherche des yeux quand la grille se reduit a la frappe. Puis le trajet,
 * puis la description coupee a quelques lignes.
 */
export function CarteEnchainement({
  enchainement,
  catalogue,
  auteur,
  montrerVisibilite = false,
}: {
  enchainement: Enchainement
  catalogue: Catalogue
  /**
   * Nom d'affichage deja reduit (`nomsDesAuteurs`), jamais l'adresse ni l'objet
   * `User` : ce qui n'arrive pas jusqu'ici ne peut pas fuir dans le HTML.
   * `null` quand on ne sait pas — la ligne disparait alors.
   */
  auteur?: string | null
  /**
   * Porter le badge de visibilite (Story 5.2).
   *
   * FAUX PARTOUT AILLEURS, ET C'EST LE POINT. Dans la liste publique, tout ce
   * qu'on voit est public ou a soi : un badge y serait du bruit sur toutes les
   * cartes sauf une. Sur « mes enchainements », la question « qui voit
   * celui-ci ? » est au contraire la premiere qu'on se pose en balayant la
   * grille — c'est la seule page ou les trois visibilites cohabitent.
   */
  montrerVisibilite?: boolean
}) {
  const passes = chaineDe(enchainement.passes, catalogue.passes, catalogue.positions)
  const { depart, arrivee } = extremites(passes)
  const date = formaterDate(enchainement.date)
  const nombre = enchainement.passes.length
  const musique = presenterMusique(enchainement.musique)
  const video = presenterVideo(enchainement.urlVideo)
  // Le public ne porte pas de badge : c'est le cas ordinaire, et le signaler
  // sur chaque carte reviendrait a ne plus rien signaler. Meme regle que la
  // fiche.
  const visibilite =
    montrerVisibilite && enchainement.visibilite !== 'public'
      ? libelleVisibilite(enchainement.visibilite)
      : null

  return (
    // L'IDENTIFIANT PUBLIC, jamais le numero de ligne : c'est la seule adresse
    // que le site sert (action item `identifiant-opaque-et-visibilites`).
    <Link className="enchainement-carte" href={`/enchainements/${enchainement.idPublic}`}>
      <div className="enchainement-ligne-titre">
        <h2 className="enchainement-titre">{enchainement.titre}</h2>
        {visibilite ? (
          <span className="enchainement-badge label-caps">{visibilite}</span>
        ) : null}
      </div>

      <p className="enchainement-meta texte-attenue">
        {date ? <span className="donnee">{date}</span> : null}
        {date ? ' · ' : null}
        {nombre} passe{nombre > 1 ? 's' : ''}
        {/* JUSTE LES ICONES, a la suite de la date et du nombre de passes :
            dans une grille, ce qu'on veut savoir c'est « celui-ci en a une ».
            Le morceau lui-meme se lit sur la fiche — l'ecrire ici (« Ecouter
            sur Spotify »…) allongeait la ligne sans rien apprendre d'utile au
            balayage.
            L'intitule reste, invisible, pour les lecteurs d'ecran : ici l'icone
            EST l'information, contrairement a celles qui accompagnent un bouton
            deja nomme (UX-DR17). */}
        {musique ? (
          <span className="enchainement-media">
            {' · '}
            <IconeNote taille={14} />
            <span className="enchainement-media__intitule">Avec musique</span>
          </span>
        ) : null}

        {video ? (
          <span className="enchainement-media">
            {' · '}
            <IconeVideo taille={14} />
            <span className="enchainement-media__intitule">Avec vidéo</span>
          </span>
        ) : null}
      </p>

      {/* L'auteur sur SA PROPRE LIGNE, sous la date et les marqueurs : dans une
          grille, c'est une information de second rang — on cherche d'abord un
          titre, on regarde ensuite qui l'a ecrit. */}
      {auteur ? <p className="enchainement-auteur texte-attenue">par {auteur}</p> : null}

      {depart && arrivee ? (
        <p className="enchainement-trajet texte-attenue">
          {depart.nom} <span className="enchainement-fleche">→</span> {arrivee.nom}
        </p>
      ) : null}

      {enchainement.description ? (
        <p className="enchainement-description texte-attenue texte-coupe">
          {enchainement.description}
        </p>
      ) : null}
    </Link>
  )
}
