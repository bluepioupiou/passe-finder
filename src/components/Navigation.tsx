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
 * Deux elements sont volontairement des PLACEHOLDERS, faute de story livree :
 *  - la recherche globale (page de resultats E10 : Story 5.5) ;
 *  - la zone de compte, figee sur « Se connecter » (authentification : Epic 3).
 * Ils sont presents mais desactives, plutot que de mener a une page inexistante.
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
              Catalogue
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
            <button
              type="button"
              className="bouton bouton--fantome"
              disabled
              title="La création de compte arrive avec la gestion des comptes."
            >
              Se connecter
            </button>
            <SelecteurTheme />
          </div>
        </div>
      </div>
    </header>
  )
}
