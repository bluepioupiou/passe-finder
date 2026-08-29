import Script from 'next/script'
import React from 'react'

import { beaconCloudflare } from '@/analytique'
import { CLOUDFLARE_ANALYTICS_TOKEN } from '@/env'

/**
 * Mesure d'audience Cloudflare Web Analytics (Story 1.7, FR-43, AD-15).
 *
 * Ce composant ne rend RIEN de visible : il pose le script de mesure, et rien
 * d'autre. Pas de CSS, pas d'ecran de statistiques — la consultation se fait
 * dans la console Cloudflare, jamais dans l'application (AD-15).
 *
 * POURQUOI aucune banniere de consentement : le beacon Cloudflare ne pose aucun
 * cookie et ne construit pas d'identifiant persistant de visiteur. C'est la
 * raison meme du choix d'AD-15 — mesurer la frequentation sans imposer un
 * bandeau aux eleves. Toute evolution qui ajouterait un cookie remettrait cette
 * conclusion en cause.
 *
 * POURQUOI un composant SERVEUR : le jeton est lu cote serveur au rendu (voir
 * `src/env.ts`), ce qui permet de le fournir a l'execution du conteneur plutot
 * qu'a la construction de l'image.
 *
 * Monte dans le seul layout public. Le back-office `/admin` a son propre layout
 * et reste hors mesure : c'est l'usage prive d'Alain, le compter fausserait la
 * frequentation des eleves.
 */
export function AnalytiqueAudience() {
  const beacon = beaconCloudflare(CLOUDFLARE_ANALYTICS_TOKEN)

  // Pas de jeton configure : on n'emet rien du tout (ni script, ni erreur).
  if (!beacon) return null

  // Un SEUL script par page : Cloudflare n'accepte pas plusieurs snippets.
  return (
    <Script
      strategy="afterInteractive"
      src={beacon.src}
      type={beacon.type}
      data-cf-beacon={beacon.dataCfBeacon}
    />
  )
}
