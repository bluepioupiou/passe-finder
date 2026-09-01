import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Tests UNITAIRES — fonctions pures, aucune base, aucun serveur.
 *
 * Ils n'ouvrent aucune ressource partagee : le parallelisme complet est donc
 * sans danger, et ils durent quelques millisecondes. C'est la suite qu'on peut
 * laisser tourner en `--watch` pendant qu'on code, et celle qui doit echouer en
 * premier dans la barriere qualite.
 *
 * Ce qui vit ici : le moteur de composition, la recherche, le rendu de chaine,
 * l'analytique. Ce qui n'y a PAS sa place : tout ce qui appelle `getPayload`
 * (voir vitest.int.config.mts, et la note qui y explique pourquoi).
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/**/*.spec.{ts,tsx}'],
  },
})
