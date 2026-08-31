'use client'

import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

import { IconeCompte } from './Icones'
import './menu-compte.css'

type Proprietes = {
  /** Affiche de qui est la session. Sert de titre au panneau. */
  email: string
  /** Action serveur : la deconnexion ferme la session cote serveur, pas ici. */
  seDeconnecter: () => Promise<void>
}

/**
 * Menu de compte de la barre de navigation (UX-DR4, Story 3.2).
 *
 * Il remplace la zone laissee vide depuis la Story 1.6 : tant qu'on ne pouvait
 * pas se connecter, un bouton « Se connecter » se serait lu comme une panne.
 *
 * Meme mecanique que le « + » (`MenuCreation`) : fermeture au clic exterieur et
 * a « Echap ». Un menu qui reste ouvert par-dessus la page oblige a revenir
 * cliquer la bascule pour s'en debarrasser.
 *
 * « Mes enchaînements » et « Mes favoris » sont annonces comme A VENIR plutot
 * que poses en liens morts : leurs destinations arrivent a l'Epic 5, et un lien
 * qui mene a une page vide se lit comme un defaut.
 */
export function MenuCompte({ email, seDeconnecter }: Proprietes) {
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ouvert) return

    const auClic = (evenement: MouseEvent) => {
      if (!racine.current?.contains(evenement.target as Node)) setOuvert(false)
    }
    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === 'Escape') setOuvert(false)
    }

    document.addEventListener('mousedown', auClic)
    document.addEventListener('keydown', auClavier)
    return () => {
      document.removeEventListener('mousedown', auClic)
      document.removeEventListener('keydown', auClavier)
    }
  }, [ouvert])

  return (
    <div className="menu-compte" ref={racine}>
      <button
        type="button"
        className="menu-compte__bascule"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Mon compte"
        title="Mon compte"
        onClick={() => setOuvert((etat) => !etat)}
      >
        <IconeCompte />
      </button>

      {ouvert ? (
        <div className="menu-compte__panneau" role="menu">
          <p className="menu-compte__identite texte-attenue">{email}</p>

          <Link
            className="menu-compte__item"
            role="menuitem"
            href="/enchainements/nouveau"
            onClick={() => setOuvert(false)}
          >
            Créer un enchaînement
          </Link>

          <p className="menu-compte__avenir texte-attenue">Mes enchaînements et mes favoris : bientôt.</p>

          {/* Un FORMULAIRE, pas un lien : la deconnexion change l'etat du
              serveur, elle ne doit pas partir sur une simple visite d'URL
              (prechargement, robot d'indexation, bouton « precedent »). */}
          <form action={seDeconnecter}>
            <button type="submit" className="menu-compte__item menu-compte__item--action" role="menuitem">
              Se déconnecter
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
