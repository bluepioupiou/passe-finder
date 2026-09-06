import { expect, test } from '@playwright/test'

/**
 * La page d'explication et ses portes d'entree.
 *
 * CE QUI EST VERROUILLE ICI, ce sont les CHEMINS D'ACCES, pas la prose. Le
 * texte de la page changera ; l'ancre `#schemas` et les liens qui y menent, non,
 * sous peine de laisser un renvoi mort sur chaque fiche position.
 *
 * La page ne lit ni base ni session : ce test tourne donc a l'identique sur la
 * base d'Alain et sur le conteneur de CI, dont la base est vide.
 */
test.describe('Comment ça marche ?', () => {
  test('affiche les trois questions du cours et la legende des schemas', async ({ page }) => {
    await page.goto('/comment-ca-marche')

    await expect(page.locator('h1')).toHaveText('Comment ça marche ?')

    // Les trois questions sont la colonne vertebrale de la page.
    await expect(page.locator('.explication-question h3')).toHaveCount(3)
    await expect(page.getByRole('heading', { name: /qu’est-ce que je peux faire/ })).toBeVisible()

    // Les disques sont de VRAIS schemas, rendus par le moteur du site : deux
    // danseurs seuls, plus le couple.
    await expect(page.locator('.legende-danseur__dessus')).toHaveCount(2)
    await expect(page.locator('.legende-couple__vignette')).toHaveCount(1)

    // Une pastille par ligne de la liste : c'est ce qui fait tenir le renvoi.
    const pastilles = await page.locator('.legende-couple__numero').count()
    await expect(page.locator('.legende-couple__liste li')).toHaveCount(pastilles)
  })

  test('est atteignable depuis le pied de page et depuis l’accueil', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.pied').getByRole('link', { name: 'Comment ça marche ?' })).toBeVisible()

    await page.locator('.accueil-intro').getByRole('link', { name: 'Comment ça marche ?' }).click()
    await expect(page).toHaveURL(/\/comment-ca-marche$/)
  })

  test('la fiche d’une position renvoie a la legende', async ({ page }) => {
    await page.goto('/positions')

    const premiere = page.locator('a[href^="/positions/"]').first()
    // Base vide (CI) : il n'y a aucune fiche a ouvrir, et rien a verifier.
    test.skip((await premiere.count()) === 0, 'aucune position dans cette base')

    await premiere.click()
    const renvoi = page.getByRole('link', { name: 'Comment lire ce schéma ?' })
    await expect(renvoi).toHaveAttribute('href', '/comment-ca-marche#schemas')

    await renvoi.click()
    // L'ancre existe vraiment : sans la section, le lien mènerait en haut de page.
    await expect(page.locator('#schemas')).toBeVisible()
  })
})
