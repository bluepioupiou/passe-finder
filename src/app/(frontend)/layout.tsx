import React from 'react'

import { AnalytiqueAudience } from '@/components/AnalytiqueAudience'
import { Navigation } from '@/components/Navigation'
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
        <Navigation />
        <main>{children}</main>
        <AnalytiqueAudience />
      </body>
    </html>
  )
}
