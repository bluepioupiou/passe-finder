'use client'

import React, { useState } from 'react'

import './affichage-passe.css'

type Mode = 'simple' | 'rythme'

/**
 * La bascule « Simple | Rythme » de la fiche passe (Story 8.3, FR-49).
 *
 * LA FICHE D'AVANT RESTE LA FICHE PAR DEFAUT. « Simple » est actif a chaque
 * ouverture (le choix n'est pas memorise, decision d'Alain) ; sans position
 * intermediaire (`rythme` a `null`), il n'y a meme pas de bascule — elle ne
 * menerait a rien.
 *
 * Les deux vues sont rendues par la page, cote serveur : ce composant ne fait
 * que choisir laquelle montrer. Aucune animation au changement.
 */
export function AffichagePasse({
  simple,
  rythme,
}: {
  simple: React.ReactNode
  rythme: React.ReactNode | null
}) {
  const [mode, setMode] = useState<Mode>('simple')

  if (!rythme) return <>{simple}</>

  const bouton = (cible: Mode, libelle: string) => (
    <button
      type="button"
      className="affichage-passe__choix"
      aria-pressed={mode === cible}
      onClick={() => setMode(cible)}
    >
      {libelle}
    </button>
  )

  return (
    <div className="affichage-passe">
      <div className="affichage-passe__bascule" role="group" aria-label="Affichage de la passe">
        {bouton('simple', 'Simple')}
        {bouton('rythme', 'Rythme')}
      </div>
      {mode === 'simple' ? simple : rythme}
    </div>
  )
}
