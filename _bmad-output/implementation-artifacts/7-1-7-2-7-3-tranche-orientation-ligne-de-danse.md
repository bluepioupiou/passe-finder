---
baseline_commit: a740b3e6
---

# Epic 7 — tranche : orienter les positions dans l'espace (ligne de danse & pivot)

Status: review

> **Nature de ce document.** Demande d'Alain du 2026-10-23 : « améliorer la
> lecture des passes. Actuellement il n'y a pas de logique d'orientation d'une
> position de début et de fin dans une passe alors qu'elles sont dépendantes
> dans la vie réelle. » Rédigé hors de la session de dev, à partir du code de
> `main`. Comme pour la 4.7, le modèle a été discuté **avant** les critères. Les
> questions ouvertes du brouillon ont été tranchées avec Alain le 2026-10-23,
> puis le modèle de la position a été revu le 2026-10-24 (voir « Décisions »).

## Le problème

Une position est aujourd'hui une **configuration relative** du couple (qui tient
quelle main, qui regarde qui), dessinée vue de dessus dans une orientation
**arbitraire** : celle où Alain l'a tracée. Conséquences :

- deux vignettes côte à côte dans une passe ne disent rien de la rotation du
  couple dans la salle ;
- une passe dont le départ et l'arrivée sont la **même position** (un
  changement de côté, par ex.) s'affiche comme si rien ne s'était passé, alors
  que le couple a fait un demi-tour ;
- dans un enchaînement, on ne retrouve pas les danseurs là où on les attend.

## Le but : une rotation « naturelle »

Décision d'Alain (2026-10-24) : on veut **retrouver les danseurs dans les
positions auxquelles on s'attend, sans le souligner**. Les vignettes sont donc
simplement tournées : **ni repère, ni texte, ni animation**. Dire *comment* on
tourne relèvera d'une autre feature.

## Le modèle retenu

Deux informations, posées chacune là où elle est vraie.

### 1. Sur la POSITION : la direction de la ligne de danse dans le dessin (`ligneDeDanse`)

« Dans ce dessin, la ligne de danse pointe vers : haut / droite / bas /
gauche. » C'est une propriété **du dessin** : la même vignette sert de départ et
d'arrivée à des dizaines de passes, elle n'a qu'une direction.

En rock 6 temps, la ligne n'a pas de définition unique par rapport aux
danseurs. Elle dépend de la position :

| Position (exemples) | La ligne… | Les danseurs regardent… |
| --- | --- | --- |
| Fermée | sépare les deux danseurs | vers la ligne, face à face |
| Côte à côte / ouverte | relie les deux danseurs | dans des directions opposées |
| Berceau | sépare les deux danseurs | dans la même direction |

Elle ne se déduit donc pas du schéma : Alain la choisit à l'œil, position par
position. Chaque dessin **garde son orientation la plus lisible**, et rien n'est
redessiné.

### 2. Sur la PASSE : le pivot du couple (`pivot`)

De combien le couple a tourné **par rapport à la ligne de danse** entre la
position de départ et celle d'arrivée. Quatre valeurs, vue de dessus, sens
horaire (convention de `rotation` dans les schémas, y vers le bas) : `0` même
orientation, `90` quart de tour à droite, `180` demi-tour, `270` quart de tour à
gauche.

C'est le **résultat**, jamais le geste. Le sens de rotation et les tours
complets relèvent d'une autre feature ; un tour complet vaut `0`.

### 3. À l'affichage : le départ tel que dessiné, la suite recalée

La première position (départ d'une passe, ou d'un enchaînement) s'affiche
**telle que dessinée** : c'est elle qui fixe le repère de l'écran. Chaque
position suivante est tournée de :

```
angle(P) = orientationₖ + ligne(départ) − ligne(P)        (mod 360)

orientation₀ = 0
orientationₖ = orientationₖ₋₁ + pivotₖ
```

Le terme `ligne(départ) − ligne(P)` aligne la ligne de danse du dessin de P sur
celle du départ ; `orientationₖ` ajoute la rotation du couple. Une **transition**
(changement de prise sans passe) a un pivot nul : la position reprise a
l'orientation de celle qu'on quittait, avec sa propre ligne.

Rien n'est stocké sur l'enchaînement. Une position seule (liste, fiche
position) s'affiche telle que dessinée, comme aujourd'hui : hors d'une passe,
deux positions n'ont pas de relation dans la salle, il n'y a rien à aligner.

## « Non renseigné » n'est pas « zéro »

Au déploiement, ni les ~30 positions ni les ~115 passes ne sont renseignées. Si
l'absence valait `0`, tout afficherait des orientations fausses avec l'aplomb du
vrai.

- `ligneDeDanse` et `pivot` sont **nullables**. `null` = inconnu.
- Une position dont l'angle ne peut pas être calculé s'affiche **telle que
  dessinée**.
- Pivot inconnu : l'orientation devient inconnue **à partir de ce maillon** et
  pour toute la suite, jamais devinée.
- Ligne inconnue sur une position : seule **cette** position reste telle que
  dessinée ; la suite n'est pas affectée (l'orientation du couple ne dépend pas
  du dessin). Ligne inconnue sur le **départ** : rien n'est recalé.

## Décisions

1. **Référence de la ligne de danse** (2026-10-23, revue le 2026-10-24) : elle
   dépend de la position et ne se déduit pas du schéma. D'abord fixée par
   convention de dessin (« ligne vers le haut », à redessiner), elle devient un
   **champ sur la position** : redessiner toutes les positions s'est révélé trop
   coûteux, et imposer la même orientation à tous les dessins en aurait rendu
   certains moins lisibles.
2. **Granularité** : quarts de tour, pour le pivot comme pour la ligne.
3. **Transitions** : pivot nul, aucun champ ajouté.
4. **Sens de rotation** : non stocké, non affiché. Le pivot est le résultat (4
   valeurs).
5. **Aucun indice visuel ni texte** de rotation (2026-10-24).
6. **Pas de guide dans l'atelier** (2026-10-23).

## Critères d'acceptation

### Story 7.1 — Direction de la ligne de danse sur les positions

1. `Position` gagne un champ `ligneDeDanse` : select **facultatif** (`0` haut,
   `90` droite, `180` bas, `270` gauche), éditable dans l'admin et dans
   l'atelier (création et modification).
2. Migration Payload créée ; **aucune valeur inventée** pour l'existant.
3. La liste admin des positions montre la colonne, pour repérer celles à saisir.
4. `ImagePosition` accepte un `angle` facultatif (`number | null`, défaut
   `null`) et applique une rotation CSS. Le PNG n'est **pas** modifié. Aucun
   repère, aucune animation. `null` : aucun changement.
5. Les listes et fiches positions restent telles que dessinées.

### Story 7.2 — Pivot sur les passes

1. `Passe` gagne un champ `pivot` : select **facultatif** à 4 options. La
   conversion texte → nombre se fait à un seul endroit (`pivotDe`).
2. Migration Payload créée ; **aucune valeur inventée**.
3. Liste et fiche passe : le départ tel que dessiné, l'arrivée tournée de
   `pivot + ligne(départ) − ligne(arrivée)`, ou telle que dessinée si l'un des
   trois est inconnu.
4. **Cas témoin** : une passe `X → X` avec `pivot = 180` et la ligne de `X`
   renseignée affiche une arrivée retournée.
5. Aucun libellé de pivot à l'écran. La liste admin des passes montre la
   colonne `pivot`.

### Story 7.3 — Orientation cumulée dans l'enchaînement

1. `orientations(maillons)` rend l'orientation cumulée de chaque étape, ou
   `null` dès le premier pivot inconnu. Une fonction pure unique
   `angleAffiche(orientation, ligneDepart, ligne)` rend l'angle à appliquer,
   ou `null`. Testées unitairement : pivots nuls, demi-tours qui s'annulent,
   quatre quarts, reprise sans pivot, pivot inconnu au milieu, ligne inconnue
   sur une position intermédiaire (seule elle reste telle que dessinée), ligne
   inconnue au départ.
2. `ChaineEnchainement` (lecture) et `Compositeur` (aperçu) : départ tel que
   dessiné, chaque autre bulle (y compris les deux bulles d'une reprise) tournée
   de `angleAffiche`.
3. Aucun champ ajouté à `Enchainement` ; aucune migration des enchaînements.

### Hors périmètre

- Le **sens** de rotation, les **tours complets**, tout texte sur la rotation :
  future feature d'Alain.
- Le **déplacement** du couple dans la salle (translation).
- L'orientation **individuelle** de chaque danseur pendant la passe.
- Choisir l'orientation de départ d'un enchaînement (toujours celle du dessin).
- Aligner les listes de positions sur la ligne de danse.

## Coût réel : la saisie, pas le code

1. Renseigner `ligneDeDanse` sur les ~30 positions (admin ou atelier).
2. Saisir les pivots (~115) avec le filtre admin « pivot n'existe pas », en
   commençant par les passes **des enchaînements les plus consultés**.

Tant que les deux ne sont pas faits pour une passe, elle s'affiche comme
aujourd'hui.

## Dev Agent Record

### Implementation Plan

- Module pur `src/orientation.ts` (sans Payload ni React, utilisable par le
  compositeur côté navigateur) : `Pivot`, `PIVOTS`, `LIGNES`, lecture des
  valeurs stockées (`pivotDe`, `ligneDe`), `orientationsCumulees`,
  `angleAffiche`.
- Champs `Passe.pivot` et `Position.ligneDeDanse`, en colonne par défaut des
  listes admin.
- `ImagePosition` prend un `angle` facultatif : rotation CSS, rien d'autre.
- Angles appliqués sur la liste et la fiche des passes, dans
  `ChaineEnchainement` et dans le `Compositeur` ; `ligneDeDanse` saisissable
  dans l'atelier.

### Completion Notes

- 2026-10-23 : pivot, vignettes tournées, orientation cumulée.
- 2026-10-24 : retrait du repère, des libellés et de la phrase de fin, sur
  décision d'Alain (rotation sans indice visuel). `libellePivot` et
  `libelleOrientationFinale` sont supprimées.
- 2026-10-24 : la convention « ligne vers le haut » est remplacée par le champ
  `ligneDeDanse` sur la position. Le départ s'affiche tel que dessiné, la suite
  est recalée par `angleAffiche`. La case 0 de `orientationsCumulees` vaut
  désormais toujours 0 : c'est le repère.
- Une seule migration (`20261024_084828_orientation`) ajoute les deux colonnes
  nullables. Celle du pivot seul, jamais commitée, a été remplacée.
- Atelier : un menu « Ligne de danse dans le dessin » (« Non renseignée » par
  défaut) dans l'étape d'enregistrement ; il est relu à la modification. Une
  valeur inattendue est lue comme « non renseignée ».
- **Enregistrer sans retracer (demande d'Alain, 2026-10-24)** : une vignette
  historique s'ouvre dans l'atelier sans aucune pièce, et le bouton restait
  grisé. En modification, une position ouverte sans pièce s'enregistre
  désormais en « informations seules » : nom, description et ligne de danse
  sont mis à jour, l'image et `schemaCompose` ne changent pas. Une composition
  existante dont on aurait retiré toutes les pièces reste bloquée. Une création
  sans pièce reste refusée par l'action serveur.
- Vérifié dans le navigateur, avec des valeurs posées temporairement en base
  locale puis remises à vide :
  - « Changement de côté » (X → X, demi-tour) : arrivée à 180° ;
  - « Sortie cavalière » (lignes 0 → 90, pivot 0) : arrivée à 270° ;
  - « Cours du 6 octobre 2009 » : départ tel que dessiné, puis 0, 270, 90 et
    180°, conformes au calcul.

  Des erreurs `LIGNES is not defined` sont apparues dans les journaux pendant
  quelques secondes, entre l'ajout du champ et celui de son import ; tout
  répond en 200 depuis.
- **Non vérifiés dans le navigateur, faute de session connectée** : l'atelier
  (couvert par 3 tests unitaires), la voie « informations seules » de l'action
  serveur (pas de test d'intégration, comme le reste de cette action) et le
  compositeur.
- Tests : unitaires 281/281, intégration 96/96. Lint : 0 erreur. Les tests e2e
  n'ont pas été lancés.

### File List

- `src/orientation.ts` (nouveau)
- `src/collections/Passe.ts`
- `src/collections/Position.ts`
- `src/migrations/20261024_084828_orientation.ts` (nouveau)
- `src/migrations/20261024_084828_orientation.json` (nouveau)
- `src/migrations/index.ts`
- `src/payload-types.ts`
- `src/schema-position.ts`
- `src/composition.ts`
- `src/catalogue.ts`
- `src/enchainements.ts`
- `src/components/ImagePosition.tsx`
- `src/components/ChaineEnchainement.tsx`
- `src/components/Compositeur.tsx`
- `src/components/AtelierPosition.tsx`
- `src/components/atelier-position.css`
- `src/app/(frontend)/passes/page.tsx`
- `src/app/(frontend)/passes/[id]/page.tsx`
- `src/app/(frontend)/positions/actions.ts`
- `src/app/(frontend)/positions/[id]/modifier/page.tsx`
- `tests/unit/orientation.spec.ts` (nouveau)
- `tests/unit/enchainements.spec.ts`
- `tests/unit/composition.spec.ts`
- `tests/unit/compositeur.spec.tsx`
- `tests/unit/atelier-position.spec.tsx`

## Change Log

- 2026-10-23 : questions ouvertes tranchées ; dev du pivot et de l'orientation
  cumulée.
- 2026-10-24 : rotation sans indice visuel ; champ `ligneDeDanse` sur la
  position.
