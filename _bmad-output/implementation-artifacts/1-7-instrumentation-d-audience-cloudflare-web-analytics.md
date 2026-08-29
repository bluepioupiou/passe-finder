---
baseline_commit: ddbe9bcd8364f3e210583153a2fba2e17b2a0fb5
---

# Story 1.7: Instrumentation d'audience (Cloudflare Web Analytics)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Alain,
I want mesurer la fréquentation du site,
so that je peux suivre l'usage réel (KPI : visiteurs/jour) sans construire de tableau de bord (M-2).

## Acceptance Criteria

1. **Given** un compte Cloudflare Web Analytics, **When** une page publique est chargée, **Then** le script léger sans cookie de Cloudflare est présent et remonte la visite à la console externe (FR-43, ADD-17), **And** aucune bannière de consentement cookies n'est nécessaire.

2. **Given** que les navigations internes de l'App Router se font côté client, **When** je passe du catalogue à une fiche puis à une autre, **Then** chaque vue est comptée (option `spa`) — le KPI visiteurs/jour n'est pas faussé à la baisse.

3. **Given** l'exigence v1, **When** je consulte l'application, **Then** aucun écran de statistiques n'est intégré dans l'app (la consultation se fait dans la console Cloudflare).

4. **Given** un environnement sans jeton configuré (dev local, CI, test de fumée), **When** une page est rendue, **Then** aucun script d'analytics n'est émis et l'application démarre normalement — l'absence de jeton n'est jamais une erreur bloquante.

5. **Given** le back-office `/admin` (usage privé d'Alain, hors mesure d'audience), **When** je l'ouvre, **Then** aucun beacon n'est émis.

6. **Given** que l'authentification n'est pas encore livrée (Epic 3), **When** la mesure est en place, **Then** la mesure porte sur le **total des visiteurs**, sans segmentation connectés/anonymes, **And** le report de cette partie de FR-43 est tracé explicitement (voir « Dette assumée ») pour être rouvert avec l'Epic 3.

## Tasks / Subtasks

- [x] **Task 1 — Variable d'environnement du beacon** (AC: #1, #4)
  - [x] Dans `src/env.ts`, ajouter une lecture **optionnelle** (surtout pas `requireEnv`) : `CLOUDFLARE_ANALYTICS_TOKEN`.
  - [x] Une valeur absente **ou vide** est traitée comme « non configuré » (`undefined`), jamais comme une erreur — contrairement à `DATABASE_URI`, une absence ici ne met aucune donnée en danger.
  - [x] Documenter la variable dans `.env.example`, en français, avec la même densité de commentaire que les entrées existantes (dire qu'elle est optionnelle et où le jeton se récupère).
  - [x] ⚠️ **Ne pas** préfixer par `NEXT_PUBLIC_` : la variable est lue **côté serveur au rendu**. Un `NEXT_PUBLIC_` serait figé à la construction de l'image en CI, où le jeton n'existe pas — le beacon serait alors définitivement vide en production.

- [x] **Task 2 — Composant `AnalytiqueAudience`** (AC: #1, #2, #4)
  - [x] Créer `src/components/AnalytiqueAudience.tsx` — **composant serveur** (pas de `'use client'`), sans CSS : il ne rend rien de visible.
  - [x] Si `CLOUDFLARE_ANALYTICS_TOKEN` est absent → **retourner `null`** (aucun script).
  - [x] Sinon, émettre **un seul** script (Cloudflare interdit plusieurs snippets sur une même page) :
    ```tsx
    <Script
      strategy="afterInteractive"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: CLOUDFLARE_ANALYTICS_TOKEN, spa: true })}
    />
    ```
    `Script` vient de `next/script`.
  - [x] Commentaire d'en-tête expliquant **pourquoi** : sans cookie (donc pas de bannière de consentement), console externe, aucun écran in-app, et pourquoi `spa: true` est indispensable ici.
  - [x] Le composant **ne lit pas la session** : aucune segmentation en v1 (AC #6). Ne pas ajouter `payload.auth()` « au cas où ».

- [x] **Task 3 — Montage dans le layout public uniquement** (AC: #1, #3, #5)
  - [x] Monter `<AnalytiqueAudience />` en fin de `<body>` dans `src/app/(frontend)/layout.tsx`.
  - [x] **Ne pas** toucher `src/app/(payload)/layout.tsx` : le back-office reste hors mesure.
  - [x] Ne rien retirer du layout : le script anti-flash de thème doit rester bloquant dans le `<head>`.
  - [x] Cette story n'ajoute **aucune page** (AC #3).

- [x] **Task 4 — Acheminement du jeton jusqu'à la production** (AC: #1, #4)
  - [x] `.github/workflows/ci.yml`, job `deploiement` : passer `CLOUDFLARE_ANALYTICS_TOKEN` depuis les secrets GitHub vers le fichier `.env` distant, exactement comme `PAYLOAD_SECRET` / `DOMAINE`.
  - [x] `deploy/docker-compose.yml`, service `app` : ajouter la variable au bloc `environment`.
  - [x] Un secret non renseigné doit produire une ligne `.env` vide, **pas** un échec de déploiement (cohérent avec AC #4 et avec le garde-fou `SSH_HOTE` existant).
  - [x] `docs/mise-en-production.md`, *Étape 8 — Secrets GitHub* : ajouter la ligne au tableau + un court paragraphe disant que le secret est **facultatif** (sans lui, le site fonctionne, il n'est simplement pas mesuré) et où le jeton se récupère dans le tableau de bord Cloudflare.

- [x] **Task 5 — Tracer la dette** (AC: #6)
  - [x] Consigner le report de la segmentation dans les notes de complétion de cette story : **quoi** (distinction connectés/anonymes de FR-43/ADD-17), **pourquoi** (l'Epic 3 n'existe pas, donc personne ne peut se connecter hors `/admin`), **quand** (à rouvrir avec l'Epic 3).
  - [x] Commentaire déjà posé dans `_bmad-output/implementation-artifacts/sprint-status.yaml`, au même endroit que les autres notes de réalité — vérifier qu'il est toujours exact en fin de story.
  - [x] Ne **pas** modifier l'AC de la Story 1.7 dans `epics.md` : l'exigence reste vraie, elle est seulement différée.

- [x] **Task 6 — Vérification** (AC: #1 à #5)
  - [x] Test d'intégration (`tests/int/`) : sans jeton → le composant ne rend rien ; avec jeton → un script dont `data-cf-beacon` contient le jeton et `"spa":true`. Si le rendu du composant serveur est peu commode à isoler sous vitest/jsdom, extraire une petite fonction pure (ex. `attributsBeacon(token)`) et la tester — mais **ne pas laisser l'AC #1 sans preuve automatisée**.
  - [x] Test E2E (`tests/e2e/frontend.e2e.spec.ts`) : sans jeton configuré, `page.locator('script[src*="cloudflareinsights"]')` a un `count()` de 0. Le test de fumée CI ne doit **jamais** dépendre d'un appel réseau vers Cloudflare.
  - [x] `npx tsc --noEmit` 0 erreur, `npm run lint` 0 erreur, `npm run test:int` vert.
  - [x] Vérification manuelle locale avec un jeton factice dans `.env` : le script est présent dans le HTML rendu, `data-cf-beacon` contient le jeton et `"spa":true`.
  - [x] Le déploiement touche l'infrastructure (Task 4) : reconstruire l'image Docker et rejouer le test de fumée, comme pour les stories 1.2 / 1.6.

## Dev Notes

### Ce que cette story n'est pas

Aucun tableau de bord, aucune page `/stats`, aucun stockage de compteurs en base, aucune lecture de session. Le produit livré tient en **un script conditionnel dans le layout public** + son acheminement de configuration. Toute tentative de construire une mesure maison est hors périmètre — AD-15 existe précisément pour l'éviter.

### Dette assumée — segmentation connectés/anonymes différée à l'Epic 3

FR-43 et ADD-17 demandent de distinguer élèves connectés et visiteurs anonymes, la distinction étant dérivée côté application. **Cette moitié de l'exigence est volontairement reportée**, pour deux raisons :

1. **Cloudflare Web Analytics n'accepte ni événement ni dimension personnalisée** (FAQ officielle : *« Not yet »*). Aucune étiquette « connecté » ne peut voyager dans le beacon. La segmentation exigerait un montage détourné (deux sites Cloudflare, un jeton par segment choisi au rendu serveur).
2. **Il n'y a rien à segmenter aujourd'hui.** L'authentification est l'Epic 3, entièrement en backlog. Le seul compte existant est celui d'Alain, via `/admin` — précisément la surface qu'on exclut de la mesure (AC #5). Un mécanisme de segmentation livré maintenant compterait 100 % d'anonymes, indéfiniment, tout en ajoutant une lecture de session sur chaque rendu.

**À rouvrir avec l'Epic 3** (concrètement, au moment de la Story 3.2, *connexion/déconnexion & état connecté dans la nav*) : c'est là que l'état de session devient réel et que le montage à deux jetons prend son sens. L'AC de la Story 1.7 dans `epics.md` reste inchangé — il n'est pas faux, il est en attente.

### État de session : à ne PAS lire dans cette story

Le motif existe déjà dans `src/app/(frontend)/page.tsx` (`payload.auth({ headers })`) et sera la base du travail Epic 3. Ne pas l'introduire ici : il ferait porter au layout une requête Payload par rendu de page, sans aucun bénéfice mesurable tant que personne ne peut se connecter. Le layout reste donc un composant serveur statique dans sa structure.

### Fichiers touchés (état actuel → ce qui change)

| Fichier | État actuel | Changement |
| --- | --- | --- |
| `src/app/(frontend)/layout.tsx` | `<html lang="fr">` + script anti-flash de thème dans `<head>`, `<Navigation />` et `<main>` dans `<body>` | **Ajouter** `<AnalytiqueAudience />` en fin de `<body>`. Ne rien retirer. |
| `src/env.ts` | `requireEnv` pour `PAYLOAD_SECRET`, résolution nuancée de `DATABASE_URI` | **Ajouter** une lecture optionnelle. Ne pas modifier le comportement des deux existantes. |
| `.env.example` | 2 variables commentées | **Ajouter** la nouvelle, mêmes conventions de commentaire. |
| `deploy/docker-compose.yml` | service `app` : `PAYLOAD_SECRET`, `DATABASE_URI` | **Ajouter** la variable. |
| `.github/workflows/ci.yml` | job `deploiement` écrit `.env` avec 7 variables | **Ajouter** la variable au passage SSH et au heredoc `ENV`. |
| `docs/mise-en-production.md` | Étape 8, tableau de 9 secrets | **Ajouter** une ligne + explication de provenance et de son caractère facultatif. |

**Nouveaux :** `src/components/AnalytiqueAudience.tsx`, plus les tests.

### Conventions du projet à respecter

- **Français** partout : nom de composant et de fichier, commentaires (NFR-7, ADD-18). Les composants existants suivent `PascalCase.tsx` + `nom-en-kebab.css` (`Navigation.tsx` / `navigation.css`) ; ici, pas de CSS.
- **Commentaires qui expliquent le pourquoi**, pas le comment — c'est la densité du code existant. Références de style : `src/env.ts`, `src/components/Navigation.tsx`, `deploy/docker-compose.yml`.
- Imports triés, `import type` pour les types seuls, pas de `any` — `npm run lint` et `tsc --noEmit` restent à zéro.

### Vie privée — pourquoi aucune bannière n'est nécessaire

Le beacon Cloudflare Web Analytics ne pose **aucun cookie** et ne construit pas d'identifiant persistant de visiteur. C'est la raison même du choix d'AD-15 : mesurer sans imposer de bandeau de consentement aux élèves. Ne pas ajouter de mécanisme de suivi complémentaire dans cette story — cela remettrait cette conclusion en cause.

### Pièges identifiés

1. **`NEXT_PUBLIC_` = jeton vide en prod.** L'image est construite dans GitHub Actions sans jeton, puis exécutée sur Lightsail avec le `.env`. Une variable `NEXT_PUBLIC_` est inlinée à la construction → définitivement vide. Le rendu serveur est la seule voie correcte.
2. **Oublier `spa: true`.** Sans lui, seule la première page d'une visite est comptée ; les navigations `<Link>` (catalogue → fiche → fiche) disparaissent des chiffres. Le KPI serait faux à la baisse — d'où l'AC #2.
3. **Instrumenter `/admin`.** Le back-office est l'usage privé d'Alain : le compter fausserait la mesure de fréquentation des élèves. Le layout Payload est un fichier distinct — ne pas y toucher suffit.
4. **Casser le test de fumée CI.** Le conteneur CI démarre sans jeton ; si le composant lançait une erreur ou émettait un script pointant vers Cloudflare, le smoke test deviendrait dépendant du réseau. D'où l'AC #4.
5. **Faire échouer le déploiement pour un secret manquant.** Le job `deploiement` s'arrête déjà proprement si `SSH_HOTE` est absent ; un secret Cloudflare vide doit simplement produire une ligne `.env` vide.
6. **Rendre la variable obligatoire dans `src/env.ts`.** Le fichier échoue volontairement fort sur `PAYLOAD_SECRET` et `DATABASE_URI` parce qu'une absence y met les données en danger. Ce n'est pas le cas ici : copier le motif `requireEnv` par mimétisme casserait le dev local et la CI.

### Intelligence de la story précédente (1.6) et des commits récents

- La Story 1.6 a monté `<Navigation />` dans ce même layout. Le layout est stable : cette story n'y ajoute qu'une ligne.
- Motif récurrent des stories livrées : **placeholder honnête plutôt que fonction morte** (zone de compte 1.6, groupe Enchaînements de la recherche 5.5). Ici l'équivalent est la dette explicitement tracée (Task 5) plutôt qu'un mécanisme de segmentation qui compterait 100 % d'anonymes.
- Les commits récents (5.4 puis 5.5, catalogue et recherche globale) n'ont touché ni `env.ts`, ni le déploiement, ni le layout : aucun conflit attendu.
- Vérification systématique en fin de story dans ce projet : `tsc` + `lint` + `test:int`, et reconstruction de l'image Docker avec test de fumée quand le déploiement est touché — c'est le cas ici (Task 4).

### Informations techniques à jour (vérifiées le 2026-08-29)

- Snippet officiel : `https://static.cloudflareinsights.com/beacon.min.js` avec l'attribut `data-cf-beacon` portant un JSON `{"token": "...", "spa": true}`.
- L'option `spa` fonctionne en surchargeant `history.pushState` et en écoutant `onpopstate`. Les routeurs à base de hash ne sont pas supportés — sans objet ici, l'App Router utilise l'History API.
- Fonctionne sur un site **non proxifié par Cloudflare** (notre cas : Lightsail + Caddy) via l'installation manuelle du snippet.
- **Un seul snippet par page** est autorisé.
- Piège d'infrastructure documenté par Cloudflare : un en-tête `Cache-Control: public, no-transform` empêche l'injection automatique du beacon. Sans objet ici (snippet posé manuellement), mais à connaître si la configuration Caddy évolue.
- Ni événements ni dimensions personnalisées disponibles — origine de la dette ci-dessus.
- `next/script` avec `strategy="afterInteractive"` est le montage recommandé dans l'App Router.

### Prérequis côté Alain (hors code)

Créer le site dans **Cloudflare → Web Analytics → Add a site** (le domaine n'a pas besoin d'être proxifié par Cloudflare), récupérer le jeton du snippet, puis l'enregistrer comme secret GitHub `CLOUDFLARE_ANALYTICS_TOKEN`. Le code est livrable et testable **sans** ce jeton (AC #4) ; seule la vérification de bout en bout en production l'exige.

### Project Structure Notes

Conforme à l'arborescence de l'ARCHITECTURE-SPINE : *« Instrumentation → script Cloudflare dans `app/` »*. Le composant vit dans `src/components/` (comme `Navigation`, `SelecteurTheme`) et est monté depuis `src/app/(frontend)/layout.tsx` — aucune variance à signaler.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Instrumentation d'audience (Cloudflare Web Analytics)]
- [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory] — FR-43, ADD-17, NFR-7
- [Source: _bmad-output/planning-artifacts/architecture/architecture-passe-finder-2026-07-21/ARCHITECTURE-SPINE.md#AD-15] — script léger sans cookie, aucun écran in-app
- [Source: _bmad-output/planning-artifacts/architecture/architecture-passe-finder-2026-07-21/ARCHITECTURE-SPINE.md#Capability → Architecture Map] — « Instrumentation | script Cloudflare dans `app/` | AD-15 »
- [Source: _bmad-output/implementation-artifacts/1-6-coquille-de-navigation-layout-responsive.md#Completion Notes List] — motif du placeholder assumé
- [Source: src/env.ts] — conventions de validation des variables d'environnement
- [Source: .github/workflows/ci.yml#deploiement] — écriture du `.env` distant
- [Source: docs/mise-en-production.md#Étape 8 — Secrets GitHub]
- [Source: https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/] — option `spa`
- [Source: https://developers.cloudflare.com/web-analytics/faq/] — pas d'événements personnalisés, un seul snippet par page

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

**Vérification dans le navigateur, jeton factice posé puis retiré :**

| État | Page | Scripts `cloudflareinsights` | `data-cf-beacon` |
| --- | --- | --- | --- |
| Jeton configuré | `/` | **1** | `{"spa":true,"token":"jeton-factice-verification-1-7"}` |
| Jeton configuré | `/positions` (navigation `<Link>`, sans rechargement) | **1** — pas de doublon | idem |
| Jeton configuré | `/admin` | **0** | — |
| Sans jeton | `/` | **0** | — |

La navigation client-side vers `/positions` a été faite en cliquant le lien, pas en rechargeant : c'est le cas que l'option `spa` doit couvrir, et le script n'est pas réinjecté une seconde fois.

**Tests :**

- `tests/int/analytique.int.spec.ts` — 5/5. Écrits **avant** l'implémentation ; échec initial confirmé (module `@/analytique` inexistant), puis passage au vert.
- `npm run test:int` complet — 12/12, aucune régression.
- `npm run test:e2e -- tests/e2e/frontend.e2e.spec.ts` — 3/3 **dans les deux états** : sans jeton (attendu 0 beacon) et avec jeton factice (attendu 1). Les deux branches de l'assertion conditionnelle sont donc réellement exercées, pas seulement la branche « 0 ».
- `npx tsc --noEmit` — 0 erreur. `npm run lint` — 0 erreur (21 avertissements préexistants, aucun sur les fichiers de cette story).

**Contre-épreuve sur l'artefact réel (image Docker de production reconstruite) :**

L'image est construite **sans aucun jeton**, exactement comme en CI. Elle a ensuite été lancée dans les deux configurations :

| Conteneur | `test:e2e` (fumée + frontend) | Beacon dans le DOM |
| --- | --- | --- |
| sans `CLOUDFLARE_ANALYTICS_TOKEN` | **6/6** | 0 |
| avec `-e CLOUDFLARE_ANALYTICS_TOKEN=jeton-conteneur-1-7` | — | **1**, `{"spa":true,"token":"jeton-conteneur-1-7"}` |

C'est la preuve qui compte pour le piège n° 1 : le jeton n'existait **pas** au moment du `docker build`, et il apparaît pourtant dans la page quand on le fournit au `docker run`. La valeur est donc bien lue à l'exécution, et non figée dans l'image — ce qu'un `NEXT_PUBLIC_` aurait rendu impossible, en silence.

Note de lecture du HTML brut : `beacon.min.js` y apparaît deux fois (un `<link rel="preload">` et la charge utile RSC), mais **aucune balise `<script>`** — `next/script` en `afterInteractive` l'injecte après hydratation. Le comptage qui fait foi est celui du DOM, vérifié à 1.

Conteneur, volume et image de test supprimés après vérification.

**Vérification finale avec le vrai jeton du site (2026-08-29) :**

Le snippet fourni par Cloudflare pour ce compte est en `type='module'` ; l'attribut a été aligné sur le snippet officiel. Le bundle actuel est un IIFE classique qui fonctionnerait sans, mais s'écarter du snippet du fournisseur ferait dépendre la mesure d'un détail d'implémentation susceptible de changer sans préavis.

Constaté dans le navigateur, jeton réel posé puis retiré :

- **1** script, `type="module"`, `{"spa":true,"token":"<jeton du site>"}` ;
- le beacon **s'exécute réellement** : il émet vers `https://cloudflareinsights.com/cdn-cgi/rum` ;
- cet envoi est refusé en local par CORS — Cloudflare n'autorise que l'origine `http://localhost`, **sans port**, jamais `localhost:3000`.

Le refus CORS est donc une limite du poste de développement, pas un défaut : sur le vrai domaine l'origine correspond. C'est la preuve la plus forte obtenue ici — le script se charge, s'exécute et tente l'envoi ; seule l'origine locale l'arrête. Aucune visite n'a atteint le compte Cloudflare pendant ces essais, les requêtes ayant été bloquées avant d'aboutir. Le cas est documenté dans `.env.example` : renseigner le jeton en local ne sert à rien et pollue la console.

### Completion Notes List

Mesure d'audience livrée : un script conditionnel dans le layout public, et son acheminement de configuration jusqu'à la production. Aucun écran de statistiques, aucun compteur en base — conforme à AD-15.

**Décisions d'implémentation :**

- **La décision vit dans `src/analytique.ts`, pas dans le composant.** Fonction pure `beaconCloudflare(jeton)`, testable sans rendu — même motif que `src/recherche.ts`. Le composant n'est plus qu'un branchement. C'est ce qui rend l'AC #1 prouvable automatiquement sans dépendre du rendu d'un composant serveur sous jsdom.
- **`optionalEnv` à côté de `requireEnv` dans `src/env.ts`.** Deux comportements volontairement opposés : on échoue fort quand l'absence met les données ou les sessions en danger (`PAYLOAD_SECRET`, `DATABASE_URI` en prod), on dégrade en silence quand elle ne prive que d'un confort. Copier `requireEnv` par mimétisme aurait cassé le dev local et le test de fumée de la CI.
- **Pas de `NEXT_PUBLIC_`.** L'image est construite dans GitHub Actions, où le jeton n'existe pas ; une variable `NEXT_PUBLIC_` y aurait été inlinée à vide, définitivement, sans aucune erreur pour le signaler. La lecture se fait au rendu, côté serveur.
- **`spa: true` systématique.** L'App Router navigue côté client ; sans cette option, seule la première page de chaque visite serait comptée et le KPI visiteurs/jour serait faux à la baisse en silence. Vérifié dans le navigateur : la navigation `<Link>` ne réinjecte pas de second script.
- **Test E2E conditionnel plutôt que « toujours zéro ».** L'attendu se dérive de `CLOUDFLARE_ANALYTICS_TOKEN` : 0 sans jeton, exactement 1 avec. Un test figé sur 0 serait devenu faux le jour où le jeton est renseigné, et n'aurait jamais couvert le cas qui compte.
- **Secret facultatif de bout en bout.** `${CLOUDFLARE_ANALYTICS_TOKEN:-}` dans le compose, ligne `.env` vide côté CI : un secret non renseigné ne fait pas échouer le déploiement, cohérent avec le garde-fou `SSH_HOTE` existant.

**Dette assumée — segmentation connectés/anonymes différée (AC #6).** FR-43 et ADD-17 demandent de distinguer élèves connectés et visiteurs anonymes. Cette moitié est reportée, décision prise avec Alain le 2026-08-29 :

- *Quoi* : la distinction connectés / anonymes, dérivée côté application.
- *Pourquoi* : Cloudflare Web Analytics n'accepte ni événement ni dimension personnalisée — aucune étiquette ne peut voyager dans le beacon. Et il n'y a rien à segmenter aujourd'hui : l'authentification est l'Epic 3, le seul compte existant est celui d'Alain via `/admin`, précisément la surface exclue de la mesure. Un mécanisme livré maintenant compterait 100 % d'anonymes indéfiniment, tout en ajoutant une lecture de session à chaque rendu de page.
- *Quand* : à rouvrir avec la Story 3.2 (connexion / état connecté dans la nav). L'AC correspondant reste inchangé dans `epics.md` — il est en attente, pas faux. La note est également posée dans `sprint-status.yaml`.

**Prérequis restant côté Alain (hors code) :** créer le site dans Cloudflare → Web Analytics, récupérer le jeton, et l'enregistrer comme secret GitHub `CLOUDFLARE_ANALYTICS_TOKEN`. Sans lui, tout fonctionne — le site n'est simplement pas mesuré.

### File List

**Nouveaux fichiers :**
- `src/analytique.ts` — décision pure : émettre le beacon, et avec quels attributs.
- `src/components/AnalytiqueAudience.tsx` — composant serveur posant le script, ou rien.
- `tests/int/analytique.int.spec.ts` — 5 tests sur la décision.

**Modifiés :**
- `src/env.ts` — `optionalEnv` + `CLOUDFLARE_ANALYTICS_TOKEN`.
- `src/app/(frontend)/layout.tsx` — montage du composant en fin de `<body>`.
- `.env.example` — la variable, documentée comme facultative.
- `deploy/docker-compose.yml` — la variable atteint le conteneur applicatif.
- `.github/workflows/ci.yml` — le secret voyage jusqu'au `.env` distant.
- `docs/mise-en-production.md` — Étape 8 : ligne de tableau + section « Le jeton Cloudflare (facultatif) ».
- `tests/e2e/frontend.e2e.spec.ts` — beacon présent si et seulement si un jeton est configuré ; back-office toujours hors mesure.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — statut de la story et note de dette.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-29 | 0.1.0 | Story créée et contextualisée pour l'implémentation. | Bob (scrum master) |
| 2026-08-29 | 0.2.0 | Décision d'Alain : un seul jeton, segmentation connectés/anonymes différée à l'Epic 3. Périmètre resserré (plus de lecture de session), dette tracée en AC #6 et Task 5. | Bob (scrum master) |
| 2026-08-29 | 1.0.0 | Mesure d'audience Cloudflare livrée : script conditionnel dans le layout public, jeton facultatif acheminé du secret GitHub jusqu'au conteneur, back-office hors mesure. | Amelia (dev agent) |
| 2026-08-29 | 1.0.1 | Attribut `type="module"` aligné sur le snippet officiel Cloudflare ; chaîne complète vérifiée avec le vrai jeton du site. | Amelia (dev agent) |
