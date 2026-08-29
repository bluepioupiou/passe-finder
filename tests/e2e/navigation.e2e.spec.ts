import { expect, test } from '@playwright/test'

/**
 * Marque de la barre de navigation (logo + nom).
 *
 * Le logo est decoratif (`aria-hidden`) : le nom accessible du lien vient du
 * TEXTE a cote. Ce test verrouille ce point precis — si quelqu'un remplace un
 * jour le texte par le seul logo, le lien deviendrait muet pour un lecteur
 * d'ecran, et rien d'autre ne le signalerait.
 */
test.describe('Barre de navigation', () => {
  test("la marque affiche le logo et reste nommee pour les lecteurs d'ecran", async ({ page }) => {
    await page.goto('/')

    const marque = page.getByRole('link', { name: 'Passe Finder' })
    await expect(marque).toBeVisible()

    // Le logo est bien la, et bien masque aux technologies d'assistance.
    const logo = marque.locator('svg')
    await expect(logo).toHaveAttribute('aria-hidden', 'true')
  })

  test("l'icone d'onglet est declaree et servie", async ({ page, request }) => {
    await page.goto('/')

    const icone = page.locator('link[rel="icon"]')
    await expect(icone).toHaveAttribute('type', 'image/svg+xml')

    const href = await icone.getAttribute('href')
    expect(href).toBeTruthy()
    expect((await request.get(href!)).status()).toBe(200)
  })
})
