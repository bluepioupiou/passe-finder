import Link from 'next/link'
import React from 'react'

import { IconeLoupe } from './Icones'
import { Logo } from './Logo'
import { MenuMobile } from './MenuMobile'
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
 * Sur petit ecran, tout ce bloc se replie derriere un chevron (`MenuMobile`) :
 * seule la marque reste visible tant qu'on ne l'ouvre pas.
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

        <MenuMobile>
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
            {/* Le bouton d'envoi vit DANS le champ, reduit a une loupe. La
                touche « Entrée » (ou « Rechercher » du clavier mobile, que
                `type="search"` dans un formulaire fait apparaitre) suffit a
                lancer la recherche ; la loupe reste la comme cible tactile et
                comme repere visuel de ce qu'est ce champ. */}
            <div className="nav__recherche-ligne">
              <input
                id="recherche-globale"
                name="q"
                type="search"
                className="nav__champ"
                placeholder="Une position, une passe…"
              />
              <button type="submit" className="nav__envoyer" aria-label="Lancer la recherche">
                <IconeLoupe />
              </button>
            </div>
          </form>

          <div className="nav__actions">
            <SelecteurTheme />
          </div>
        </MenuMobile>
      </div>
    </header>
  )
}
