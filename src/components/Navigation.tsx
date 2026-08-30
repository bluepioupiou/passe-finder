import { headers as getHeaders } from 'next/headers.js'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import config from '@/payload.config'
import { IconeLoupe } from './Icones'
import { Logo } from './Logo'
import { MenuCreation } from './MenuCreation'
import { MenuMobile } from './MenuMobile'
import { SelecteurTheme } from './SelecteurTheme'
import './navigation.css'

/**
 * Barre de navigation globale (UX-DR4, Story 1.6).
 *
 * Gauche  : marque -> Accueil, liens de catalogue.
 * Droite  : le « + » des creations (connectes), la recherche globale, puis la
 *           zone d'actions de compte + selecteur de theme.
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
 * une fonction a venir. Meme regle pour le « + » : il n'apparait QUE pour un
 * compte connecte, plutot que de proposer une porte fermee.
 *
 * La barre lit donc la session, ce qui rend tout le site dynamique — c'etait
 * deja le cas de chaque page (`dynamic = 'force-dynamic'`), et une page mise en
 * cache montrerait de toute facon la barre du premier visiteur venu.
 */
export async function Navigation() {
  const payload = await getPayload({ config: await config })
  const { user } = await payload.auth({ headers: await getHeaders() })

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
            <Link className="nav__lien" href="/enchainements">
              Enchaînements
            </Link>
          </nav>

          {/* Le « + » et la recherche voyagent ensemble : sur grand ecran ce
              groupe est pousse a droite d'un bloc, sans que la disparition du
              « + » pour un anonyme ne deplace la loupe. */}
          <div className="nav__outils">
            {user ? <MenuCreation /> : null}

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
                  placeholder="Une position, une passe, un enchaînement…"
                />
                <button type="submit" className="nav__envoyer" aria-label="Lancer la recherche">
                  <IconeLoupe />
                </button>
              </div>
            </form>
          </div>

          <div className="nav__actions">
            <SelecteurTheme />
          </div>
        </MenuMobile>
      </div>
    </header>
  )
}
