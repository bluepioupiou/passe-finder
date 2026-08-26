import Link from 'next/link'
import React from 'react'

import './bouton.css'

type Variante = 'primaire' | 'fantome'

type ProprietesCommunes = {
  /** `primaire` : sauge plein, un seul par zone d'action. `fantome` : surface + bordure. */
  variante?: Variante
  children: React.ReactNode
  className?: string
}

type ProprietesBouton = ProprietesCommunes &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined
  }

type ProprietesLien = ProprietesCommunes &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    href: string
  }

/**
 * Bouton du design system « Lin & Sauge » (UX-DR3).
 *
 * Rend un `<a>` quand `href` est fourni (navigation), un `<button>` sinon
 * (action) : la semantique suit l'usage, pas l'apparence.
 */
export function Bouton(proprietes: ProprietesBouton | ProprietesLien) {
  const { variante = 'primaire', children, className, ...reste } = proprietes
  const classes = ['bouton', `bouton--${variante}`, className].filter(Boolean).join(' ')

  if (typeof (proprietes as ProprietesLien).href === 'string') {
    const { href, ...attributsLien } = reste as React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string
    }

    // Navigation interne au site : on passe par le routeur Next (pas de
    // rechargement complet). Le back-office `/admin` est rendu par Payload :
    // un lien classique est preferable pour y entrer proprement.
    const interne = href.startsWith('/') && !href.startsWith('/admin')

    if (interne) {
      return (
        <Link className={classes} href={href} {...attributsLien}>
          {children}
        </Link>
      )
    }

    return (
      <a className={classes} href={href} {...attributsLien}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...(reste as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}
