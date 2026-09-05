'use client'

import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

import { IconePlus } from './Icones'
import './menu-creation.css'

/**
 * Le « + » de la barre de navigation : ce qu'on peut CREER (Story 4.2).
 *
 * Rendu uniquement pour un compte connecte — c'est `Navigation` qui en decide,
 * pas ce composant : la barre ne montre pas une porte fermee a qui ne peut pas
 * l'ouvrir (meme raison que la zone de compte, laissee vide tant que l'Epic 3
 * n'existe pas). Le controle reel reste cote serveur : la page de creation
 * refuse un anonyme, et les `access` de la collection refusent l'ecriture.
 *
 * Un MENU et non un lien direct : les creations a venir (proposer une position,
 * proposer une passe…) s'ajouteront ici sans reprendre la barre.
 *
 * `admin` n'est pas une regle de securite — la page `/positions/nouvelle`
 * redirige deja un non-admin et la collection refuse l'ecriture (ADD-5). Il
 * evite seulement d'offrir une entree qui se refermerait aussitot : composer
 * une position gouverne le catalogue commun, ce n'est pas encore un geste
 * d'eleve. Meme raison que le « + » absent pour un anonyme.
 */
export function MenuCreation({ admin = false }: { admin?: boolean }) {
  const [ouvert, setOuvert] = useState(false)
  const racine = useRef<HTMLDivElement>(null)

  // Un menu se ferme quand on regarde ailleurs : clic en dehors ou « Echap ».
  // Sans cela il resterait ouvert par-dessus la page, et il faudrait revenir
  // cliquer le « + » pour s'en debarrasser.
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
    <div className="menu-creation" ref={racine}>
      <button
        type="button"
        className="menu-creation__bascule"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Créer"
        title="Créer"
        onClick={() => setOuvert((etat) => !etat)}
      >
        <IconePlus />
      </button>

      {ouvert ? (
        <div className="menu-creation__panneau" role="menu">
          <Link
            className="menu-creation__item"
            role="menuitem"
            href="/enchainements/nouveau"
            onClick={() => setOuvert(false)}
          >
            Créer un enchaînement
          </Link>
          {admin ? (
            <Link
              className="menu-creation__item"
              role="menuitem"
              href="/positions/nouvelle"
              onClick={() => setOuvert(false)}
            >
              Composer une position
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
