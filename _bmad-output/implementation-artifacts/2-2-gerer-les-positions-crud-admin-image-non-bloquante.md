# Story 2.2: Gerer les Positions (CRUD admin, image non bloquante)

Status: review

## Story

As a Alain (admin),
I want creer, editer et supprimer des Positions avec nom, description et image optionnelle,
so that je catalogue les etats statiques de la danse, la brique de depart de tout le reste.

## Acceptance Criteria

1. **Given** la collection Danse (Story 2.1), **When** je definis la collection `Position` (nom, description, image, danse de rattachement) et j'ouvre `/admin`, **Then** je peux creer, editer et supprimer une Position depuis le back-office Payload, en francais (FR-1, ADD-2, UX-DR18).

2. **Given** que je cree une Position sans fournir d'image, **When** j'enregistre, **Then** la Position est valide et utilise le placeholder `no_position` a l'affichage (FR-2, NFR-3), **And** je peux ajouter ou remplacer l'image plus tard sans invalider la Position.

3. **Given** une image fournie, **When** j'enregistre la Position, **Then** l'image est stockee via l'adaptateur d'upload de Payload, **And** son texte alternatif est le `nom` de la position (UX-DR17).

4. **Given** un utilisateur non-admin (connecte ou visiteur), **When** il accede aux Positions, **Then** il est en lecture seule ; seul l'admin peut creer/editer/supprimer (FR-7, AD-3 — controle dans les `access`, jamais dans l'UI).

## Ecart assume : stockage des images

L'AC #3 de l'epic exige un stockage **S3** (ADD-13). Cette tranche etant **100 % locale** (decision d'Alain : voir du reel en local avant la prod), les images sont stockees sur le **disque local** via l'adaptateur d'upload par defaut de Payload. Le passage a S3 est un changement de configuration isole, a traiter avec la story de deploiement. Aucun code metier n'en depend.

## Tasks / Subtasks

- [x] **Task 1 — Collection de stockage des images** (AC: #2, #3)
  - [x] Creer une collection d'upload dediee (`Media`) : Payload exige une collection `upload` pour porter les fichiers. **Ecart documente** vis-a-vis d'ADD-2 (qui ne la liste pas) : c'est un support technique, pas une entite du domaine.
  - [x] Justification du choix : mettre `upload: true` directement sur `Position` rendrait le fichier **obligatoire** a la creation et violerait FR-2 (image non bloquante).
  - [x] Champ `alt` requis, alimente par le `nom` de la position (UX-DR17). Lecture publique.
- [x] **Task 2 — Collection `Position`** (AC: #1, #2)
  - [x] `src/collections/Position.ts` : slug `positions`, champs `nom` (text requis), `description` (textarea), `image` (upload vers Media, **optionnel**), `danse` (relation vers `danses`, requise).
  - [x] Libelles francais, `admin.useAsTitle: 'nom'`, identifiants de code en anglais (ADD-18).
  - [x] Danse : valeur par defaut « rock 6 temps » et champ **masque** dans l'admin v1 (ADD-18), tout en restant present dans le modele.
  - [x] Enregistrer la collection dans `payload.config.ts` ; regenerer les types.
- [x] **Task 3 — Placeholder `no_position`** (AC: #2)
  - [x] Rendre le fichier `no_position.jpg` servable par l'application (le placer dans `public/`), afin qu'une position sans image ne casse aucun ecran.
  - [x] Exposer un utilitaire unique donnant l'URL d'image d'une position (image reelle ou placeholder) + son texte alternatif, pour que toutes les surfaces d'affichage l'utilisent sans dupliquer la regle.
- [x] **Task 4 — Controles d'acces** (AC: #4)
  - [x] Lecture publique ; ecriture reservee (meme provisoire que Story 2.1 : utilisateurs authentifies, `TODO` pour le drapeau `admin` de la Story 3.4).
  - [x] Verifier concretement qu'un visiteur anonyme ne peut pas creer/modifier/supprimer.
- [x] **Task 5 — Migration + verification** (AC: #1, #2, #3, #4)
  - [x] `npm run payload -- migrate:create position` et commiter le fichier genere.
  - [x] Verifier dans `/admin` : creation d'une position **sans image** (doit reussir), puis ajout d'une image a posteriori.
  - [x] Verifier qu'un visiteur anonyme lit les positions mais ne peut pas ecrire.
  - [x] `npx tsc --noEmit`, `npm run lint`, `npm run test:int` verts ; image Docker toujours constructible.

## Dev Notes

### Ce que disent les vraies donnees (analyse du dump, 2026-08-26)
- Champs source : `id`, `name` (50 car. max), `description` (texte, jusqu'a 396 car.), `image` (nom de fichier), `dateCreate`, `dateMaj`, `danse_id`, `userCreate_id`, `pending`.
- **32 positions**, dont **30 en rock** (les 2 Salsa ne sont pas migrees — decision d'Alain).
- **2 positions ont un champ image VIDE** (« Final tango », « Portillon haut ») : le placeholder `no_position` a donc un usage reel des la premiere migration.
- Aucune description ni aucun nom vide ; toutes les positions ont `pending = 0` (aucun filtrage a prevoir).
- `userCreate_id` et les dates ne sont pas repris en v1 (hors modele cible).

### Invariants applicables
- **AD-1** : ecriture uniquement via Payload. **AD-3** : permissions dans les `access`.
- **AD-5** : la danse est portee par `Position` ; celle d'une Passe s'en deduira (Story 2.3).
- **ADD-11 / FR-2** : image non bloquante, placeholder `no_position`.
- **ADD-18** : selecteur de danse masque en v1 ; libelles FR, code en anglais.

### Point d'attention : migrations obligatoires
Toute nouvelle collection impose `migrate:create`, sinon la CI echoue (garde-fou pose en Story 1.3).

### References
- [Source: epics.md#Epic 2 — Story 2.2]
- [Source: ARCHITECTURE-SPINE.md#AD-11] (uploads, placeholder)
- [Source: implementation-artifacts/2-1-modele-danse-mono-danse-rock-6-temps.md] (danse de reference, provisoire sur les acces)

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

- **FR-2 verifie** : `POST /api/positions` sans champ image -> **201**, document cree avec `image = null`.
- **Danse automatique** : la position creee ressort rattachee a « rock 6 temps » sans que le client l'ait fournie (hook `beforeValidate`).
- **Acces (AC #4)** : `POST` anonyme -> **403** « Vous n'etes pas autorise a effectuer cette action » ; `GET` anonyme -> **200**.
- `npx tsc --noEmit` -> 0 erreur ; `npm run lint` -> 0 erreur ; `npm run test:int` -> 1/1.
- Image Docker reconstruite avec succes ; les migrations `danse`, `position` et `position_legacy_id` s'appliquent au demarrage du conteneur.

### Completion Notes List

Collections `Media` et `Position` livrees, avec image reellement optionnelle.

**Choix de conception :**
- **Collection `Media` dediee** plutot que `upload: true` sur `Position`. Motif : avec `upload: true`, Payload rend le fichier **obligatoire a la creation**, ce qui violerait FR-2. `Media` est un support technique, pas une entite du domaine — d'ou son absence d'ADD-2, ecart documente.
- **Danse rattachee automatiquement** par un hook `beforeValidate` et champ masque dans l'admin (ADD-18) : en v1 mono-danse, Alain n'a jamais a choisir, mais le champ existe pour l'extension future (FR-6).
- **Placeholder centralise** : `src/positions.ts` expose `imageDePosition()`, seule source de verite pour « image reelle ou `no_position` » + texte alternatif = nom (UX-DR17). Aucune surface d'affichage ne reimplemente la regle.
- **`legacyId` ajoute** (masque) : indispensable pour rendre la migration rejouable sans doublon (FR-32).
- **Acces** : meme provisoire que la Story 2.1 (ecriture reservee aux authentifies, `TODO` pour le drapeau `admin` de la Story 3.4).

**Ecart assume** : images stockees sur le **disque local**, pas sur S3 (ADD-13). Cette tranche est volontairement 100 % locale ; le passage a S3 est un changement d'adaptateur isole, aucun code metier n'en depend.

### File List

**Nouveaux fichiers :**
- `src/collections/Media.ts` — collection d'upload (champ `alt` requis, lecture publique).
- `src/collections/Position.ts` — `nom`, `description`, `image` (optionnelle), `danse` (auto, masquee), `legacyId` (masque).
- `src/positions.ts` — `imageDePosition()` : regle unique image reelle / placeholder.
- `public/no_position.jpg` — placeholder servi par l'application.
- `src/migrations/20260826_104359_position.ts` + `.json`, `src/migrations/20260826_104503_position_legacy_id.ts` + `.json`.

**Modifies :**
- `src/payload.config.ts` — enregistrement de `Media` et `Position`.
- `src/payload-types.ts`, `src/migrations/index.ts` — regeneres.
