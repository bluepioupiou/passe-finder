import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { Compositeur } from '@/components/Compositeur'
import { chargerCatalogue, vuesDuCatalogue } from '@/catalogue'
import { dateDuJour } from '@/composition'
import config from '@/payload.config'
import { exigerSession } from '@/porte'
import { VISIBILITES } from '@/visibilite'
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
  // La session est EXIGEE mais pas relue ensuite : le compositeur n'affiche
  // rien qui depende de qui compose, et c'est l'action d'enregistrement qui
  // rattachera l'enchainement a son auteur, depuis la session cote serveur.
  await exigerSession('/enchainements/nouveau')

  const payload = await getPayload({ config: await config })
  // Le catalogue entier tient en memoire (30 positions, ~110 passes, une
  // vingtaine de transitions) et se lit en trois requetes ; le compositeur n'en
  // recoit que la projection dont il a besoin (voir `vuesDuCatalogue`).
  const { positions, passes, transitions } = vuesDuCatalogue(await chargerCatalogue(payload))

  return (
    <div className="contenu-page">
      <p className="fiche-fil">
        <Link href="/enchainements">Enchaînements</Link>
      </p>

      <header className="nouveau-entete">
        <h1>Composer un enchaînement</h1>
        <p className="texte-attenue">
          Choisis une position de départ, puis enchaîne les passes proposées : seules celles qui
          partent réellement de la position courante te sont offertes. Entre deux passes, tu peux
          changer de prise sans danser — les changements possibles depuis la position d&apos;arrivée
          te sont proposés.
        </p>
      </header>

      <Compositeur
        positions={positions}
        passes={passes}
        transitions={transitions}
        dateParDefaut={dateDuJour()}
        visibilites={[...VISIBILITES]}
        enregistrer={enregistrerEnchainement}
      />
    </div>
  )
}
