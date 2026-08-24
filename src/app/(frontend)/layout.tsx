import React from 'react'
import './styles.css'

export const metadata = {
  description: "Composer et partager des enchaînements de danse.",
  title: 'Passe Finder',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="fr">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
