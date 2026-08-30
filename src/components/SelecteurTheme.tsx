'use client'

import React, { useSyncExternalStore } from 'react'

import { IconeLune, IconeMoitieMoitie, IconeSoleil } from './Icones'
import './selecteur-theme.css'

type Theme = 'systeme' | 'clair' | 'sombre'

/** Cle de stockage du choix de theme, partagee avec le script anti-flash. */
export const CLE_THEME = 'passe-finder-theme'

/**
 * Ordre de bascule. Trois etats seulement : on tourne en rond plutot que
 * d'ouvrir une liste, ce qui laisse un seul bouton dans la barre.
 */
const SUIVANT: Record<Theme, Theme> = { systeme: 'clair', clair: 'sombre', sombre: 'systeme' }

const LIBELLE: Record<Theme, string> = { systeme: 'Système', clair: 'Clair', sombre: 'Sombre' }

const ICONE: Record<Theme, React.ComponentType<{ className?: string }>> = {
  systeme: IconeMoitieMoitie,
  clair: IconeSoleil,
  sombre: IconeLune,
}

/*
 * Le theme ne vit PAS dans un etat React : il vit sur <html>, ou le script
 * anti-flash l'a deja pose avant l'hydratation. Le composant se contente de
 * lire ce document, via `useSyncExternalStore` — l'outil prevu pour afficher
 * une donnee exterieure a React sans risquer un ecart d'hydratation.
 */

const ecouteurs = new Set<() => void>()

function souscrire(ecouteur: () => void) {
  ecouteurs.add(ecouteur)
  return () => {
    ecouteurs.delete(ecouteur)
  }
}

function lireDocument(): Theme {
  const applique = document.documentElement.getAttribute('data-theme')
  return applique === 'dark' ? 'sombre' : applique === 'light' ? 'clair' : 'systeme'
}

/** Cote serveur il n'y a pas de document : on rend l'etat neutre, `systeme`. */
function lireServeur(): Theme {
  return 'systeme'
}

/**
 * Selecteur de theme (UX-DR2).
 *
 * Par defaut le site suit la preference du systeme d'exploitation. Le lecteur
 * peut forcer clair ou sombre : le choix pose `data-theme` sur <html>, ce que
 * les tokens interpretent en priorite sur la preference systeme.
 *
 * POURQUOI un bouton qui tourne plutot qu'une liste deroulante intitulee :
 * c'est un reglage de confort, pas une decision de contenu. Il ne doit pas
 * peser autant qu'un lien de navigation dans la barre. L'icone porte l'etat
 * courant — soleil, lune, ou cercle moitie-moitie pour « suit le systeme » —
 * et le mot « Thème » disparait : l'intitule accessible le dit deja pour qui
 * en a besoin.
 */
export function SelecteurTheme() {
  const theme = useSyncExternalStore(souscrire, lireDocument, lireServeur)

  const basculer = () => {
    const choisi = SUIVANT[theme]
    const racine = document.documentElement

    if (choisi === 'systeme') racine.removeAttribute('data-theme')
    else racine.setAttribute('data-theme', choisi === 'clair' ? 'light' : 'dark')

    try {
      if (choisi === 'systeme') window.localStorage.removeItem(CLE_THEME)
      else window.localStorage.setItem(CLE_THEME, choisi)
    } catch {
      // Stockage indisponible (navigation privee, site data bloque) :
      // le choix vaut pour la session en cours, sans casser la page.
    }

    ecouteurs.forEach((ecouteur) => ecouteur())
  }

  const Icone = ICONE[theme]
  const intitule = `Thème : ${LIBELLE[theme]}. Passer en ${LIBELLE[SUIVANT[theme]].toLowerCase()}.`

  return (
    <button
      type="button"
      className="selecteur-theme"
      onClick={basculer}
      aria-label={intitule}
      title={intitule}
    >
      <Icone />
    </button>
  )
}
