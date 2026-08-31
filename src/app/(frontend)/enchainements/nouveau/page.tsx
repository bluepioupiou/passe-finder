import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { Compositeur } from '@/components/Compositeur'
import { chargerCatalogue, vuesDuCatalogue } from '@/catalogue'
import { VISIBILITES } from '@/collections/Enchainement'
import { dateDuJour } from '@/composition'
import config from '@/payload.config'
import { estAdmin } from '@/collections/acces'
import { exigerSession } from '@/porte'
import { enregistrerEnchainement } from './actions'
import './nouvel-enchainement.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Nouvel enchaînement — Passe Finder',
}

/**
 * Composer un enchainement (E6, Stories 4.2 / 4.3) — reserve aux connectes.
 *
 * La porte passe par `exigerSession` (Story 3.5) : c'est le contrat commun,
 * pas une regle propre a cette page. Un anonyme est donc EMMENE vers la
 * connexion, avec le chemin d'ou il vient, plutot que de tomber sur une page
 * d'invitation qui lui demandait un clic de plus pour la meme chose.
 *
 * Cette porte soigne le parcours, elle ne le securise pas : l'action
 * d'enregistrement verifie de son cote, et les `access` de la collection
 * decident en dernier ressort (ADD-5). Les trois verifient, independamment.
 */
export default async function NouvelEnchainement() {
  const utilisateur = await exigerSession('/enchainements/nouveau')

  // GEL TEMPORAIRE (2026-08-31) : creation reservee aux administrateurs. On
  // renvoie vers la liste plutot que de montrer un compositeur qui refuserait
  // d'enregistrer — une porte fermee qu'on laisse pousser est pire que pas de
  // porte du tout. Voir `peutCreerEnchainement` pour rouvrir.
  if (!estAdmin(utilisateur)) redirect('/enchainements')

  const payload = await getPayload({ config: await config })
  // Le catalogue entier tient en memoire (30 positions, ~110 passes) et se lit
  // en deux requetes ; le compositeur n'en recoit que la projection dont il a
  // besoin (voir `vuesDuCatalogue`).
  const { positions, passes } = vuesDuCatalogue(await chargerCatalogue(payload))

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/enchainements">Enchaînements</Link>
      </p>

      <header className="nouveau-entete">
        <h1>Composer un enchaînement</h1>
        <p className="texte-attenue">
          Choisis une position de départ, puis enchaîne les passes proposées : seules celles qui
          partent réellement de la position courante te sont offertes.
        </p>
      </header>

      <Compositeur
        positions={positions}
        passes={passes}
        dateParDefaut={dateDuJour()}
        visibilites={[...VISIBILITES]}
        enregistrer={enregistrerEnchainement}
      />
    </div>
  )
}
