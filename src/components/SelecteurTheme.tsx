'use client'

import React, { useEffect, useRef } from 'react'

import './selecteur-theme.css'

type Theme = 'systeme' | 'clair' | 'sombre'

/** Cle de stockage du choix de theme, partagee avec le script anti-flash. */
export const CLE_THEME = 'passe-finder-theme'

/**
 * Selecteur de theme (UX-DR2).
 *
 * Par defaut le site suit la preference du systeme d'exploitation. Le lecteur
 * peut forcer clair ou sombre : le choix pose `data-theme` sur <html>, ce que
 * les tokens interpretent en priorite sur la preference systeme.
 *
 * Le champ est volontairement NON CONTROLE : le theme est deja applique au
 * document par le script anti-flash avant l'hydratation. On se contente
 * d'aligner la valeur affichee sur l'etat reel du document, sans passer par un
 * etat React — ce qui evite a la fois un ecart d'hydratation et un rendu en
 * cascade.
 */
export function SelecteurTheme() {
  const champ = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    const applique = document.documentElement.getAttribute('data-theme')
    const valeur: Theme = applique === 'dark' ? 'sombre' : applique === 'light' ? 'clair' : 'systeme'
    if (champ.current) champ.current.value = valeur
  }, [])

  const changer = (theme: Theme) => {
    const racine = document.documentElement

    if (theme === 'systeme') racine.removeAttribute('data-theme')
    else racine.setAttribute('data-theme', theme === 'clair' ? 'light' : 'dark')

    try {
      if (theme === 'systeme') window.localStorage.removeItem(CLE_THEME)
      else window.localStorage.setItem(CLE_THEME, theme)
    } catch {
      // Stockage indisponible (navigation privee, site data bloque) :
      // le choix vaut pour la session en cours, sans casser la page.
    }
  }

  return (
    <div className="selecteur-theme">
      <label className="selecteur-theme__label label-caps" htmlFor="selecteur-theme">
        Thème
      </label>
      <select
        id="selecteur-theme"
        ref={champ}
        className="bouton bouton--fantome"
        defaultValue="systeme"
        onChange={(evenement) => changer(evenement.target.value as Theme)}
      >
        <option value="systeme">Système</option>
        <option value="clair">Clair</option>
        <option value="sombre">Sombre</option>
      </select>
    </div>
  )
}
