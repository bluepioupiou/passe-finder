import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Tests d'INTEGRATION — vrai Payload, vrai schema, vraie base SQLite.
 *
 * Leur valeur vient precisement de ce qu'ils ne simulent rien : les trois
 * defauts reels attrapes par ce projet (visibilite privee par defaut, blocage
 * de suppression d'un element reference, regles d'acces admin) etaient tous des
 * defauts de CABLAGE, invisibles pour un test a doublures. Une doublure de
 * Payload ne teste que la fidelite de la doublure.
 *
 * DEUX REGLAGES, CHACUN POUR UN DEFAUT CONSTATE :
 *
 * 1. `fileParallelism: false` — vitest execute normalement les fichiers dans
 *    des PROCESSUS PARALLELES. Chaque fichier qui appelle `getPayload` pousse
 *    le schema dans le meme fichier SQLite : deux poussees concurrentes se
 *    verrouillent mutuellement (SQLITE_BUSY, sur une requete d'introspection de
 *    `sqlite_master`). Deux fichiers suffisaient a rendre la CI rouge de facon
 *    systematique. SQLite n'admet qu'un seul ecrivain : on serialise.
 *    Le cout est nul — ces tests durent moins d'une seconde — et il ne pese pas
 *    sur les tests unitaires, qui gardent le parallelisme complet.
 *
 * 2. `env.DATABASE_URI` — sans lui, `vitest.setup.ts` charge le `.env` du
 *    projet et les tests ecrivent DANS LA BASE DE DEVELOPPEMENT : collision
 *    avec `npm run dev` qui la tient ouverte, et fixtures de test melangees aux
 *    vraies donnees (un run interrompu y laissait son compte de test, ce qui
 *    faisait echouer le run suivant sur un email en double). `dotenv` n'ecrase
 *    jamais une variable deja definie : celle-ci gagne.
 *
 * La base de test est SUPPRIMEE avant chaque execution (cf. globalSetup) : on
 * repart d'un schema neuf, donc aucun residu ne peut faire echouer le run
 * suivant.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./vitest.int.setup.mts'],
    include: ['tests/int/**/*.int.spec.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URI: 'file:./.tmp/test.db',
    },
  },
})
