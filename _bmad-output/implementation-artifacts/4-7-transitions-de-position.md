# Story 4.7 : les transitions de position — changer de prise sans danser de passe

Status: review

> **Nature de ce document.** Journal de la tranche demandee par Alain le
> 2026-09-01 : « j'aimerais adresser la partie rupture dans un enchaînement pour
> pouvoir aller jusqu'au bout et me permettre de créer plusieurs enchaînements
> prochainement ». La question posée n'était pas « code-moi ça » mais « comment
> je fais ? », avec trois modèles en balance et une demande de critique.
> Le modèle a donc été **tranché sur les données** avant d'écrire une ligne, et
> ce document garde d'abord ce dépouillement : c'est lui qui justifie le reste.

## La question, et ce que les données ont répondu

Trois voies étaient sur la table :

1. **changement libre** entre deux passes (le plus rapide à coder, ne bloque rien) ;
2. **transitions déclarées entre positions** (« ce que je crois avoir fait avant ») ;
3. **transitions déclarées sur la passe** d'arrivée (« certaines passes ne le
   permettront pas »).

Dépouillement des 120 enchaînements repris (1208 liens passe → passe) :

- **103 reprises réelles, dans 59 enchaînements, sur seulement 18 trajets
  distincts.** 95 d'entre elles vivent à l'intérieur du petit groupe des prises
  de main (fermée, MD/MD, MG/MD, MD/MG, décroisées, croisées ×2).
- **L'hypothèse 3 est contredite par l'historique.** 19 passes différentes
  arrivent en « main gauche / main droite » et rupturent : toutes visent le même
  petit groupe de cibles, **sans une seule exception**. Le contre-exemple
  pressenti tombe d'ailleurs de lui-même — « Prise à deux mains par le coude »
  rupture bien vers « main gauche / main droite », trois fois. Le déterminant est
  la **position d'arrivée**, jamais la passe. La coder sur la passe reviendrait à
  recopier la même règle sur les 44 passes qui aboutissent là.
  Autre défaut de fond : « pas trop d'intérêt » n'est pas « impossible ». Le
  graphe doit dire ce qui est **possible** ; ce qui est **intéressant** se décide
  au moment de composer.
- **L'hypothèse 1 coûte deux choses**, malgré son mérite réel (elle ne bloque
  rien) : elle vide le compositeur de son différenciateur (FR-10 — si l'on peut
  sauter librement vers 30 positions, le graphe devient décoratif), et surtout
  elle jette le **texte pédagogique** du geste, qui est le métier d'Alain.
- **La v1 avait déjà l'objet, et il a tenu quinze ans.** Table `alternative(
  positionStart_id, positionAlternative_id, description)`, commentaire SQL
  « Table des choix possibles apres une passe » — le commentaire parle de la
  passe, le schéma porte sur les positions : Alain avait eu l'idée 3 et codé la
  2. Dix lignes survivantes expliquent **plus de quatre reprises sur cinq**. Les
  trous ne sont pas des cas nouveaux, ce sont surtout des **réciproques
  manquantes** (`décroisées → MD/MG` déclarée, l'inverse non).

Deux constats ont pesé autant que les comptages :

- **Une transition ne comble pas un trou du graphe : elle évite de dépenser une
  passe.** 10 des 18 trajets de rupture ont **déjà** une passe qui fait
  exactement ce chemin (`MG/MD → MD/MD`, la rupture n°1, est aussi ce que fait
  « Changement de côté changement de main »). Ce qui distingue la transition,
  c'est qu'elle ne prend **pas de temps musical**. D'où : on ne règle pas les
  ruptures en ajoutant des passes au catalogue.
- **Sans transitions, on reste coincé dans les culs-de-sac.** « Berceau gauche »
  et « Enroulée gauche » n'ont aucune passe sortante ; l'historique n'en sort que
  par une reprise.

**Décisions d'Alain (2026-09-01)** : modèle 2 ; rendu lecture en **annotation**
entre deux passes, pas en maillon.

## Périmètre livré

1. **Collection `Transition`** — arête position → position, dirigée, unique par
   trajet, avec description du geste et nom court facultatif.
2. **Migration `migrate:transitions`** — les 10 `alternative` de 2009, avec leur
   texte, rejouable par `legacyId`.
3. **Rapport `rapport:transitions`** — lecture seule : les trajets encore sans
   explication, triés par fréquence, avec des exemples d'enchaînements.
4. **Compositeur** — section « Changer de prise », annulation pas-à-pas étendue.
5. **Vue lecture** — la reprise est nommée quand la transition est déclarée.

## Ce qui ne bouge pas, et pourquoi c'est le point

**Aucun changement de schéma sur `enchainements`.** La chaîne reste un tableau de
passes ; la transition entre deux maillons se **déduit** du couple (position
d'arrivée, position de départ suivante) — ce que `construireChaine` faisait déjà.
C'est l'unicité de A → B, posée dans la collection, qui rend cette déduction non
ambiguë. Conséquence directe : la fonctionnalité tient en une collection, une
lecture et un peu d'UI, et l'historique migré en profite sans être retouché.

**La collection `Enchainement` reste permissive sur la continuité.** Une
vingtaine de reprises de l'historique n'ont pas encore de transition écrite ;
les rendre invalides reviendrait à refuser des enchaînements réellement dansés.
La cohérence est garantie **par le compositeur**, pas par la collection : la
chaîne qu'il produit n'est plus continue, elle est **justifiée** — toute
discontinuité s'appuie sur une arête déclarée, jamais sur un saut libre.

## Décisions de conception

- **`transitionsUtiles` et non « toutes les transitions ».** Une transition vers
  une position d'où aucune passe ne part n'offre rien : on aurait échangé un
  cul-de-sac contre un autre. Même filtre que celui des positions de départ.
- **La transition en attente est un paramètre de `positionCourante`.** Entre le
  clic sur le changement de prise et la passe qui le consomme, la position
  courante n'est plus déductible de la chaîne seule : ce choix **fait partie de
  l'état composé**. Le laisser calculer à côté par le composant aurait recréé
  exactement la seconde source de vérité que cette fonction existe pour éviter.
- **Les transitions restent ancrées sur l'arrivée de la dernière passe**, pas sur
  la position courante. On peut donc changer d'avis, mais pas enchaîner deux
  transitions d'affilée — ce que l'historique ne fait jamais, et qui reviendrait
  à se déplacer librement dans le graphe.
- **`transitionAvant` et non « transitionApres ».** Rattachée à la passe
  suivante, la transition disparaît exactement quand cette passe est retirée : il
  n'existe jamais de transition orpheline au bout de la chaîne.
- **L'enregistrement est refusé tant qu'un changement de prise n'est suivi
  d'aucune passe.** Pas par principe, par honnêteté : seules les passes sont
  stockées, un changement en fin de chaîne n'aurait rien pour survivre.
  L'enregistrer le ferait disparaître en silence.
- **Le nom est facultatif, la migration ne l'invente pas.** Les dix textes de
  2009 partent tels quels en description ; l'affichage dit « Changement de
  prise » en attendant qu'Alain les nomme. Nommer un geste est un acte de prof,
  pas de migration.
- **Un rapport plutôt que la création automatique des arêtes manquantes.** Une
  transition sans description n'est qu'une permission ; avec elle, c'est du
  contenu de cours. Fabriquer une dizaine d'arêtes muettes au nom d'Alain aurait
  rempli le compteur sans rien apprendre à personne.
- **Pas de `beforeDelete` sur `Transition`**, contrairement à `Passe` : elle
  n'est référencée nulle part, la supprimer ne vide aucun maillon. En revanche la
  garde de `Position` est **étendue** aux transitions — sinon une transition
  survivrait en pointant dans le vide.

## Critères vérifiés

1. **Given** les dix `alternative` du dump, **When** `npm run migrate:transitions`,
   **Then** dix transitions créées avec leur texte. ✅ comptage source/cible
   conforme ; second lancement idempotent (0 création).
2. **Given** la base migrée, **When** `npm run rapport:transitions`, **Then**
   83 reprises sur 103 déjà nommées, 9 trajets restants listés par fréquence, et
   la transition déclarée jamais dansée (`Portillon → Espagnol garçon gauche`)
   signalée à part. ✅
3. **Given** un enchaînement historique discontinu, **When** j'ouvre sa fiche,
   **Then** la reprise est nommée (geste, déroulé, position de reprise) là où la
   transition existe, et **inchangée** là où elle n'existe pas. ✅ vérifié à
   l'écran sur `/enchainements/1` (trois reprises nommées avec les textes de
   2009).
4. **Given** la collection, **When** on tente un doublon A → B, une transition
   vers elle-même, un trajet entre deux danses, ou la suppression d'une position
   référencée, **Then** chaque cas est refusé avec un message actionnable ; le
   sens inverse B → A reste accepté. ✅ `tests/int/transition.int.spec.ts`.
5. **Given** le moteur, **When** on demande les changements possibles depuis un
   cul-de-sac, **Then** seule la transition qui rouvre le catalogue est proposée ;
   le sens est respecté. ✅ `tests/unit/composition.spec.ts`.
6. **Given** le compositeur monté, **When** je pose une passe puis un changement
   de prise, **Then** la liste des passes se recharge depuis la nouvelle
   position, un cul-de-sac retrouve une sortie, deux changements ne s'enchaînent
   pas, l'annulation défait le changement avant la passe (et le remet en attente
   quand on retire la passe qui le suivait), l'enregistrement est bloqué tant
   qu'un changement n'est suivi d'aucune passe, et la sauvegarde n'envoie
   **que les passes**. ✅ `tests/unit/compositeur.spec.tsx`, 8 scénarios.
7. Suites complètes : **124 tests unitaires**, **41 tests d'intégration**,
   `tsc --noEmit` propre, `eslint` sans erreur.

## Une dépendance ajoutée

`@testing-library/dom` en devDependency. `@testing-library/react` était déjà
déclaré dans le projet mais **inutilisable** : c'est son pair obligatoire, et il
n'avait jamais été installé faute de test de composant. `vitest.unit.config.mts`
accepte désormais aussi les `*.spec.tsx` (jsdom et le plugin React étaient déjà
en place).

## Reste à faire

- **Le clic-à-clic du compositeur reste à passer une fois à l'écran par Alain.**
  La page `/enchainements/nouveau` est réservée aux administrateurs connectés, et
  se connecter demande un mot de passe — hors de ce que l'assistant peut faire.
  Le comportement est en revanche verrouillé par un test de composant
  (`tests/unit/compositeur.spec.tsx`, 8 scénarios, montage réel avec React
  Testing Library) : c'est le câblage qui manquait aux tests de fonctions pures.
  Il reste à confirmer l'aspect visuel de la section « Changer de prise » et de
  la ligne de reprise dans la chaîne en construction.
- **Écrire les trajets manquants** dans /admin > Transitions, avec leurs mots.
  `npm run rapport:transitions` les liste, le plus dansé d'abord.
- **Nommer les dix transitions migrées** (elles n'ont qu'une description).
- **Relire `Portillon → Espagnol garçon gauche`**, déclarée en 2012 et jamais
  dansée depuis.
- Le cas `MD/MD dans le dos → Gendarme` a disparu de lui-même : Alain a corrigé
  la passe « Gendarme », qui finit désormais en position « Gendarme ». En
  contrepartie, `Gendarme → MD/MD dans le dos` apparaît 6 fois dans le rapport —
  à trancher : vraie transition, ou héritage de l'ancienne saisie ?
