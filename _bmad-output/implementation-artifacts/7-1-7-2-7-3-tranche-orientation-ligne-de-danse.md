# Epic 7 — tranche : orienter les positions dans l'espace (ligne de danse & pivot)

Status: ready-for-dev

> **Nature de ce document.** Demande d'Alain du 2026-10-23 : « améliorer la
> lecture des passes. Actuellement il n'y a pas de logique d'orientation d'une
> position de début et de fin dans une passe alors qu'elles sont dépendantes
> dans la vie réelle. » Rédigé hors de la session de dev, à partir du code de
> `main`. Comme pour la 4.7, le modèle a été discuté **avant** les critères. Les
> questions ouvertes du brouillon ont été tranchées avec Alain le 2026-10-23
> (voir « Décisions »).

## Le problème

Une position est aujourd'hui une **configuration relative** du couple (qui tient
quelle main, qui regarde qui), dessinée vue de dessus dans une orientation
**arbitraire** : celle où Alain l'a tracée. Conséquences :

- deux vignettes côte à côte ne disent rien de la rotation du couple dans la
  salle ;
- une passe dont le départ et l'arrivée sont la **même position** (un
  changement de côté, par ex.) s'affiche comme si rien ne s'était passé, alors
  que le couple a fait un demi-tour ;
- un enchaînement ne dit jamais « à cet instant, tu es retourné par rapport au
  départ ».

## Le modèle retenu

Une **convention de dessin**, et **une seule** donnée à saisir, posée là où elle
est vraie.

### 1. Sur la POSITION : une convention, pas un champ

**Dans tout dessin de position, la ligne de danse va du bas vers le haut.**

En rock 6 temps, la ligne n'a pas de définition unique par rapport aux
danseurs. Elle dépend de la position :

| Position (exemples) | La ligne… | Les danseurs regardent… |
| --- | --- | --- |
| Fermée | sépare les deux danseurs | vers la ligne, face à face |
| Côte à côte / ouverte | relie les deux danseurs | dans des directions opposées |
| Berceau | sépare les deux danseurs | dans la même direction |

On ne peut donc **pas** la déduire du schéma (le regard du cavalier ne suffit
pas) : elle se décide à l'œil, position par position. Alain choisit pour chaque
dessin le sens qui lui paraît naturel pour le « haut ».

Comme il n'y a pas de champ, il n'y a **ni migration ni rotation de
normalisation** sur `Position`. Les dessins non conformes sont **redessinés**
dans l'atelier (travail de saisie, pas de code). L'atelier affiche un guide pour
que les nouveaux dessins respectent d'emblée la convention.

> ⚠️ **Risques acceptés (décision d'Alain).**
> - Rien ne distingue une position déjà vérifiée d'une position oubliée. Un
>   pivot saisi sur une passe dont une des positions n'est pas encore redessinée
>   affichera une orientation fausse avec l'aplomb du vrai. Mitigation : **redessiner
>   les positions avant de saisir les pivots** (voir « Coût réel »).
> - Le « haut » se choisit à l'œil : deux positions saisies à des moments
>   différents peuvent ne pas suivre la même logique. Mitigation : noter, au fil
>   de la saisie, le choix fait pour chaque famille de positions (tableau
>   ci-dessus à compléter).

### 2. Sur la PASSE : le pivot du couple (`pivot`)

De combien le couple a tourné **par rapport à la ligne de danse** entre la
position de départ et celle d'arrivée. Quatre valeurs, en quarts de tour, vue de
dessus, sens horaire (même convention que `rotation` dans les schémas, y vers le
bas) :

| Valeur | Libellé |
| --- | --- |
| `0` | même orientation |
| `90` | quart de tour à droite |
| `180` | demi-tour |
| `270` | quart de tour à gauche |

Le pivot décrit le **résultat**, jamais le geste. `270` signifie « l'arrivée est
tournée d'un quart vers la gauche », pas « on a tourné par la gauche ». Le sens
de rotation et les tours complets n'ont souvent pas de sens pour une passe : la
cavalière se déplace le long de la ligne, et l'un peut tourner sur sa droite
pendant que l'autre tourne sur sa gauche. Ils relèvent d'une **autre feature**,
celle de la manière de danser la passe. Un tour complet vaut donc `0` ici.

Comme les deux dessins ont la ligne en haut, l'arrivée s'affiche simplement
tournée de `pivot` par rapport au départ.

### 3. Dans l'ENCHAÎNEMENT : l'orientation cumulée (rien à stocker)

```
orientation₀ = 0                                 (orientation de départ)
orientationₙ = (orientationₙ₋₁ + pivotₙ) mod 360
```

Calculée à la lecture, comme la transition entre deux maillons (Story 4.7) :
**aucun champ ajouté à `Enchainement`**. Une **transition** (changement de prise
sans passe) a un pivot nul : on change de main, pas d'orientation.

## « Non renseigné » n'est pas « zéro »

C'est le principal piège de la tranche. Au déploiement, **aucune** des ~115
passes n'a de pivot. Si l'absence valait `0`, tout le catalogue afficherait des
orientations fausses avec l'aplomb du vrai.

- `pivot` est **nullable**. `null` = inconnu.
- Une passe au pivot inconnu affiche ses deux positions **telles que
  dessinées**, sans repère, sans prétendre les relier, et le dit (« orientation
  non renseignée »).
- Dans un enchaînement, l'orientation cumulée devient **inconnue à partir du
  premier maillon non renseigné**, jamais devinée. Les positions suivantes
  s'affichent telles que dessinées.

## Décisions (questions ouvertes du brouillon, tranchées le 2026-10-23)

1. **Référence de la ligne de danse** : elle dépend de la position et ne se
   déduit pas du schéma. On la fixe par **convention de dessin (bas → haut)**,
   le « haut » étant choisi à l'œil pour chaque position, plutôt que par un
   champ `ligneDeDanse`. Conséquence : le pré-remplissage depuis le regard du
   cavalier est abandonné.
2. **Granularité** : quarts de tour.
3. **Transitions** : pivot nul, aucun champ ajouté.
4. **Sens de rotation** : non affiché et non stocké. Le pivot passe de « degrés
   signés dans [-720, 720] » à « 4 valeurs de résultat ». Le sens relève d'une
   future feature.

## Critères d'acceptation

### Story 7.1 — Convention de ligne de danse et vignette orientable

1. **Aucun champ ni migration** sur `Position`. La convention « ligne de danse
   du bas vers le haut » est rappelée dans l'aide de l'atelier.
2. L'atelier (`AtelierPosition`) affiche sur la toile un **guide fixe** : une
   flèche verticale vers le haut, étiquetée « ligne de danse ». Il ne tourne pas
   avec les pièces et ne figure **pas** dans le PNG exporté.
3. `ImagePosition` accepte un `angle` facultatif (`number | null`, défaut
   `null`) et applique une rotation CSS. La vignette est ronde
   (`border-radius: full` + `object-fit: cover`) : la rotation ne montre aucun
   coin. Le PNG n'est **pas** modifié : on tourne à l'affichage, on ne recuit
   pas l'image.
4. Quand `angle` n'est pas `null` (**y compris `0`**), un **repère de ligne de
   danse** (encoche ou petite flèche sur le bord du cercle, côté haut du dessin)
   tourne avec l'image. Sans repère, une vignette tournée est illisible : on ne
   sait pas par rapport à quoi elle a tourné. Le montrer aussi à `0` permet de
   comparer le départ et l'arrivée d'un coup d'œil.
5. `angle = null` : aucun changement par rapport à l'affichage actuel (ni
   rotation, ni repère). Toutes les pages existantes restent identiques tant que
   7.2 n'est pas livrée.

### Story 7.2 — Pivot sur les passes

1. `Passe` gagne un champ `pivot` : select **facultatif** à 4 options (`0`,
   `90`, `180`, `270`, libellés du tableau ci-dessus), éditable dans l'admin.
   Payload stocke un select en texte : la conversion en nombre se fait à un seul
   endroit, dans `VuePasse` (`src/composition.ts`), qui expose
   `pivot: 0 | 90 | 180 | 270 | null`.
2. Migration Payload créée ; **aucune valeur inventée** pour l'existant.
3. Une fonction pure unique `libellePivot(pivot)` rend le libellé du tableau, ou
   « orientation non renseignée » pour `null`. Elle est testée unitairement.
4. Partout où le départ et l'arrivée d'une passe sont montrés ensemble (fiche
   passe, liste des passes, résultats de recherche), si `pivot` est connu : le
   départ reçoit `angle = 0`, l'arrivée `angle = pivot`, et `libellePivot`
   s'affiche entre les deux.
5. **Cas témoin** : une passe `X → X` avec `pivot = 180` affiche deux vignettes
   **visiblement différentes** (l'arrivée retournée, repère vers le bas).
6. `pivot = null` : vignettes telles que dessinées (`angle = null`) et mention
   « orientation non renseignée » visible.
7. La liste admin des passes montre la colonne `pivot`. On peut filtrer les
   passes sans pivot (filtre natif Payload « n'existe pas ») pour organiser la
   saisie.

### Story 7.3 — Orientation cumulée dans l'enchaînement

1. Une fonction pure `orientations(maillons)` dans `src/enchainements.ts` rend,
   pour chaque position de la chaîne, l'angle cumulé dans `{0, 90, 180, 270}`
   **ou `null`** dès le premier maillon inconnu. Testée unitairement :
   - passes à pivot `0` partout → tout à `0` ;
   - `180` puis `180` → retour à `0` ;
   - quatre `90` → retour à `0` ;
   - une transition au milieu ne casse rien (pivot nul) ;
   - un maillon inconnu au milieu → `null` à partir de sa position d'arrivée ;
   - un maillon inconnu en premier → seule la position de départ est connue (`0`).
2. `ChaineEnchainement` (vue lecture) et `Compositeur` (aperçu) passent à chaque
   bulle son angle cumulé (`null` → telle que dessinée, sans repère).
3. Quand l'orientation finale est connue, la fin de chaîne l'indique par
   rapport au départ, avec le même vocabulaire que `libellePivot` : « Vous
   finissez dans la même orientation qu'au départ », « … d'un demi-tour par
   rapport au départ », etc. Inconnue → rien n'est affiché.
4. Aucun champ ajouté à `Enchainement` ; aucune migration des enchaînements.

### Hors périmètre

- Le **sens** de rotation et les **tours complets** : future feature, celle de
  la manière de danser une passe.
- Le **déplacement** du couple dans la salle (translation, y compris celui de la
  cavalière le long de la ligne) : on ne suit que l'orientation.
- L'orientation **individuelle** de chaque danseur pendant la passe.
- Choisir l'orientation de départ d'un enchaînement (toujours 0 en v1).
- Redessiner les positions non conformes à la convention : travail de saisie
  d'Alain, pas du code.

## Fichiers concernés (repérés sur `main`)

- 7.1 : `src/components/ImagePosition.tsx`, `image-position.css`,
  `src/components/AtelierPosition.tsx` (guide sur la toile, exclu de l'export)
- 7.2 : `src/collections/Passe.ts` + migration, `src/composition.ts`
  (`VuePasse.pivot`, `libellePivot` ou module voisin sans Payload),
  `src/app/(frontend)/passes/page.tsx`, `passes/[id]/page.tsx`,
  `recherche/page.tsx`
- 7.3 : `src/enchainements.ts` (`Maillon`, `construireChaine`,
  `orientations()`), `src/components/ChaineEnchainement.tsx`,
  `src/components/Compositeur.tsx`

## Coût réel : la saisie, pas le code

Le code est petit (un champ, une rotation CSS, une somme modulo 360). La valeur
dépend entièrement de la **saisie**, et **l'ordre compte** :

1. **Livrer 7.1**, puis redessiner dans l'atelier les positions dont la ligne
   n'est pas du bas vers le haut, en notant le choix fait par famille de
   positions. Tant que ce n'est pas fini, ne pas saisir de pivot sur les passes
   qui les touchent : rien ne signalerait l'erreur.
2. **Livrer 7.2**, puis saisir les pivots (~115) avec le filtre « sans pivot »,
   en commençant par les passes **des enchaînements les plus consultés**.
3. **Livrer 7.3** : elle n'apporte quelque chose qu'une fois des enchaînements
   entièrement renseignés.
