import { describe, expect, it } from 'vitest'

import { SRC_BEACON_CLOUDFLARE, beaconCloudflare } from '@/analytique'

/**
 * Mesure d'audience (Story 1.7).
 *
 * Ce qui compte ici tient en deux garde-fous :
 *  - sans jeton, RIEN n'est emis (AC #4) : ni script, ni erreur. C'est ce qui
 *    permet au dev local, a la CI et au test de fumee de tourner sans appeler
 *    un tiers.
 *  - avec jeton, l'option `spa` est TOUJOURS presente (AC #2) : sans elle,
 *    seule la premiere page d'une visite serait comptee et le KPI
 *    visiteurs/jour serait faux a la baisse, sans que rien ne le signale.
 */
describe('beaconCloudflare', () => {
  it("n'emet rien quand le jeton n'est pas configure", () => {
    expect(beaconCloudflare(undefined)).toBeNull()
  })

  it("n'emet rien quand le jeton est vide ou blanc", () => {
    expect(beaconCloudflare('')).toBeNull()
    expect(beaconCloudflare('   ')).toBeNull()
  })

  it('emet le script officiel de Cloudflare quand un jeton est configure', () => {
    const beacon = beaconCloudflare('jeton-de-test')

    expect(beacon).not.toBeNull()
    expect(beacon?.src).toBe(SRC_BEACON_CLOUDFLARE)
    // Meme type que le snippet officiel de Cloudflare.
    expect(beacon?.type).toBe('module')
  })

  it('porte le jeton et active le suivi des navigations internes', () => {
    const beacon = beaconCloudflare('jeton-de-test')

    expect(JSON.parse(beacon!.dataCfBeacon)).toEqual({ spa: true, token: 'jeton-de-test' })
  })

  it('ignore les espaces autour du jeton', () => {
    const beacon = beaconCloudflare('  jeton-de-test  ')

    expect(JSON.parse(beacon!.dataCfBeacon).token).toBe('jeton-de-test')
  })
})
