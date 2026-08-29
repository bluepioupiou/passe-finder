---
baseline_commit: 2400cc6049a5da6aed2c17b2ef532b81ac908dd3
---

# Story 1.2: Image Docker de production

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a développeur du projet,
I want une image Docker qui exécute le monolithe en mode production,
so that l'application est packagée de façon reproductible, prête à être déployée sur n'importe quel hôte conteneur.

## Acceptance Criteria

1. **Given** le monolithe de la Story 1.1, **When** je construis l'image via le `Dockerfile` à la racine, **Then** le build réussit et produit une image exécutable, **And** l'image contient le build de production Next.js + Payload (pas les dépendances de dev superflues).

2. **Given** l'image construite, **When** je lance le conteneur en local en lui fournissant les variables d'environnement requises, **Then** l'application sert la page d'accueil et `/admin`, **And** le conteneur lit/écrit sa base SQLite sur un chemin monté depuis un volume (pas dans la couche image éphémère).

3. **Given** une variable d'environnement requise manquante au démarrage, **When** le conteneur démarre, **Then** l'échec est explicite dans les logs (message clair sur la variable manquante), pas un plantage silencieux.

## Tasks / Subtasks

- [x] **Task 1 — Activer la sortie `standalone` de Next.js** (AC: #1)
  - [x] Ajouter `output: 'standalone'` à `nextConfig` dans `next.config.ts`. Le `Dockerfile` en dépend : le build produit alors `.next/standalone/server.js` (serveur Node autonome avec seulement les dépendances tracées), copié dans l'image finale.
  - [x] Vérifier en local que `npm run build` génère bien `.next/standalone/` et `.next/static/`.
- [x] **Task 2 — Ajouter un `.dockerignore`** (AC: #1)
  - [x] Créer `.dockerignore` à la racine pour exclure du contexte de build : `node_modules`, `.next`, `.git`, `.env` et `.env*.local`, `_bmad`, `_bmad-output`, `docs`, `images`, `passe-finder-saveDB.gz`, `*.db`, `tests`, `test-results`, `playwright-report`, `.claude`.
  - [x] Objectif : build plus rapide et surtout **ne jamais copier `.env` ni la base locale dans l'image** (sécurité + reproductibilité).
- [x] **Task 3 — Finaliser le `Dockerfile`** (AC: #1, #2)
  - [x] Gérer l'absence de dossier `public/` : le scaffold n'en a pas encore et la ligne `COPY --from=builder /app/public ./public` échouerait. Créer un `public/.gitkeep` (pour que le dossier existe) **ou** rendre la copie tolérante. Choisir l'option la plus simple et la documenter.
  - [x] Confirmer le chemin du package manager : `package-lock.json` est présent → la branche `npm ci` du `Dockerfile` s'applique. `npm ci` en conteneur doit installer les binaires natifs (voir Dev Notes : `sharp` sur Alpine/musl).
  - [x] Créer et rendre inscriptible par l'utilisateur `nextjs` (uid 1001) le **répertoire de données** du volume (ex. `/data`), puisque le conteneur tourne en utilisateur non-root. La base SQLite y vivra.
  - [x] Conserver l'image finale minimale (multi-stage déjà en place : `deps` → `builder` → `runner` ; seul le `standalone` + `static` + `public` atterrissent dans `runner`).
- [x] **Task 4 — Validation explicite des variables d'environnement au démarrage** (AC: #3)
  - [x] Garantir un **échec clair et immédiat** si `PAYLOAD_SECRET` ou `DATABASE_URI` manque au démarrage (message nommant la variable), plutôt qu'un `secret: ''` silencieux ou un plantage obscur.
  - [x] Implémenter la vérification à un seul endroit chargé au boot (ex. en tête de `src/payload.config.ts`, ou un petit module `src/env.ts` importé par la config). Ne PAS logger la valeur des secrets, seulement le nom de la variable manquante.
  - [x] Adapter `src/payload.config.ts` pour consommer la valeur validée (retirer le repli `process.env.PAYLOAD_SECRET || ''` qui masque l'absence).
- [x] **Task 5 — Documenter le run local (env + volume)** (AC: #2)
  - [x] Mettre à jour `.env.example` si besoin (le `DATABASE_URI` de prod pointera vers le volume, ex. `file:/data/passe-finder.db`).
  - [x] Documenter dans le `README.md` la commande de build et de run local du conteneur (avec `-e PAYLOAD_SECRET=…`, `-e DATABASE_URI=file:/data/passe-finder.db`, `-v <volume>:/data`, `-p 3000:3000`).
- [x] **Task 6 — Vérification (nécessite Docker installé)** (AC: #1, #2, #3)
  - [x] `docker build -t passe-finder .` réussit et produit une image exécutable.
  - [x] `docker run` avec les variables requises + un volume monté sur `/data` : `/` et `/admin` répondent (HTTP 200).
  - [x] La base SQLite est écrite dans le volume (`/data`), pas dans la couche image : après création d'un contenu puis `docker restart`/recréation du conteneur (même volume), la donnée persiste.
  - [x] Lancer le conteneur **sans** `PAYLOAD_SECRET` (ou sans `DATABASE_URI`) → log d'erreur explicite nommant la variable, arrêt propre (AC #3).

## Dev Notes

### ⚠️ Prérequis outillage : Docker
La Task 6 (vérification) exige **Docker installé et démarré** sur la machine. Au moment de la rédaction, `docker` n'est **pas disponible** dans l'environnement (`docker: command not found`). Deux options pour le dev :
1. Installer Docker Desktop (Windows) et exécuter la Task 6 réellement.
2. Si Docker n'est pas installable tout de suite : réaliser Tasks 1–5 (code + config + doc) et **différer la seule vérification runtime** (Task 6) au moment où Docker/la CI sera disponible — la Story 1.3 (pipeline) construit justement l'image en CI et pourra servir de vérification. Dans ce cas, marquer explicitement la Task 6 comme non exécutée localement (pas de fausse validation).

### État de départ (livré par la Story 1.1)
- Un `Dockerfile` **par défaut du template** existe déjà à la racine (multi-stage, base `node:24-alpine`, branches yarn/npm/pnpm). Il n'est **pas encore fonctionnel** en l'état — c'est l'objet de cette story.
- **`next.config.ts` n'a pas `output: 'standalone'`** → le `Dockerfile` (qui copie `.next/standalone`) ne peut pas encore marcher. **C'est le point n°1 à corriger.**
- **Pas de dossier `public/`** dans le repo → la ligne `COPY /app/public` échoue (Task 3).
- **Pas de `.dockerignore`** (Task 2).
- `package-lock.json` présent → branche `npm ci` du Dockerfile.
- Le script `build` = `next build` (corrigé en 1.1). La sortie standalone crée `.next/standalone/server.js`, lancé par `CMD … node server.js`.
- Variables d'env actuelles : `PAYLOAD_SECRET` et `DATABASE_URI` (voir `.env.example`). `src/payload.config.ts` fait aujourd'hui `secret: process.env.PAYLOAD_SECRET || ''` → à durcir (Task 4).

### Invariants d'architecture applicables
- **AD-12 — Instance Lightsail unique, pipeline commit → prod.** [Source: ARCHITECTURE-SPINE.md#AD-12] L'app tourne dans **un conteneur Docker** sur une instance Lightsail (VM à prix fixe, disque persistant pour SQLite). Cette story produit l'artefact conteneur ; le pipeline qui le publie/déploie est la Story 1.3.
- **AD-10 — SQLite sur volume persistant.** [Source: ARCHITECTURE-SPINE.md#AD-10] La base est un fichier SQLite sur le **disque persistant** de l'instance, **jamais** dans la couche image éphémère (sinon toute donnée disparaît au redéploiement). D'où le montage volume `-v …:/data` et `DATABASE_URI=file:/data/passe-finder.db`. La réplication continue vers S3 (Litestream) est la **Story 1.4**, pas celle-ci.
- **NFR-6 — Coût maîtrisé** [Source: ARCHITECTURE-SPINE.md#Stack]: image la plus légère raisonnable (multi-stage, `standalone`), sans sur-ingénierie.

### Détails techniques
- **`output: 'standalone'`** : option Next.js qui produit un serveur Node autonome ne contenant que les dépendances réellement tracées → image bien plus petite, pas besoin d'installer les `node_modules` complets dans l'image finale. Le `Dockerfile` copie `/.next/standalone` (le serveur), `/.next/static` (les assets) et `/public`.
- **Volume & utilisateur non-root** : l'étape `runner` crée l'utilisateur `nextjs` (uid 1001) et tourne sous cet utilisateur. Le répertoire de données du volume (`/data`) doit lui appartenir / être inscriptible (ex. `RUN mkdir -p /data && chown nextjs:nodejs /data`), sinon SQLite ne pourra pas écrire.
- **`sharp` sur Alpine (musl)** : `sharp` a besoin de son binaire natif. Sur `node:*-alpine` (musl), le template ajoute déjà `apk add --no-cache libc6-compat` à l'étape `deps` ; le binaire prébuilt `@img/sharp-linuxmusl-x64` doit être installé par `npm ci`. **Risque connu** : si le build échoue sur `sharp`, la solution robuste est de basculer la base sur `node:24-slim` (Debian, glibc) plutôt qu'Alpine. Documenter le choix retenu.
  - Note : `package.json` contient un bloc `allowScripts` (npm 11) autorisant les scripts d'install de `sharp`/`esbuild`/`unrs-resolver` ; il s'applique aussi dans le conteneur (mêmes versions).
- **Validation d'env** : préférer un échec au **chargement du module** (au `import` de la config), pour que le conteneur s'arrête tout de suite avec un message clair. Exemple d'approche : une fonction `requireEnv('PAYLOAD_SECRET')` qui `throw new Error('Variable d'environnement manquante : PAYLOAD_SECRET')` si absente/vide.
- **Port** : le Dockerfile expose `3000` et fixe `HOSTNAME=0.0.0.0` — nécessaire pour que le serveur écoute hors du conteneur.

### Périmètre — HORS de cette story
- Pipeline CI/CD, publication sur `ghcr.io`, déploiement Lightsail, tests Playwright en CI → **Story 1.3**.
- Réplication continue SQLite → S3 (Litestream) → **Story 1.4**.
- Provisionnement de l'instance Lightsail / du volume AWS lui-même → contexte déploiement (Story 1.3), pas la construction de l'image.
Rester concentré sur : **une image qui build, tourne, persiste sur volume, et échoue proprement si mal configurée.**

### Project Structure Notes
- Fichiers touchés : `next.config.ts` (ajout `output`), `Dockerfile` (finalisation), nouveau `.dockerignore`, nouveau `public/.gitkeep` (si option retenue), `src/payload.config.ts` (validation env) + éventuel `src/env.ts`, `.env.example` et `README.md` (doc).
- Ne pas réintroduire mongodb/pnpm : le projet est npm + SQLite (voir Story 1.1).

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 — Story 1.2] — énoncé, AC.
- [Source: ARCHITECTURE-SPINE.md#AD-12] — conteneur Docker sur Lightsail, pipeline commit→prod.
- [Source: ARCHITECTURE-SPINE.md#AD-10] — SQLite sur volume persistant (jamais dans l'image).
- [Source: implementation-artifacts/1-1-scaffold-du-monolithe-next-js-payload.md] — état livré : Dockerfile template, `next.config.ts` sans `output`, pas de `public/`, npm + SQLite, `allowScripts`, `secret || ''` à durcir.
- FRs de contexte : FR-40 (déployé sur AWS), FR-41 (pipeline — story suivante).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8)

### Debug Log References

**Vérification Docker complète (Task 6) — les 3 AC validés dans le conteneur :**
- `docker build -t passe-finder .` → succès. Image **1,76 Go** (node_modules complet, cf. course-correction). `sharp` sur Alpine OK (pas de bascule Debian nécessaire).
- `docker run` (volume `pf-data:/data`, `PAYLOAD_SECRET` fourni) → migrations appliquées au boot (`Migrated: 20260825_205959_init`), `GET /` et `GET /admin` → 200, premier admin créé → 200.
- **Persistance** : login OK après `docker restart` ET après **suppression + recréation** du conteneur sur le même volume (donnée survivante). Base bien dans `/data`, aucune `*.db` dans `/app`.
- **AC #3** : `docker run` sans `PAYLOAD_SECRET` → log `Error: Variable d'environnement manquante : PAYLOAD_SECRET…`, conteneur en **exit code 1**.

Vérifs locales (hors Docker) : `tsc --noEmit` 0 erreur ; `npm run test:int` 1/1 ; `npm run dev` → `/` 200 ; validation `src/env.ts` testée via `tsx` (manquant → message clair ; présent → OK).

### Completion Notes List

**Story terminée, les 3 AC vérifiés dans Docker.** (Docker a été installé en cours de story — WSL2 activé côté Windows.)

**Course-correction majeure découverte pendant la Task 6 :** l'approche initiale (Next `output: 'standalone'` + `CMD node server.js`) build et sert les pages, **mais la base reste vide en production** → `SQLITE_ERROR: no such table: users` à la première écriture. Cause : Payload/Drizzle **ne synchronise le schéma (`push`) qu'en développement** ; en production, le schéma doit être appliqué par des **migrations**. Ni `push: true` explicite ni un `next start` avec node_modules complet ne déclenchent le push en prod (vérifié en local). 

**Solution retenue :** migrations Payload.
- Migration initiale générée : `src/migrations/20260825_205959_init.ts` (+ snapshot `.json` + `index.ts`), via `npm run payload -- migrate:create init`.
- Le conteneur applique les migrations au démarrage (`docker-entrypoint.sh` : `payload migrate` **puis** `next start`).
- Conséquence : le CLI `payload` doit être présent au runtime → **abandon de `output: 'standalone'`** (image minimale sans CLI) au profit d'une image avec **node_modules complet** (`next start`). D'où la taille de 1,76 Go.
- **Workflow induit** : dev = push automatique (défaut) ; prod = migrations. Toute évolution de collection (Epics 2+) nécessitera `npm run payload -- migrate:create <nom>`. Documenté dans le code (`payload.config.ts`) et le README.

**Détail des AC :**
- **AC #1** : `Dockerfile` multi-stage `deps`/`builder`/`runner` (base `node:24-alpine`, `npm ci`). Correctif clé : **copier `.npmrc`** (`legacy-peer-deps=true`) avant `npm ci`, sinon la résolution diffère du lockfile et `npm ci` échoue (« out of sync »). Placeholder `PAYLOAD_SECRET` **en ligne** sur la commande de build (pas d'ENV secret dans l'image → warning Docker évité).
- **AC #2** : `runner` crée `/data` (chown `nextjs`), `VOLUME /data`, `ENV DATABASE_URI=file:/data/passe-finder.db`. Persistance prouvée.
- **AC #3** : `src/env.ts` (`requireEnv`) — `PAYLOAD_SECRET` obligatoire ; `src/instrumentation.ts` valide au boot ; l'entrypoint `set -e` stoppe si `payload migrate` échoue (secret manquant inclus).

**Dette / suivi :**
- **Taille d'image 1,76 Go** — élevée (node_modules complet + dev pour le CLI de migration). À optimiser (prune prod + tsx en dependency, ou stage de migration dédié). Tâche de suivi créée.
- **`push` retiré** de `payload.config.ts` (dev garde le défaut). Avant l'Epic 6 (données legacy), confirmer que le flux migrations couvre bien les évolutions de schéma.
- `sharp` sur Alpine a fonctionné — pas besoin de `node:24-slim`.

### File List

**Nouveaux fichiers :**
- `.gitattributes` — force les fins de ligne LF (scripts shell + Dockerfile), indépendamment du client git. **Correctif de revue.**
- `.dockerignore` — exclusions du contexte de build (secrets, base locale, node_modules, livrables…).
- `public/.gitkeep` — fait exister `public/` (requis par le `COPY` du Dockerfile).
- `src/env.ts` — validation des variables d'environnement (`PAYLOAD_SECRET` requis, `DATABASE_URI` défaut).
- `src/instrumentation.ts` — déclenche la validation d'env au démarrage du serveur (`register()`).
- `docker-entrypoint.sh` — migrations Payload puis démarrage Next (`set -e`).
- `src/migrations/20260825_205959_init.ts` — migration initiale (schéma `users`).
- `src/migrations/20260825_205959_init.json` — snapshot de schéma associé.
- `src/migrations/index.ts` — registre des migrations.

**Modifiés :**
- `Dockerfile` — image de prod finalisée : `node:24-alpine`, `npm ci` (avec `.npmrc`), placeholder de build en ligne, `runner` non-root avec node_modules complet, `/data` + `VOLUME`, `HEALTHCHECK`, `ENTRYPOINT` migrate+start. **(standalone abandonné)**
- `next.config.ts` — **retrait** de `output: 'standalone'` (voir course-correction).
- `src/payload.config.ts` — consomme `PAYLOAD_SECRET`/`DATABASE_URI` validés depuis `./env` ; `push` non forcé (dev = défaut, prod = migrations).
- `vitest.setup.ts` — repli `PAYLOAD_SECRET` de test si absent.
- `.env.example` — précision sur `DATABASE_URI` (défaut local vs volume `/data` en prod).
- `README.md` — section « Docker (image de production) » : build + run avec secret et volume.

> Note : `package-lock.json` inchangé (déjà cohérent) — le blocage `npm ci` venait de l'absence de `.npmrc` dans le contexte Docker, corrigée en le copiant avant `npm ci`.

### Revue de code (2026-08-25)

Revue du diff de la story : 4 constats, **3 corrigés et re-vérifiés dans Docker**, 1 reporté.

| # | Constat | Sévérité | Suite donnée |
| --- | --- | --- | --- |
| 1 | `docker-entrypoint.sh` : sans `.gitattributes` et avec `core.autocrlf=true`, un clone Windows produit des CRLF → `sh docker-entrypoint.sh` échoue (`set: illegal option -`, exit 2) et le conteneur ne démarre pas. Reproduit de bout en bout. | HIGH | **Corrigé** — `.gitattributes` (`*.sh`/`Dockerfile` en `eol=lf`). Vérifié : `git ls-files --eol` → `w/lf`. |
| 2 | `src/env.ts` : `DATABASE_URI` optionnel avec repli silencieux → une valeur vide fait écrire la base dans la couche éphémère, perte de données sans message (contraire à AD-10 et à l'AC #3 qui exige un échec explicite). | MEDIUM | **Corrigé** — valeur vide refusée ; variable requise si `NODE_ENV=production` ; défaut conservé en dev. Vérifié : `docker run -e DATABASE_URI=` → message clair, exit 1. |
| 3 | `Dockerfile` : `HEALTHCHECK` interrogeait `127.0.0.1:3000` en dur alors que l'entrypoint écoute sur `${PORT:-3000}` → conteneur `unhealthy` en permanence si `PORT` est surchargé (risque de redémarrages en boucle sur Lightsail). | MEDIUM | **Corrigé** — sonde sur `${PORT:-3000}`. Vérifié : `docker run -e PORT=8080` → état `healthy`. |
| 4 | Dérive possible entre le `push` automatique du dev et les migrations de prod : une collection ajoutée sans `migrate:create` passe tous les contrôles locaux et ne casse qu'en production (`no such table`). | LOW | **Reporté à la Story 1.3** — la CI est le bon endroit pour un garde-fou (comparaison snapshot de schéma ↔ migrations). |

Effet de bord du correctif #2 : l'étape `builder` du Dockerfile fournit désormais aussi un `DATABASE_URI` de build en ligne (le build tourne sous `NODE_ENV=production`, où la variable est devenue obligatoire).

Non-régression après correctifs : `tsc` 0 erreur ; `test:int` 1/1 ; build image OK ; `/` et `/admin` → 200 ; persistance confirmée (login OK après destruction/recréation du conteneur sur le même volume) ; `PAYLOAD_SECRET` manquant → exit 1 avec message clair.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-25 | 0.1.1 | Correctifs de revue : `.gitattributes` (fins de ligne LF — le conteneur ne démarrait plus après un clone Windows), `DATABASE_URI` requis en production et valeur vide refusée, `HEALTHCHECK` suivant `PORT`. Re-vérifiés dans Docker. | Amelia (dev agent) |
| 2026-08-25 | 0.1.0 | Image Docker de production fonctionnelle : Dockerfile multi-stage (Node 24, volume SQLite `/data`, non-root), `.dockerignore`, validation explicite des variables d'env, **migrations Payload appliquées au démarrage** (course-correction : standalone abandonné car incompatible avec le CLI de migration). Les 3 AC vérifiés dans Docker (build, run, persistance, échec explicite). Story → review. | Amelia (dev agent) |
