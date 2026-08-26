import Link from 'next/link'
import React from 'react'

import { SelecteurTheme } from '@/components/SelecteurTheme'
import './styles.css'

export const metadata = {
  description: 'Composer et partager des enchaînements de danse.',
  title: 'Passe Finder',
}

/**
 * Applique le theme choisi AVANT le premier rendu, pour eviter un bref flash
 * de theme clair chez un lecteur qui a choisi sombre. Volontairement minuscule
 * et bloquant : il s'execute avant la peinture de la page.
 */
const SCRIPT_ANTI_FLASH = `
try {
  var t = localStorage.getItem('passe-finder-theme');
  if (t === 'clair') document.documentElement.setAttribute('data-theme', 'light');
  else if (t === 'sombre') document.documentElement.setAttribute('data-theme', 'dark');
} catch (e) {}
`

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_FLASH }} />
      </head>
      <body>
        {/*
          Bandeau provisoire : il porte le selecteur de theme en attendant la
          barre de navigation complete (Story 1.6), qui l'accueillera.
        */}
        <div className="bandeau-provisoire">
          <Link className="bandeau-provisoire__marque" href="/">
            Passe Finder
          </Link>
          <SelecteurTheme />
        </div>
        <main>{children}</main>
      </body>
    </html>
  )
}
