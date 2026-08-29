'use client'

import Link from 'next/link'
import React, { useId, useState } from 'react'

import { SelecteurTheme } from './SelecteurTheme'
import './navigation.css'

/**
 * Barre de navigation globale (UX-DR4, Story 1.6).
 *
 * Gauche  : marque -> Accueil, lien Catalogue, recherche globale.
 * Droite  : zone d'actions de compte + selecteur de theme.
 * Mobile  : les entrees se replient derriere un bouton « Menu » (NFR-1).
 *
 * La recherche globale reste un PLACEHOLDER desactive, faute de page de
 * resultats (E10 : Story 5.5) — la recherche par nom du catalogue, elle, est
 * livree sur les pages Positions et Passes (Story 5.4).
 * La zone de compte est vide en attendant l'authentification (Epic 3).
 */
export function Navigation() {
  const [deplie, setDeplie] = useState(false)
  const idMenu = useId()

  return (
    <header className="nav">
      <div className="nav__barre">
        <Link className="nav__marque" href="/" onClick={() => setDeplie(false)}>
          Passe Finder
        </Link>

        <button
          type="button"
          className="nav__bascule bouton bouton--fantome"
          aria-expanded={deplie}
          aria-controls={idMenu}
          onClick={() => setDeplie((ouvert) => !ouvert)}
        >
          {deplie ? 'Fermer' : 'Menu'}
        </button>

        <div
          id={idMenu}
          className={['nav__contenu', deplie ? 'nav__contenu--deplie' : ''].filter(Boolean).join(' ')}
        >
          <nav className="nav__liens" aria-label="Navigation principale">
            <Link className="nav__lien" href="/positions" onClick={() => setDeplie(false)}>
              Positions
            </Link>
            <Link className="nav__lien" href="/passes" onClick={() => setDeplie(false)}>
              Passes
            </Link>
          </nav>

          <div className="nav__recherche">
            <label className="nav__recherche-label" htmlFor="recherche-globale">
              Rechercher
            </label>
            <input
              id="recherche-globale"
              type="search"
              className="nav__champ"
              placeholder="Recherche — bientôt disponible"
              disabled
              title="La recherche arrive avec la page de résultats."
            />
          </div>

          <div className="nav__actions">
            {/* Zone de compte volontairement vide : le bouton « Se connecter »
                reviendra avec l'authentification (Epic 3). Un bouton desactive
                laissait croire a une panne plutot qu'a une fonction a venir. */}
            <SelecteurTheme />
          </div>
        </div>
      </div>
    </header>
  )
}
