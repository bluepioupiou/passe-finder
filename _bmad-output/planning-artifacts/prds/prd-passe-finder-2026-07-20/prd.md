---
title: Passe Finder v2 — PRD
status: final
created: 2026-07-20
updated: 2026-07-21
---

# PRD : Passe Finder v2

## 1. Contexte & objectifs

Passe Finder v2 redonne à Alain — prof de rock / west coast swing bénévole — l'outil de travail qu'il a perdu après l'abandon de deux versions précédentes : cataloguer les passes et positions qu'il connaît, et composer/partager en quelques minutes l'enchaînement travaillé pendant un cours.

Le produit repose sur un modèle générique à trois briques :

- **Position** — un état statique (une tenue, une posture).
- **Passe** — un mouvement qui relie une position de départ à une position d'arrivée.
- **Enchaînement** — une séquence ordonnée de passes, composée à partir du catalogue existant.

C'est ce modèle composable — et non la taille du catalogue — qui permet de publier un enchaînement de cours en 5 minutes, là où les bibliothèques de figures existantes restent des catalogues de fiches isolées.

**Objectif du v1.** Un usage réel et régulier par Alain et ses élèves, et un jalon technique solide : catalogue migré depuis l'ancienne base, déploiement continu opérationnel, moteur de création d'enchaînement fiable. Le succès **ne se mesure pas** à l'adoption par d'autres écoles — c'est une ambition future (voir §8), pas une condition du v1.

## 2. Utilisateurs & rôles

Trois rôles, avec des permissions strictement distinctes :

- **Alain — administrateur.** Seul à créer/modifier les Positions et Passes du **catalogue de référence**. Compose et publie des enchaînements comme n'importe quel utilisateur connecté. Besoin clé : cataloguer une nouvelle passe et composer l'enchaînement du soir sans friction, chaque semaine.
- **Élève — utilisateur connecté.** Ne touche pas au catalogue de référence. Compose ses propres enchaînements liés à son profil, choisit de les partager ou non, et met en favori les enchaînements partagés par d'autres. Besoin clé : retrouver l'enchaînement d'un cours pour réviser, sans fouiller WhatsApp.
- **Visiteur — anonyme.** Consulte le catalogue et les enchaînements partagés en **lecture seule**. Toute action (favori, composition, sauvegarde) exige la connexion. Besoin clé : trouver assez de valeur pour vouloir créer un compte.

> Le catalogue de référence (Positions, Passes) est **mono-administrateur** en v1 : seul Alain l'édite. La contribution collaborative des élèves (proposer/personnaliser des passes) est explicitement hors v1 — voir §8.
>
> Il n'existe **aucune distinction entre utilisateurs connectés** au-delà du rôle admin d'Alain : un connecté qui n'est pas son élève dispose exactement des mêmes possibilités.

## 3. Parcours utilisateurs

### UJ-1 — Alain publie l'enchaînement du cours

_Protagoniste : Alain (admin), sur son PC, en rentrant du cours._

1. Il ouvre le site sur son PC ; se connecte si la session n'est pas active.
2. « Créer un enchaînement » → il choisit une **position de départ** dans la liste (souvent « position fermée »).
3. L'outil affiche **uniquement les passes réellement possibles depuis cette position**. Il en choisit une → elle s'ajoute à l'enchaînement, qui avance jusqu'à la **position d'arrivée** de cette passe.
4. La liste se recharge sur les passes possibles depuis la nouvelle position. Il répète jusqu'à reconstituer l'enchaînement du cours.
5. Il a à tout moment une **vue claire de la chaîne** : quelle passe enchaînée avec quelle autre.
6. Il enregistre l'enchaînement avec **date, titre, description, notes**.
7. Il obtient une **URL de partage simple** qu'il colle dans WhatsApp pour ses élèves.

> **Mécanisme central — composition guidée par le graphe.** À aucun moment Alain ne peut composer un enchaînement incohérent : le catalogue ne lui propose que des passes dont la position de départ correspond à la position courante. C'est ce guidage qui rend la composition rapide et fiable — le différenciateur du produit.

### UJ-2 — Léa révise l'enchaînement du cours

_Protagoniste : Léa, élève débutante qui oublie la moitié du cours le soir venu, sur son téléphone via le lien WhatsApp._

1. Elle clique le lien reçu sur WhatsApp → voit d'abord le **titre, la description et la date** remplis par Alain.
2. Puis **l'enchaînement** : les passes qui s'enchaînent, avec la **position tout au début** et **tout à la fin**. _(Au survol d'une passe : détails supplémentaires — sa position de départ/arrivée, autres infos utiles.)_
3. Chaque passe est **cliquable → fiche de la passe** (détails complets, dont les enchaînements-avec-vidéo qui la contiennent — voir F6). Elle revient à l'enchaînement par la navigation.
4. Pour retrouver l'enchaînement plus tard sans fouiller WhatsApp, elle **se connecte / crée un compte** et le met **en favori (signet)** → il apparaît dans sa **liste de favoris**. Le favori est un **lien vers l'enchaînement d'Alain, pas une copie**.
5. Le moteur de composition lui est ouvert comme à tout connecté : elle peut **composer ses propres enchaînements** (même mécanisme qu'UJ-1) et les partager.

### UJ-3 — Alain catalogue une nouvelle passe

_Protagoniste : Alain (admin), après avoir appris une nouvelle passe._

1. Si la position de départ ou d'arrivée n'existe pas encore, il **crée d'abord la/les position(s)** : **description + image**, rattachée(s) à une **danse**.
2. Il crée la **passe** en reliant **position de départ → position d'arrivée**, avec **description (comment faire)**, **danse** et **difficulté** (optionnelle).
3. Contrainte : les positions doivent exister au préalable pour être sélectionnées (pas de création de position à la volée depuis l'écran de passe en v1).
4. Pour aller vite, il peut laisser l'**image placeholder `no_position`** et compléter l'image plus tard — la passe est immédiatement utilisable grâce à sa description.

> La création au catalogue n'est **jamais bloquée par l'image** : le placeholder permet de remplir la description et d'utiliser aussitôt la position/passe dans un enchaînement.

## 4. Fonctionnalités & exigences

Dépendance structurante : **Position → Passe → Enchaînement**. Une passe ne peut relier que des positions existantes ; un enchaînement ne peut chaîner que des passes existantes. Cet ordre gouverne aussi la migration (F5).

### F1 — Catalogue (Positions, Passes, Danse)

- **FR-1.** L'admin peut **créer, éditer et supprimer une Position** : **nom**, description, image, danse de rattachement.
- **FR-2.** L'image d'une position est **non bloquante** : à défaut, un placeholder `no_position` est utilisé, et l'image reste **éditable ultérieurement** sans invalider la position.
- **FR-3.** L'admin peut **créer, éditer et supprimer une Passe** : **nom**, position de départ, position d'arrivée, description (comment exécuter la passe), danse, difficulté (optionnelle).
- **FR-4.** Une passe ne peut être créée qu'en **sélectionnant des positions existantes** ; pas de création de position à la volée depuis l'écran de passe.
- **FR-5.** Une passe et ses positions de départ/arrivée **appartiennent à la même danse** (une passe ne mélange jamais deux danses).
- **FR-6.** La **danse** est une dimension de premier ordre du modèle (Position et Passe en portent une). En v1, le catalogue ne contient qu'une seule danse : **« rock 6 temps »**. Le modèle doit permettre d'en ajouter d'autres (4 temps, salsa…) **sans migration structurelle**.
- **FR-7.** Seul l'**admin** crée/édite/supprime Positions et Passes. Tout autre utilisateur (connecté ou visiteur) est en **lecture seule** sur le catalogue de référence.
- **FR-8.** La suppression d'une position ou d'une passe **référencée** est **bloquée** tant qu'elle est utilisée (par une passe existante, ou par l'enchaînement d'un utilisateur). L'admin doit d'abord retirer les références. Objectif : ne jamais casser l'enchaînement de révision d'un élève.

### F2 — Moteur d'enchaînement

- **FR-9.** Tout **utilisateur connecté** peut créer un enchaînement en choisissant une **position de départ**.
- **FR-10.** À chaque étape, le système propose **uniquement les passes dont la position de départ correspond à la position courante** (composition guidée par le graphe).
- **FR-11.** Sélectionner une passe l'**ajoute à l'enchaînement** et fait avancer la position courante à la **position d'arrivée** de cette passe.
- **FR-12.** L'enchaînement en cours affiche une **vue claire de la chaîne** : suite ordonnée des passes et des positions traversées. _(Forme concrète déléguée à l'UX — voir Q-5.)_
- **FR-13.** L'utilisateur peut **retirer la dernière passe** ajoutée (revenir en arrière d'une étape) pendant la composition. Réordonner ou insérer une passe en milieu de chaîne est **hors v1**.
- **FR-14.** L'utilisateur **enregistre** l'enchaînement avec : **titre**, **description**, **notes**, **date**. L'enchaînement est **lié à son profil** (auteur).
- **FR-15.** L'auteur peut **éditer et supprimer ses propres** enchaînements.
- **FR-16.** Un enchaînement peut être **associé à une vidéo YouTube** (capacité optionnelle détaillée en F6).

### F3 — Consultation & partage

- **FR-17.** Chaque enchaînement a une **visibilité** choisie par son auteur : **privé** (auteur seul) ou **partagé**.
- **FR-18.** Un enchaînement partagé est accessible via une **URL de partage simple**, en **lecture seule et sans connexion** (collable dans WhatsApp).
- **FR-19.** La fiche d'un enchaînement affiche **titre, description, date**, puis la **chaîne des passes** avec la position de tout début et de toute fin. Au **survol** d'une passe : détails supplémentaires (positions de départ/arrivée, autres infos utiles).
- **FR-20.** Chaque passe d'un enchaînement est **cliquable → fiche de la passe** ; navigation retour vers l'enchaînement. Les positions disposent également d'une **fiche**.
- **FR-21.** Les fiches Passe et Position sont consultables en **lecture publique** (visiteur anonyme inclus).
- **FR-22.** Depuis la **fiche d'une passe**, ses **positions de départ et d'arrivée sont cliquables → fiche de la position** correspondante (navigation dans le graphe passe → position).
- **FR-23.** La **fiche d'une position** liste, dans les deux sens, **toutes les passes qui y arrivent** (position d'arrivée) et **toutes celles qui en partent** (position de départ) — chacune cliquable vers sa fiche passe. C'est l'entrée « exploration » du catalogue : depuis une position, voir tout ce qu'on peut faire.
- **FR-24.** La **fiche d'une passe** liste **les enchaînements partagés qui l'utilisent** (chacun cliquable vers sa fiche enchaînement). C'est une liste distincte de la liste des vidéos (FR-38).
- **FR-25.** Un utilisateur connecté peut mettre en **favori** un enchaînement **partagé par quelqu'un d'autre** (on ne met pas en favori ses propres enchaînements — ils sont déjà listés comme tels). Le favori est un **lien vers l'enchaînement**, jamais une copie.

### F4 — Comptes & rôles

- **FR-26.** Un visiteur peut **créer un compte** (inscription) et **se connecter / se déconnecter**.
- **FR-27.** Le v1 **exige des comptes** (inscription, connexion, déconnexion). La **mécanique d'authentification** (email/mot de passe géré par l'appli vs. fournisseur externe type Cognito/Google) est **déléguée à la phase Architecture** — voir addendum. Le PRD n'impose que la capacité, pas le mécanisme.
- **FR-28.** L'utilisateur peut **récupérer l'accès à son compte** en cas de perte d'identifiants (réinitialisation / mot de passe oublié). La forme exacte suit le choix d'authentification (FR-27).
- **FR-29.** Le rôle **admin** est unique (Alain) et confère les droits d'édition du catalogue de référence (F1). Il n'existe pas d'interface d'auto-promotion : le statut admin est attribué hors application.
- **FR-30.** Chaque utilisateur dispose d'un **profil** avec **deux listes distinctes** : **« mes enchaînements »** (ceux qu'il a créés) et **« mes favoris »** (les enchaînements partagés par d'autres qu'il a mis en signet).

### F5 — Migration des données legacy

Source : `passe-finder-saveDB.gz` (dump de l'ancien projet Yii). Entités de l'ancien schéma : `Danse`, `Position`, `Passe`, `Enchainement`, `EnchainementPasse`, `PersonnalizePasse`.

- **FR-31.** Migrer le catalogue existant dans l'**ordre de dépendance** : Danses → Positions → Passes → Enchaînements (et leur liaison ordonnée aux passes).
- **FR-32.** La migration est **vérifiable** (comptage des éléments source vs migrés) et **rejouable** sans dupliquer les données.
- **FR-33.** Les positions migrées sans image exploitable reçoivent le **placeholder `no_position`** (cohérent FR-2).
- **FR-34.** L'ancien `passe.youtube_url` du dump est **archivé sans être exposé** en v1 (le champ vidéo vit désormais sur l'enchaînement — F6). La valeur est conservée en migration pour un usage futur éventuel, mais n'apparaît pas dans l'UI v1.
- **FR-35.** `passe.customName` et l'entité `PersonnalizePasse` relèvent de la personnalisation (hors v1) → **archivés sans être exposés** en v1 (conservés, non supprimés, non affichés).
- **FR-36.** Les ~50 **comptes historiques ne sont pas migrés** ; les élèves re-créent un compte (F4). **Tous les enchaînements migrés sont rattachés à Alain (admin).**

### F6 — Lien vidéo (amorce de la Vision « comprendre une passe »)

- **FR-37.** Un enchaînement peut porter une **URL YouTube optionnelle**.
- **FR-38.** La **fiche d'une passe** liste, **séparément** de la liste des enchaînements (FR-24), les **vidéos** issues des enchaînements partagés-**avec-vidéo** qui la contiennent ; un clic mène à l'enchaînement puis à sa vidéo YouTube. Seuls les enchaînements **partagés** alimentent cette liste (un enchaînement privé avec vidéo ne fuite pas sur la fiche passe).
- **FR-39.** En v1, la vidéo est un **lien** (ouvre/renvoie vers l'enchaînement et sa vidéo). Le **lecteur intégré au bon timestamp / chapitrage** reste **hors v1** (Vision).

## 5. Exigences non-fonctionnelles

- **NFR-1 — Web responsive.** L'application est utilisable sur **PC** (poste de composition privilégié d'Alain) **et sur téléphone** (révision des élèves via WhatsApp). La lecture d'un enchaînement partagé doit être confortable sur petit écran.
- **NFR-2 — Simplicité d'usage.** Le geste central (composer et publier un enchaînement) doit rester réalisable **en quelques minutes**, sans friction ni étape technique.
- **NFR-3 — Gestion des images.** Le stockage et l'affichage des images de positions doivent rester **légers** ; le placeholder `no_position` garantit qu'aucun écran ne dépend d'une image manquante.
- **NFR-4 — Fiabilité de la sauvegarde.** Un enchaînement enregistré n'est **jamais perdu** : la sauvegarde est fiable et confirmée à l'utilisateur (critère de succès explicite du brief).
- **NFR-5 — Disponibilité proportionnée.** Outil interne à faible trafic (Alain + ~50 élèves, pas 1000 créations/jour) : viser une disponibilité correcte sans sur-ingénierie ni redondance coûteuse.
- **NFR-6 — Coût maîtrisé.** Projet bénévole : viser le **coût le plus bas possible**. Référence historique OVH ≈ **50 €/an** (domaine + hébergement site + base). L'objectif AWS est de rester dans cet ordre de grandeur en s'appuyant sur le paiement à l'usage et le free tier, vu le très faible trafic. Le nom de domaine est un poste à part. Ce plafond guide les choix d'Architecture.
- **NFR-7 — Langue.** Interface et contenus en **français**.

## 6. Déploiement & CI/CD (AWS)

Traité comme une exigence de premier ordre : c'est l'un des **trois jalons techniques** du v1 (avec la migration et le moteur), et un objectif d'apprentissage pour Alain.

- **FR-40.** Le produit est **déployé sur AWS**.
- **FR-41.** Un **pipeline CI/CD** assure le passage **commit → production sans geste technique manuel** (déploiement continu).
- **FR-42.** Le choix des services AWS, de l'IaC et de la forme du pipeline est **délégué à la phase Architecture**, avec le _pourquoi_ de chaque choix explicité (voir addendum).

## 7. Métriques de succès & contre-métriques

Le succès du v1 se mesure à l'**usage réel**, pas à l'adoption multi-écoles.

**Métriques de succès**

- **M-1 — Usage régulier d'Alain.** Alain compose/enregistre des enchaînements **chaque semaine**, et retrouve facilement une passe, une position ou un enchaînement déjà créé (y compris ceux qu'il oublie, ex. un enchaînement monté sur une musique précise).
- **M-2 — Retour des élèves.** Mesuré via des **statistiques de visite simples** (ex. Plausible / Google Analytics). **Premier KPI : nombre de visiteurs par jour** ; distinction souhaitée **élèves (connectés) vs. externes (anonymes)**.
- **M-3 — Jalon technique.** Catalogue **migré** depuis l'ancienne base ; **déploiement continu** opérationnel ; **moteur d'enchaînement** fonctionnel avec sauvegarde fiable.

**Contre-métriques (signaux qu'on dérive)**

- **CM-1 — Complexité de maintenance.** Si maintenir l'outil redevient plus lourd que le problème qu'il résout, on a reproduit l'échec des v1/v2 précédentes. La simplicité de maintenance est un garde-fou explicite.
- **CM-2 — Friction du geste central.** Si publier l'enchaînement du cours prend nettement plus que « quelques minutes », la valeur cœur s'érode.

**Instrumentation**

- **FR-43.** Le site est **instrumenté** pour la mesure d'audience (nombre de visiteurs/jour, distinction connectés vs. anonymes). La **consultation** peut se faire via une **interface externe** (Google Analytics, console AWS…) — **aucun écran de statistiques intégré n'est requis en v1**. Un tableau de bord in-app est hors v1.

**Transitions de position** _(ajoutés le 2026-09-01 — besoin remonté par la migration de l'historique, postérieur à la rédaction initiale du PRD ; voir Story 4.7)_

- **FR-44.** Un administrateur peut déclarer une **transition** : un changement de prise entre deux positions **sans passe**, donc **sans temps musical**. Elle est **dirigée** (déclarer A → B n'ouvre pas B → A), relie deux positions **différentes** de la **même danse**, porte une **description du geste** et un nom court facultatif, et un même trajet A → B ne peut exister **qu'une seule fois**.
- **FR-45.** Le compositeur **propose** les transitions qui partent de la position d'arrivée de la dernière passe, **et seulement celles qui mènent vers une position d'où une passe repart**. En choisir une déplace la position courante et rouvre la liste des passes possibles — y compris depuis une position sans passe sortante. Aucun changement de position **libre** n'est possible : toute discontinuité composée s'appuie sur une transition déclarée.
- **FR-46.** La vue lecture **nomme** la reprise quand la transition existe (geste, déroulé, position de reprise), et l'**affiche sans la nommer** quand elle n'existe pas — une reprise non déclarée n'est pas une erreur, c'est un geste dont le texte reste à écrire.

## 8. Hors scope v1 & Vision

### Explicitement hors v1

Repris du brief :

- Adoption / visibilité **multi-écoles**, recherche d'écoles proches.
- **Communication de cours** (remplacement de WhatsApp), messagerie profs/élèves.
- **Personnalisation** d'une position/passe existante par un connecté (ex. nom alternatif — `customName`).
- **Proposition** de nouvelles passes/positions par les utilisateurs, avec workflow de validation admin.
- **Visualisation 3D** des passes/positions.
- **Système de synonymes / mapping** communautaire par école.
- **Application mobile native**.

Précisé/ajouté pendant ce PRD :

- **Création de passe à la volée** depuis l'écran de composition (cas rare — non optimisé en v1 ; la passe se crée dans l'admin catalogue).
- **Création de position à la volée** depuis l'écran de passe (positions créées d'abord).
- **Copier / dupliquer** un enchaînement pour le modifier.
- **Réordonner / insérer** une passe en milieu de chaîne (seul l'undo de la dernière passe est en v1).
- **Lecteur vidéo intégré au timestamp / chapitrage** (le v1 se limite au lien vidéo + reverse-lookup).
- **Migration des comptes historiques** (~50) : non repris.

### Vision (au-delà du v1)

Trois pistes, par ordre de priorité :

1. **Catalogue collaboratif** — les élèves proposent de nouvelles passes/positions (validées par Alain) et personnalisent les existantes avec le nom qu'ils connaissent. À terme, si d'autres profs rejoignent, un **système de synonymes par école** (avec modération humaine, à la BJJ / escalade) pour retrouver une passe sous un nom qu'on ne connaît pas.
2. **Comprendre une passe par la vidéo** — dépasser le simple lien : lecteur **chapitré/timestampé** pointant le moment exact de la passe dans une vidéo, en recoupant plusieurs exécutions réelles. La 3D navigable reste une piste ultérieure si le besoin de compréhension persiste. Le choix « YouTube vs. hébergement propre » sera à redébattre.
3. **D'autres écoles rejoignent, sur leurs propres termes** — non par démarchage, mais parce que le modèle Position/Passe/Enchaînement leur permet de cataloguer et partager en quelques minutes. La communication de cours n'entrerait dans l'outil que si elle remplace **entièrement** WhatsApp sans friction ajoutée.

## 9. Questions ouvertes

Aucune de ces questions ne bloque le passage à l'UX, l'Architecture ou le découpage en épics ; elles sont à trancher au bon moment, avec propriétaire.

| # | Question | Propriétaire | À trancher à |
|---|----------|--------------|--------------|
| Q-1 | Mécanique d'authentification : email/mot de passe géré par l'appli vs. fournisseur managé (Cognito, Google…). | Architecture | Phase Architecture |
| Q-2 | Services AWS, IaC et forme du pipeline CI/CD permettant commit → prod à coût quasi nul. | Architecture | Phase Architecture |
| Q-3 | Outil de stats retenu (Plausible, Google Analytics, autre) et façon de distinguer connectés vs. anonymes. | Architecture / Alain | Phase Architecture |
| Q-4 | Gestion et enregistrement du **nom de domaine** (registrar, coût), poste distinct de l'hébergement. | Alain | Avant mise en production |
| Q-5 | Forme concrète de la « vue claire de la chaîne » (liste, schéma de positions enchaînées, autre) et des interactions de survol. | UX | Phase UX |
