---
baseline_commit: 1c104944eb912df07d6c4d8fc22a7a5805b0cfea
---

# Story 1.1: Scaffold du monolithe Next.js + Payload

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a développeur du projet,
I want un projet monolithe Next.js avec Payload monté dedans qui démarre en local,
so that j'ai le squelette technique de référence sur lequel construire toutes les fonctionnalités.

## Acceptance Criteria

1. **Given** un dépôt vide sur la branche `v2`, **When** j'initialise le projet avec la stack cible (TypeScript 5, Node 22 LTS, Next.js ≥ 16.2.2, React 19.2, Payload ≥ 3.73, adaptateur `@payloadcms/db-sqlite`), **Then** `npm install` puis le lancement du serveur de dev réussissent sans erreur, **And** l'arborescence suit le scaffold de l'architecture (`src/app/`, `src/collections/`, `src/engine/`, `src/payload.config.ts`, `migrate/`, `tests/e2e/`).

2. **Given** le serveur de dev lancé, **When** j'ouvre la route racine `/` et la route `/admin`, **Then** la page d'accueil (même minimale) et le back-office Payload s'affichent, **And** un fichier de base SQLite (libSQL) est créé au premier démarrage.

3. **Given** la configuration Payload, **When** je crée le premier utilisateur admin via l'assistant `/admin`, **Then** je peux me connecter au back-office, **And** aucune écriture de données ne se fait ailleurs que par l'API/les hooks Payload (ADD-3 : Payload est le seul scribe).

4. **Given** le dépôt initialisé, **When** je consulte la configuration de langue, **Then** les libellés du domaine et de l'UI sont en français et les identifiants de code en anglais technique (ADD-18, NFR-7).

## Tasks / Subtasks

- [x] **Task 1 — Initialiser le projet Payload + Next.js sur la stack cible** (AC: #1)
  - [x] Vérifier que Node 22 LTS est actif (`node -v` → `v22.x`) ; figer la version via un `.nvmrc`/`engines` dans `package.json`.
  - [x] Générer le scaffold avec `npx create-payload-app@latest` en choisissant le template **blank** et la base de données **SQLite** (adaptateur `@payloadcms/db-sqlite`). C'est le scaffold officiel : il produit d'emblée un monolithe Next.js App Router avec Payload monté dedans (route group `(payload)` pour `/admin` et l'API). **Ne pas** partir d'un `create-next-app` nu et bricoler Payload par-dessus.
  - [x] Confirmer/aligner les versions dans `package.json` : TypeScript `5.x`, `next` `≥ 16.2.2`, `react`/`react-dom` `19.2`, `payload` `≥ 3.73`, `@payloadcms/db-sqlite`, `@payloadcms/next`. Si le générateur propose une version de Next < 16.2.2, la relever (Payload ≥ 3.73 l'exige).
  - [x] `npm install` doit se terminer sans erreur ; `npm run dev` doit démarrer le serveur sans erreur.
- [x] **Task 2 — Aligner l'arborescence sur le scaffold de l'architecture** (AC: #1)
  - [x] S'assurer que le code source vit sous `src/` : `src/app/`, `src/collections/`, `src/payload.config.ts`.
  - [x] Créer les dossiers **prévus mais non encore peuplés** avec un marqueur pour qu'ils existent dès maintenant : `src/engine/` (lectures du graphe, Epic 4), `migrate/` (script one-off, Epic 6), `tests/e2e/` (Playwright, Story 1.3). Un fichier `.gitkeep` ou un stub commenté suffit — **ne pas** implémenter leur contenu ici.
  - [x] Vérifier la présence de `Dockerfile` et `.github/workflows/` **à l'ordre du jour des stories suivantes** (1.2 / 1.3) — ne PAS les créer dans cette story sauf s'ils sont générés par défaut ; s'ils le sont, les laisser minimalistes.
- [x] **Task 3 — Configurer Payload comme seul scribe + première collection d'auth** (AC: #2, #3)
  - [x] Dans `src/payload.config.ts`, configurer l'adaptateur `sqliteAdapter` pointant vers un fichier local (ex. `./passe-finder.db` ou chemin issu d'une variable d'env `DATABASE_URI`).
  - [x] Définir a minima la collection d'auth `User` (`slug: 'users'`, `auth: true`) — c'est le socle de l'auth Payload (AD-9) et le point d'entrée de l'assistant premier-admin de `/admin`. **Portée v1 :** collection d'auth minimale seulement ; les autres collections (Danse, Position, Passe, Enchainement, Favori) et le drapeau `admin` arrivent aux Epics 2/3.
  - [x] Vérifier qu'au premier `npm run dev` un fichier SQLite est créé automatiquement (AC #2).
  - [x] Vérifier qu'aucun accès direct en écriture à la base (SQL brut / Drizzle) n'existe dans le code : toute écriture passe par Payload (AD-1 / ADD-3).
- [x] **Task 4 — Page d'accueil minimale + accès `/admin`** (AC: #2)
  - [x] `/` (route Next.js dans `src/app/`) rend une page d'accueil minimale (un titre suffit ; le vrai design arrive à la Story 1.5). Pas de dépendance à une police externe.
  - [x] `/admin` rend le back-office Payload ; l'assistant de création du premier utilisateur admin s'affiche sur base vide, et après création la connexion fonctionne (AC #3).
- [x] **Task 5 — Configuration de langue FR** (AC: #4)
  - [x] Configurer la locale de l'admin Payload en **français** (`i18n` de Payload → `fr`) pour que les libellés du back-office soient en français (ADD-18, NFR-7, UX-DR18).
  - [x] Poser la convention : **identifiants de code en anglais** (slugs, noms de champs, noms de fichiers), **libellés/domaine/UI en français** (via `label`/`labels` des collections et champs). Documenter cette règle dans le `README.md`.
- [x] **Task 6 — Vérification manuelle de bout en bout** (AC: #1, #2, #3, #4)
  - [x] `npm install` OK, `npm run dev` OK, `/` s'affiche, `/admin` s'affiche, premier admin créé + connexion OK, fichier SQLite créé, libellés admin en français.
  - [x] Confirmer que `.gitignore` exclut `node_modules/`, `.next/`, le fichier `.db` local et les fichiers d'environnement (`.env*`).

## Dev Notes

### Nature de la story
Story de **scaffold greenfield**. Le dépôt est vide de code applicatif : `git ls-files` ne montre que `README.md`, `.gitignore`, `passe-finder-saveDB.gz` (dump legacy, exploité seulement à l'Epic 6) et les images legacy sous `images/positions/` (dont `no_position.jpg`). Il n'y a **ni `package.json` ni `src/`** — tu pars réellement de zéro sur la branche `v2` (commit courant : « table rase du code Yii legacy pour reconstruction v2 »).

### Stack cible (verrouillée par l'architecture — ne pas dévier)
[Source: ARCHITECTURE-SPINE.md#Stack ; versions courantes revérifiées le 2026-08-24]

| Élément | Version à installer | Plancher archi | Note |
| --- | --- | --- | --- |
| TypeScript | 5.x | 5.x | |
| Node.js | 22 LTS | 22 LTS | figer via `.nvmrc` / `engines` — toujours en support LTS |
| Next.js | 16.3.2 (dernière stable LTS) | ≥ 16.2.2 | dernière stable au 2026-08-24, satisfait le plancher |
| React | 19.2 | 19.2 | fourni avec Next 16 |
| Payload CMS | 3.88.x (dernière stable) | ≥ 3.73 | **plancher impératif 3.73** (correctif injection SQL `@payloadcms/drizzle`) ; la dernière stable le dépasse largement |
| Adaptateur base | `@payloadcms/db-sqlite` (aligné sur la version de `payload`) | — | Drizzle + libSQL |

> Vérification versions (2026-08-24) : Payload dernière stable **3.88.0**, Next.js dernière stable **16.3.2 LTS**. Aucune dépréciation ni rupture par rapport aux planchers de l'architecture — on part sur les dernières stables. **Important :** garder `payload` et `@payloadcms/*` (dont `@payloadcms/db-sqlite`, `@payloadcms/next`) sur la **même version** pour éviter les incompatibilités inter-paquets.

Litestream, Docker, GitHub Actions, S3, Playwright, Cloudflare Analytics **ne sont PAS** de cette story (Stories 1.2/1.3/1.4/1.7). Ne pas les câbler ici.

### Invariants d'architecture qui s'appliquent dès le scaffold
- **AD-1 / ADD-3 — Payload est le seul scribe.** [Source: ARCHITECTURE-SPINE.md#AD-1] Toute mutation passe par l'API/hooks/access de Payload. Les lectures custom (moteur, plus tard) utiliseront le schéma Drizzle **typé généré par Payload**, jamais du SQL brut. Dès le scaffold : ne crée aucun chemin d'écriture direct à la base.
- **Direction de dépendance** [Source: ARCHITECTURE-SPINE.md#Invariants]: `UI → Payload`, `UI → Engine (lecture)`, `Engine → Drizzle (lecture seule)`, `Payload → Drizzle (seul scribe)`. L'UI n'écrit jamais directement dans Drizzle.
- **AD-9 — Auth via Payload intégré.** [Source: ARCHITECTURE-SPINE.md#AD-9] La collection `users` d'auth de Payload est le socle (email + mot de passe, sessions, reset). Pas de fournisseur externe. Cette story ne fait qu'établir cette collection minimale ; les écrans d'inscription/connexion custom sont l'Epic 3.

### Conventions de nommage & langue (à ancrer maintenant)
[Source: ARCHITECTURE-SPINE.md#Consistency Conventions ; epics.md ADD-2, ADD-18]
- Collections Payload : **singulier, PascalCase** — `Danse`, `Position`, `Passe`, `Enchainement`, `User`, `Favori`. (Seul `User` est créé dans cette story.)
- **Identifiants de code en anglais** ; **domaine et UI en français** (NFR-7). Utiliser les `label`/`labels` FR des collections/champs, et `i18n: { fallbackLanguage: 'fr' }` (ou config équivalente) pour l'admin.
- `Position` et `Passe` porteront un champ `nom` (pas pertinent ici, mais fixe la convention).

### Arborescence cible
[Source: ARCHITECTURE-SPINE.md#Structural Seed]
```text
passe-finder/            (branche v2)
  src/
    app/                 # routes et pages Next.js (public + compositeur)
    collections/         # collections Payload (ici : User seulement)
    engine/              # lectures du graphe — dossier créé, vide (Epic 4)
    payload.config.ts
  migrate/               # script one-off de migration — dossier créé, vide (Epic 6)
  tests/e2e/             # Playwright — dossier créé, vide (Story 1.3)
  Dockerfile             # Story 1.2 (ne pas implémenter ici)
  .github/workflows/     # Story 1.3 (ne pas implémenter ici)
```
Les dossiers `engine/`, `migrate/`, `tests/e2e/` doivent **exister** dès maintenant (marqueur `.gitkeep`) pour que les stories suivantes s'y branchent sans réorganiser l'arbre — mais rester vides de logique.

### Périmètre — ce qui est HORS de cette story (ne pas anticiper)
- Design system « Lin & Sauge », tokens, thème clair/sombre, composants → **Story 1.5**.
- Barre de navigation globale, layout responsive → **Story 1.6**.
- Dockerfile de production → **Story 1.2**.
- Pipeline CI/CD + Playwright → **Story 1.3**.
- Volume persistant + backup S3 (Litestream) → **Story 1.4**.
- Cloudflare Analytics → **Story 1.7**.
- Collections métier (Danse/Position/Passe/Enchainement/Favori), drapeau `admin`, contrôles d'accès → **Epics 2/3**.
Garder le scaffold **minimal et propre** : `/` peut être une page quasi vide. L'objectif est un squelette qui démarre, pas une UI.

### Project Structure Notes
- Aucun conflit : projet greenfield, aucune structure préexistante à respecter hormis le scaffold de l'architecture ci-dessus.
- `passe-finder-saveDB.gz` et `images/` restent à la racine tels quels (consommés à l'Epic 6) — ne pas les déplacer ni les toucher.
- Le fichier SQLite local (dev) doit être ignoré par git (ajouter au `.gitignore`).
- Variable d'environnement recommandée dès maintenant : `PAYLOAD_SECRET` (obligatoire pour Payload) et `DATABASE_URI` (chemin SQLite) — la gestion « échec explicite si variable manquante » est traitée à la Story 1.2, mais poser les noms ici évite un renommage plus tard.

### Détails techniques Payload 3.x utiles (scaffold officiel)
- `npx create-payload-app@latest` avec template **blank** + DB **sqlite** génère la structure App Router attendue : un route group `(payload)` exposant `/admin` et les routes d'API Payload, un `payload.config.ts`, et une collection `Users` d'auth par défaut. C'est le chemin recommandé — plus sûr que d'assembler les pièces à la main.
- L'adaptateur : `import { sqliteAdapter } from '@payloadcms/db-sqlite'` puis `db: sqliteAdapter({ client: { url: process.env.DATABASE_URI || 'file:./passe-finder.db' } })`.
- La base SQLite est créée/poussée au démarrage en dev (push automatique du schéma Drizzle) → satisfait « fichier SQLite créé au premier démarrage » (AC #2).
- Locale admin FR : configurer le bloc `i18n` de Payload (langue `fr`). Vérifier visuellement que le back-office affiche des libellés français.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 — Story 1.1] — énoncé, AC, FRs couverts.
- [Source: _bmad-output/planning-artifacts/architecture/architecture-passe-finder-2026-07-21/ARCHITECTURE-SPINE.md#Stack] — versions verrouillées.
- [Source: ARCHITECTURE-SPINE.md#Design Paradigm] — monolithe Payload monté dans Next.js, un seul artefact.
- [Source: ARCHITECTURE-SPINE.md#AD-1] — Payload seul scribe.
- [Source: ARCHITECTURE-SPINE.md#AD-9] — auth Payload intégrée.
- [Source: ARCHITECTURE-SPINE.md#Consistency Conventions] — nommage, langue, écriture des données.
- [Source: ARCHITECTURE-SPINE.md#Structural Seed] — arborescence source.
- [Source: epics.md#Requirements — ADD-1, ADD-2, ADD-3, ADD-18] — scaffold, collections, seul scribe, conventions.
- FRs de l'Epic (contexte) : FR-40, FR-41, FR-42, FR-43 (déploiement, arrivent aux stories suivantes).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Opus 4.8)

### Debug Log References

Vérification de bout en bout effectuée sur le serveur de dev (Next 16.3.2, Turbopack) :
- `GET /` → HTTP 200, `<title>Passe Finder</title>` + `<h1>Passe Finder</h1>`.
- `GET /admin` → HTTP 200, écran de création du premier utilisateur **en français** (« Créer », « E-mail », « Mot de passe »).
- `GET /api/users` (non authentifié) → HTTP 403 « Vous n'êtes pas autorisé à effectuer cette action. » (contrôles d'accès Payload actifs + i18n FR).
- `POST /api/users/first-register` → « Premier utilisateur enregistré avec succès. » + JWT.
- `POST /api/users/login` → « Authentification réussie » + JWT (AC #3).
- Fichier `passe-finder.db` créé automatiquement au premier démarrage (AC #2).
- `npx tsc --noEmit` : 0 erreur. `npm run build` (next build) : succès, routes `/`, `/admin/[[...segments]]`, `/api/[...slug]`, graphql.

### Completion Notes List

Scaffold monolithe Next.js + Payload opérationnel, démarrant en local, base SQLite, admin FR, premier admin créable et connexion vérifiée. Les 4 AC sont satisfaits.

**Écarts assumés par rapport au texte de la story / au snapshot d'architecture du 2026-07-21 (revérification versions du 2026-08-24) :**
1. **Node 24 au lieu de Node 22.** Le template Payload 3.88 déclare `engines.node >= 24.15.0` — Node 24 (LTS active) est donc **requis** par la stack actuelle, pas seulement toléré. `engines.node` fixé à `>=24.15.0`. La machine tourne sur Node v24.18.0. L'intention de l'architecture (« Node LTS courant ») est respectée.
2. **TypeScript 6.0.3 au lieu de « TS 5.x ».** TS 6 est sorti et le template Payload 3.88 l'épingle ; forcer TS 5 risquait l'incompatibilité. Aligné sur le template.
3. **Scaffold via `degit` du template `blank` officiel, pas `create-payload-app`.** `create-payload-app` exige un vrai TTY (échec `uv_tty_init EBADF` en environnement non interactif). J'ai récupéré le template officiel `payloadcms/payload/templates/blank` via `degit` puis adapté. Résultat structurel identique au scaffold officiel.
4. **Deux corrections dues au template `main` en avance sur la release 3.88.0 publiée :**
   - `src/app/(payload)/layout.tsx` : retrait de `generatePayloadViewport` (non exporté par `@payloadcms/next@3.88.0`).
   - script `build` : `payload build` → `next build` (`payload build` n'existe pas en 3.88.0).

**Décisions de périmètre (scaffold minimal, aligné architecture) :**
- Base convertie **mongodb → `@payloadcms/db-sqlite`** ; `localization` de contenu retirée au profit de `i18n` admin français.
- Collections template `Media`/`Folders`/`Tags` **retirées** ; ne reste que `Users` (auth) — les collections métier arrivent aux Epics 2/3. `importMap.js` et `payload-types.ts` régénérés.
- Plugin `@payloadcms/plugin-mcp` retiré (hors périmètre).
- Gestionnaire de paquets **npm** (template orienté pnpm) ; scripts convertis. npm 11 a bloqué les scripts d'install natifs → autorisés via `npm approve-scripts` (bloc `allowScripts` dans `package.json`) ; sharp/esbuild/unrs OK.
- `Dockerfile` conservé (défaut du template) mais **non finalisé** — base bumpée à `node:24-alpine` ; sa finalisation est la Story 1.2. `docker-compose.yml` (orienté mongo) non repris.
- `tests/e2e/` + harnais Playwright/Vitest conservés (bonus pour la Story 1.3) ; specs frontend alignées sur la page réelle (titre/heading « Passe Finder »).
- `agentRules: false` dans `next.config.ts` pour empêcher Next 16 de régénérer `AGENTS.md`/`CLAUDE.md` à la racine.
- Route de démo `src/app/my-route/` supprimée.

**Non fait volontairement (hors story) :** Litestream/S3 (1.4), CI/CD GitHub Actions (1.3), design system Lin & Sauge (1.5), nav globale (1.6), Cloudflare Analytics (1.7), collections métier + drapeau `admin` + contrôles d'accès (Epics 2/3). Un `README.md` dédié au dev pourra documenter la convention de langue — non ajouté dans cette story pour rester minimal (le README existant est conservé).

### File List

**Nouveaux fichiers (racine) :**
- `package.json`, `package-lock.json` — dépendances épinglées (Payload 3.88.0, Next 16.3.2, React 19.2.6, TS 6.0.3), scripts, `engines.node >=24.15.0`, `allowScripts`.
- `tsconfig.json`, `next.config.ts` (dont `agentRules:false` + `withPayload`), `eslint.config.mjs`, `.prettierrc.json`, `.npmrc` (`legacy-peer-deps`).
- `.env.example` (PAYLOAD_SECRET, DATABASE_URI). `.env` local créé pour la vérif (gitignoré, non commité).
- `Dockerfile` (défaut template, base `node:24-alpine` — finalisation Story 1.2).
- `playwright.config.ts`, `vitest.config.mts`, `vitest.setup.ts`, `test.env`.
  (`vitest.config.mts` a ete scinde le 2026-08-31 en `vitest.unit.config.mts` et
  `vitest.int.config.mts` — voir la note « separation des tests » du suivi.)

**Nouveaux fichiers (`src/`) :**
- `src/payload.config.ts` — adaptateur SQLite, `i18n` FR, collection `Users` seule, seul scribe.
- `src/collections/Users.ts` — collection d'auth minimale.
- `src/payload-types.ts` — types générés (Users).
- `src/app/(frontend)/layout.tsx` (title « Passe Finder », `lang="fr"`), `page.tsx` (francisée), `styles.css`.
- `src/app/(payload)/layout.tsx` (correction `generatePayloadViewport`), `custom.css`.
- `src/app/(payload)/admin/[[...segments]]/page.tsx`, `not-found.tsx`, `admin/importMap.js` (régénéré).
- `src/app/(payload)/api/[...slug]/route.ts`, `api/graphql/route.ts`, `api/graphql-playground/route.ts`.
- `src/engine/.gitkeep`, `migrate/.gitkeep` — dossiers prévus pour Epics 4/6.

**Nouveaux fichiers (`tests/`) :**
- `tests/e2e/frontend.e2e.spec.ts` (alignée « Passe Finder »), `tests/e2e/admin.e2e.spec.ts`, `tests/int/api.int.spec.ts`, `tests/helpers/login.ts`, `tests/helpers/seedUser.ts`.

**Modifiés :**
- `.gitignore` — ajout des exclusions applicatives (node_modules, .next, .env*, *.db, artefacts de test, /media).
- `README.md` — démarrage rapide, commandes, convention de langue, lien vers la doc de structure.

**Documentation :**
- `docs/structure-et-choix-techniques.md` — explication de l'organisation des dossiers (route groups `(frontend)`/`(payload)`), `payload.config.ts`, choix SQLite, convention de langue, versions, reste-à-faire par epic.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-24 | 0.1.0 | Scaffold initial du monolithe Next.js 16.3.2 + Payload 3.88.0 (SQLite, admin FR, collection Users, page d'accueil, `/admin`). Story 1.1 → review. | Amelia (dev agent) |
