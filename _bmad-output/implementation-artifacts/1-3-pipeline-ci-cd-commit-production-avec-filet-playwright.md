---
baseline_commit: 6f4adc8903a144165c227383fd15bb2fb9756d3b
---

# Story 1.3: Pipeline CI/CD commit → production avec filet Playwright

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Alain (mainteneur),
I want qu'un push sur ma branche construise, teste et publie automatiquement l'image de l'application,
so that je livre en continu et j'apprends une chaîne de déploiement moderne (jalon technique M-3).

## ⚠️ Portée réduite décidée avec Alain (2026-08-25)

L'AC #1 d'origine couvrait **jusqu'au déploiement sur Lightsail**. Décision prise :

- **DANS cette story** : build de l'image, tests automatisés bloquants, publication sur `ghcr.io`.
- **REPORTÉ à une story dédiée** : récupération de l'image par l'instance Lightsail + redémarrage du conteneur (l'instance AWS n'est pas encore provisionnée).
- **Branche de déclenchement** : `v2` (et `main`) pendant la reconstruction ; bascule sur `main` seul à la fusion.

Conséquence assumée : à l'issue de cette story, **FR-41 n'est que partiellement couvert** (commit → image publiée, pas encore commit → prod). Le jalon M-3 reste ouvert jusqu'à la story de déploiement.

## Acceptance Criteria

1. **Given** un dépôt configuré avec GitHub Actions, **When** je pousse un commit sur `v2` (ou `main`), **Then** le workflow construit l'image Docker et la publie sur `ghcr.io` avec un tag immuable (SHA) et un tag mobile (`latest`), **And** aucune intervention manuelle n'est nécessaire (FR-41 partiel, ADD-14).

2. **Given** le pipeline en cours d'exécution, **When** l'étape de tests s'exécute avant la publication, **Then** un test Playwright de fumée (la page d'accueil se charge et affiche le contenu attendu) doit passer (ADD-15), **And** si le test de fumée échoue, la publication est bloquée (pas de diffusion d'une régression).

3. **Given** le risque de dérive de schéma identifié en revue de la Story 1.2, **When** une collection évolue sans migration correspondante, **Then** le pipeline échoue avant publication (le filet de fumée s'exécute contre l'**image de production migrée**, où l'absence de migration provoque `no such table`).

4. **Given** l'architecture v1, **When** j'examine le pipeline, **Then** il n'existe pas d'environnement de staging séparé (simplicité assumée, AD-13), **And** le harnais Playwright est en place dans `tests/e2e/` pour que les epics suivants y ajoutent leurs scénarios.

## Tasks / Subtasks

- [x] **Task 1 — Corriger `playwright.config.ts` (bloquant pour toute exécution CI)** (AC: #2, #4)
  - [x] Remplacer `command: 'pnpm dev'` par la commande **npm** (`npm run dev`) — le projet n'utilise pas pnpm ; en l'état les tests E2E ne peuvent pas démarrer de serveur.
  - [x] Rendre l'URL cible configurable : `baseURL` = `process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'`, afin de pouvoir viser **le conteneur** en CI plutôt qu'un serveur de dev local.
  - [x] Ne démarrer le `webServer` que si `PLAYWRIGHT_BASE_URL` n'est pas fourni (sinon on teste une cible déjà en écoute).
  - [x] Choisir un `reporter` adapté à la CI (ex. `list` quand `process.env.CI`, `html` en local).
- [x] **Task 2 — Écrire le test de fumée exécuté contre l'image de production** (AC: #2, #3)
  - [x] Créer `tests/e2e/smoke.e2e.spec.ts`, conçu pour tourner contre **n'importe quelle base URL** (donc contre le conteneur).
  - [x] Vérifier : (a) `/` se charge et affiche le contenu attendu (titre/heading « Passe Finder ») ; (b) `/admin` répond 200 ; (c) **une écriture en base réussit** via `POST /api/users/first-register` — c'est ce point qui transforme le test en garde-fou de migration (AC #3), car sans migration appliquée la réponse est une 500 `no such table`.
  - [x] Utiliser des chemins relatifs (`page.goto('/')`) grâce au `baseURL`, jamais d'URL en dur.
  - [x] Adapter `tests/e2e/frontend.e2e.spec.ts` aux chemins relatifs. **Ne pas** inclure `admin.e2e.spec.ts` dans le run CI-contre-conteneur : il sème son utilisateur via l'API Local de Payload (base locale), incompatible avec une cible distante — documenter cette limite.
- [x] **Task 3 — Workflow GitHub Actions : job qualité** (AC: #2)
  - [x] Créer `.github/workflows/ci.yml`, déclenché sur `push` (branches `v2`, `main`) et sur `pull_request`.
  - [x] Job `qualite` : checkout, `actions/setup-node` (Node 24, cache npm), `npm ci`, puis **typecheck** (`npx tsc --noEmit`), **lint** (`npm run lint`) et **tests d'intégration** (`npm run test:int`).
  - [x] Fournir `PAYLOAD_SECRET` de test au job (les tests chargent `src/env.ts`) — via une valeur factice d'environnement, jamais un secret réel.
- [x] **Task 4 — Workflow : job image (build → test de fumée → publication)** (AC: #1, #2, #3)
  - [x] Job `image`, dépendant du job `qualite` (`needs`), qui **construit l'image une seule fois** puis la teste avant toute publication.
  - [x] Démarrer le conteneur avec un `PAYLOAD_SECRET` de test et un volume, attendre qu'il réponde, puis exécuter le test de fumée avec `PLAYWRIGHT_BASE_URL` pointant dessus (`npx playwright install --with-deps chromium` requis).
  - [x] **Publier sur `ghcr.io` uniquement si les tests passent ET s'il s'agit d'un `push` sur `v2`/`main`** (jamais sur une pull request).
  - [x] Authentification GHCR via le `GITHUB_TOKEN` intégré (`permissions: packages: write`), sans secret à créer manuellement. Nom d'image en minuscules : `ghcr.io/bluepioupiou/passe-finder`.
  - [x] Taguer avec le **SHA du commit** (immuable, ce que le futur déploiement épinglera) **et** `latest`.
  - [x] En cas d'échec, récupérer les logs du conteneur pour le diagnostic.
- [x] **Task 5 — Documentation** (AC: #1, #4)
  - [x] Documenter le pipeline dans `docs/structure-et-choix-techniques.md` (ou le README) : ce qui tourne à chaque push, ce qui bloque la publication, où atterrit l'image, et **ce qui reste à faire pour le déploiement**.
  - [x] Rappeler la règle des migrations (toute évolution de collection ⇒ `npm run payload -- migrate:create`), puisque la CI l'impose désormais.
- [x] **Task 6 — Vérification** (AC: #1, #2, #3, #4)
  - [x] Valider la syntaxe YAML du workflow avant de pousser.
  - [x] Rejouer **localement** la séquence exacte du job image (build → run conteneur → test de fumée contre le conteneur) pour prouver que le filet fonctionne.
  - [x] Prouver le garde-fou de l'AC #3 : sur une image dont les migrations ne couvrent pas le schéma, le test de fumée doit **échouer** (démontrer, puis rétablir).
  - [ ] Après push, vérifier l'exécution réelle du workflow sur GitHub et la présence de l'image publiée dans `ghcr.io`.

## Dev Notes

### État de départ vérifié
- **Remote** : `https://github.com/bluepioupiou/passe-finder.git` → GitHub Actions et `ghcr.io` sont disponibles sans service tiers.
- **Aucun `.github/`** dans le dépôt : tout est à créer.
- **`gh` CLI absent** de la machine → la vérification post-push se fait via l'interface web GitHub (ou installation de `gh`).
- Branches : `main` et `v2` (travail en cours sur `v2`).
- **Bug préexistant à corriger (Task 1)** : `playwright.config.ts` déclare `webServer.command: 'pnpm dev'` alors que le projet est en **npm** (héritage du template Payload). En CI comme en local, Playwright ne pourrait pas démarrer le serveur.
- `playwright.config.ts` définit déjà `forbidOnly`, `retries: 2` et `workers: 1` quand `process.env.CI` — GitHub Actions positionne `CI=true` automatiquement.
- Les specs existantes utilisent des URL en dur (`page.goto('http://localhost:3000')`) → à passer en relatif via `baseURL`.

### Acquis de la Story 1.2 sur lesquels s'appuyer
- L'image se construit avec `docker build -t passe-finder .` et démarre via `docker-entrypoint.sh` : **migrations Payload puis `next start`**.
- Variables au runtime : `PAYLOAD_SECRET` **obligatoire** (échec explicite + exit 1 sinon) ; `DATABASE_URI` **obligatoire en production**, valeur vide refusée — l'image fournit `file:/data/passe-finder.db` par défaut.
- La base vit sur le volume `/data` ; le conteneur tourne en utilisateur non-root `nextjs`.
- `HEALTHCHECK` interroge `${PORT:-3000}` — utilisable en CI pour attendre la disponibilité (`docker inspect --format '{{.State.Health.Status}}'`).
- `.gitattributes` force les fins de ligne LF : **indispensable** pour que le runner Linux exécute `docker-entrypoint.sh`.
- Taille d'image ~1,76 Go → prévoir le **cache de build GitHub Actions** (`type=gha`) pour éviter des CI interminables.

### Pourquoi tester contre l'image plutôt que contre `npm run dev`
C'est le cœur de la valeur de cette story, et ce qui règle le constat n°4 de la revue 1.2 :
- En **développement**, Payload synchronise le schéma tout seul (`push`) → un oubli de migration passe inaperçu.
- En **production**, seules les migrations créent les tables.
- Donc un test de fumée exécuté contre `npm run dev` **ne détecterait jamais** une migration manquante, alors qu'un test exécuté contre le conteneur la révèle immédiatement (`no such table`). Le filet doit viser l'artefact réel qui partira en production.

### Invariants d'architecture applicables
- **AD-12** [Source: ARCHITECTURE-SPINE.md#AD-12] : pipeline `push` → GitHub Actions build → `ghcr.io` → (à venir) pull + redémarrage sur Lightsail. Aucun geste manuel.
- **AD-13** [Source: ARCHITECTURE-SPINE.md#AD-13] : Playwright s'exécute en local **et dans la CI avant le déploiement** ; **pas de staging séparé** en v1.
- **NFR-6** : rester dans le gratuit — GitHub Actions et `ghcr.io` sont gratuits pour un dépôt public ; surveiller les minutes si le dépôt devient privé.

### Détails techniques
- **Authentification GHCR** : utiliser le `GITHUB_TOKEN` fourni automatiquement avec `permissions: { contents: read, packages: write }` — aucun secret à créer. Le nom de l'image doit être **entièrement en minuscules**.
- **Build + test + push sans reconstruire deux fois** : construire avec `docker/build-push-action` en `load: true` (image disponible localement pour les tests), puis pousser dans une étape ultérieure conditionnée à la réussite — ou construire avec `docker build` classique puis `docker push`. Privilégier la lisibilité pour un débutant.
- **Attendre le conteneur** : boucler sur le `HEALTHCHECK` ou sur une requête HTTP, avec un délai maximal ; ne jamais utiliser un `sleep` fixe qui rend la CI instable.
- **Condition de publication** : `if: github.event_name == 'push'` (exclut les pull requests venant de forks, qui n'ont de toute façon pas les droits d'écriture sur les packages).
- **Playwright en CI** : `npx playwright install --with-deps chromium` est nécessaire ; la config demande le canal `chromium`.

### Périmètre — HORS de cette story
- **Déploiement Lightsail** (provisionnement de l'instance, secrets SSH, pull + restart côté serveur) → **story dédiée à créer**.
- Réplication SQLite → S3 / Litestream → Story 1.4.
- Optimisation de la taille d'image (1,76 Go) → tâche de suivi déjà enregistrée.
- Tests E2E fonctionnels au-delà du fumée (parcours catalogue, compositeur) → Epics 2+.

### Project Structure Notes
- Nouveau : `.github/workflows/ci.yml`, `tests/e2e/smoke.e2e.spec.ts`.
- Modifiés : `playwright.config.ts`, `tests/e2e/frontend.e2e.spec.ts`, documentation.
- Ne pas toucher au `Dockerfile` ni à `docker-entrypoint.sh` (validés en 1.2) sauf nécessité démontrée.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 — Story 1.3] — énoncé et AC d'origine.
- [Source: ARCHITECTURE-SPINE.md#AD-12] — pipeline commit → prod, ghcr.io.
- [Source: ARCHITECTURE-SPINE.md#AD-13] — Playwright avant déploiement, pas de staging.
- [Source: implementation-artifacts/1-2-image-docker-de-production.md] — contrat de l'image (entrypoint, variables, volume, healthcheck) et constat n°4 de la revue (dérive de migration) que l'AC #3 vient couvrir.
- FRs : FR-40, FR-41 (partiel), FR-42.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

**Sequence du job image rejouee localement (identique a la CI) :**
- `docker build` -> image OK ; `docker run` + attente -> pret en 6 s.
- Test de fumee contre le conteneur : **3/3 passes**, puis **rejoue une 2e fois sur le meme conteneur : 3/3** (preuve d'idempotence, indispensable car la CI reessaie 2 fois).

**Preuve du garde-fou de migration (AC #3) — contre-epreuve :**
- Conteneur demarre en court-circuitant l'entrypoint (donc **sans** `payload migrate`), puis meme test de fumee :
  - `la page d'accueil se charge` -> passe
  - `le back-office repond` -> passe
  - `la base repond (garde-fou des migrations)` -> **echoue**, `Expected: 401 / Received: 500`, exit 1, avec le message indiquant de lancer `migrate:create`.
- Enseignement : `/admin` repond 200 **meme sans schema** — une sonde de base etait donc reellement necessaire, l'AC #3 n'aurait pas ete couvert autrement.

**Choix de la sonde de base (valide empiriquement) :**

| Situation | `POST /api/users/login` (identifiants invalides) |
| --- | --- |
| migrations appliquees | **401** (Payload a interroge la table `users`) |
| migrations absentes | **500** (`SQLITE_ERROR: no such table: users`) |

**Job qualite rejoue localement :** `npx tsc --noEmit` -> 0 erreur ; `npm run lint` -> 0 erreur (5 warnings preexistants) ; `npm run test:int` -> 1/1.

**Validation du workflow :** YAML parse sans erreur ; declencheurs `push` sur `[v2, main]` + `pull_request` ; publication correctement conditionnee a `github.event_name == 'push'`.

### Completion Notes List

**Tasks 1 a 5 terminees. Task 6 verifiee localement, SAUF sa derniere sous-tache** (execution reelle du workflow sur GitHub + presence de l'image sur `ghcr.io`), qui exige un `git push` — non effectue, Alain ne l'ayant pas demande. **Aucune execution reelle du pipeline n'est donc revendiquee** ; la story reste `in-progress` jusqu'a cette verification.

**Portee** : conformement a la decision d'Alain, cette story s'arrete a la **publication de l'image**. Le deploiement Lightsail fait l'objet d'une story dediee (FR-41 partiellement couvert).

**Deux bugs preexistants corriges au passage (sans quoi aucun test E2E n'aurait pu tourner) :**
1. `playwright.config.ts` lancait `pnpm dev` alors que le projet est en **npm** (heritage du template Payload).
2. Le projet Playwright imposait `channel: 'chromium'`, qui **echoue sur la machine d'Alain** (`browserType.launch: spawn UNKNOWN`). Diagnostic isole : `chromium.launch()` fonctionne, `chromium.launch({ channel: 'chromium' })` echoue. Retire au profit du Chromium fourni par Playwright — plus portable, fonctionne en local et en CI.

**Erreur de conception corrigee en cours de route :** la premiere version de la sonde de base utilisait `POST /api/users/first-register`, qui **ne fonctionne qu'une seule fois** (403 ensuite). Le test passait au premier run puis echouait au second — inacceptable avec `retries: 2` en CI. Remplacee par la sonde de login idempotente ci-dessus.

**Decisions d'implementation :**
- **Build unique** : l'image est construite une seule fois (`load: true`), testee, puis poussee avec `docker push`. Pas de second build, donc pas de risque de publier un artefact different de celui qui a ete teste.
- **Tests contre le conteneur, pas contre `npm run dev`** : c'est ce qui rend le garde-fou de migration possible (le dev synchronise le schema tout seul et masquerait le probleme).
- **Aucun secret a creer** : l'authentification `ghcr.io` utilise le `GITHUB_TOKEN` integre (`permissions: packages: write`).
- **Deux etiquettes** : SHA du commit (immuable, ce que le futur deploiement epinglera) et `latest`.
- **Pas de publication depuis une pull request** (`if: github.event_name == 'push'`).
- `admin.e2e.spec.ts` reste **hors** du run CI-contre-conteneur : il seme son utilisateur via l'API Local de Payload (base locale), incompatible avec une cible distante. Limite documentee dans la story.

**Reste a faire apres le push :** verifier l'execution du workflow dans l'onglet Actions de GitHub et la presence de l'image sur `ghcr.io/bluepioupiou/passe-finder`. Prevoir que le **premier run sera lent** (image ~1,76 Go, cache GHA a constituer).

### File List

**Nouveaux fichiers :**
- `.github/workflows/ci.yml` — pipeline : job `qualite` (types, lint, tests d'integration) puis job `image` (build unique, test de fumee contre le conteneur, publication conditionnelle sur `ghcr.io`).
- `tests/e2e/smoke.e2e.spec.ts` — test de fumee executable contre n'importe quelle base URL ; porte le garde-fou de migration.

**Modifies :**
- `playwright.config.ts` — `pnpm dev` -> `npm run dev` ; `baseURL` pilotable par `PLAYWRIGHT_BASE_URL` ; `webServer` desactive quand une cible externe est fournie ; reporter `list` en CI ; retrait de `channel: 'chromium'`.
- `tests/e2e/frontend.e2e.spec.ts` — chemins relatifs via `baseURL` ; suppression du code mort (variable `page` inutilisee).
- `docs/structure-et-choix-techniques.md` — nouvelle section sur la CI (ce qui tourne, ce qui bloque, la regle des migrations, ce qui reste a automatiser).
- `README.md` — section « Integration continue ».
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — statut de la story.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-26 | 0.1.0 | Pipeline CI GitHub Actions : qualite (types/lint/tests) puis build de l'image, test de fumee **contre le conteneur** et publication sur `ghcr.io`. Garde-fou de migration prouve par contre-epreuve. Correction de deux bugs Playwright preexistants (`pnpm dev`, `channel: chromium`). Deploiement Lightsail hors perimetre (decision d'Alain). Verification reelle sur GitHub en attente d'un push. | Amelia (dev agent) |
