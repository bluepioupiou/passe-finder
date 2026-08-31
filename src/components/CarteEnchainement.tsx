import Link from 'next/link'
import React from 'react'

import type { Catalogue } from '@/catalogue'
import { chaineDe, extremites, formaterDate } from '@/enchainements'
import type { Enchainement } from '@/payload-types'

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
}: {
  enchainement: Enchainement
  catalogue: Catalogue
}) {
  const passes = chaineDe(enchainement.passes, catalogue.passes, catalogue.positions)
  const { depart, arrivee } = extremites(passes)
  const date = formaterDate(enchainement.date)
  const nombre = enchainement.passes.length

  return (
    <Link className="enchainement-carte" href={`/enchainements/${enchainement.id}`}>
      <h2 className="enchainement-titre">{enchainement.titre}</h2>

      <p className="enchainement-meta texte-attenue">
        {date ? <span className="donnee">{date}</span> : null}
        {date ? ' · ' : null}
        {nombre} passe{nombre > 1 ? 's' : ''}
      </p>

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
