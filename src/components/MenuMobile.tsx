'use client'

import React, { useState, useSyncExternalStore } from 'react'

import { IconeChevron } from './Icones'

/*
 * « Sommes-nous cote navigateur, JavaScript actif ? » — une donnee exterieure
 * a React, donc lue avec `useSyncExternalStore` : `false` au rendu serveur,
 * `true` une fois hydrate. Rien a surveiller, d'ou un abonnement inerte.
 */
const abonnementInerte = () => () => {}
const coteClient = () => true
const coteServeur = () => false

/**
 * Repli du contenu de la barre de navigation sur petit ecran.
 *
 * POURQUOI : sur mobile, liens + recherche + theme s'empilaient en permanence
 * et mangeaient le haut de chaque page avant le contenu. Un chevron les replie ;
 * a partir de 768px il disparait et tout reste deplie, comme aujourd'hui.
 *
 * Les enfants restent RENDUS PAR LE SERVEUR : ce composant ne fait que les
 * envelopper, il ne reimplemente ni la recherche ni les liens.
 *
 * Amelioration progressive : tant qu'on est cote serveur (ou si le navigateur
 * n'execute pas JavaScript), aucun bouton n'est rendu et `data-repli` reste
 * absent — or c'est lui seul qui autorise le CSS a masquer le panneau. Sans
 * JavaScript, la barre se comporte donc comme avant : tout deplie, utilisable.
 */
export function MenuMobile({ children }: { children: React.ReactNode }) {
  const interactif = useSyncExternalStore(abonnementInerte, coteClient, coteServeur)
  const [ouvert, setOuvert] = useState(false)

  return (
    <>
      {interactif ? (
        <button
          type="button"
          className="nav__bascule"
          aria-expanded={ouvert}
          aria-controls="nav-contenu"
          aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOuvert((etat) => !etat)}
        >
          <IconeChevron className="nav__chevron" />
        </button>
      ) : null}

      <div
        id="nav-contenu"
        className="nav__contenu"
        data-repli={interactif ? (ouvert ? 'ouvert' : 'ferme') : undefined}
      >
        {children}
      </div>
    </>
  )
}
