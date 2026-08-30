import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config'

/**
 * Cible des tests.
 * - Par defaut : serveur de dev local demarre par Playwright.
 * - En CI : PLAYWRIGHT_BASE_URL pointe vers le CONTENEUR de production, afin que
 *   le filet de fumee teste l'artefact reel (migrations appliquees) et pas un
 *   serveur de dev qui synchronise le schema tout seul.
 */
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL
const baseURL = externalBaseURL || 'http://localhost:3000'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /*
   * Un seul worker, partout.
   *
   * Les tests qui ont besoin d'une session ecrivent dans SQLite (creation puis
   * suppression de leur compte). Deux fichiers joues en parallele, avec en plus
   * le serveur de dev qui tient la base, se heurtent a « database is locked » :
   * un echec qui ne dit rien du produit, seulement de la machine. La suite
   * entiere tient en une vingtaine de secondes en serie — c'est moins cher
   * qu'un test qui tombe une fois sur deux.
   */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? 'list' : 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // Chromium fourni par Playwright (installe via `npx playwright install
      // chromium`). On ne fixe PAS `channel`, qui depend d'un canal externe et
      // echoue sur certaines machines.
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Aucun serveur a demarrer quand on vise une cible deja en ecoute (conteneur en CI). */
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run dev',
        reuseExistingServer: true,
        url: baseURL,
        timeout: 120_000,
      },
})
