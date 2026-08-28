# Story 2.5: Fiche Position publique & exploration du graphe

Status: review

## Story

As a visiteur ou élève,
I want consulter la fiche d'une Position et voir toutes les passes qui y arrivent et qui en partent,
so that j'explore le catalogue depuis une position : ce que je peux faire à partir d'ici.

## Acceptance Criteria

1. **Given** des Passes reliant des Positions (Story 2.3), **When** j'ouvre la fiche d'une Position (E3) **sans être connecté**, **Then** je vois sa grande image (ou `no_position`), son nom et sa description en lecture publique (FR-21, UX-DR8).

2. **Given** la fiche d'une Position, **When** je consulte ses relations, **Then** deux listes **distinctes** s'affichent : les passes qui y **arrivent** (position d'arrivée) et celles qui en **partent** (position de départ) (FR-23), **And** chaque passe listée est cliquable vers sa fiche passe.

3. **Given** une Position sans passe entrante ni sortante, **When** j'ouvre sa fiche, **Then** l'absence de relations est affichée proprement (pas d'écran cassé).

## Tasks / Subtasks

- [x] **Task 1 — Route et lecture** (AC: #1)
  - [x] `/positions/[id]` : lecture publique, rendu à la demande.
  - [x] Identifiant inconnu -> page 404 propre (jamais d'écran cassé).
- [x] **Task 2 — Entête de la fiche** (AC: #1)
  - [x] Grande image via `ImagePosition` (placeholder `no_position` délégué), nom, description.
- [x] **Task 3 — Les deux listes du graphe** (AC: #2)
  - [x] Passes **sortantes** : `positionDebut = position courante`.
  - [x] Passes **entrantes** : `positionFin = position courante`.
  - [x] Listes visuellement distinctes, chaque entrée cliquable vers `/passes/[id]`.
  - [x] Afficher l'autre extrémité de chaque passe, pour que le sens de circulation soit lisible.
- [x] **Task 4 — États vides** (AC: #3)
  - [x] Message explicite par liste vide ; une position isolée reste consultable.
- [x] **Task 5 — Navigation depuis la liste**
  - [x] Les cartes de `/positions` deviennent cliquables vers la fiche.
- [x] **Task 6 — Vérification**
  - [x] Fiche testée en anonyme ; deux listes correctes sur une position réelle ; 404 sur identifiant inconnu ; `tsc`/`lint`/tests verts.

## Dev Notes

- **AD-2** : le graphe vit sur la Passe. Les deux listes sont deux lectures inverses de la même arête — c'est la story qui rend le graphe navigable.
- **UX-DR8** : grande image, nom, description, puis les deux listes.
- **FR-21** : lecture publique, visiteur anonyme inclus.
- `imageDePosition()` (Story 2.2) reste la seule source de vérité pour l'image et le texte alternatif.
- Données disponibles : 30 positions, 110 passes migrées.

### References
- [Source: epics.md#Epic 2 — Story 2.5]
- [Source: ARCHITECTURE-SPINE.md#AD-2]

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

- `/positions/30` (« Espagnol garçon gauche ») -> **200**. Rendu verifie : grande image, nom, description, puis les **deux listes distinctes** :
  - « Passes qui partent d'ici (1) » -> *Sortie espagnol enroulée* **→ Enroulée**, badge AVANCÉ
  - « Passes qui arrivent ici (1) » -> *Changement d'espagnol* **← Espagnol garçon**, badge AVANCÉ
- Liens sortants verifies : 2 liens uniques vers des fiches passe.
- **AC #3 sur un cas reel** : l'analyse du catalogue revele **3 positions isolees** (« Berceau assis », « Final tango », « Main gauche / main gauche »). `/positions/29` -> **200**, les deux messages d'etat vide s'affichent, page intacte.
- Identifiant inconnu : `/positions/999999` -> **404**.
- `tsc` 0 erreur, `lint` 0 erreur, `test:int` 1/1, image Docker reconstruite, test de fumee 3/3.

### Completion Notes List

Fiche position livree : le catalogue devient navigable de proche en proche.

**Choix d'implementation :**
- **Les deux listes affichent l'autre extremite** de chaque passe, precedee d'une fleche orientee (`→` pour ce qui part, `←` pour ce qui arrive). Sans cela, les deux listes se ressemblent et le sens de circulation dans le graphe se perd.
- **Compteur par liste** (`(1)`, `(3)`…) : on voit d'un coup d'oeil si une position est un carrefour ou un cul-de-sac.
- **Composant `ListePasses` unique**, parametre par le sens : les deux listes sont deux lectures inverses de la meme arete (AD-2), le code le reflete au lieu de dupliquer.
- **URLs par identifiant** (`/positions/30`) plutot que par slug : les noms contiennent des barres obliques (« Main gauche / main droite »), incompatibles avec un slug lisible sans reecriture.
- `imageDePosition()` reste la seule source de verite pour l'image et le texte alternatif.
- **Cartes de la liste rendues cliquables** vers la fiche, avec le survol `accent-soft` + bordure `accent` du contrat de design.

### File List

**Nouveaux fichiers :**
- `src/app/(frontend)/positions/[id]/page.tsx` — fiche position, deux listes du graphe, 404 propre.
- `src/app/(frontend)/positions/[id]/fiche-position.css`

**Modifies :**
- `src/app/(frontend)/positions/page.tsx` + `positions.css` — cartes cliquables vers la fiche.

### Correctif (2026-08-27) — image démesurée sur la fiche position

**Signalé par Alain** : sur la fiche d'une position, l'image occupait toute la hauteur de l'écran.

**Cause** : `fiche-position.css` fixait `width: 220px` alors que le composant `ImagePosition` porte déjà `width: 100%`. Deux règles `width` portées par des sélecteurs de même priorité se départagent à **l'ordre de chargement des fichiers** — c'est le `100%` qui l'emportait. Combiné au ratio carré imposé (`aspect-ratio: 1 / 1`), l'image s'étendait sur toute la largeur du conteneur, donc sur une hauteur équivalente.

Les autres pages n'étaient pas touchées : elles utilisent `max-width`, qui **plafonne** sans entrer en conflit avec `width: 100%`.

**Correction** :
- `.fiche-image` : `width` → `max-width` (aligné sur les autres pages) ;
- garde-fou `max-width: 100%` ajouté dans le composant lui-même, pour qu'une page appelante ne puisse plus provoquer ce débordement.

**Tailles vérifiées après correction** (fenêtre 1280 px, aucun débordement horizontal) :

| Page | Image |
| --- | --- |
| Fiche position | **220×220** (auparavant : toute la hauteur d'écran) |
| Fiche passe | 140×140 |
| Liste passes | 96×96 |
| Liste positions | 211×211 |

Vérifié aussi en 375 px (mobile) : 220×220, pas de débordement.

**Piège de mesure rencontré** : une première série de mesures donnait des images de « 2×2 px » et des débordements partout. En réalité le panneau navigateur était masqué, donc `window.innerWidth` valait **0** — les chiffres étaient des artefacts. Toute mesure de mise en page doit imposer une fenêtre explicite au préalable.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-27 | 0.1.1 | Correctif : image de la fiche position démesurée (`width` en conflit avec le `width: 100%` du composant) ; passage en `max-width` + garde-fou dans le composant. | Amelia (dev agent) |
| 2026-08-27 | 0.1.0 | Fiche position publique avec les deux listes du graphe (passes entrantes / sortantes), etats vides verifies sur des positions reellement isolees, cartes de liste cliquables. | Amelia (dev agent) |