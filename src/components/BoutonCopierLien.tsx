'use client'

import React, { useEffect, useState } from 'react'

import './bouton-copier-lien.css'

/**
 * « Copier le lien » (Story 5.2).
 *
 * L'ADRESSE SE FABRIQUE DANS LE NAVIGATEUR, a partir du chemin. Le serveur ne
 * connait pas de facon fiable l'origine sous laquelle la page est servie
 * (localhost en developpement, le domaine en production, et un proxy entre les
 * deux) : un lien construit cote serveur se retrouverait a pointer vers
 * `http://localhost:3000` dans un message WhatsApp. `location.origin` est la
 * seule source qui ne peut pas se tromper — c'est litteralement l'adresse par
 * laquelle la personne est arrivee.
 *
 * POURQUOI CE BOUTON EXISTE ICI. Un enchainement NON REPERTORIE ne se retrouve
 * ni dans la liste ni dans la recherche : son lien EST sa seule adresse (voir
 * `src/visibilite.ts`). Sans ce geste, la seule facon de le transmettre serait
 * de l'ouvrir et de recopier la barre d'adresse — le modele de partage
 * demanderait un detour a chaque envoi.
 *
 * LA CONFIRMATION S'EFFACE au bout de quelques secondes : elle dit « c'est
 * fait », elle n'a pas a rester en place jusqu'au prochain clic.
 *
 * L'ECHEC EST DIT, PAS AVALE. `navigator.clipboard` n'existe pas partout (vieux
 * navigateur, page servie en http hors localhost) et peut etre refuse par
 * l'utilisateur. Le bouton affiche alors l'adresse a recopier a la main plutot
 * que de ne rien faire — un bouton qui ne repond pas se lit comme une panne.
 */
export function BoutonCopierLien({ chemin }: { chemin: string }) {
  const [etat, setEtat] = useState<'repos' | 'copie'>('repos')
  const [aRecopier, setARecopier] = useState<string | null>(null)

  useEffect(() => {
    if (etat !== 'copie') return

    const minuterie = setTimeout(() => setEtat('repos'), 2500)
    return () => clearTimeout(minuterie)
  }, [etat])

  const copier = async () => {
    const adresse = new URL(chemin, window.location.origin).href

    try {
      await navigator.clipboard.writeText(adresse)
      setARecopier(null)
      setEtat('copie')
    } catch {
      setARecopier(adresse)
      setEtat('repos')
    }
  }

  return (
    <span className="copier-lien">
      <button type="button" className="action-discrete" onClick={copier}>
        {etat === 'copie' ? 'Lien copié' : 'Copier le lien'}
      </button>

      {/* `role="status"` et non `alert` : c'est une confirmation, pas un
          probleme. Un lecteur d'ecran l'annonce sans interrompre. */}
      <span className="copier-lien__annonce" role="status">
        {etat === 'copie' ? 'Lien copié dans le presse-papiers.' : ''}
      </span>

      {aRecopier ? (
        <span className="copier-lien__repli">
          Copie impossible ici. L’adresse : <code>{aRecopier}</code>
        </span>
      ) : null}
    </span>
  )
}
