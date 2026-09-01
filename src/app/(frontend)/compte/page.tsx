import React from 'react'

import { nomDepuisEmail } from '@/auteurs'
import { FormulairePseudo } from '@/components/FormulairePseudo'
import { exigerSession } from '@/porte'
import { enregistrerPseudo } from './actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mon compte — Passe Finder',
}

/**
 * Mon compte (action item `pseudo-et-page-auteur`).
 *
 * N'y figure, pour l'instant, que le PSEUDO : le nom sous lequel on apparait
 * comme auteur. Le reste du compte (mot de passe, adresse) reste du ressort de
 * Payload ; cette page ne les reprend pas tant qu'elle n'a rien de mieux a en
 * faire qu'un formulaire de plus.
 *
 * Reservee, donc passee par `exigerSession` (Story 3.5) : un anonyme est emmene
 * vers la connexion et revient ici.
 *
 * L'ADRESSE EST AFFICHEE, mais a son proprietaire seulement — c'est la seule
 * page du site ou elle apparaisse. Elle sert ici a repondre a la question que
 * pose le formulaire : « sous quel nom est-ce que j'apparais aujourd'hui ? ».
 */
export default async function MonCompte() {
  const utilisateur = await exigerSession('/compte')

  return (
    <div className="contenu-page">
      <header className="compte-entete">
        <h1>Mon compte</h1>
        <p className="texte-attenue">Connecté avec {utilisateur.email}.</p>
      </header>

      <FormulairePseudo
        action={enregistrerPseudo}
        pseudo={utilisateur.pseudo ?? ''}
        parDefaut={nomDepuisEmail(utilisateur.email)}
      />
    </div>
  )
}
