# Story 2.6: Fiche Passe publique & navigation vers les positions

Status: review

## Story

As a visiteur ou élève,
I want consulter la fiche d'une Passe et naviguer vers ses positions de départ et d'arrivée,
so that je comprends comment exécuter la passe et je circule dans le graphe position ↔ passe.

## Acceptance Criteria

1. **Given** une Passe existante (Story 2.3) et les fiches Position (Story 2.5), **When** j'ouvre la fiche d'une Passe (E4) **sans être connecté**, **Then** je vois son nom, sa description (comment faire) et sa difficulté en lecture publique (FR-21, UX-DR9).

2. **Given** la fiche d'une Passe, **When** je consulte ses positions, **Then** les images des positions de départ → arrivée sont affichées et **cliquables** vers la fiche de la position correspondante (FR-22).

3. **Given** l'exigence v1, **When** j'affiche la fiche d'une Passe, **Then** les listes « enchaînements qui l'utilisent » et « vidéos » **n'y figurent pas encore** (livrées à l'Epic 5, car elles dépendent des Enchaînements) — leur emplacement est prévu sans bloquer cette story.

## Tasks / Subtasks

- [x] **Task 1 — Route et lecture** (AC: #1)
  - [x] `/passes/[id]` : lecture publique, rendu à la demande.
  - [x] Identifiant inconnu -> page 404 propre.
- [x] **Task 2 — Contenu de la fiche** (AC: #1)
  - [x] Nom, difficulté, **description** (présentation) et **déroulé** (pas à pas) — les deux textes conservés en Story 2.3.
  - [x] Le déroulé respecte les sauts de ligne d'origine (c'est du texte temps par temps).
- [x] **Task 3 — Navigation vers les positions** (AC: #2)
  - [x] Positions départ → arrivée avec leurs images, chacune cliquable vers `/positions/[id]`.
- [x] **Task 4 — Emplacement des listes futures** (AC: #3)
  - [x] Ne rien afficher aujourd'hui, mais documenter l'emplacement prévu (Epic 5) pour éviter une refonte.
- [x] **Task 5 — Navigation depuis la liste**
  - [x] Les cartes de `/passes` deviennent cliquables vers la fiche.
- [x] **Task 6 — Vérification**
  - [x] Fiche testée en anonyme ; aller-retour position ↔ passe fonctionnel ; 404 sur identifiant inconnu ; `tsc`/`lint`/tests verts.

## Dev Notes

- **FR-22** : depuis la fiche d'une passe, les deux positions sont cliquables.
- **UX-DR9** : nom, description, difficulté ; les listes enchaînements/vidéos sont **hors périmètre v1 de cette story**.
- Le champ `deroule` (Story 2.3) porte le « comment exécuter » du PRD ; `description` porte la présentation.
- Les champs legacy restent masqués (AD-8) : rien à afficher de ce côté.

### References
- [Source: epics.md#Epic 2 — Story 2.6]
- [Source: implementation-artifacts/2-3-gerer-les-passes-meme-danse-positions-existantes.md] (deux champs de texte, difficulté libellée)

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

- `/passes/110` (« Carré magique ») -> **200**. Rendu verifie : nom, badge **AVANCÉ**, **DÉPART** *Mains décroisées* **→** **ARRIVÉE** *Main gauche / main droite*, puis Description et Deroule.
- **Deroule pas a pas** correctement rendu avec ses sauts de ligne d'origine :
  `1,2: En face pas de base` / `3et4: Le cavalier enroule la cavalière…` / `5et6: …`
- Liens vers les fiches position : 2 liens uniques (FR-22).
- Identifiant inconnu : `/passes/999999` -> **404**.
- `tsc` 0 erreur, `lint` 0 erreur, `test:int` 1/1, image Docker reconstruite, test de fumee 3/3.

### Completion Notes List

Fiche passe livree : l'aller-retour position <-> passe boucle la navigation du graphe.

**Choix d'implementation :**
- **`white-space: pre-line` sur les textes** : le deroule est du contenu temps par temps, ses retours a la ligne portent le sens. Sans cela, les trois temps se seraient agglutines en un paragraphe illisible.
- **Les deux positions sont des liens entiers** (image + role + nom), pas seulement l'image : cible de clic confortable, notamment sur mobile (UX-DR17).
- **Roles explicites « Départ » / « Arrivée »** en label-caps : la fleche seule ne suffit pas a un lecteur d'ecran.
- **Description et Deroule en deux sections distinctes**, conformement a la decision de la Story 2.3 de conserver les deux textes.

**AC #3 — emplacement des listes futures** : rien n'est affiche aujourd'hui. L'emplacement prevu (apres le deroule, en deux sections distinctes) est **documente en commentaire dans le composant**, pour que l'Epic 5 (FR-24 enchaînements, FR-38 videos) s'y insere sans refonte.

### File List

**Nouveaux fichiers :**
- `src/app/(frontend)/passes/[id]/page.tsx` — fiche passe, positions cliquables, 404 propre.
- `src/app/(frontend)/passes/[id]/fiche-passe.css`

**Modifies :**
- `src/app/(frontend)/passes/page.tsx` + `passes.css` — cartes cliquables vers la fiche.

### Correctif (2026-08-27) — images de position non affichées

**Signalé par Alain** : sur les passes, les deux images (départ et arrivée) affichaient systématiquement le placeholder au point d'interrogation, alors que les noms et les liens étaient corrects.

**Cause** : les requêtes utilisaient `depth: 1`. Payload résolvait bien `positionDebut`/`positionFin` en objets Position (d'où les noms justes), mais s'arrêtait là : le champ `image` de ces positions restait un simple identifiant. `imageDePosition()` ne voyant pas d'objet basculait sur le placeholder — comportement correct de l'utilitaire, appelé avec des données incomplètes.

Sur les pages Position, l'image est à un seul niveau de profondeur (`position -> image`), ce qui explique qu'elles n'aient jamais été touchées. Sur les passes, il y a deux niveaux : `passe -> position -> image`.

**Correction** : `depth: 2` sur la liste des passes et sur la fiche passe.

| Page | Avant | Après |
| --- | --- | --- |
| `/passes` | 0 vraie image, 440 placeholders | **436 vraies images**, 4 placeholders (les 2 positions réellement sans image) |
| `/passes/[id]` | 0 vraie image, 4 placeholders | **4 vraies images**, 0 placeholder |

URLs d'images vérifiées côté serveur : `HTTP 200`, `image/jpeg`, taille non nulle.

**Défaut de ma vérification initiale** : j'avais contrôlé la présence et l'exactitude des *liens* (« 2 liens uniques vers des positions ») sans jamais vérifier que les *images* se chargeaient. Un comptage de liens ne prouve pas qu'une page s'affiche correctement.

**Observation annexe** : le dossier `media/` contient 56 fichiers pour 28 positions illustrées — 28 doublons suffixés `-1`, accumulés lors des recréations de base sans vidage du dossier. Sans impact (la base référence les bons fichiers) ; à nettoyer à l'occasion.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-27 | 0.1.1 | Correctif : `depth: 2` sur les requêtes de passes — les images des positions de départ/arrivée affichaient le placeholder au lieu des vrais schémas. | Amelia (dev agent) |
| 2026-08-27 | 0.1.0 | Fiche passe publique : description, deroule pas a pas avec sauts de ligne preserves, positions depart/arrivee cliquables ; emplacement des listes de l'Epic 5 documente. | Amelia (dev agent) |