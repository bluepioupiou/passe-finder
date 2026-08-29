import Link from 'next/link'
import React from 'react'

import { Bouton } from './Bouton'
import { Logo } from './Logo'
import { SelecteurTheme } from './SelecteurTheme'
import './navigation.css'

/**
 * Barre de navigation globale (UX-DR4, Story 1.6).
 *
 * Gauche  : marque -> Accueil, liens de catalogue, recherche globale.
 * Droite  : zone d'actions de compte + selecteur de theme.
 *
 * La recherche est un simple formulaire GET vers /recherche : elle fonctionne
 * sans JavaScript, la requete vit dans l'URL (donc partageable et rechargeable),
 * et ce composant reste rendu cote serveur.
 *
 * La zone de compte est vide en attendant l'authentification (Epic 3) : un
 * bouton « Se connecter » desactive se lisait comme une panne plutot que comme
 * une fonction a venir.
 */
export function Navigation() {
  return (
    <header className="nav">
      <div className="nav__barre">
        <Link className="nav__marque" href="/">
          <Logo className="nav__logo" />
          Passe Finder
        </Link>

        <div className="nav__contenu">
          <nav className="nav__liens" aria-label="Navigation principale">
            <Link className="nav__lien" href="/positions">
              Positions
            </Link>
            <Link className="nav__lien" href="/passes">
              Passes
            </Link>
          </nav>

          <form className="nav__recherche" action="/recherche" role="search">
            <label className="nav__recherche-label" htmlFor="recherche-globale">
              Rechercher
            </label>
            <div className="nav__recherche-ligne">
              <input
                id="recherche-globale"
                name="q"
                type="search"
                className="nav__champ"
                placeholder="Une position, une passe…"
              />
              {/* Bouton explicite plutot que de compter sur la seule touche
                  Entree : c'est la cible tactile sur mobile, et la fonction
                  reste visible pour qui ne devine pas le raccourci. */}
              <Bouton type="submit" variante="fantome" className="nav__envoyer">
                Chercher
              </Bouton>
            </div>
          </form>

          <div className="nav__actions">
            <SelecteurTheme />
          </div>
        </div>
      </div>
    </header>
  )
}
