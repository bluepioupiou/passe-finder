import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { Bouton } from '@/components/Bouton'
import { Compositeur } from '@/components/Compositeur'
import { chargerCatalogue, vuesDuCatalogue } from '@/catalogue'
import { VISIBILITES } from '@/collections/Enchainement'
import { dateDuJour } from '@/composition'
import config from '@/payload.config'
import { enregistrerEnchainement } from './actions'
import './nouvel-enchainement.css'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Nouvel enchaînement — Passe Finder',
}

/**
 * Composer un enchainement (E6, Stories 4.2 / 4.3) — reserve aux connectes.
 *
 * La porte est ici, cote SERVEUR : l'absence du « + » dans la barre de
 * navigation n'est qu'un confort d'affichage, elle ne protege rien. Un anonyme
 * qui connait l'URL tombe donc sur l'invitation a se connecter, et l'action
 * d'enregistrement refuse de son cote (les deux verifient, independamment).
 *
 * Le lien de connexion renvoie vers /connexion en emportant `suite` : apres
 * s'etre connecte, on revient ICI plutot que sur l'accueil, et on reprend ce
 * qu'on etait venu faire.
 */
export default async function NouvelEnchainement() {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  if (!user) {
    return (
      <div className="contenu-page">
        <p className="fiche-fil">
          <Link href="/enchainements">Enchaînements</Link>
        </p>

        <header className="nouveau-entete">
          <h1>Composer un enchaînement</h1>
          <p className="texte-attenue">
            Composer demande un compte : c&apos;est ce compte qui devient l&apos;auteur de
            l&apos;enchaînement, et qui décide ensuite de le garder privé ou de le partager.
          </p>
        </header>

        <div className="nouveau-actions">
          <Bouton href="/connexion?suite=%2Fenchainements%2Fnouveau">Se connecter</Bouton>
          <Bouton href="/inscription?suite=%2Fenchainements%2Fnouveau" variante="fantome">
            Créer un compte
          </Bouton>
          <Bouton href="/enchainements" variante="fantome">
            Voir les enchaînements partagés
          </Bouton>
        </div>
      </div>
    )
  }

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
