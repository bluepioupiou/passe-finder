---
title: Sprint Change Proposal — Epic 8, positions intermédiaires dans le rythme
date: 2026-10-25
auteur: Alain (avec le workflow correct-course)
statut: approuvée par Alain le 2026-10-25, appliquée
portée: modérée
---

# Sprint Change Proposal — Epic 8 : positions intermédiaires dans le rythme

## 1. Résumé du changement

**Déclencheur.** Demande d'Alain du 2026-10-25, hors de toute story en cours.
L'Epic 7 (orientation) est en review et n'est pas remise en cause.

**Problème.** Une passe ne montre que deux images : la position de départ et
celle d'arrivée. Tout ce qui se passe entre les deux repose sur le texte du
déroulé, qui décrit mal certains gestes.

**Besoin.** Poser des **positions clés à des instants clés du rythme**. Chaque
demi-temps du comptage est un instant : `1 . 2 . 3 et 4 . 5 et 6 .` pour une
passe de 6 temps. Ces positions sont **propres à la passe** : sans nom, sans
fiche, jamais réutilisées. Alain les dessine **déjà orientées**, dans le repère
du départ. La fiche passe reste inchangée par défaut ; une **bascule** ouvre un
affichage avancé qui place ces positions sur la frise du comptage.

**Cas témoin.** « Trou de souris » (passe n°19, Espagnol garçon → Main droite /
main droite). La cavalière avance puis recule pendant que le cavalier se décale
à gauche puis à droite. Le couple fait un grand tour pour revenir presque à la
même position, et les instants clés entre les deux sont ce qui manque. Le
déroulé actuel est déjà découpé en instants (« 1,2 : … », « 3 et : … »,
« 4 : … », « 5 et 6 : … »).

## 2. Analyse d'impact

### Epics

| Epic | Impact |
| --- | --- |
| Epic 7 (orientation) | Se termine telle quelle. Les positions intermédiaires sont dessinées dans le repère du départ : ni `ligneDeDanse`, ni pivot, ni recalage. |
| Epic 6 (migration) | La 6.4 (rejouabilité) n'est pas touchée : les nouveaux champs sont vides par défaut. |
| Autres | Aucun impact, aucun epic rendu obsolète. |
| **Epic 8 (nouveau)** | 3 stories : 8.1 durée et comptage, 8.2 dessin des positions intermédiaires, 8.3 affichage « Rythme ». |

### Documents

| Document | Changement |
| --- | --- |
| PRD | Ajout de FR-47 à FR-50 après FR-46. Rien de retiré, MVP non touché. |
| Architecture | Ajout d'AD-16 ; `binds` passe à FR-1..FR-50. Pas de nouvelle entité. |
| UX (`EXPERIENCE.md`) | E4 Fiche passe : bascule et frise. Nouvelle section « Modifier une passe » pour la saisie. Nouveau mode de l'atelier. |
| `epics.md` | Epic 8 dans la liste, puis ses stories. |
| `sprint-status.yaml` | Epic 8 et stories en `backlog`. |

### Technique

- Deux champs nullables sur `Passe` (`duree`, `positionsIntermediaires`), donc
  une migration Payload sans valeur inventée.
- Un module pur `src/rythme.ts`, testé unitairement.
- Un mode « position intermédiaire » dans `AtelierPosition`.
- Une frise sur la fiche passe et sur sa page « Modifier ».
- Aucun impact sur le déploiement, la CI ni l'infrastructure.

### Constats qui ont orienté les choix

- Seules **3 positions sur 31** ont un schéma d'atelier (base locale). On ne
  peut donc presque jamais partir d'une copie du schéma du départ. Le départ
  sert de **calque de décalque** (son schéma s'il en a un, sinon son image),
  ce que l'atelier sait déjà faire.
- L'atelier transforme un schéma en PNG stocké dans les médias. Pour les
  positions intermédiaires, on ne génère **aucune image** : `ScenePosition`
  dessine le schéma directement à l'écran (SVG).
- L'admin Payload ne sait pas afficher l'atelier : la saisie se fait depuis la
  page « Modifier » de la fiche passe.

## 3. Approche retenue

**Ajustement direct : un nouvel epic, sans toucher à l'existant.**

- Effort : moyen (mode atelier et frise).
- Risque : faible (deux champs nullables, aucune donnée existante modifiée).
- Le retour arrière et la révision du MVP ne s'appliquent pas : c'est un ajout.

Décisions prises avec Alain le 2026-10-25 :

1. Une passe dure **6 ou 10 temps**. 8 temps n'existe pas (on ralentit en
   passant directement à 10). Une durée vide vaut **6 temps**.
2. 10 temps répète `3 et 4 . 5 et 6 .` :
   `1 . 2 . 3 et 4 . 5 et 6 . 7 et 8 . 9 et 10 .` (20 instants).
3. Une position intermédiaire est un **schéma d'atelier stocké dans la passe**,
   sans nom, sans description, sans note : la description de la passe suffit.
4. **Au plus une position par instant.**
5. L'affichage avancé n'existe que sur **la fiche passe**, jamais dans un
   enchaînement.
6. La bascule « Simple | Rythme » n'apparaît que si la passe a au moins une
   position intermédiaire. Elle n'est **pas mémorisée** : « Simple » par défaut.

## 4. Propositions de modification détaillées

### 4.1 PRD — `prds/prd-passe-finder-2026-07-20/prd.md`, §7, après FR-46

```markdown
**Positions intermédiaires** _(ajoutés le 2026-10-25 — demande d'Alain : le
déroulé écrit ne suffit pas pour certaines passes, ex. « Trou de souris » ;
voir Epic 8)_

- **FR-47.** Une passe a une **durée** : **6 temps** (valeur par défaut, y compris
  quand elle n'est pas renseignée) ou **10 temps**. Chaque demi-temps est un
  **instant** du comptage : 6 temps → `1 . 2 . 3 et 4 . 5 et 6 .` (12 instants) ;
  10 temps → `1 . 2 . 3 et 4 . 5 et 6 . 7 et 8 . 9 et 10 .` (20 instants).
- **FR-48.** L'admin peut ajouter à une passe des **positions intermédiaires**, au
  plus **une par instant**, dessinées dans l'atelier par-dessus la position de
  départ en calque, donc dans son repère. Elles n'ont **ni nom, ni description,
  ni fiche** ; elles n'apparaissent **nulle part ailleurs** que sur la fiche de
  leur passe et ne sont jamais réutilisées.
- **FR-49.** La fiche passe s'affiche **comme aujourd'hui par défaut**. Si la passe
  a au moins une position intermédiaire, une **bascule** ouvre l'**affichage
  avancé** : le comptage de la passe, avec le départ, chaque position
  intermédiaire à son instant, et l'arrivée (orientée comme en Epic 7). Sans
  position intermédiaire, la bascule n'apparaît pas.
- **FR-50.** Réduire la durée d'une passe est **refusé** tant qu'une position
  intermédiaire occupe un instant qui disparaîtrait ; rien n'est supprimé en
  silence.
```

### 4.2 Architecture — `architecture/architecture-passe-finder-2026-07-21/ARCHITECTURE-SPINE.md`

Frontmatter : `binds: [FR-1..FR-43, NFR-1..NFR-7]` → `binds: [FR-1..FR-50, NFR-1..NFR-7]`.

Après AD-15 :

```markdown
### AD-16 — Positions intermédiaires : embarquées dans la Passe, rendues sans image
- **Binds:** FR-47, FR-48, FR-49, FR-50
- **Prevents:** une collection fantôme de positions sans nom qui fuiraient dans
  le catalogue, la recherche ou le graphe ; des PNG orphelins dans les médias ;
  un comptage recodé différemment par chaque écran
- **Rule:**
  - `Passe.duree` : select facultatif (`6` | `10`) ; vide = 6 temps. La lecture
    texte → nombre et le comptage (`1 . 2 . 3 et 4 …`) vivent dans un seul
    module pur `src/rythme.ts` (sans Payload ni React, comme `orientation.ts`).
  - `Passe.positionsIntermediaires` : champ tableau Payload `{ instant, schema }`.
    `instant` = index du demi-temps (0 = « 1 ») ; `schema` = le JSON de l'atelier
    (`SchemaPosition`). **L'ordre d'affichage est celui des instants**, pas
    l'index du tableau.
  - Un hook `beforeValidate` refuse : un instant hors de la durée, deux
    positions sur le même instant, un schéma invalide (FR-50 inclus : réduire
    la durée est refusé si un instant disparaîtrait).
  - **Jamais de PNG ni de Media** : le schéma est dessiné à l'affichage par
    `ScenePosition` (SVG). Aucune orientation Epic 7 ne s'y applique : il est
    déjà dans le repère du départ.
  - Le moteur de composition, la recherche, les listes et les fiches position
    **ignorent** ce champ. L'écriture passe par une action serveur qui appelle
    l'API Local de Payload **avec l'utilisateur** (AD-1, AD-3 : admin seul).
  - L'admin Payload montre `duree` ; `positionsIntermediaires` y est masqué
    (inéditable sans l'atelier) et se gère depuis la page « Modifier » de la
    fiche passe.
```

### 4.3 UX — `ux-designs/ux-passe-finder-2026-07-21/EXPERIENCE.md`

**E4 — Fiche Passe**, ajout aux Éléments :

```markdown
- **Bascule d'affichage** _(Epic 8, FR-49)_ — visible seulement si la passe a au
  moins une position intermédiaire. Contrôle segmenté **« Simple | Rythme »**
  au-dessus des images, « Simple » par défaut, non mémorisé.
  - **Simple** : inchangé (départ → arrivée).
  - **Rythme** : la frise du comptage de la passe.
    - **PC** : frise horizontale. Le départ à gauche, l'arrivée à droite, entre
      les deux **tous les instants** du comptage (`1 . 2 . 3 et 4 …`) ; une
      vignette au-dessus de chaque instant occupé, un instant vide n'affiche
      que son libellé.
    - **Mobile** : colonne verticale, **seulement les instants occupés**
      (libellé + vignette), entre le départ en haut et l'arrivée en bas ; le
      comptage complet en une ligne en tête, instants occupés en accent.
  - Vignettes intermédiaires **non cliquables** (elles n'ont pas de fiche) ;
    départ et arrivée restent cliquables (FR-22). Texte alternatif :
    « Position à l'instant 3 et » (pas de nom à donner).
```

**Nouveau — Modifier une passe, section « Positions intermédiaires » (admin)** :

```markdown
- Choix de la **durée** (6 temps / 10 temps).
- La même frise, en édition : un **« + »** sur chaque instant libre ouvre
  l'atelier ; une vignette existante se **rouvre** pour être corrigée ou
  **retirée** (avec confirmation).
- Réduire la durée alors qu'un instant au-delà est occupé : message
  « Retire d'abord les positions après le 6 . » (FR-50).
```

**Nouveau — Atelier, mode « position intermédiaire »** :

```markdown
- Le **départ de la passe en calque** (son schéma s'il en a un, sinon son
  image) ; on dessine par-dessus.
- Ni nom, ni description, ni ligne de danse ; pas d'export PNG.
- En-tête : « Trou de souris — instant 3 et », bouton « Enregistrer » qui
  ramène à la page Modifier.
```

### 4.4 Epics — `epics.md`

Dans l'**Epic List**, après Epic 7 :

```markdown
### Epic 8: Positions intermédiaires dans le rythme
Montrer ce que le texte dit mal : poser, sur les instants du comptage d'une
passe (6 ou 10 temps), des positions dessinées dans l'atelier par-dessus le
départ. Sans nom ni fiche, elles ne vivent que sur la fiche de leur passe,
derrière une bascule « Simple | Rythme ».
**Détail & décisions :** `_bmad-output/implementation-artifacts/8-1-8-2-8-3-tranche-positions-intermediaires.md`
```

En fin de document : la section « Epic 8 » avec les stories 8.1, 8.2 et 8.3 et
leurs critères (Given / When / Then), puis le hors-périmètre : réutiliser ou
copier des positions intermédiaires entre passes ; les afficher dans un
enchaînement ; une note par position ; 8 temps.

### 4.5 Sprint status — `implementation-artifacts/sprint-status.yaml`

```yaml
  # --- Epic 8: Positions intermédiaires dans le rythme ---
  # Ajoute le 2026-10-25 (correct-course). Tranche dans
  # 8-1-8-2-8-3-tranche-positions-intermediaires.md. Ordre : 8.1, 8.2, 8.3.
  epic-8: backlog
  8-1-duree-et-comptage-d-une-passe: backlog
  8-2-dessiner-les-positions-intermediaires: backlog
  8-3-affichage-rythme-sur-la-fiche-passe: backlog
  epic-8-retrospective: optional
```

## 5. Passage de relais

**Portée : modérée.** On ajoute des stories au backlog, sans re-planification
du produit.

| Rôle | Responsabilité |
| --- | --- |
| Correct-course (cette session) | Appliquer les modifications 4.1 à 4.5 et rédiger le document de tranche de l'Epic 8, sur la branche `feat/epic-8-positions-intermediaires`. |
| Développeur (`bmad-dev-story`) | Développer 8.1, puis 8.2, puis 8.3, à partir du document de tranche. |
| Alain | Saisir la durée des passes de 10 temps et dessiner les positions intermédiaires, en commençant par « Trou de souris ». |

**Critères de succès.**

- Une passe sans position intermédiaire s'affiche exactement comme aujourd'hui.
- « Trou de souris » montre, en affichage « Rythme », ses positions
  intermédiaires au bon instant, sur PC comme sur mobile.
- Aucune position intermédiaire n'apparaît dans le catalogue, la recherche, le
  compositeur ou une fiche position.
- Aucun fichier n'est ajouté aux médias par une position intermédiaire.
