'use client'

import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

import { IconeCompte } from './Icones'
import './menu-compte.css'

type Proprietes = {
  /** Affiche de qui est la session. Sert de titre au panneau. */
  email: string
  /** Le compte porte-t-il le drapeau admin ? Decide de l'entree vers /admin. */
  admin?: boolean
  /** Action serveur : la deconnexion ferme la session cote serveur, pas ici. */
  seDeconnecter: () => Promise<void>
}

/**
 * Menu de compte de la barre de navigation (UX-DR4, Story 3.2).
 *
 * Il remplace la zone laissee vide depuis la Story 1.6 : tant qu'on ne pouvait
 * pas se connecter, un bouton « Se connecter » se serait lu comme une panne.
 *
 * IL NE PROPOSE PAS DE CREER. Le « + » voisin (`MenuCreation`) est la seule
 * porte de creation. Deux entrees pour le meme geste, a quelques dizaines de
 * pixels l'une de l'autre, n'ouvrent aucun chemin de plus : elles obligent
 * seulement a choisir entre deux portes identiques.
 *
 * Meme mecanique que le « + » : fermeture au clic exterieur et a « Echap ».
 * Un menu qui reste ouvert par-dessus la page oblige a revenir cliquer la
 * bascule pour s'en debarrasser.
 *
 * « Mon compte » y mene au choix du PSEUDO — le nom sous lequel on apparait
 * comme auteur. Il vient EN PREMIER : c'est le reglage, les deux entrees
 * suivantes sont des listes.
 *
 * « Mes favoris » mene desormais a une vraie page (Story 5.1). « Mes
 * enchaînements » reste annonce comme A VENIR plutot que pose en lien mort :
 * sa destination arrive a la Story 5.2, et un lien qui mene a une page vide se
 * lit comme un defaut.
 *
 * « Back-office » n'apparait qu'aux administrateurs, en avant-dernier : c'est
 * une porte de service, elle ne doit pas se lire avant les entrees ordinaires.
 */
export function MenuCompte({ email, admin = false, seDeconnecter }: Proprietes) {
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
            href="/compte"
            onClick={() => setOuvert(false)}
          >
            Mon compte
          </Link>

          <Link
            className="menu-compte__item"
            role="menuitem"
            href="/favoris"
            onClick={() => setOuvert(false)}
          >
            Mes favoris
          </Link>

          <p className="menu-compte__avenir texte-attenue">Mes enchaînements : bientôt.</p>

          {/* LE BACK-OFFICE, pour les administrateurs seulement (demande
              d'Alain, 2026-09-01) : /admin leur etait accessible mais ne
              s'atteignait qu'en tapant l'adresse a la main.

              N'AFFICHER LE LIEN QU'AUX ADMINISTRATEURS N'EST QU'UN CONFORT :
              c'est `access.admin` de la collection users qui ferme reellement
              la porte (ADD-5), et un compte ordinaire qui connaitrait l'URL est
              refuse de la meme facon qu'avant. Le cacher evite seulement de
              proposer a un eleve une porte qui se refermera sur lui.

              Un `Link` ordinaire suffit, malgre le changement d'univers :
              /admin vit sous une AUTRE mise en page racine (celle de Payload,
              qui pose son propre `html`), et Next bascule alors de lui-meme en
              chargement de page complet plutot qu'en navigation cote client. */}
          {admin ? (
            <Link
              className="menu-compte__item"
              role="menuitem"
              href="/admin"
              onClick={() => setOuvert(false)}
            >
              Back-office
            </Link>
          ) : null}

          {/* Un FORMULAIRE, pas un lien : la deconnexion change l'etat du
              serveur, elle ne doit pas partir sur une simple visite d'URL
              (prechargement, robot d'indexation, bouton « precedent »). */}
          <form action={seDeconnecter}>
            <button
              type="submit"
              className="menu-compte__item menu-compte__item--action"
              role="menuitem"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
