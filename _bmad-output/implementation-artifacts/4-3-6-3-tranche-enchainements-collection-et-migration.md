# Tranche « enchaînements » : collection + migration de l'historique

Status: review

> **Nature de ce document.** Cette tranche verticale recoupe trois stories,
> chacune réduite à son volet « modèle et données » :
> - **4.3** — volet *collection* uniquement (schéma, visibilité par défaut, accès).
>   L'enregistrement depuis le compositeur reste à faire (il dépend de 4.1/4.2).
> - **4.5** — dernier AC uniquement : le blocage de suppression d'une Passe
>   utilisée par un Enchaînement (FR-8, ADD-8), qui attendait littéralement
>   l'existence de cette collection — un TODO le disait dans `Passe.ts`.
> - **6.3** — migration des enchaînements et de leurs liaisons ordonnées.
>
> Motif : Alain a demandé à commencer les enchaînements par « la table + la
> récupération de l'historique », dans la même logique de tranche réelle que la
> tranche « positions » (2026-08-26).

## Périmètre livré

1. Collection `Enchainement` (titre, description, notes, date, auteur,
   visibilité, passes ordonnées, URL vidéo, champs d'archivage legacy).
2. Migration des 119 enchaînements historiques et de leurs 1322 maillons.
3. Blocage de la suppression d'une passe utilisée par un enchaînement.
4. Tests d'intégration sur les deux comportements qui protègent des données.

## Ce que le dump a révélé — et la décision qui en découle

L'analyse de la source a fait apparaître **un mécanisme métier oublié**, qui a
changé la conception avant la première ligne de code.

| Constat | Détail |
| --- | --- |
| Enchaînements | 119, tous en rock (`danse_id = 1`) — aucun écarté |
| Maillons `enchainement_passe` | 1424, dont **82 qui ne sont pas des passes** mais des positions seules |
| Longueur des chaînes | de 1 à 54 passes |
| Auteurs d'origine | 4 comptes (106 pour Alain, 13 pour trois autres) |
| Privés / non publiés | 11 privés + 1 non publié |
| Maillons orphelins | 22, sur 5 enchaînements absents de la table source (supprimés dans l'ancienne appli) |
| Passes référencées introuvables | **0** — tout retombe sur les 110 passes déjà migrées |

**Les 82 maillons « position seule » ne sont pas du bruit.** Ils tombent
**tous (75/75 mesurés)** exactement là où le graphe saute, et valent la position
de **départ de la passe suivante**, jamais l'arrivée de la précédente. Alain a
identifié le mécanisme : c'est une **transition de main** — depuis « mains
décroisées », on lâche une main pour se retrouver en « main droite / main
gauche », sans passe. L'ancienne appli notait cette transition en insérant la
position réellement atteinte.

Positions utilisées comme marqueur : « Main droite / main droite » (41×),
« Main gauche / main droite » (17×), « Mains décroisées » (14×),
« Main droite / main gauche » (6×), « Dos cavalière » (3×), « Portillon » (1×).

Conséquence : **59 enchaînements sur 119 sont discontinus** au sens du graphe
v2 (102 ruptures sur 1322 maillons).

### Décisions (Alain, 2026-08-30)

1. **Tout migrer, ruptures affichées.** Aucun enchaînement n'est écarté, aucune
   passe n'est inventée. La vue lecture (Story 4.4) montrera la reprise
   explicitement (« on arrivait en X — reprise en Y »).
2. **Les marqueurs ne deviennent pas des maillons.** Le tableau ordonné ne
   contient que des passes (ADD-18) : l'information des marqueurs est déjà
   déductible du graphe (marqueur = `positionDebut` de la passe suivante). Ils
   sont archivés dans `legacyMarqueurs`, non exposés.
3. **Visibilité fidèle au legacy** : ce qui était privé le reste (11), ce qui
   était public arrive en « partagé » (107). Un enchaînement non publié (1) est
   traité comme privé — il n'était déjà plus visible.
4. **Le mécanisme de Transition reste à construire** — noté au backlog, hors
   périmètre de cette tranche (voir plus bas).

## Résultats d'exécution

```
Enchainements dans le dump   : 119
Enchainements rock a migrer  : 119
Auteur des enchainements     : (compte unique en base)
Passes disponibles           : 110

Crees cette fois             : 119
Maillons crees               : 1322
Prives (fidelite au legacy)  : 12
Avec marqueurs archives      : 52
Enchainements en base        : 119
Maillons orphelins ignores   : 22 (enchainements 104, 105, 106, 114, 115)
OK : le comptage cible correspond a la source.
```

**Rejouabilité (2ᵉ exécution)** : `Crees : 0`, `Deja presents (ignores) : 119`,
total inchangé.

**Relecture depuis la base** (119 enchaînements, profondeur 2) : 1322 maillons,
107 partagés / 12 privés, 119 avec date, 113 avec description, 52 avec
marqueurs archivés, **60 continus / 59 discontinus (102 ruptures)** — le compte
correspond exactement à l'analyse de la source, l'ordre est préservé.

Rendu d'un enchaînement discontinu tel que la vue lecture devra le montrer :

```
[Position fermée]
   --Sortie cavalière contrariée--> [Main gauche / main droite]
   --Asynchrone--> [Main gauche / main droite]
   --Tour tenu--> [Main gauche / main droite]
   ~~ reprise en [Main droite / main droite] (on arrivait en [Main gauche / main droite])
   --Caresse--> [Main gauche / main droite]
   ...
```

## Critères vérifiés

1. **Given** les passes migrées et la collection Enchaînement, **When** le
   script migre `enchainement` et `enchainement_passe`, **Then** chaque
   enchaînement est recréé avec ses passes dans l'ordre d'origine (tableau
   ordonné, index = ordre — ADD-18, FR-31). ✅ 119 / 1322 maillons.

2. **Given** que les ~50 comptes historiques ne sont pas migrés, **When** les
   enchaînements sont créés, **Then** tous sont rattachés à un auteur unique
   (FR-36). ✅ `MIGRATION_AUTEUR_EMAIL` désigne le compte ; le script refuse de
   deviner s'il y a plusieurs utilisateurs en base.

3. **Given** un enchaînement migré, **When** la migration s'achève, **Then**
   aucune référence orpheline. ✅ 0 passe introuvable ; les 22 maillons
   pointant vers 5 enchaînements supprimés sont comptés et ignorés.

4. **Given** une migration déjà exécutée, **When** je la relance, **Then**
   aucun doublon (FR-32). ✅ rejouabilité par `legacyId`.

5. **Given** un nouvel enchaînement, **When** il est créé sans visibilité,
   **Then** il est **privé** (FR-17, ADD-6). ✅ testé.

6. **Given** un enchaînement privé, **When** un visiteur anonyme interroge la
   collection, **Then** il ne le voit pas — la règle vit dans les `access` de
   Payload, pas dans l'UI (AD-3). ✅ testé ; 107/119 visibles anonymement.

7. **Given** que la collection Enchaînement existe, **When** on tente de
   supprimer une Passe utilisée, **Then** la suppression est refusée avec un
   message nommant les enchaînements fautifs (FR-8, ADD-8 — dernier AC de la
   Story 4.5). ✅ testé.

## Choix d'implémentation

- **L'ordre est le tableau lui-même** (ADD-18) : `passes` est un `array` Payload
  dont l'index EST le rang. Aucun champ « ordre » parallèle, donc aucune
  désynchronisation possible entre deux sources de vérité.
- **La chaîne ne stocke pas les positions** : elles se déduisent des passes,
  qui portent le graphe (AD-2). Une seule source de vérité pour le parcours —
  c'est ce qui rend l'affichage des ruptures automatique.
- **La continuité n'est pas imposée dans la collection.** Le compositeur
  (Story 4.2) ne proposera que des passes partant de la position courante : les
  enchaînements créés dans l'app seront continus par construction. Valider la
  continuité au niveau du modèle reviendrait à refuser la moitié de
  l'historique d'Alain.
- **Un enchaînement incomplet n'est jamais créé** : s'il manquait une passe au
  catalogue, la migration écarte l'enchaînement entier et le signale, plutôt
  que de produire une chaîne amputée qui aurait l'air correcte. (Cas non
  rencontré : 0 passe manquante.)
- **`legacyMeta`** archive en un seul JSON ce qui sort du modèle v1 :
  difficulté d'enchaînement (100 des 119 valent 0), `lesson_id`, auteur
  d'origine, `published`/`private`, dates. Rien ne se perd, rien n'est exposé.
- **Garde de suppression avec `overrideAccess: true`** : la garde doit protéger
  *tous* les enchaînements, y compris les privés d'autres utilisateurs, que
  l'appelant n'a pas le droit de lire.

## Correctif de passage

`npm run migrate:positions` et `migrate:passes` **ne démarraient plus** :
`PAYLOAD_SECRET` manquait, car `tsx` ne lit pas `.env` (contrairement à la CLI
Payload et à Next). Les trois scripts de migration passent désormais par
`tsx --env-file-if-exists=.env`, qui reste sans effet là où le fichier n'existe
pas (CI, conteneur).

## Décision de déploiement : plus d'import automatique (2026-08-30)

L'entrypoint du conteneur importait jusqu'ici les positions et les passes au
démarrage, sous condition « la base est-elle vide ? » (`deploy/catalogue-vide.mjs`).

Ce garde-fou est **tout ou rien** — et la tranche « enchaînements » l'a mis en
défaut : la prod ayant déjà des positions, il répond « peuplé » et aurait sauté
l'import des enchaînements pour toujours. Il ne sait pas représenter l'état
« positions et passes présentes, enchaînements absents ».

Deux issues étaient possibles : porter les imports dans `src/migrations/` pour
que `payload_migrations` en tienne le registre, ou cesser de les automatiser.
**Décision d'Alain : cesser de les automatiser.** La reprise du catalogue est un
geste d'*initialisation*, fait une fois par entité ; maintenant que la base
existe et qu'elle est répliquée en continu vers S3, l'automatiser au démarrage
n'apporte plus de sécurité — seulement un mécanisme maison à entretenir en
parallèle de celui de Payload.

En conséquence :
- `docker-entrypoint.sh` ne fait plus que schéma + WAL + démarrage ;
- `deploy/catalogue-vide.mjs` est supprimé ;
- les scripts `migrate/*` et leurs sources (dump, images) **restent dans
  l'image**, à lancer à la main :
  `docker compose exec app npm run migrate:enchainements` ;
- la procédure est écrite dans `docs/mise-en-production.md` (étape 10), avec le
  cas `MIGRATION_AUTEUR_EMAIL` quand plusieurs comptes existent.

Le dédoublonnage par `legacyId` reste la ceinture : relancer un import ne crée
jamais de doublon.

## À faire ensuite (noté au backlog)

**Mécanisme de Transition** — arête position → position sans passe (lâcher ou
changer de main). Deux effets attendus :
1. la vue lecture nomme la transition au lieu d'afficher une rupture ;
2. le compositeur permet de faire glisser la position d'arrivée d'une passe vers
   une position atteignable par transition, ce qui élargit les passes proposées
   ensuite sans polluer le catalogue de passes.

Les 82 marqueurs archivés dans `legacyMarqueurs` en sont la matière première :
ils indiquent quelles transitions existent réellement dans la pratique d'Alain.

**Autres restes de la tranche** : l'enregistrement depuis le compositeur
(4.3 complet), l'édition/suppression (4.5), la vue lecture (4.4), et le groupe
« Enchaînements » de la recherche globale (5.5, en attente de l'Epic 4).

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

- Migration : 119 créés / 1322 maillons, comptage conforme ; 2ᵉ exécution :
  0 créé / 119 ignorés (rejouabilité prouvée).
- Relecture profondeur 2 : ordre préservé, 60 continus / 59 discontinus,
  107 visibles anonymement.
- Garde-fou : suppression d'une passe utilisée refusée avec la liste des
  enchaînements concernés.
- `tsc` 0 erreur, `lint` 0 erreur (25 avertissements préexistants sur les
  fichiers de migration générés), `test:int` 16/16.
- Une erreur d'initialisation SQLite s'est produite une fois, juste après la
  création des tables (synchronisation du schéma en dev). Non reproduite sur
  les trois exécutions suivantes ; à resurveiller si elle revient.

### File List

**Nouveaux fichiers :**
- `src/collections/Enchainement.ts` — collection.
- `src/migrations/20260830_072052_enchainement.ts` (+ `.json`) — schéma.
- `migrate/migrate-enchainements.ts` — migration rejouable et vérifiable.
- `tests/int/enchainement.int.spec.ts` — défaut privé, invisibilité anonyme,
  ordre des passes, garde de suppression.

**Supprimé :**
- `deploy/catalogue-vide.mjs` — garde-fou de l'import automatique, devenu sans objet.

**Modifiés :**
- `docker-entrypoint.sh` — plus d'import de données au démarrage.
- `docs/mise-en-production.md` — étape 10 réécrite (import manuel + commandes).
- `Dockerfile`, `.dockerignore` — commentaires alignés sur le geste manuel.
- `src/payload.config.ts` — enregistrement de la collection.
- `src/collections/Passe.ts` — `beforeDelete` : blocage si la passe est utilisée.
- `src/migrations/index.ts` — nouvelle migration.
- `src/payload-types.ts` — types régénérés.
- `package.json` — script `migrate:enchainements`, `migrate:all` étendu,
  `--env-file-if-exists=.env` sur les trois migrations.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-30 | 0.1.0 | Collection Enchainement, migration des 119 enchaînements historiques (1322 maillons, rejouable, fidèle au legacy pour la visibilité), blocage de suppression d'une passe utilisée. Découverte et documentation du mécanisme de transition de main, reporté au backlog. | Amelia (dev agent) |
