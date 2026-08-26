# Story 2.1: Modele Danse (mono-danse « rock 6 temps »)

Status: review

## Story

As a developpeur du projet,
I want une collection Danse portant la seule danse v1 « rock 6 temps », masquee dans l'UI mais presente dans le modele,
so that Positions et Passes se rattachent a une danse des le depart, sans bloquer l'ajout futur d'autres danses sans migration structurelle.

## Acceptance Criteria

1. **Given** le monolithe de l'Epic 1, **When** je definis la collection Payload `Danse`, **Then** elle existe avec au minimum un `nom`, **And** une seule danse « rock 6 temps » est presente (semee) au demarrage (FR-6, ADD-2).

2. **Given** la contrainte mono-danse v1, **When** un admin gere des Positions dans `/admin`, **Then** le selecteur de danse est masque et « rock 6 temps » s'applique par defaut (ADD-18), **And** le modele permet d'ajouter d'autres danses ulterieurement sans changement de schema.

3. **Given** la regle des migrations etablie en Story 1.2/1.3, **When** la collection est ajoutee, **Then** une migration Payload correspondante est generee et commitee, **And** la CI reste verte (le test de fumee echouerait sinon).

## Tasks / Subtasks

- [x] **Task 1 — Collection `Danse`** (AC: #1)
  - [x] Creer `src/collections/Danse.ts` : slug `danses`, champ `nom` (text, requis, unique), libelles francais (`labels`), `admin.useAsTitle: 'nom'`.
  - [x] L'enregistrer dans `collections` de `src/payload.config.ts`.
  - [x] Regenerer les types (`npm run generate:types`).
- [x] **Task 2 — Semis de la danse v1** (AC: #1, #2)
  - [x] Garantir la presence de « rock 6 temps » au demarrage, de facon **idempotente** (relancer ne cree pas de doublon).
  - [x] Passer par l'API Local de Payload (AD-1 : Payload seul scribe), jamais par du SQL brut.
  - [x] Choisir un point d'accroche execute au demarrage serveur et le documenter.
- [x] **Task 3 — Controles d'acces** (AC: #2)
  - [x] Lecture publique ; ecriture reservee a l'admin. Les regles vivent dans les `access` de la collection (AD-3), jamais dans l'UI.
  - [x] Note : le drapeau `admin` sur l'utilisateur arrive en Story 3.4 ; en attendant, restreindre l'ecriture aux utilisateurs authentifies et documenter ce provisoire.
- [x] **Task 4 — Migration + verification** (AC: #3)
  - [x] `npm run payload -- migrate:create danse` puis commiter le fichier genere.
  - [x] Verifier en local : `/admin` montre la collection Danse en francais, « rock 6 temps » est presente, un second demarrage ne cree pas de doublon.
  - [x] `npx tsc --noEmit`, `npm run lint`, `npm run test:int` verts.

## Dev Notes

### Decisions produit (Alain, 2026-08-26)
- **Nom retenu : « rock 6 temps »** (l'historique disait « Rock'n Roll ») — conforme au PRD/architecture.
- **Migration du rock uniquement** : les danses Salsa et Tango du legacy ne sont pas reprises en v1. Le modele reste multi-danse (FR-6), seule la donnee est limitee.

### Donnees legacy (analysees le 2026-08-26)
Le dump contient 3 danses (`Rock'n Roll`, `Salsa`, `Tango`) et 32 positions, dont **30 rattachees au rock**. Seule la danse rock est semee ici ; la Story 6.2 rattachera les positions migrees a cette danse.

### Invariants applicables
- **AD-1** : toute ecriture via l'API/les hooks Payload.
- **AD-3** : permissions uniquement dans les `access` des collections.
- **ADD-2** : collections au singulier, PascalCase, domaine francais. `Danse` porte un `nom`.
- **ADD-18** : selecteur de danse masque en v1 ; le champ existe pour l'extension future. Identifiants de code en anglais, libelles en francais.

### Point d'attention : migrations obligatoires
Depuis la Story 1.2, la production applique le schema **par migrations**. Toute nouvelle collection impose `migrate:create`. La CI (Story 1.3) echoue sinon — c'est voulu.

### References
- [Source: epics.md#Epic 2 — Story 2.1]
- [Source: ARCHITECTURE-SPINE.md#AD-5] (la danse est portee par Position ; celle de la Passe se deduit)
- [Source: implementation-artifacts/1-2-image-docker-de-production.md] (regle des migrations)

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

- `npm run generate:types` + `migrate:create danse` -> `src/migrations/20260826_104122_danse.ts` genere.
- Demarrage dev : log `Danse de reference creee : rock 6 temps`.
- `GET /api/danses` (non authentifie) -> `totalDocs: 1`, `nom: "rock 6 temps"` : lecture publique OK.
- **Idempotence verifiee** : apres redemarrage, `totalDocs` reste a **1** (aucun doublon).

### Completion Notes List

Collection `Danse` livree avec semis idempotent de la danse v1.

- **Nom retenu : « rock 6 temps »** (decision d'Alain ; l'historique disait « Rock'n Roll »).
- **Semis via `onInit`** de Payload : s'execute au demarrage en dev comme en prod. En production l'entrypoint applique d'abord les migrations, donc le schema existe avant l'appel. Le semis passe par l'API Local (AD-1), jamais par du SQL brut, et verifie l'existence avant de creer.
- **`admin.hidden: true`** sur la collection : en v1 mono-danse il n'y a rien a gerer au quotidien, la barre laterale de l'admin reste epuree. Le champ et la collection existent pour l'extension future (FR-6).
- **Acces** : lecture publique (catalogue de reference), ecriture reservee aux utilisateurs authentifies. **Provisoire assume** : le drapeau `admin` arrive en Story 3.4 ; un `TODO` est pose dans le code pour restreindre a ce moment-la. Les regles vivent dans les `access` (AD-3).
- Migration generee et commitee, conformement a la regle etablie en Story 1.2/1.3.

### File List

**Nouveaux fichiers :**
- `src/collections/Danse.ts` — collection `danses` (champ `nom`, libelles FR, acces) + constante `DANSE_V1`.
- `src/seed.ts` — `seedDanseV1()`, semis idempotent via l'API Local.
- `src/migrations/20260826_104122_danse.ts` + `.json` — migration de schema.

**Modifies :**
- `src/payload.config.ts` — enregistrement de `Danse`, branchement de `onInit`.
- `src/payload-types.ts` — types regeneres.
- `src/migrations/index.ts` — registre mis a jour.
