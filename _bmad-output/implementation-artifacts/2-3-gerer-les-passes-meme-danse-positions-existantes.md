# Story 2.3: Gérer les Passes (même danse, positions existantes)

Status: review

## Story

As a Alain (admin),
I want créer, éditer et supprimer des Passes reliant une position de départ à une position d'arrivée de la même danse,
so that je construis le graphe des mouvements sur lequel repose la composition d'enchaînements.

## Acceptance Criteria

1. **Given** des Positions existantes (Story 2.2), **When** je définis la collection `Passe` (nom, position de départ, position d'arrivée, description, difficulté optionnelle) et je crée une Passe dans `/admin`, **Then** je sélectionne les positions de départ et d'arrivée **parmi les positions existantes uniquement** — pas de création de position à la volée (FR-3, FR-4).

2. **Given** que je choisis deux positions de danses différentes, **When** j'enregistre la Passe, **Then** un hook de validation refuse l'enregistrement (FR-5, AD-5), **And** la danse de la passe **se déduit** de ses positions, sans être stockée en double.

3. **Given** que la difficulté n'est pas renseignée, **When** j'enregistre la Passe, **Then** l'enregistrement réussit (la difficulté est optionnelle).

4. **Given** les champs legacy hérités de l'ancien schéma, **When** je définis la collection Passe, **Then** des champs d'archivage sont **définis dès la création de la collection** pour `youtube_url` (legacy), `customName` et les données `PersonnalizePasse` liées (AD-8/ADD-10), **And** ces champs sont marqués `hidden` : ni affichés ni utilisés en lecture/écriture par l'admin, l'API ou l'UI v1.

5. **Given** un utilisateur non-admin, **When** il accède aux Passes, **Then** il est en lecture seule ; seul l'admin édite (FR-7, AD-3).

## Décisions produit (Alain, 2026-08-26)

- **Deux champs de texte conservés** : `description` (présentation) et `deroule` (pas à pas). L'ancien modèle porte les deux, remplis pour les 115 passes ; les fusionner ou en supprimer un ferait perdre du contenu pédagogique. **Écart assumé** vis-à-vis du PRD, qui n'en prévoyait qu'un.
- **Difficulté libellée** : 1 = Débutant, 2 = Facile, 3 = Intermédiaire, 4 = Avancé.
- **Périmètre rock** : seules les 110 passes rock sont migrées (les 5 Salsa sont écartées, comme les positions Salsa).

## Tasks / Subtasks

- [x] **Task 1 — Collection `Passe`** (AC: #1, #3)
  - [x] `nom` (requis), `positionDebut` et `positionFin` (relations vers `positions`, requises), `description`, `deroule`, `difficulte` (select 1–4, **optionnelle**).
  - [x] Les relations n'autorisent que la sélection de positions existantes (comportement natif Payload) — aucune création à la volée.
  - [x] Libellés français, `admin.useAsTitle: 'nom'`, identifiants de code en anglais/neutres (ADD-18).
  - [x] **Pas de champ `danse`** sur la Passe : elle se déduit des positions (AD-5).
- [x] **Task 2 — Validation même-danse** (AC: #2)
  - [x] Hook de validation refusant l'enregistrement si `positionDebut.danse != positionFin.danse`, avec un message clair en français.
  - [x] Exposer la danse déduite en lecture (champ virtuel ou lecture à la demande), sans la stocker.
- [x] **Task 3 — Champs d'archivage legacy** (AC: #4)
  - [x] `legacyYoutubeUrl` (texte) et `legacyPersonnalisations` (JSON, pour `PersonnalizePasse` + `customName`), tous deux `hidden`.
  - [x] `legacyId` masqué, pour la rejouabilité de la migration (FR-32).
  - [x] Vérifier qu'ils n'apparaissent ni dans `/admin` ni dans l'UI.
- [x] **Task 4 — Contrôles d'accès** (AC: #5)
  - [x] Lecture publique ; écriture réservée (même provisoire que 2.1/2.2 : authentifiés, `TODO` drapeau `admin` en Story 3.4).
- [x] **Task 5 — Migration des passes** (tranche Epic 6)
  - [x] Étendre `migrate/` pour importer les 110 passes rock via l'API Local, après les positions (ordre de dépendance).
  - [x] Rattacher `positionDebut`/`positionFin` via le `legacyId` des positions déjà migrées.
  - [x] Archiver `youtube_url` et les lignes `personnalizepasse` correspondantes.
  - [x] Rejouable (aucun doublon) et vérifiable (comptage source vs cible).
- [x] **Task 6 — Page publique des passes**
  - [x] Liste `/passes` : nom, difficulté, position de départ → position d'arrivée, description.
  - [x] Habillée par le design system ; lien depuis la navigation.
- [x] **Task 7 — Migration de schéma + vérification**
  - [x] `migrate:create passe` et commit du fichier généré (sinon la CI échoue).
  - [x] Vérifier : refus d'une passe inter-danses, création sans difficulté, lecture publique, écriture anonyme refusée.
  - [x] `tsc`, `lint`, `test:int` verts ; image Docker constructible ; test de fumée 3/3.

## Dev Notes

### Ce que disent les vraies données (analyse du dump, 2026-08-26)

| Constat | Détail |
| --- | --- |
| Volume | **115 passes**, dont **110 rock** et 5 Salsa |
| Intégrité du graphe | **0 référence orpheline** — toutes les passes rock pointent vers des positions rock existantes |
| Difficulté | valeurs 1 à 4, toujours renseignée (28 / 30 / 39 / 18) |
| `youtube_url` | renseignée sur **5 passes** — l'archivage d'AD-8 a un usage réel |
| `pending` / `published` | 0 et 1 partout : aucun filtrage à prévoir |
| Textes | `description` **et** `progress` remplis pour les 115 passes |
| `personnalizepasse` | **1 seule ligne** : « Grand foulard custom » sur la passe 115 |

**Colonnes source** : `id`, `name`, `positionStart_id`, `positionEnd_id`, `difficulty`, `description`, `progress`, `dateMaj`, `danse_id`, `dateCreate`, `userCreate_id`, `pending`, `published`, `youtube_url`.

**Point à noter sur ADD-10** : la règle mentionne un `passe.customName`, mais **cette colonne n'existe pas** dans le dump. Le nom personnalisé vit en réalité dans `personnalizepasse.name`. L'archivage couvre donc `youtube_url` + les lignes `personnalizepasse` (qui portent le `customName`).

**Champs non repris en v1** : `dateCreate`, `dateMaj`, `userCreate_id`, `pending`, `published`, `danse_id` (déduite des positions — AD-5).

### Invariants applicables
- **AD-5** : `positionDebut.danse == positionFin.danse` ; la danse de la passe **se déduit**, jamais stockée en double.
- **AD-2** : les arêtes du graphe vivent sur la Passe — c'est la base du futur moteur de composition (Epic 4).
- **AD-8 / ADD-10** : champs legacy conservés en base mais **non exposés** en v1.
- **AD-1** : écriture via Payload uniquement. **AD-3** : permissions dans les `access`.

### Point d'attention : migrations obligatoires
Toute nouvelle collection impose `migrate:create`, sinon le test de fumée de la CI échoue (garde-fou posé en Story 1.3).

### References
- [Source: epics.md#Epic 2 — Story 2.3]
- [Source: ARCHITECTURE-SPINE.md#AD-2] (le graphe vit sur la Passe)
- [Source: ARCHITECTURE-SPINE.md#AD-5] (même-danse, danse dérivée)
- [Source: ARCHITECTURE-SPINE.md#AD-8] (champs legacy archivés)
- [Source: implementation-artifacts/2-2-gerer-les-positions-crud-admin-image-non-bloquante.md] (modèle Position, `legacyId`, provisoire sur les accès)

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

**Migration** : 115 passes dans le dump, **110 rock migrées**, 5 Salsa écartées, comptage conforme. Rejouée : 0 créée / 110 ignorées.

**Critères vérifiés par appels API :**

| AC | Test | Résultat |
| --- | --- | --- |
| #2 | passe reliant une position rock à une position d'une autre danse | **HTTP 400** + « Une passe doit relier deux positions de la même danse : « Espagnol garçon gauche » et « Position salsa (test) » appartiennent à des danses différentes. » |
| #3 | création sans difficulté | **HTTP 201** |
| #4 | champs legacy dans la réponse API | **absents** (`legacyYoutubeUrl`, `legacyPersonnalisations`, `legacyId`) |
| #5 | `POST` anonyme / `GET` anonyme | **403** / **200** |

**Page `/passes`** : 110 passes, difficultés en français, arête du graphe lisible (« Mains décroisées → Main gauche / main droite »), descriptions issues du dump avec accents corrects.

**Non-régression** : `tsc` 0 erreur, `lint` 0 erreur, `test:int` 1/1, image Docker reconstruite, **5 migrations appliquées** au démarrage du conteneur, **test de fumée 3/3**.

### Completion Notes List

Collection `Passe` livrée, 110 passes historiques migrées, page publique en ligne.

**Trois problèmes rencontrés et corrigés :**

1. **Les champs legacy étaient exposés par l'API.** `admin: { hidden: true }` ne masque que le back-office ; l'API REST renvoyait toujours `legacyYoutubeUrl`, `legacyPersonnalisations` et `legacyId`. Or AD-8/ADD-10 exige « non lus par l'API, l'admin **ou** l'UI ». Corrigé en passant `hidden: true` au niveau du **champ** (et non de `admin`), ce qui les retire aussi des réponses. Même correction appliquée à `Position.legacyId`.

2. **Régression induite : la migration ne pouvait plus lire `legacyId`.** `hidden: true` retire le champ des réponses de l'API **Local** également, cassant la table de correspondance position↔passe et la rejouabilité. Corrigé avec `showHiddenFields: true` sur les requêtes de migration — l'opt-in explicite prévu par Payload pour ce cas. Rejouabilité re-vérifiée ensuite.

3. **La validation même-danse renvoyait `500 Something went wrong`.** Une `Error` générique levée dans un hook est traitée comme une erreur serveur. Remplacée par `APIError(..., 400)` : l'appelant reçoit désormais un refus de validation lisible, nommant les deux positions fautives.

**Erreur de méthode de ma part** : mon premier test de l'AC #2 utilisait la même position aux deux extrémités (la requête « position rock » renvoyait en fait la position de test créée juste avant). Le test passait donc pour de mauvaises raisons. Refait en sélectionnant explicitement une position de chaque danse.

**Choix d'implémentation :**
- **Deux champs de texte** (`description` + `deroule`), conformément à la décision d'Alain : l'historique porte les deux, remplis pour les 115 passes. Écart assumé au PRD, qui n'en prévoyait qu'un.
- **Aucun champ `danse` sur la Passe** (AD-5) : elle se déduit des positions, jamais stockée en double.
- **Difficulté** : select `1`–`4` libellé Débutant / Facile / Intermédiaire / Avancé, optionnel (AC #3).
- **Module `dump-legacy.ts` factorisé** : les deux scripts de migration lisent la source de la même façon, plus de duplication du parseur SQL.
- **Passe sans ses deux extrémités** : signalée dans le rapport plutôt que créée, pour ne jamais introduire d'arête cassée dans le graphe. Aucun cas rencontré (dump intact).

**Constat sur les données** : les 5 URLs YouTube du dump appartiennent toutes à des passes **Salsa**, donc écartées. Aucune passe rock n'a de vidéo — la seule donnée archivée est l'unique personnalisation « Grand foulard custom ».

**Note sur ADD-10** : la règle mentionne un `passe.customName`, mais cette colonne **n'existe pas** dans le dump. Le nom personnalisé vit dans `personnalizepasse.name` ; l'archivage le couvre via `legacyPersonnalisations`.

### File List

**Nouveaux fichiers :**
- `src/collections/Passe.ts` — collection + validation même-danse + champs d'archivage masqués.
- `migrate/dump-legacy.ts` — lecture et parsing du dump, partagés par les scripts de migration.
- `migrate/migrate-passes.ts` — migration des 110 passes rock.
- `src/app/(frontend)/passes/page.tsx` + `passes.css` — liste publique des passes.
- `src/migrations/20260827_200955_passe.ts` + `.json` — migration de schéma.

**Modifiés :**
- `src/payload.config.ts` — enregistrement de `Passe`.
- `src/collections/Position.ts` — `legacyId` masqué au niveau du champ.
- `migrate/migrate-positions.ts` — utilise le module partagé ; `showHiddenFields`.
- `src/components/Navigation.tsx` — liens « Positions » et « Passes ».
- `package.json` — scripts `migrate:passes` et `migrate:all`.
- `src/payload-types.ts`, `src/migrations/index.ts` — régénérés.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-27 | 0.1.0 | Collection `Passe` (graphe, validation même-danse, difficulté optionnelle, champs legacy archivés et masqués de l'API), migration des 110 passes rock, page publique `/passes`. | Amelia (dev agent) |
