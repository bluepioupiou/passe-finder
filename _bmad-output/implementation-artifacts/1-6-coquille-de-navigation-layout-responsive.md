# Story 1.6: Coquille de navigation & layout responsive

Status: review

## Story

As a utilisateur (connecté ou visiteur),
I want une barre de navigation globale et une mise en page cohérente sur mobile et PC,
so that je m'oriente dans l'application quel que soit mon écran.

## Acceptance Criteria

1. **Given** le système visuel de la Story 1.5, **When** j'affiche n'importe quelle page, **Then** une barre de navigation haute est présente : à gauche logo → Accueil, lien Catalogue, entrée de recherche globale ; à droite, une zone d'actions de compte (UX-DR4), **And** le contenu s'inscrit dans un layout appliquant marges et espacements des tokens (16px mobile / 24px desktop).

2. **Given** un petit écran (mobile), **When** j'affiche la barre de navigation, **Then** elle passe en version compacte (menu replié) tout en gardant l'accès aux entrées principales (NFR-1).

3. **Given** que l'authentification n'est pas encore livrée (Epic 3), **When** j'affiche la zone d'actions de compte, **Then** elle présente un état par défaut « Se connecter » (placeholder), sans dépendre d'une story future, **And** les libellés sont en français (NFR-7).

## Tasks / Subtasks

- [x] **Task 1 — Composant de navigation** (AC: #1, #3)
  - [x] Marque → Accueil, lien Catalogue, champ de recherche globale, zone de compte, sélecteur de thème.
  - [x] Libellés en français ; valeurs issues exclusivement des tokens.
- [x] **Task 2 — Version compacte mobile** (AC: #2)
  - [x] Repli derrière un bouton « Menu » sous 768px, déploiement au-dessus.
  - [x] Attributs d'accessibilité `aria-expanded` / `aria-controls` corrects.
- [x] **Task 3 — Placeholders assumés** (AC: #3)
  - [x] Zone de compte figée sur « Se connecter », désactivée (Epic 3).
  - [x] Recherche présente mais désactivée (page de résultats E10 : Story 5.5).
- [x] **Task 4 — Intégration au layout** (AC: #1)
  - [x] Bandeau provisoire de la Story 1.5 remplacé par la navigation ; sélecteur de thème déplacé dedans.
  - [x] Marges de page pilotées par le token `--page-margin`.
- [x] **Task 5 — Vérification** (AC: #1, #2, #3)
  - [x] `tsc` 0 erreur, `lint` 0 erreur, `test:int` 1/1.
  - [x] Comportement responsive vérifié dans le navigateur à 375px, 750px et 1280px.
  - [x] Image Docker reconstruite, test de fumée 3/3.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

**Mesures relevées dans le navigateur :**

| Largeur | `--page-margin` | Padding réel | Bouton « Menu » | Contenu de la barre |
| --- | --- | --- | --- | --- |
| 375px (mobile) | 16px | 16px | visible | replié (`display: none`) |
| 750px | 16px | 16px | visible | replié |
| 1280px (desktop) | 24px | 24px | **masqué** | déployé, champ de recherche à 260px |

**Bascule du menu mobile** (déclenchée par script, le panneau n'étant pas affiché) :
- avant : libellé « Menu », `aria-expanded="false"`, contenu masqué ;
- après : libellé « Fermer », `aria-expanded="true"`, contenu visible, lien Catalogue accessible ;
- `aria-controls` pointe bien sur l'identifiant du conteneur replié.

**Autres contrôles :** `tsc` 0 erreur ; `lint` 0 erreur ; `test:int` 1/1 ; image Docker reconstruite ; **test de fumée 3/3** contre le conteneur. Persistance du thème confirmée au passage (le choix « Clair » fait lors de la Story 1.5 était toujours appliqué après rechargement).

### Completion Notes List

Barre de navigation globale livrée, conforme à UX-DR4, et bandeau provisoire de la Story 1.5 retiré.

**Deux placeholders assumés, et pourquoi :**
1. **Zone de compte** — « Se connecter » désactivé. Exigé tel quel par l'AC #3 : l'authentification est l'Epic 3.
2. **Recherche globale** — champ présent mais **désactivé**, avec l'intitulé « Recherche — bientôt disponible ». L'AC #1 impose que l'entrée soit présente, mais la page de résultats (E10) relève de la Story 5.5. Un champ actif mènerait à une page inexistante : plutôt qu'un lien mort visible par les élèves, le champ affiche honnêtement son état. C'est la même logique que celle retenue par l'AC #3 pour l'authentification.

**Choix d'implémentation :**
- **Mobile d'abord** : le contenu de la barre est replié par défaut et ne se déploie qu'à partir de 768px, seuil déjà utilisé par le token `--page-margin` — un seul point de rupture pour toute la coquille.
- **« Catalogue » pointe sur `/positions`**, seule page de catalogue existante. La vraie page E2 (onglets Positions | Passes, recherche, filtre difficulté) est la Story 5.4 ; le lien n'aura pas à changer de place.
- **Le libellé « Rechercher » reste lisible par les lecteurs d'écran** sur desktop (masqué visuellement, pas retiré du DOM).
- **Fermeture automatique du menu** au clic sur un lien : sans cela, le menu resterait ouvert par-dessus la page d'arrivée sur mobile.

**Non couvert** (arrive avec l'Epic 3, comme prévu par UX-DR4) : bouton « Créer un enchaînement » en accent et menu profil (mes enchaînements / mes favoris / déconnexion) pour l'utilisateur connecté.

### File List

**Nouveaux fichiers :**
- `src/components/Navigation.tsx` — barre de navigation globale, repli mobile.
- `src/components/navigation.css` — styles, entièrement basés sur les tokens.

**Modifiés :**
- `src/app/(frontend)/layout.tsx` — la navigation remplace le bandeau provisoire.
- `src/app/(frontend)/styles.css` — styles du bandeau provisoire retirés.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-26 | 0.1.0 | Barre de navigation globale responsive (repli mobile sous 768px), intégrée au layout ; recherche et zone de compte en placeholders désactivés, en attendant leurs stories respectives. | Amelia (dev agent) |
