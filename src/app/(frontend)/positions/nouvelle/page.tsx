import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { estAdmin } from '@/collections/acces'
import { AtelierPosition } from '@/components/AtelierPosition'
import { exigerSession } from '@/porte'
import { enregistrerSchemaPosition } from '../actions'
import '../atelier-page.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Nouvelle position — Passe Finder',
}

/**
 * Composer une nouvelle position, image comprise.
 *
 * `nouvelle` est un segment STATIQUE : Next lui donne priorite sur `[id]`, donc
 * aucune collision avec la fiche d'une position.
 *
 * PREMIERE DES TROIS GARDES, et elle ne soigne que le PARCOURS. L'action
 * reverifie de son cote, et les `access` de la collection tranchent en dernier
 * ressort (AD-3 / ADD-5). On renvoie vers la liste plutot que de montrer un
 * atelier qui refuserait d'enregistrer : une porte fermee qu'on laisse pousser
 * est pire que pas de porte du tout.
 */
export default async function NouvellePosition() {
  const utilisateur = await exigerSession('/positions/nouvelle')
  if (!estAdmin(utilisateur)) redirect('/positions')

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/positions">Positions</Link>
      </p>

      <header className="atelier-entete">
        <h1>Composer une position</h1>
        <p className="texte-attenue">
          Pose les têtes et les bras, fais-les glisser, tourne-les. Le cercle en pointillé montre ce
          que le site affichera vraiment : la vignette est toujours recadrée en rond, donc tout ce
          qui déborde sera coupé.
        </p>
      </header>

      <AtelierPosition enregistrer={enregistrerSchemaPosition} retour="/positions" />
    </div>
  )
}
