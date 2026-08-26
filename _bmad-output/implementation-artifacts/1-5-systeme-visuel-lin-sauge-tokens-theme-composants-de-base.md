# Story 1.5: Système visuel « Lin & Sauge » — tokens, thème, composants de base

Status: review

## Story

As a utilisateur (élève ou visiteur),
I want une interface épurée, cohérente et lisible en clair comme en sombre,
so that l'outil est agréable et rassurant à utiliser sur tout écran.

## Acceptance Criteria

1. **Given** le contrat de design DESIGN.md, **When** j'implémente le système visuel, **Then** toutes les valeurs (palette claire ET sombre, typographie système sans-serif, rayons, espacements) sont exposées en variables CSS/tokens réutilisables (UX-DR1), **And** aucune police externe n'est chargée.

2. **Given** le thème clair/sombre, **When** un utilisateur change le thème de son OS ou via le sélecteur `data-theme`, **Then** l'interface bascule entre les palettes claire et sombre en conservant un contraste conforme (UX-DR2, UX-DR17), **And** `prefers-reduced-motion` est respecté.

3. **Given** les tokens en place, **When** je crée les composants de base, **Then** le bouton primaire (sauge plein), le bouton fantôme (surface + bordure) et l'image de position ronde (fond `pos-bg`, alt = nom, placeholder `no_position`) existent et respectent les tokens (UX-DR3).

## Tasks / Subtasks

- [x] **Task 1 — Tokens** (AC: #1)
  - [x] Toute la palette claire (13 couleurs) et les surcharges sombres, transcrites depuis DESIGN.md sans invention.
  - [x] Typographie système (`display`, `headline`, `body`, `label-caps`, `data`) — aucune police externe.
  - [x] Rayons (`sm`/défaut/`md`/`lg`/`full`) et espacements sur unité 4px ; marges 16px mobile / 24px desktop.
- [x] **Task 2 — Thème clair/sombre** (AC: #2)
  - [x] Suivi de la préférence OS via `prefers-color-scheme`.
  - [x] Choix explicite du lecteur via `data-theme`, prioritaire sur l'OS.
  - [x] Sélecteur de thème (Système / Clair / Sombre), choix mémorisé dans le navigateur.
  - [x] `prefers-reduced-motion` respecté ; focus visible en accent.
- [x] **Task 3 — Composants de base** (AC: #3)
  - [x] `Bouton` (variantes primaire et fantôme).
  - [x] `ImagePosition` (ronde, fond `pos-bg`, alt = nom, placeholder délégué).
- [x] **Task 4 — Application aux pages existantes** (AC: #1, #3)
  - [x] Accueil et liste des positions rebasées sur les tokens.
  - [x] Aucune valeur de couleur/typo en dur hors `tokens.css`.
- [x] **Task 5 — Vérification** (AC: #1, #2, #3)
  - [x] `tsc` 0 erreur, `lint` 0 erreur, `test:int` 1/1.
  - [x] Rendu vérifié visuellement dans les deux thèmes.
  - [x] Image Docker reconstruite et test de fumée 3/3.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

- `tsc --noEmit` → 0 erreur ; `npm run lint` → **0 erreur** (17 warnings préexistants) ; `test:int` → 1/1.
- Rendu vérifié **dans le navigateur, dans les deux thèmes** : sombre (fond `#14170F`, cartes `surface-dark`) puis bascule sur clair via le sélecteur (fond lin `#F6F7F3`, cartes blanches). Les images de positions ressortent identiquement dans les deux — l'intention du contrat (« la couleur vient des images ») est respectée.
- Image Docker reconstruite avec succès ; **test de fumée 3/3** contre le conteneur (le garde-fou des migrations reste vert).

### Completion Notes List

Design system « Lin & Sauge » implémenté à partir du contrat UX, sans invention de valeurs.

**Deux erreurs de lint corrigées en cours de route** (elles auraient fait **échouer la CI**, `npm run lint` sortant en code 1) :
1. `SelecteurTheme` appelait `setState` dans un `useEffect` → rendus en cascade. Refait en **champ non contrôlé** piloté par le DOM : plus d'état React, donc ni écart d'hydratation ni cascade.
2. Navigation interne en `<a>` au lieu de `<Link>`. `Bouton` route désormais vers `Link` pour les chemins internes, et garde un `<a>` classique pour `/admin` (rendu par Payload, où un rechargement franc est préférable).

**Choix d'implémentation :**
- **Script anti-flash** minuscule et bloquant dans le `<head>` : applique le thème mémorisé **avant la première peinture**. Sans lui, un lecteur ayant choisi « sombre » verrait un éclair de thème clair à chaque chargement.
- **Stockage défensif** : tout accès à `localStorage` est encadré (navigation privée, stockage bloqué) — le sélecteur retombe alors sur « Système » sans casser la page.
- **`ImagePosition` ne décide de rien** : elle délègue à `imageDePosition()` (Story 2.2), qui reste la source de vérité unique pour « image réelle ou placeholder » et pour le texte alternatif. Aucune duplication de la règle.
- **Bandeau provisoire** ajouté au layout pour héberger le sélecteur de thème. Il sera **remplacé** par la barre de navigation complète en Story 1.6 — c'est signalé en commentaire dans le code.

**Non couvert par cette story** (composants prévus par UX-DR3 mais sans usage aujourd'hui) : flèche de passe, chip/ligne de passe, position verrouillée. Ils relèvent du compositeur (Epic 4) ; les créer maintenant reviendrait à écrire du code sans consommateur.

### File List

**Nouveaux fichiers :**
- `src/app/(frontend)/tokens.css` — l'intégralité des tokens (couleurs claires + sombres, typo, rayons, espacements, `prefers-reduced-motion`).
- `src/components/Bouton.tsx` + `bouton.css` — boutons primaire et fantôme.
- `src/components/ImagePosition.tsx` + `image-position.css` — image de position ronde.
- `src/components/SelecteurTheme.tsx` + `selecteur-theme.css` — sélecteur Système / Clair / Sombre.

**Modifiés :**
- `src/app/(frontend)/styles.css` — styles de base rebasés sur les tokens + bandeau provisoire.
- `src/app/(frontend)/layout.tsx` — script anti-flash, bandeau, sélecteur de thème.
- `src/app/(frontend)/page.tsx` — accueil refait avec les composants.
- `src/app/(frontend)/positions/page.tsx` + `positions.css` — liste rebasée sur les tokens et `ImagePosition`.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-26 | 0.1.0 | Design system « Lin & Sauge » : tokens complets (clair + sombre), thème suivant l'OS avec sélecteur et anti-flash, composants de base, application à l'accueil et à la liste des positions. | Amelia (dev agent) |
