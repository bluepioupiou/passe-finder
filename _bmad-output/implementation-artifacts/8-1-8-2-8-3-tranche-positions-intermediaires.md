---
baseline_commit: 0142a8c0
---

# Epic 8 — tranche : positions intermédiaires dans le rythme

Status: in-progress (8.1 et 8.2 en review ; 8.3 prête pour le dev)

> **Nature de ce document.** Demande d'Alain du 2026-10-25 : « parfois le texte
> ne suffit pas à décrire, ou pas très bien. J'aimerais pouvoir ajouter des
> positions clés à des instants clés. » Cadrée avec Alain par correct-course
> (`_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-25.md`),
> section par section, à partir du code de `main`. Comme pour l'Epic 7, le
> modèle a été discuté **avant** les critères. FR-47 à FR-50 du PRD, AD-16 de
> l'architecture, E4 et E4b de `EXPERIENCE.md`.

## Le problème

Une passe ne montre que deux images : la position de départ et celle
d'arrivée. Tout ce qui se passe entre les deux repose sur le texte du
`deroule`, qui décrit mal certains gestes.

**Cas témoin : « Trou de souris »** (passe n°19, *Espagnol garçon → Main droite
/ main droite*). La cavalière avance puis recule pendant que le cavalier se
décale à gauche puis à droite. Le couple fait un grand tour et revient presque
à la même position. Les deux vignettes se ressemblent, et ce sont les instants
clés entre les deux qui manquent. Le déroulé actuel est **déjà découpé en
instants** (« 1,2 : … », « 3 et : … », « 4 : … », « 5 et 6 : … ») : la frise
colle à la façon dont Alain pense la passe.

## Le modèle retenu

### 1. Le rythme : une durée sur la passe (`duree`)

| Durée | Comptage | Instants |
| --- | --- | --- |
| 6 temps (défaut) | `1 . 2 . 3 et 4 . 5 et 6 .` | 12 |
| 10 temps | `1 . 2 . 3 et 4 . 5 et 6 . 7 et 8 . 9 et 10 .` | 20 |

- **Un instant = un demi-temps**, chaque chiffre, « et » ou « . » est un tic.
- 10 temps **répète** `3 et 4 . 5 et 6 .` : c'est ainsi qu'Alain ralentit une
  passe. **8 temps n'existe pas.**
- Le comptage est **généré**, jamais saisi : `1 . 2 .` puis des paires de pas
  chassés `n et n+1 .` jusqu'à la durée.
- `instant` est l'**index** dans ce comptage, à partir de 0 : en 6 temps, `0` =
  « 1 », `4` = « 3 », `5` = « et », `6` = « 4 », `11` = le « . » final.

**Ici, contrairement à l'Epic 7, « non renseigné » vaut 6 temps** (décision
d'Alain). C'est la grande majorité des passes. Une durée fausse ne trompe
personne tant que la passe n'a pas de position intermédiaire, et le hook
empêche de la réduire sous une position existante. Alain n'aura à saisir que
les passes de 10 temps.

### 2. Les positions : un tableau embarqué dans la passe (`positionsIntermediaires`)

`[{ instant: number, schema: SchemaPosition }]`, au plus **une par instant**.

- **Ni nom, ni description, ni note, ni fiche.** La description de la passe
  dit le reste (décision d'Alain).
- **Jamais réutilisées**, jamais listées ailleurs que sur la fiche de leur
  passe. C'est pourquoi elles vivent **dans** la Passe et non dans une
  collection : elles naissent et meurent avec elle, et ne peuvent pas fuir vers
  la recherche, le catalogue, le compositeur ou la garde de suppression.
- **L'ordre est celui des instants**, pas l'index du tableau : l'écriture trie
  par `instant`, la lecture aussi (ceinture et bretelles).
- **Aucun PNG, aucun Media.** `ScenePosition` dessine le schéma en SVG à
  l'affichage. Pas de fichier orphelin, et une correction se voit tout de
  suite.
- `schema.calque` est **remis à `null` à l'enregistrement** : le calque aide à
  dessiner et ne fait pas partie du dessin (même règle que l'atelier).

### 3. Le repère : celui du départ, sans recalage

Alain dessine chaque position **par-dessus le départ en calque**, donc déjà
orientée. Sur la fiche passe, le départ s'affiche tel que dessiné (Epic 7), et
les positions intermédiaires aussi : **aucun angle**, ni `ligneDeDanse`, ni
`pivot`. Seule l'arrivée garde la rotation de l'Epic 7.

Le calque est le **schéma** du départ s'il en a un, sinon son **image**. Seules
3 positions sur 31 ont un schéma d'atelier : le cas courant est l'image
historique.

## Décisions (Alain, 2026-10-25)

1. **Atelier de schémas**, pas d'images téléversées.
2. **Durée 6 ou 10 temps** ; vide = 6 ; pas de 8.
3. **Une position par instant.**
4. **Pas de note** par position.
5. **Fiche passe seulement** : jamais dans un enchaînement (lecture ni
   compositeur).
6. **Bascule « Simple | Rythme »**, visible seulement s'il y a au moins une
   position intermédiaire ; « Simple » par défaut, **non mémorisée**.
7. **Sur mobile, seulement les instants occupés**, avec la ligne de comptage
   complète en tête.
8. **Saisie depuis la page « Modifier » de la fiche passe** : l'admin Payload
   ne sait pas afficher l'atelier. Il montre `duree`, et masque
   `positionsIntermediaires`.

## Critères d'acceptation

### Story 8.1 — Durée et comptage d'une passe

1. Module pur `src/rythme.ts` (sans Payload ni React, il part dans le
   navigateur, comme `orientation.ts`) :
   - `DUREES` (les options du select : `6`, `10`) ;
   - `dureeDe(valeur)` → `6 | 10` (vide ou valeur inattendue → `6`) ;
   - `comptage(duree)` → les libellés des instants (`['1', '.', '2', '.', '3',
     'et', '4', '.', '5', 'et', '6', '.']`) ;
   - `libelleInstant(duree, instant)` → `'3 et'`-style pour un instant donné,
     ou `null` hors durée. Format exact à fixer au dev, utilisé par le texte
     alternatif et l'en-tête de l'atelier.
2. Tests unitaires : 6 temps (12 instants), 10 temps (20 instants), vide →
   6, valeur inattendue → 6, instant hors durée → `null`.
3. `Passe` gagne `duree` : select **facultatif**. La liste admin montre la
   colonne. Migration Payload **sans valeur inventée**.
4. La page « Modifier » de la fiche passe (`FormulairePasse`) propose la durée.

### Story 8.2 — Dessiner les positions intermédiaires

1. `Passe` gagne `positionsIntermediaires` : champ tableau `{ instant: number
   (required), schema: json (required) }`, **masqué dans l'admin**. Même
   migration que 8.1 si les deux stories sont livrées ensemble, sinon une
   seconde.
2. Hook `beforeValidate` de la Passe, avec un message en français pour chaque
   refus :
   - instant non entier, négatif, ou `≥` nombre d'instants de la durée ;
   - deux positions sur le même instant ;
   - schéma rejeté par `schemaSur` ;
   - **réduction de durée** laissant une position hors de la nouvelle durée :
     « Retire d'abord les positions après le 6 . » (FR-50). Rien n'est
     supprimé en silence.
3. L'écriture passe par une action serveur qui appelle l'API Local **avec
   l'utilisateur** (`overrideAccess: false`) : un non-admin est refusé par
   l'`access` de la collection (AD-1, AD-3), pas par l'UI.
4. Page « Modifier » de la fiche passe, section « Positions intermédiaires » :
   la frise du comptage (composant partagé avec 8.3), un **« + »** sur chaque
   instant libre, et sur chaque instant occupé **rouvrir** ou **retirer**
   (avec confirmation).
5. `AtelierPosition`, mode « position intermédiaire » :
   - le départ en calque (schéma s'il existe, sinon image) ;
   - pas de nom, de description ni de ligne de danse ;
   - **pas d'export PNG** ;
   - en-tête « <nom de la passe> — instant <libellé> » ;
   - « Enregistrer » ramène à la page « Modifier ».

   Le mode ne doit pas dégrader l'atelier des positions : ses tests existants
   restent verts.
6. Le champ n'est lu **nulle part ailleurs** : la recherche, les listes, le
   compositeur (`src/engine/`, `composition.ts`) et les fiches position
   l'ignorent. Vérifier qu'aucune requête publique de liste ne le charge
   inutilement (`select` / `depth`).
7. Tests : unitaires sur les règles de validation (fonction pure appelée par le
   hook), intégration sur le hook (refus et réduction de durée) et sur l'accès
   non-admin.

### Story 8.3 — Affichage « Rythme » sur la fiche passe

1. Passe **sans** position intermédiaire : aucune bascule, la fiche est
   **identique** à aujourd'hui.
2. Passe **avec** des positions intermédiaires : contrôle segmenté « Simple |
   Rythme » au-dessus des images, « Simple » actif à l'ouverture, **non
   mémorisé**.
3. « Rythme », sur PC : frise horizontale. Le départ à gauche, l'arrivée à
   droite, entre les deux tous les instants, et une vignette au-dessus de
   chaque instant occupé. Un instant vide n'affiche que son libellé.
4. « Rythme », sur mobile : colonne verticale. Le départ en haut, l'arrivée en
   bas, **seulement les instants occupés** (libellé + vignette), et en tête le
   comptage complet en une ligne, avec les instants occupés en `{colors.accent}`.
5. Vignettes intermédiaires : `ScenePosition` (SVG), **non cliquables**, texte
   alternatif « Position à l'instant <libellé> ». Départ et arrivée restent
   cliquables (FR-22), et l'arrivée garde son angle Epic 7.
6. La bascule est utilisable au clavier, avec un focus visible ; elle respecte
   `prefers-reduced-motion` (pas d'animation imposée).
7. **Cas témoin e2e** : « Trou de souris » avec des positions sur « 3 et »,
   « 4 » et « 5 et » → en « Rythme », elles apparaissent dans cet ordre, à leur
   instant ; en « Simple », la fiche est inchangée.

### Hors périmètre

- Réutiliser ou **copier** des positions intermédiaires d'une passe à l'autre
  (« Trou de souris contrarié » partage la première moitié de « Trou de
  souris » : piste future, pas ce lot).
- Les afficher dans un **enchaînement** (lecture ou compositeur), et donc les
  faire tourner avec l'orientation cumulée de l'Epic 7.
- Une **note** ou un nom par position.
- Une durée de **8 temps**, ou toute autre durée.
- Une animation ou un « lecteur » qui ferait défiler les instants.

## Point à trancher au dev de la 8.2

Quand le départ **a** un schéma d'atelier, l'atelier pourrait partir d'une
**copie de ses pièces** plutôt que d'un simple calque : on déplace les bras au
lieu de tout redessiner. Ce n'est pas validé par Alain. On livre le calque
(décision 1), et on lui pose la question devant l'atelier.

## Coût réel : la saisie, pas le code

1. Mettre 10 temps sur les quelques passes concernées (vide = 6 pour les
   autres).
2. Dessiner les positions intermédiaires, passe par passe, en commençant par
   « Trou de souris » et les passes dont le déroulé est le plus long.

Tant qu'une passe n'a pas de position intermédiaire, elle s'affiche exactement
comme aujourd'hui.

## Dev Agent Record

### Implementation Plan

- **8.1** — Module pur `src/rythme.ts` (`Duree`, `DUREES`, `dureeDe`,
  `comptage`, `libelleInstant`), sur le modèle de `src/orientation.ts`. Champ
  `Passe.duree` (select facultatif, options lues dans `DUREES`), en colonne par
  défaut de la liste admin. Durée ajoutée à `SaisiePasse` / `donneesDePasse`
  et au `FormulairePasse` de la page « Modifier ».
- **8.2** — Module pur `src/positions-intermediaires.ts` (lecture, validation,
  pose, retrait, `SANS_POSITIONS_INTERMEDIAIRES`). Champ tableau
  `Passe.positionsIntermediaires` (`admin.hidden`), second `beforeValidate`
  qui juge les données reçues ou, à défaut, celles déjà enregistrées, et
  `defaultPopulate` qui l'exclut des passes peuplées. Actions serveur
  `enregistrerPositionIntermediaire` / `retirerPositionIntermediaire`, qui
  relisent toujours la passe avant de réécrire. `AtelierPosition` gagne
  `intermediaire` et `destination`. Nouvelle route
  `/passes/[id]/intermediaires/[instant]` et frise
  `EditionPositionsIntermediaires` sur la page « Modifier ».

### Completion Notes

- 2026-10-25 — **Story 8.1 terminée.**
  - `comptage` génère `1 . 2 .` puis des paires `n et n+1 .` : 12 instants en
    6 temps, 20 en 10 temps. `libelleInstant` nomme un temps par son chiffre
    (« 4 ») et un demi-temps avec le temps qui le précède (« 3 et », « 6 . »),
    sinon tous les « . » se ressembleraient ; `null` hors durée ou pour un
    instant non entier.
  - `dureeDe` lit vide, `'8'` ou toute valeur inattendue comme 6 temps.
  - Migration `20261025_221808_duree` : une colonne `duree` nullable, **aucune
    valeur écrite** pour l'existant.
  - **Choix de la page « Modifier »** : le menu montre toujours une durée
    (« 6 temps » pour une durée vide, puisque c'est ce qu'elle vaut), et
    l'enregistrement écrit donc `'6'` ou `'10'`, jamais `null`. Une passe
    enregistrée depuis la fiche passe de « vide » à `'6'` : même valeur lue,
    rien ne change à l'écran. L'admin, lui, laisse le champ vide si on n'y
    touche pas.
  - Vérifié dans le navigateur (serveur de dev local, compte admin de test
    créé puis supprimé) : « Trou de souris » → page « Modifier » montre
    « Durée : 6 temps » à côté du pivot ; la liste admin des passes montre la
    colonne « Durée » ; aucune erreur console.
  - Tests : unitaires 296/296 (dont 8 nouveaux dans `rythme.spec.ts` et 2 dans
    `edition-passe.spec.ts`), intégration 96/96, e2e `modifier-passe` 3/3 (dont
    le nouveau « propose 6 temps pour une durée vide, puis enregistre 10
    temps »). `tsc` sans erreur, lint sans erreur sur les fichiers touchés. La
    suite e2e complète n'a pas été lancée.

- 2026-10-26 — **Story 8.2 terminée.**
  - **Le calque est toujours l'IMAGE du départ.** Le calque de l'atelier ne
    sait afficher qu'une image (`calque.src`), et toute position composée
    dans l'atelier a aussi son PNG : on ne perd rien. Sans vraie image (le
    placeholder), pas de calque. Une nouvelle position part du couple par
    défaut, par-dessus le calque. Le point « copier les pièces du départ »
    reste à poser à Alain (voir plus haut).
  - Le calque n'est **jamais stocké** (`poserPosition` le remet à `null`) et
    se remet à chaque ouverture de l'atelier.
  - `destination` est un **chemin**, pas une fonction : la page qui monte
    l'atelier est un composant serveur, et une fonction ne traverse pas la
    frontière serveur → client.
  - Le hook juge une mise à jour partielle (la durée seule, depuis le
    formulaire) sur les positions **déjà enregistrées** : c'est ce qui bloque
    une réduction de durée, avec le message « En 6 temps, la passe s'arrête à
    « 6 . » : retire d'abord la position posée sur « 7 et ». »
  - La frise d'édition suit la durée **enregistrée**, pas celle du menu du
    formulaire, et le dit : passer à 10 temps, c'est enregistrer d'abord.
  - Les 8 requêtes de listes de passes (liste, fiche position ×2, recherche,
    catalogue ×3, nouveautés) passent `select: SANS_POSITIONS_INTERMEDIAIRES`.
    Les passes peuplées (enchaînements…) en sont privées par `defaultPopulate`.
  - Migration `20261026_225154_positions_intermediaires` : une nouvelle table
    `passes_positions_intermediaires`, rien de modifié dans l'existant.
  - Vérifié dans le navigateur (serveur de dev local, compte admin de test
    créé puis supprimé, rien d'enregistré sur les vraies passes) : la page
    « Modifier » de « Trou de souris » montre la frise `1 . 2 . 3 et 4 . 5 et
    6 .` avec ses 12 « + » ; l'atelier sur « 3 et » s'ouvre avec le titre
    « Trou de souris — instant « 3 et » », le départ « Espagnol garçon » en
    calque à 35 %, sans nom, description ni ligne de danse ; aucune erreur
    console. Capture d'écran impossible sur la frise (panneau du navigateur
    masqué) : contrôle par lecture de la page.
  - Tests : unitaires 309/309 (11 nouveaux dans `positions-intermediaires`,
    2 dans `atelier-position`), intégration 102/102 (6 nouveaux : ordre,
    doublon, hors durée, réduction de durée, accès non-admin, exclusion des
    listes), e2e 8/8 sur l'atelier, la page « Modifier » et le nouveau
    parcours « pose une position sur « 3 et », puis la retire ». `tsc` sans
    erreur, lint 0 erreur (les 4 avertissements nouveaux sont les signatures
    générées par Payload dans la migration, comme pour les autres). La suite
    e2e complète n'a pas été lancée.

### File List

- `src/rythme.ts` (nouveau)
- `src/collections/Passe.ts`
- `src/edition-passe.ts`
- `src/components/FormulairePasse.tsx`
- `src/app/(frontend)/passes/[id]/modifier/page.tsx`
- `src/migrations/20261025_221808_duree.ts` (nouveau)
- `src/migrations/20261025_221808_duree.json` (nouveau)
- `src/migrations/index.ts`
- `src/payload-types.ts`
- `tests/unit/rythme.spec.ts` (nouveau)
- `tests/unit/edition-passe.spec.ts`
- `tests/e2e/modifier-passe.e2e.spec.ts`
- `src/positions-intermediaires.ts` (nouveau, 8.2)
- `src/app/(frontend)/passes/actions.ts`
- `src/app/(frontend)/passes/[id]/intermediaires/[instant]/page.tsx` (nouveau, 8.2)
- `src/components/AtelierPosition.tsx`
- `src/components/EditionPositionsIntermediaires.tsx` (nouveau, 8.2)
- `src/components/edition-positions-intermediaires.css` (nouveau, 8.2)
- `src/migrations/20261026_225154_positions_intermediaires.ts` (nouveau, 8.2)
- `src/migrations/20261026_225154_positions_intermediaires.json` (nouveau, 8.2)
- `src/app/(frontend)/passes/page.tsx`
- `src/app/(frontend)/positions/[id]/page.tsx`
- `src/app/(frontend)/recherche/page.tsx`
- `src/catalogue.ts`
- `src/nouveautes.ts`
- `tests/unit/positions-intermediaires.spec.ts` (nouveau, 8.2)
- `tests/unit/atelier-position.spec.tsx`
- `tests/int/positions-intermediaires.int.spec.ts` (nouveau, 8.2)
- `tests/e2e/positions-intermediaires.e2e.spec.ts` (nouveau, 8.2)

## Change Log

- 2026-10-25 : cadrage par correct-course ; modèle et décisions validés par
  Alain ; prêt pour le dev.
- 2026-10-25 : Story 8.1 — durée et comptage d'une passe (`src/rythme.ts`,
  champ `duree`, migration, page « Modifier »).
- 2026-10-26 : Story 8.2 — dessiner les positions intermédiaires (champ
  tableau, hook, actions, mode de l'atelier, frise d'édition).
