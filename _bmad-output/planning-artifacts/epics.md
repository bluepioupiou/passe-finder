---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/briefs/brief-passe-finder-2026-07-10/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-passe-finder-2026-07-10/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-passe-finder-2026-07-20/prd.md
  - _bmad-output/planning-artifacts/prds/prd-passe-finder-2026-07-20/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-passe-finder-2026-07-21/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-passe-finder-2026-07-21/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-passe-finder-2026-07-21/EXPERIENCE.md
---

# Passe Finder v2 - Epic Breakdown

## Overview

Ce document fournit le découpage complet en epics et stories de Passe Finder v2, décomposant les exigences du PRD, du contrat UX (DESIGN + EXPERIENCE) et de l'architecture en stories implémentables.

## Requirements Inventory

### Functional Requirements

**F1 — Catalogue (Positions, Passes, Danse)**

- FR-1 : L'admin peut créer, éditer et supprimer une Position : nom, description, image, danse de rattachement.
- FR-2 : L'image d'une position est non bloquante — à défaut, un placeholder `no_position` est utilisé, et l'image reste éditable ultérieurement sans invalider la position.
- FR-3 : L'admin peut créer, éditer et supprimer une Passe : nom, position de départ, position d'arrivée, description (comment exécuter), danse, difficulté (optionnelle).
- FR-4 : Une passe ne peut être créée qu'en sélectionnant des positions existantes ; pas de création de position à la volée depuis l'écran de passe.
- FR-5 : Une passe et ses positions de départ/arrivée appartiennent à la même danse.
- FR-6 : La danse est une dimension de premier ordre du modèle (Position et Passe en portent une). En v1, une seule danse : « rock 6 temps ». Le modèle doit permettre d'en ajouter d'autres sans migration structurelle.
- FR-7 : Seul l'admin crée/édite/supprime Positions et Passes. Tout autre utilisateur (connecté ou visiteur) est en lecture seule sur le catalogue de référence.
- FR-8 : La suppression d'une position ou d'une passe référencée est bloquée tant qu'elle est utilisée (par une passe ou l'enchaînement d'un utilisateur) ; l'admin doit d'abord retirer les références.

**F2 — Moteur d'enchaînement**

- FR-9 : Tout utilisateur connecté peut créer un enchaînement en choisissant une position de départ.
- FR-10 : À chaque étape, le système propose uniquement les passes dont la position de départ correspond à la position courante (composition guidée par le graphe).
- FR-11 : Sélectionner une passe l'ajoute à l'enchaînement et fait avancer la position courante à la position d'arrivée de cette passe.
- FR-12 : L'enchaînement en cours affiche une vue claire de la chaîne (suite ordonnée des passes et positions traversées).
- FR-13 : L'utilisateur peut retirer la dernière passe ajoutée (undo d'une étape). Réordonner/insérer une passe en milieu de chaîne est hors v1.
- FR-14 : L'utilisateur enregistre l'enchaînement avec titre, description, notes, date. L'enchaînement est lié à son profil (auteur).
- FR-15 : L'auteur peut éditer et supprimer ses propres enchaînements.
- FR-16 : Un enchaînement peut être associé à une vidéo YouTube (capacité optionnelle détaillée en F6).

**F3 — Consultation & partage**

- FR-17 : Chaque enchaînement a une visibilité choisie par son auteur : privé (auteur seul) ou partagé.
- FR-18 : Un enchaînement partagé est accessible via une URL de partage simple, en lecture seule et sans connexion (collable dans WhatsApp).
- FR-19 : La fiche d'un enchaînement affiche titre, description, date, puis la chaîne des passes avec position de tout début et de toute fin. Au survol d'une passe : détails supplémentaires.
- FR-20 : Chaque passe d'un enchaînement est cliquable → fiche de la passe ; navigation retour. Les positions disposent aussi d'une fiche.
- FR-21 : Les fiches Passe et Position sont consultables en lecture publique (visiteur anonyme inclus).
- FR-22 : Depuis la fiche d'une passe, ses positions de départ et d'arrivée sont cliquables → fiche de la position correspondante.
- FR-23 : La fiche d'une position liste, dans les deux sens, toutes les passes qui y arrivent et toutes celles qui en partent — chacune cliquable vers sa fiche passe.
- FR-24 : La fiche d'une passe liste les enchaînements partagés qui l'utilisent (chacun cliquable). Liste distincte de celle des vidéos (FR-38).
- FR-25 : Un utilisateur connecté peut mettre en favori un enchaînement partagé par quelqu'un d'autre. Le favori est un lien vers l'enchaînement, jamais une copie.

**F4 — Comptes & rôles**

- FR-26 : Un visiteur peut créer un compte (inscription) et se connecter / se déconnecter.
- FR-27 : Le v1 exige des comptes. La mécanique d'authentification est déléguée à l'Architecture (résolue : auth Payload — AD-9).
- FR-28 : L'utilisateur peut récupérer l'accès à son compte en cas de perte d'identifiants (réinitialisation / mot de passe oublié).
- FR-29 : Le rôle admin est unique (Alain) et confère les droits d'édition du catalogue de référence. Pas d'interface d'auto-promotion ; le statut admin est attribué hors application.
- FR-30 : Chaque utilisateur dispose d'un profil avec deux listes distinctes : « mes enchaînements » (créés) et « mes favoris » (partagés d'autrui mis en signet).

**F5 — Migration des données legacy**

- FR-31 : Migrer le catalogue existant dans l'ordre de dépendance : Danses → Positions → Passes → Enchaînements (et leur liaison ordonnée aux passes).
- FR-32 : La migration est vérifiable (comptage source vs migré) et rejouable sans dupliquer les données.
- FR-33 : Les positions migrées sans image exploitable reçoivent le placeholder `no_position`.
- FR-34 : L'ancien `passe.youtube_url` du dump est archivé sans être exposé en v1.
- FR-35 : `passe.customName` et l'entité `PersonnalizePasse` sont archivés sans être exposés en v1.
- FR-36 : Les ~50 comptes historiques ne sont pas migrés ; les élèves re-créent un compte. Tous les enchaînements migrés sont rattachés à Alain (admin).

**F6 — Lien vidéo**

- FR-37 : Un enchaînement peut porter une URL YouTube optionnelle.
- FR-38 : La fiche d'une passe liste, séparément des enchaînements (FR-24), les vidéos issues des enchaînements partagés-avec-vidéo qui la contiennent ; un clic mène à l'enchaînement puis à sa vidéo. Seuls les enchaînements partagés alimentent cette liste.
- FR-39 : En v1, la vidéo est un lien (ouvre/renvoie vers l'enchaînement et sa vidéo). Le lecteur intégré au timestamp/chapitrage est hors v1.

**Déploiement & Instrumentation**

- FR-40 : Le produit est déployé sur AWS.
- FR-41 : Un pipeline CI/CD assure le passage commit → production sans geste technique manuel.
- FR-42 : Le choix des services AWS, de l'IaC et du pipeline est délégué à l'Architecture (résolu — AD-12/AD-13).
- FR-43 : Le site est instrumenté pour la mesure d'audience (visiteurs/jour, distinction connectés vs anonymes). Consultation via interface externe ; aucun écran de stats in-app en v1.

### NonFunctional Requirements

- NFR-1 — Web responsive : utilisable sur PC (composition Alain) et téléphone (révision élèves). La lecture d'un enchaînement partagé doit être confortable sur petit écran.
- NFR-2 — Simplicité d'usage : composer et publier un enchaînement doit rester réalisable en quelques minutes, sans friction ni étape technique.
- NFR-3 — Gestion des images : stockage/affichage légers ; le placeholder `no_position` garantit qu'aucun écran ne dépend d'une image manquante.
- NFR-4 — Fiabilité de la sauvegarde : un enchaînement enregistré n'est jamais perdu ; sauvegarde fiable et confirmée à l'utilisateur.
- NFR-5 — Disponibilité proportionnée : outil interne à faible trafic ; disponibilité correcte sans sur-ingénierie.
- NFR-6 — Coût maîtrisé : viser le coût le plus bas possible (référence ≈ 50 €/an), en s'appuyant sur paiement à l'usage et free tier.
- NFR-7 — Langue : interface et contenus en français.

### Additional Requirements

_Exigences techniques issues de l'Architecture (ARCHITECTURE-SPINE) qui gouvernent l'implémentation._

- ADD-1 — **Scaffold / starter** : projet greenfield monolithe modulaire full-stack. Un seul artefact déployable : Payload CMS monté dans Next.js (mêmes processus, même conteneur). Stack : TypeScript 5, Node 22 LTS, Next.js ≥ 16.2.2, React 19.2, Payload ≥ 3.73, adaptateur `@payloadcms/db-sqlite` (Drizzle + libSQL). **Impacte Epic 1, Story 1.**
- ADD-2 — Collections Payload à définir (singulier, PascalCase, domaine FR) : `Danse`, `Position`, `Passe`, `Enchainement`, `User`, `Favori`. Position et Passe portent un `nom`.
- ADD-3 — Payload est le seul scribe de la base (AD-1) : toute mutation passe par l'API/hooks/access de Payload. Les lectures custom (moteur) utilisent le schéma Drizzle typé généré par Payload, jamais du SQL brut ; aucune écriture Drizzle ne contourne Payload.
- ADD-4 — Le graphe vit sur la Passe (AD-2) : arêtes = `Passe.positionDébut`/`positionFin`. « Passes possibles depuis la position courante » = lecture serveur `WHERE positionDébut = courante`. Le client ne reconstruit jamais le graphe. Vit dans `src/engine/`.
- ADD-5 — Contrôles d'accès concentrés dans les `access` des collections Payload (AD-3), jamais réimplémentés dans l'UI. Admin (drapeau `admin`) possède Danse/Position/Passe ; l'auteur possède son Enchaînement.
- ADD-6 — Règle de visibilité (AD-4) : `partagé` = lisible sans connexion ; `privé` = auteur seul ; défaut à la création = `privé`. Les surfaces dérivées (fiche passe, favoris) ne remontent que du partagé.
- ADD-7 — Validation même-danse par hook (AD-5) : `positionDébut.danse == positionFin.danse` ; la danse de la passe/enchaînement se déduit (non stockée en double).
- ADD-8 — Suppression bloquée si référencé par hook Payload (AD-6).
- ADD-9 — Contrainte Favori (AD-7) : créé seulement si `enchaînement.auteur != user` et `visibilité == partagé` ; unicité au plus un Favori par couple (user, enchaînement).
- ADD-10 — Champs legacy archivés, non lus par API/admin/UI en v1 (AD-8) : `youtube_url` de la passe, `customName`, `PersonnalizePasse`.
- ADD-11 — Authentification via la collection `users` d'auth de Payload (AD-9) : email + mot de passe, sessions, réinitialisation. Pas de fournisseur externe.
- ADD-12 — Persistance : SQLite (libSQL) sur volume persistant + sauvegarde continue vers S3 via Litestream/réplication libSQL (AD-10). Aucune écriture validée perdue si l'instance disparaît.
- ADD-13 — Uploads images de positions dans S3 via l'adaptateur de stockage Payload (AD-11), découplés de l'instance ; placeholder `no_position` si absente.
- ADD-14 — Déploiement : conteneur Docker sur instance Lightsail unique (disque persistant SQLite). Pipeline : push `main` → GitHub Actions build image → `ghcr.io` → l'instance pull + redémarre (AD-12). Aucun geste manuel.
- ADD-15 — Tests E2E Playwright en local et dans la CI avant déploiement (AD-13). Pas d'environnement de staging séparé en v1.
- ADD-16 — Script de migration one-off via l'API Local de Payload (AD-14), ordonné (Danses → Positions → Passes → Enchaînements), vérifiable (comptage) et rejouable sans doublon. Vit dans `migrate/`. Lit `passe-finder-saveDB.gz`.
- ADD-17 — Instrumentation via Cloudflare Web Analytics (AD-15) : script léger sans cookie, console externe. Distinction connectés/anonymes dérivée côté app (état de session). Aucun écran de stats in-app.
- ADD-18 — Conventions : ordre des passes d'un Enchaînement porté par un champ tableau ordonné Payload (index = ordre). Sélecteur de danse masqué en UI/admin v1 (défaut « rock 6 temps »), le champ existe pour l'extension future. Identifiants de code en anglais ; domaine et UI en français.

### UX Design Requirements

_Issues du contrat UX (DESIGN « Lin & Sauge » + EXPERIENCE). Chaque UX-DR est assez spécifique pour générer une story avec des critères testables._

**Système visuel & fondations**

- UX-DR1 — Implémenter le design system « Lin & Sauge » en tokens (variables CSS) : palette claire ET sombre (bg, surface, surface-container, ink, muted, line, accent sauge, accent-soft, on-accent, danger, pos-bg, dancer-lead, dancer-follow + variantes `-dark`), typographie système sans-serif (display, headline, body, label-caps, data-monospace), rayons (sm/DEFAULT/md/lg/full), espacements (unité 4px, marges 16px mobile / 24px desktop).
- UX-DR2 — Thème clair/sombre : suit l'OS et un sélecteur `data-theme` du lecteur ; les deux thèmes reçoivent le même soin ; respect de `prefers-reduced-motion`.
- UX-DR3 — Composants de base réutilisables : bouton primaire (sauge plein), bouton fantôme (surface + bordure line), chip/ligne de passe (survol accent-soft + bordure accent), image de position ronde (fond pos-bg, alt = nom, placeholder `no_position`), flèche de passe (accent, coudée au retour à la ligne, portant le nom en label-caps), position verrouillée (fond accent-soft + coche).
- UX-DR4 — Barre de navigation globale (haut) : gauche = logo→Accueil, Catalogue, recherche globale (→ E10) ; droite = si connecté « Créer un enchaînement » (accent) + menu profil (mes enchaînements, mes favoris, déconnexion), sinon « Se connecter ». Version compacte mobile (menu replié).

**Composant partagé cœur**

- UX-DR5 — Rendu de chaîne (partagé compositeur ↔ vue lecture) : séquence continue `position → flèche(nom de passe) → position`, jamais deux positions adjacentes sans flèche-passe. PC : zigzag (boustrophedon) avec retour à la ligne via flèche coudée ; mobile : colonne verticale. Responsive (≈8 images/ligne grand écran → ≈4 → vertical).

**Écrans**

- UX-DR6 — E1 Accueil (public) : fil des 5-10 derniers ajouts, types mélangés avec badge de type (Position / Passe / Enchaînement), nom/titre, date, vignette ; seuls les enchaînements partagés y figurent. État vide « Rien de neuf pour l'instant ».
- UX-DR7 — E2 Catalogue (public) : deux onglets/sections Positions | Passes, grille de vignettes (image + nom), recherche par nom, filtre par difficulté pour les Passes. États vide et recherche sans résultat.
- UX-DR8 — E3 Fiche Position (public) : grande image (ou `no_position`), nom, description ; deux listes — passes qui y arrivent / passes qui en partent (FR-23), cliquables → E4.
- UX-DR9 — E4 Fiche Passe (public) : nom, description, difficulté ; images position début → fin cliquables → E3 ; liste des enchaînements qui l'utilisent (FR-24) ; liste des vidéos (FR-38) — deux listes distinctes.
- UX-DR10 — E5 Vue lecture d'un enchaînement (public) : entête titre/description/date/auteur + chaîne (rendu partagé) ; survol passe (PC) = détails. Bouton Favori pour visiteur/autre connecté (si partagé & pas l'auteur) ; contrôles auteur : Éditer, Supprimer, basculer Privé/Partagé, Copier le lien. Privé → 404/accès refusé pour les autres.
- UX-DR11 — E6 Compositeur / Éditeur (connecté) : sélecteur de position de départ (verrouille à la sélection, état accent-soft), rail des passes possibles en trois blocs empilés (Position de départ verrouillée · Dernière position courante · Passes possibles d'ici, chaque passe montrant sa position d'arrivée `→ ouverte`), chaîne en construction, annulation (croix × sur le dernier maillon ET bouton « ↶ Annuler dernière »), barre de sauvegarde en bas (titre/description/notes/date à gauche, visibilité défaut Privé, Enregistrer aligné à droite). Mode édition : chaîne préchargée. État cul-de-sac (aucune passe sortante) = message d'invitation, pas d'écran bloqué.
- UX-DR12 — E7 Mon profil (connecté) : deux listes disjointes — mes enchaînements (créés, avec titre/date/visibilité + éditer/supprimer/basculer visibilité/copier le lien) · mes favoris (partagés d'autrui, avec ouvrir/retirer des favoris). Messages de vide accueillants distincts par liste.
- UX-DR13 — E8 Inscription / Connexion / Mot de passe oublié (public) : formulaires email + mot de passe (auth Payload), lien « mot de passe oublié » ; déclenché naturellement quand un visiteur tente une action réservée (favori, composer) avec retour à l'action après connexion.
- UX-DR14 — E10 Résultats de recherche (public) : page dédiée atteinte depuis la recherche globale ; résultats groupés par catégorie (Positions, Passes, Enchaînements partagés) cliquables → E3/E4/E5 ; « voir tout » par catégorie ; portée = noms/titres en v1 (pas de plein-texte). États sans résultat et requête vide.

**Transverses**

- UX-DR15 — Voice & tone : français, tutoiement, chaleureux et direct ; microcopie concrète (« Enregistrer » → toast « Enregistré ») ; messages d'état écrits (cul-de-sac, vides, favoris vide). Pas de jargon ni d'excuses.
- UX-DR16 — State patterns : chargement/erreur standards ; sauvegarde échouée explicite et non destructive (enchaînement jamais perdu — NFR-4) ; sauvegarde réussie = toast + accès à l'URL de partage ; image manquante = placeholder + nom visible.
- UX-DR17 — Accessibility floor : texte alternatif obligatoire = `nom` de la position ; contraste conforme (palette vérifiée) ; compositeur et formulaires entièrement utilisables au clavier avec focus visible (accent) ; cibles tactiles confortables sur mobile ; respect `prefers-reduced-motion` et thème clair/sombre.
- UX-DR18 — E9 Back-office admin (`/admin`) : interface générée par Payload (hors design custom), libellés français, ordre de création Position → Passe → Enchaînement ; image non bloquante, suppression bloquée si référencé.

### FR Coverage Map

- FR-1 : Epic 2 — CRUD Position (admin)
- FR-2 : Epic 2 — Image non bloquante / placeholder `no_position`
- FR-3 : Epic 2 — CRUD Passe (admin)
- FR-4 : Epic 2 — Passe relie des positions existantes
- FR-5 : Epic 2 — Même danse pour passe + positions
- FR-6 : Epic 2 — Danse dimension de premier ordre (mono-danse v1)
- FR-7 : Epic 2 — Catalogue en lecture seule hors admin
- FR-8 : Epic 2 — Suppression bloquée si référencé
- FR-9 : Epic 4 — Créer un enchaînement (choix position de départ)
- FR-10 : Epic 4 — Passes possibles depuis la position courante
- FR-11 : Epic 4 — Sélection d'une passe avance la position
- FR-12 : Epic 4 — Vue claire de la chaîne en construction
- FR-13 : Epic 4 — Undo de la dernière passe
- FR-14 : Epic 4 — Enregistrer (titre/desc/notes/date, lié à l'auteur)
- FR-15 : Epic 4 — Éditer/supprimer ses propres enchaînements
- FR-16 : Epic 4 — Associer une vidéo YouTube (capacité)
- FR-17 : Epic 4 — Visibilité privé/partagé
- FR-18 : Epic 4 — URL de partage lecture seule sans connexion
- FR-19 : Epic 4 — Fiche enchaînement (entête + chaîne + survol)
- FR-20 : Epic 4 — Passes cliquables → fiche passe ; positions ont une fiche
- FR-21 : Epic 2 — Fiches Passe/Position en lecture publique
- FR-22 : Epic 2 — Fiche passe → positions départ/arrivée cliquables
- FR-23 : Epic 2 — Fiche position → passes entrantes/sortantes
- FR-24 : Epic 5 — Fiche passe → enchaînements partagés qui l'utilisent
- FR-25 : Epic 5 — Favori sur enchaînement partagé d'autrui
- FR-26 : Epic 3 — Inscription / connexion / déconnexion
- FR-27 : Epic 3 — Comptes exigés (auth Payload)
- FR-28 : Epic 3 — Récupération d'accès (mot de passe oublié)
- FR-29 : Epic 3 — Rôle admin unique
- FR-30 : Epic 5 — Profil à deux listes (enchaînements / favoris)
- FR-31 : Epic 6 — Migration ordonnée du catalogue
- FR-32 : Epic 6 — Migration vérifiable et rejouable
- FR-33 : Epic 6 — Positions migrées sans image → placeholder
- FR-34 : Epic 6 — `passe.youtube_url` legacy archivé
- FR-35 : Epic 6 — `customName` / `PersonnalizePasse` archivés
- FR-36 : Epic 6 — Comptes non migrés ; enchaînements → Alain
- FR-37 : Epic 4 — URL YouTube optionnelle sur l'enchaînement
- FR-38 : Epic 5 — Fiche passe → vidéos (reverse-lookup)
- FR-39 : Epic 4 — Vidéo = lien (pas de lecteur intégré)
- FR-40 : Epic 1 — Déployé sur AWS
- FR-41 : Epic 1 — Pipeline CI/CD commit → prod
- FR-42 : Epic 1 — Choix services AWS (résolu AD-12/13)
- FR-43 : Epic 1 — Instrumentation d'audience

## Epic List

### Epic 1: Socle déployable & pipeline continu
Poser le monolithe Next.js + Payload qui tourne en production, se déploie automatiquement à chaque commit sur Lightsail, persiste et sauvegarde ses données de façon fiable, et installe le système visuel « Lin & Sauge » avec la coquille de navigation. À la fin de cet epic, tout travail futur atterrit en prod sans geste manuel — c'est le jalon technique du déploiement continu (M-3) et le terrain d'apprentissage AWS d'Alain.
**FRs couverts :** FR-40, FR-41, FR-42, FR-43
**Exigences additionnelles :** ADD-1, ADD-3, ADD-12, ADD-14, ADD-15, ADD-17 · UX-DR1, UX-DR2, UX-DR3, UX-DR4
**NFR adressés :** NFR-4, NFR-5, NFR-6, NFR-7

### Epic 2: Catalogue de référence (Positions & Passes)
Donner à Alain (admin) le pouvoir de cataloguer : créer/éditer/supprimer Positions et Passes de la danse « rock 6 temps », avec images non bloquantes (placeholder `no_position`), validation même-danse et blocage de la suppression d'un élément référencé. En miroir, tout visiteur consulte les fiches Position et Passe et circule dans le graphe (passes entrantes/sortantes, positions départ/arrivée). C'est la brique de base de la colonne vertébrale.
**FRs couverts :** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-21, FR-22, FR-23
**Exigences additionnelles :** ADD-2, ADD-5, ADD-7, ADD-8, ADD-10, ADD-13, ADD-18 · UX-DR8, UX-DR9 (hors listes enchaînements/vidéos), UX-DR18
**NFR adressés :** NFR-1, NFR-3, NFR-7

### Epic 3: Comptes & accès
Permettre à un visiteur de créer un compte, se connecter, se déconnecter et récupérer son accès (mot de passe oublié) via l'authentification Payload ; ancrer le rôle admin unique qui gouverne l'édition du catalogue. Prérequis pour composer et mettre en favori. La connexion se déclenche naturellement quand un visiteur tente une action réservée, avec retour à l'action.
**FRs couverts :** FR-26, FR-27, FR-28, FR-29
**Exigences additionnelles :** ADD-11 · UX-DR13
**NFR adressés :** NFR-1, NFR-7

### Epic 4: Composition & enchaînements (climax du produit)
Le geste central. Tout utilisateur connecté compose un enchaînement guidé par le graphe (le catalogue ne propose que les passes possibles depuis la position courante), annule pas-à-pas, l'enregistre avec titre/description/notes/date et visibilité (défaut privé), l'édite/supprime, et peut y associer une vidéo YouTube. Un enchaînement partagé s'ouvre en lecture seule sans connexion via une URL simple (collable dans WhatsApp), avec le rendu de chaîne partagé (zigzag PC / vertical mobile).
**FRs couverts :** FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20, FR-37, FR-39
**Exigences additionnelles :** ADD-4 (moteur), ADD-6 (visibilité), ADD-8 (extension blocage suppression) · UX-DR5, UX-DR10, UX-DR11, UX-DR16
**NFR adressés :** NFR-1, NFR-2, NFR-4

### Epic 5: Découverte, favoris & profil
Boucler la boucle de valeur pour les élèves et pour Alain. Accueil « fil des nouveautés » (5-10 derniers ajouts, types mélangés), catalogue navigable, recherche globale groupée par catégorie (E10), favoris sur les enchaînements partagés d'autrui, profil à deux listes disjointes (mes enchaînements / mes favoris), et le reverse-lookup de la fiche passe (enchaînements et vidéos partagés qui l'utilisent). Sert directement M-1 (« retrouver facilement ») et M-2 (retour des élèves).
**FRs couverts :** FR-24, FR-25, FR-30, FR-38
**Exigences additionnelles :** ADD-9 (contrainte favori) · UX-DR6, UX-DR7, UX-DR9 (listes enchaînements/vidéos), UX-DR12, UX-DR14, UX-DR15
**NFR adressés :** NFR-1, NFR-2, NFR-7

### Epic 6: Migration des données legacy
Rapatrier le catalogue accumulé depuis `passe-finder-saveDB.gz` via l'API Local de Payload, dans l'ordre de dépendance Danses → Positions → Passes → Enchaînements, de façon vérifiable (comptage source vs cible) et rejouable sans doublon. Tous les enchaînements migrés sont rattachés à Alain ; les images manquantes reçoivent le placeholder ; les champs legacy (youtube_url de passe, customName, PersonnalizePasse) sont archivés sans être exposés. Clôt le jalon M-3 en mettant le vrai catalogue d'Alain en production.
**FRs couverts :** FR-31, FR-32, FR-33, FR-34, FR-35, FR-36
**Exigences additionnelles :** ADD-16, ADD-10 (champs archivés)
**NFR adressés :** NFR-6

---

## Epic 1: Socle déployable & pipeline continu

Poser le monolithe Next.js + Payload qui tourne en production, se déploie automatiquement à chaque commit sur Lightsail, persiste et sauvegarde ses données de façon fiable, et installe le système visuel « Lin & Sauge » avec la coquille de navigation. À la fin de cet epic, tout travail futur atterrit en prod sans geste manuel (jalon M-3) et le terrain d'apprentissage AWS d'Alain est en place.

### Story 1.1: Scaffold du monolithe Next.js + Payload

As a développeur du projet,
I want un projet monolithe Next.js avec Payload monté dedans qui démarre en local,
So that j'ai le squelette technique de référence sur lequel construire toutes les fonctionnalités.

**Acceptance Criteria:**

**Given** un dépôt vide sur la branche `v2`
**When** j'initialise le projet avec la stack cible (TypeScript 5, Node 22 LTS, Next.js ≥ 16.2.2, React 19.2, Payload ≥ 3.73, adaptateur `@payloadcms/db-sqlite`)
**Then** `npm install` puis le lancement du serveur de dev réussissent sans erreur
**And** l'arborescence suit le scaffold de l'architecture (`src/app/`, `src/collections/`, `src/engine/`, `src/payload.config.ts`, `migrate/`, `tests/e2e/`)

**Given** le serveur de dev lancé
**When** j'ouvre la route racine `/` et la route `/admin`
**Then** la page d'accueil (même minimale) et le back-office Payload s'affichent
**And** un fichier de base SQLite (libSQL) est créé au premier démarrage

**Given** la configuration Payload
**When** je crée le premier utilisateur admin via l'assistant `/admin`
**Then** je peux me connecter au back-office
**And** aucune écriture de données ne se fait ailleurs que par l'API/les hooks Payload (ADD-3 : Payload est le seul scribe)

**Given** le dépôt initialisé
**When** je consulte la configuration de langue
**Then** les libellés du domaine et de l'UI sont en français et les identifiants de code en anglais technique (ADD-18, NFR-7)

### Story 1.2: Image Docker de production

As a développeur du projet,
I want une image Docker qui exécute le monolithe en mode production,
So that l'application est packagée de façon reproductible, prête à être déployée sur n'importe quel hôte conteneur.

**Acceptance Criteria:**

**Given** le monolithe de la Story 1.1
**When** je construis l'image via le `Dockerfile` à la racine
**Then** le build réussit et produit une image exécutable
**And** l'image contient le build de production Next.js + Payload (pas les dépendances de dev superflues)

**Given** l'image construite
**When** je lance le conteneur en local en lui fournissant les variables d'environnement requises
**Then** l'application sert la page d'accueil et `/admin`
**And** le conteneur lit/écrit sa base SQLite sur un chemin monté depuis un volume (pas dans la couche image éphémère)

**Given** une variable d'environnement requise manquante au démarrage
**When** le conteneur démarre
**Then** l'échec est explicite dans les logs (message clair sur la variable manquante), pas un plantage silencieux

### Story 1.3: Pipeline CI/CD commit → production avec filet Playwright

As a Alain (mainteneur),
I want qu'un push sur `main` construise, teste et déploie l'application en production sans aucun geste manuel,
So that je livre en continu et j'apprends une chaîne de déploiement moderne (jalon technique M-3).

**Acceptance Criteria:**

**Given** un dépôt configuré avec GitHub Actions et une instance Lightsail cible
**When** je pousse un commit sur `main`
**Then** le workflow construit l'image Docker, la publie sur `ghcr.io`, puis l'instance Lightsail la récupère et redémarre le conteneur
**And** la modification est visible en production sans intervention manuelle (FR-40, FR-41, ADD-14)

**Given** le pipeline en cours d'exécution
**When** l'étape de tests s'exécute avant le déploiement
**Then** un test Playwright de fumée (la page d'accueil se charge et affiche le contenu attendu) doit passer (ADD-15)
**And** si le test de fumée échoue, le déploiement est bloqué (pas de mise en prod d'une régression)

**Given** l'architecture v1
**When** j'examine le pipeline
**Then** il n'existe pas d'environnement de staging séparé (simplicité assumée, AD-13)
**And** le harnais Playwright est en place dans `tests/e2e/` pour que les epics suivants y ajoutent leurs scénarios

### Story 1.4: Persistance fiable — volume SQLite + sauvegarde continue vers S3

As a Alain (mainteneur),
I want que la base SQLite vive sur un volume persistant et soit répliquée en continu vers S3,
So that aucun enchaînement enregistré n'est jamais perdu, même si l'instance disparaît (NFR-4).

**Acceptance Criteria:**

**Given** le conteneur déployé sur Lightsail
**When** l'application écrit des données puis le conteneur redémarre
**Then** les données sont toujours présentes après redémarrage (base sur volume persistant, pas dans l'image)

**Given** Litestream (ou la réplication libSQL) configuré vers un bucket S3
**When** l'application valide une écriture
**Then** cette écriture est répliquée en continu vers S3 (ADD-12)
**And** je peux restaurer la base depuis S3 sur une instance neuve et retrouver les dernières données validées (restauration vérifiée au moins une fois)

**Given** la contrainte de coût (NFR-6)
**When** je choisis le dimensionnement du stockage et de la sauvegarde
**Then** la solution reste dans l'ordre de grandeur visé (paiement à l'usage / free tier), documentée avec le _pourquoi_ du choix

### Story 1.5: Système visuel « Lin & Sauge » — tokens, thème, composants de base

As a utilisateur (élève ou visiteur),
I want une interface épurée, cohérente et lisible en clair comme en sombre,
So that l'outil est agréable et rassurant à utiliser sur tout écran.

**Acceptance Criteria:**

**Given** le contrat de design DESIGN.md
**When** j'implémente le système visuel
**Then** toutes les valeurs (palette claire ET sombre, typographie système sans-serif, rayons, espacements) sont exposées en variables CSS/tokens réutilisables (UX-DR1)
**And** aucune police externe n'est chargée (chargement instantané, sans dépendance)

**Given** le thème clair/sombre
**When** un utilisateur change le thème de son OS ou via le sélecteur `data-theme`
**Then** l'interface bascule entre les palettes claire et sombre en conservant un contraste conforme (UX-DR2, UX-DR17)
**And** `prefers-reduced-motion` est respecté (pas d'animation imposée)

**Given** les tokens en place
**When** je crée les composants de base
**Then** le bouton primaire (sauge plein), le bouton fantôme (surface + bordure) et l'image de position ronde (fond `pos-bg`, alt = nom, placeholder `no_position`) existent et respectent les tokens (UX-DR3)

### Story 1.6: Coquille de navigation & layout responsive

As a utilisateur (connecté ou visiteur),
I want une barre de navigation globale et une mise en page cohérente sur mobile et PC,
So that je m'oriente dans l'application quel que soit mon écran.

**Acceptance Criteria:**

**Given** le système visuel de la Story 1.5
**When** j'affiche n'importe quelle page
**Then** une barre de navigation haute est présente : à gauche logo → Accueil, lien Catalogue, entrée de recherche globale ; à droite, une zone d'actions de compte (UX-DR4)
**And** le contenu s'inscrit dans un layout appliquant marges et espacements des tokens (16px mobile / 24px desktop)

**Given** un petit écran (mobile)
**When** j'affiche la barre de navigation
**Then** elle passe en version compacte (menu replié) tout en gardant l'accès aux entrées principales (NFR-1)

**Given** que l'authentification n'est pas encore livrée (Epic 3)
**When** j'affiche la zone d'actions de compte
**Then** elle présente un état par défaut « Se connecter » (placeholder), sans dépendre d'une story future
**And** les libellés sont en français (NFR-7)

### Story 1.7: Instrumentation d'audience (Cloudflare Web Analytics)

As a Alain,
I want mesurer la fréquentation du site en distinguant élèves connectés et visiteurs anonymes,
So that je peux suivre l'usage réel (KPI : visiteurs/jour) sans construire de tableau de bord (M-2).

**Acceptance Criteria:**

**Given** un compte Cloudflare Web Analytics
**When** une page publique est chargée
**Then** le script léger sans cookie de Cloudflare est présent et remonte la visite à la console externe (FR-43, ADD-17)
**And** aucune bannière de consentement cookies n'est nécessaire

**Given** la nécessité de distinguer connectés et anonymes
**When** une page est instrumentée
**Then** la distinction se dérive côté application à partir de l'état de session (pas via l'outil de stats)

**Given** l'exigence v1
**When** je consulte l'application
**Then** aucun écran de statistiques n'est intégré dans l'app (la consultation se fait dans la console Cloudflare)

---

## Epic 2: Catalogue de référence (Positions & Passes)

Donner à Alain (admin) le pouvoir de cataloguer : créer/éditer/supprimer Positions et Passes de la danse « rock 6 temps », avec images non bloquantes (placeholder `no_position`), validation même-danse et blocage de la suppression d'un élément référencé. En miroir, tout visiteur consulte les fiches Position et Passe et circule dans le graphe. C'est la brique de base de la colonne vertébrale Position → Passe → Enchaînement.

### Story 2.1: Modèle Danse (mono-danse « rock 6 temps »)

As a développeur du projet,
I want une collection Danse portant la seule danse v1 « rock 6 temps », masquée dans l'UI mais présente dans le modèle,
So that Positions et Passes se rattachent à une danse dès le départ, sans bloquer l'ajout futur d'autres danses sans migration structurelle.

**Acceptance Criteria:**

**Given** le monolithe de l'Epic 1
**When** je définis la collection Payload `Danse` (singulier, PascalCase)
**Then** elle existe avec au minimum un `nom`, et une seule danse « rock 6 temps » est présente (semée) au démarrage (FR-6, ADD-2)

**Given** la contrainte mono-danse v1
**When** un admin gère Positions ou Passes dans `/admin`
**Then** le sélecteur de danse est masqué et la danse « rock 6 temps » est appliquée par défaut (ADD-18)
**And** le modèle permet d'ajouter d'autres danses ultérieurement sans changement de schéma (le champ danse reste porté par Position)

### Story 2.2: Gérer les Positions (CRUD admin, image non bloquante)

As a Alain (admin),
I want créer, éditer et supprimer des Positions avec nom, description et image optionnelle,
So that je catalogue les états statiques de la danse, la brique de départ de tout le reste.

**Acceptance Criteria:**

**Given** la collection Danse (Story 2.1)
**When** je définis la collection `Position` (nom, description, image, danse de rattachement) et j'ouvre `/admin`
**Then** je peux créer, éditer et supprimer une Position depuis le back-office Payload, en français (FR-1, ADD-2, UX-DR18)

**Given** que je crée une Position sans fournir d'image
**When** j'enregistre
**Then** la Position est valide et utilise le placeholder `no_position` à l'affichage (FR-2, NFR-3)
**And** je peux ajouter ou remplacer l'image plus tard sans invalider la Position

**Given** une image fournie
**When** j'enregistre la Position
**Then** l'image est stockée dans S3 via l'adaptateur de stockage Payload, découplée de l'instance (ADD-13)
**And** son texte alternatif est le `nom` de la position (UX-DR17)

**Given** un utilisateur non-admin (connecté ou visiteur)
**When** il accède aux Positions
**Then** il est en lecture seule ; seul l'admin peut créer/éditer/supprimer (FR-7, ADD-5 — contrôle dans les `access` de la collection, jamais dans l'UI)

### Story 2.3: Gérer les Passes (même danse, positions existantes)

As a Alain (admin),
I want créer, éditer et supprimer des Passes reliant une position de départ à une position d'arrivée de la même danse,
So that je construis le graphe des mouvements sur lequel repose la composition d'enchaînements.

**Acceptance Criteria:**

**Given** des Positions existantes (Story 2.2)
**When** je définis la collection `Passe` (nom, position de départ, position d'arrivée, description, difficulté optionnelle) et je crée une Passe dans `/admin`
**Then** je sélectionne les positions de départ et d'arrivée parmi les positions existantes uniquement — pas de création de position à la volée (FR-3, FR-4)

**Given** que je choisis deux positions de danses différentes
**When** j'enregistre la Passe
**Then** un hook de validation refuse l'enregistrement (une passe ne mélange jamais deux danses) (FR-5, ADD-7)
**And** la danse de la passe se déduit de ses positions, sans être stockée en double

**Given** que la difficulté n'est pas renseignée
**When** j'enregistre la Passe
**Then** l'enregistrement réussit (la difficulté est optionnelle)

**Given** les champs legacy hérités de l'ancien schéma
**When** je définis la collection Passe
**Then** des champs d'archivage sont **définis dès la création de la collection** pour accueillir `youtube_url` (legacy), `customName` et les données `PersonnalizePasse` liées (ex. champ JSON) (ADD-10)
**And** ces champs sont marqués `hidden` : ni affichés ni utilisés en lecture/écriture par l'admin, l'API ou l'UI v1 — réservés à la phase d'archivage (migration)

**Given** un utilisateur non-admin
**When** il accède aux Passes
**Then** il est en lecture seule ; seul l'admin édite (FR-7, ADD-5)

### Story 2.4: Blocage de suppression d'un élément référencé

As a Alain (admin),
I want être empêché de supprimer une Position ou une Passe encore utilisée,
So that je ne casse jamais par accident le contenu de révision dépendant de cet élément.

**Acceptance Criteria:**

**Given** une Position utilisée comme départ ou arrivée d'au moins une Passe
**When** je tente de la supprimer
**Then** un hook Payload refuse la suppression avec un message clair (FR-8, ADD-8)
**And** je peux la supprimer une fois toutes les passes qui la référencent retirées

**Given** une Passe (ou une Position) non référencée
**When** je la supprime
**Then** la suppression réussit

**Given** que la collection Enchaînement n'existe pas encore (livrée à l'Epic 4)
**When** j'implémente ce blocage
**Then** la garde couvre le référencement Position↔Passe existant ; le volet « Passe référencée par un Enchaînement » sera ajouté à l'Epic 4 quand la collection existera (extension documentée, pas de dépendance vers l'avant)

### Story 2.5: Fiche Position publique & exploration du graphe

As a visiteur ou élève,
I want consulter la fiche d'une Position et voir toutes les passes qui y arrivent et qui en partent,
So that j'explore le catalogue depuis une position : ce que je peux faire à partir d'ici.

**Acceptance Criteria:**

**Given** des Passes reliant des Positions (Story 2.3)
**When** j'ouvre la fiche d'une Position (E3) sans être connecté
**Then** je vois sa grande image (ou `no_position`), son nom et sa description en lecture publique (FR-21, UX-DR8)

**Given** la fiche d'une Position
**When** je consulte ses relations
**Then** deux listes distinctes s'affichent : les passes qui y **arrivent** (position d'arrivée) et celles qui en **partent** (position de départ) (FR-23)
**And** chaque passe listée est cliquable vers sa fiche passe

**Given** une Position sans passe entrante ni sortante
**When** j'ouvre sa fiche
**Then** l'absence de relations est affichée proprement (pas d'écran cassé)

### Story 2.6: Fiche Passe publique & navigation vers les positions

As a visiteur ou élève,
I want consulter la fiche d'une Passe et naviguer vers ses positions de départ et d'arrivée,
So that je comprends comment exécuter la passe et je circule dans le graphe position ↔ passe.

**Acceptance Criteria:**

**Given** une Passe existante (Story 2.3) et les fiches Position (Story 2.5)
**When** j'ouvre la fiche d'une Passe (E4) sans être connecté
**Then** je vois son nom, sa description (comment faire) et sa difficulté en lecture publique (FR-21, UX-DR9)

**Given** la fiche d'une Passe
**When** je consulte ses positions
**Then** les images des positions de départ → arrivée sont affichées et cliquables vers la fiche de la position correspondante (FR-22)

**Given** l'exigence v1
**When** j'affiche la fiche d'une Passe
**Then** les listes « enchaînements qui l'utilisent » et « vidéos » n'y figurent pas encore (livrées à l'Epic 5, car elles dépendent des Enchaînements) — leur emplacement est prévu sans bloquer cette story

---

## Epic 3: Comptes & accès

Permettre à un visiteur de créer un compte, se connecter, se déconnecter et récupérer son accès (mot de passe oublié) via l'authentification Payload ; ancrer le rôle admin unique qui gouverne l'édition du catalogue. Prérequis pour composer (Epic 4) et mettre en favori (Epic 5). La connexion se déclenche naturellement quand un visiteur tente une action réservée, avec retour à l'action.

### Story 3.1: Inscription (créer un compte)

As a visiteur,
I want créer un compte avec mon email et un mot de passe,
So that je peux ensuite composer et sauvegarder mes propres enchaînements.

**Acceptance Criteria:**

**Given** la collection `users` d'auth de Payload (ADD-11)
**When** j'ouvre l'écran d'inscription (E8) et je fournis un email et un mot de passe valides
**Then** mon compte est créé et je suis authentifié (FR-26)
**And** l'email et le mot de passe sont gérés par l'auth Payload (hachage, sessions) — aucun fournisseur externe

**Given** un email déjà utilisé ou un mot de passe invalide
**When** je tente de m'inscrire
**Then** un message d'erreur clair en français explique le problème, sans créer de compte

**Given** un compte fraîchement créé
**When** je consulte mes droits
**Then** je suis un utilisateur connecté standard (pas admin) avec les mêmes possibilités que tout autre connecté

### Story 3.2: Connexion, déconnexion & état connecté dans la nav

As a utilisateur,
I want me connecter et me déconnecter, et voir la navigation refléter mon statut,
So that j'accède à mon espace et je sais toujours si je suis connecté.

**Acceptance Criteria:**

**Given** un compte existant (Story 3.1)
**When** je saisis mes identifiants sur l'écran de connexion (E8)
**Then** une session est ouverte et je suis redirigé vers l'application connecté (FR-26)

**Given** une session active
**When** je me déconnecte
**Then** la session est fermée et je retrouve l'état visiteur

**Given** mon état de connexion
**When** j'affiche la barre de navigation
**Then** connecté, elle montre « Créer un enchaînement » (mis en avant, accent) + un menu profil ; anonyme, elle montre « Se connecter » (UX-DR4, remplace le placeholder de la Story 1.6)
**And** les entrées « mes enchaînements » / « mes favoris » du menu profil sont présentes en placeholder (destinations livrées à l'Epic 5), tandis que « Créer » et « Déconnexion » sont pleinement fonctionnels

### Story 3.3: Récupération d'accès (mot de passe oublié)

As a utilisateur ayant perdu son mot de passe,
I want réinitialiser mon mot de passe par email,
So that je retrouve l'accès à mon compte sans le recréer.

**Acceptance Criteria:**

**Given** un compte existant
**When** je demande une réinitialisation depuis « mot de passe oublié » (E8) avec mon email
**Then** l'auth Payload envoie un email de réinitialisation (FR-28)
**And** le message affiché ne révèle pas si l'email existe ou non (pas de fuite d'information)

**Given** un lien de réinitialisation valide
**When** je définis un nouveau mot de passe
**Then** mon mot de passe est mis à jour et je peux me connecter avec

**Given** un lien de réinitialisation expiré ou déjà utilisé
**When** je tente de l'utiliser
**Then** un message clair m'invite à refaire une demande

### Story 3.4: Rôle admin unique & gouvernance du catalogue

As a Alain,
I want être le seul détenteur du rôle admin, attribué en dehors de l'application,
So that l'édition du catalogue de référence reste strictement sous mon contrôle.

**Acceptance Criteria:**

**Given** un drapeau `admin` porté par l'utilisateur (introduit à l'Epic 2 pour les contrôles d'accès)
**When** je consulte les droits d'un utilisateur admin
**Then** il possède l'édition de Danse/Position/Passe ; un utilisateur non-admin en est privé (FR-29, ADD-5)

**Given** l'exigence v1
**When** un utilisateur cherche à devenir admin depuis l'application
**Then** aucune interface d'auto-promotion n'existe : le statut admin s'attribue hors application (seed / `/admin`)

**Given** la gouvernance des permissions
**When** j'audite où vivent les règles admin
**Then** elles sont uniquement dans les `access` des collections Payload, jamais réimplémentées dans l'UI (ADD-5)

### Story 3.5: Porte d'accès aux actions réservées & retour après connexion

As a visiteur qui tente une action réservée,
I want être invité à me connecter puis ramené à ce que je voulais faire,
So that la connexion s'intègre sans friction dans mon parcours plutôt que de me faire perdre le fil.

**Acceptance Criteria:**

**Given** une route ou une action marquée « connexion requise »
**When** un visiteur anonyme y accède
**Then** il est redirigé vers l'écran de connexion/inscription (E8) (UX-DR13)
**And** après connexion réussie, il est ramené à la route/action d'origine (retour à l'action)

**Given** un utilisateur déjà connecté
**When** il accède à une action réservée
**Then** il n'est pas redirigé et accède directement

**Given** le contrat de protection réutilisable
**When** les fonctionnalités « composer » (Epic 4) et « favori » (Epic 5) seront livrées
**Then** elles se branchent sur ce mécanisme sans le réimplémenter (cette story livre le contrat, démontré sur une route protégée)

---

## Epic 4: Composition & enchaînements (climax du produit)

Le geste central. Tout utilisateur connecté compose un enchaînement guidé par le graphe (le catalogue ne propose que les passes possibles depuis la position courante), annule pas-à-pas, l'enregistre avec titre/description/notes/date et visibilité (défaut privé), l'édite/supprime, et peut y associer une vidéo YouTube. Un enchaînement partagé s'ouvre en lecture seule sans connexion via une URL simple, avec le rendu de chaîne partagé (zigzag PC / vertical mobile).


### Story 4.1: Moteur de composition — passes possibles depuis la position courante

As a développeur du compositeur,
I want une lecture serveur qui renvoie les passes dont la position de départ est la position courante,
So that la composition ne propose jamais qu'un mouvement cohérent — le différenciateur du produit.

**Acceptance Criteria:**

**Given** le graphe des Passes du catalogue (Epic 2) et une position courante donnée
**When** le moteur (`src/engine/`) interroge « passes possibles d'ici »
**Then** il renvoie exactement les Passes dont `positionDébut` = position courante (FR-10, ADD-4)
**And** la lecture se fait côté serveur via le schéma Drizzle typé généré par Payload, jamais du SQL brut ni une reconstruction du graphe côté client (ADD-3, ADD-4)

**Given** une position sans passe sortante
**When** le moteur est interrogé pour cette position
**Then** il renvoie une liste vide (le compositeur en déduira l'état cul-de-sac)

**Given** un changement de collection Passe
**When** le code du moteur est compilé
**Then** toute incompatibilité de schéma casse à la compilation, pas silencieusement à l'exécution

### Story 4.2: Compositeur — composition guidée & rendu de chaîne

As a utilisateur connecté (Alain ou élève),
I want composer un enchaînement en choisissant une position de départ puis en enchaînant des passes proposées,
So that je reconstitue l'enchaînement du cours en quelques clics, sans jamais me tromper de position.

**Acceptance Criteria:**

**Given** l'écran compositeur (E6) et la porte d'accès de la Story 3.5
**When** un visiteur anonyme tente d'ouvrir le compositeur
**Then** il est invité à se connecter puis ramené au compositeur (action réservée aux connectés — FR-9)

**Given** le compositeur ouvert
**When** je choisis une position de départ dans la liste déroulante
**Then** la position se verrouille (état visuel `accent-soft`) et le rail « Passes possibles » apparaît, alimenté par le moteur (Story 4.1) (FR-9, UX-DR11)
**And** le rail montre trois blocs empilés : position de départ (verrouillée), dernière position (courante), passes possibles d'ici — chaque passe affichant sa position d'arrivée (`→ ouverte`)

**Given** le rail des passes possibles
**When** je clique une passe
**Then** elle s'ajoute à la chaîne, la position courante avance vers sa position d'arrivée, et le rail se recharge sur les passes possibles depuis la nouvelle position (FR-10, FR-11)

**Given** une chaîne en construction
**When** je la visualise
**Then** elle s'affiche en rendu partagé : séquence continue `position → flèche(nom de passe) → position`, jamais deux positions adjacentes sans flèche-passe ; zigzag sur grand écran (flèche coudée au retour à la ligne), colonne verticale sur mobile (FR-12, UX-DR5)

**Given** au moins une passe ajoutée
**When** j'annule la dernière (croix × sur le dernier maillon ou bouton « ↶ Annuler dernière »)
**Then** la dernière passe et sa position d'arrivée sont retirées, la position courante recule d'un cran (FR-13)
**And** réordonner ou insérer une passe au milieu n'est pas proposé (hors v1)

**Given** une position courante sans passe sortante
**When** le rail se recharge
**Then** un message d'invitation s'affiche (« Aucune passe ne part d'ici — enregistre ou annule la dernière passe. »), pas d'écran bloqué (UX-DR11)

### Story 4.3: Enregistrer un enchaînement (métadonnées, défaut privé, sauvegarde fiable)

As a utilisateur connecté,
I want enregistrer mon enchaînement avec un titre, une description, des notes et une date,
So that je le retrouve plus tard et je peux le partager — sans jamais risquer de le perdre.

**Acceptance Criteria:**

**Given** une chaîne composée (Story 4.2) et la collection `Enchainement` (titre, description, notes, date, auteur, visibilité, passes ordonnées, URL vidéo optionnelle)
**When** j'enregistre depuis la barre de sauvegarde
**Then** l'enchaînement est persisté via l'API Payload, lié à mon profil comme auteur (FR-14, ADD-1)
**And** l'ordre des passes est porté par un champ tableau ordonné (index = ordre), non dérivé d'ailleurs (ADD-18)

**Given** un nouvel enchaînement
**When** je l'enregistre sans toucher à la visibilité
**Then** il est créé en **privé** par défaut (on ne partage jamais par accident — FR-17, ADD-6)

**Given** un enregistrement réussi
**When** la sauvegarde se termine
**Then** une confirmation claire (toast « Enregistré ») s'affiche avec accès à l'URL de partage (UX-DR16)

**Given** un échec de sauvegarde (réseau, serveur)
**When** l'enregistrement échoue
**Then** l'erreur est explicite et **non destructive** : l'enchaînement en cours de composition n'est jamais perdu (NFR-4, UX-DR16)

### Story 4.4: Vue lecture, partage par URL & contrôles de partage

As a élève (ou visiteur) recevant un lien,
I want ouvrir un enchaînement partagé en lecture seule sans me connecter,
So that je révise l'enchaînement du cours directement depuis WhatsApp.

**Acceptance Criteria:**

**Given** un enchaînement en visibilité **partagé**
**When** j'ouvre son URL de partage sans être connecté
**Then** la vue lecture (E5) s'affiche : entête titre / description / date / auteur, puis la chaîne (rendu partagé de la Story 4.2) (FR-18, FR-19, UX-DR10)
**And** l'URL est simple et copiable (collable dans WhatsApp)

**Given** la vue lecture d'un enchaînement
**When** je clique une passe de la chaîne
**Then** j'accède à sa fiche passe (Story 2.6), et je peux revenir à l'enchaînement par la navigation (FR-20)
**And** sur PC, le survol d'une passe révèle des détails (positions de départ/arrivée)

**Given** un enchaînement en visibilité **privé**
**When** un autre utilisateur (ou un visiteur) tente d'ouvrir son URL
**Then** l'accès est refusé (404 / accès refusé) ; seul l'auteur y accède (FR-17, ADD-6)

**Given** que je suis l'auteur affichant mon enchaînement
**When** je consulte les contrôles de partage
**Then** je peux basculer Privé/Partagé et Copier le lien (FR-17, UX-DR10)
**And** l'emplacement des contrôles Éditer/Supprimer (auteur) et du bouton Favori (non-auteur) est prévu : Éditer/Supprimer sont câblés à la Story 4.5, Favori à l'Epic 5

### Story 4.5: Éditer & supprimer ses propres enchaînements

As a auteur d'un enchaînement,
I want éditer ou supprimer mes propres enchaînements,
So that je corrige ou retire mon contenu, sans qu'un autre utilisateur ne puisse y toucher.

**Acceptance Criteria:**

**Given** un enchaînement dont je suis l'auteur (Story 4.3) affiché en vue lecture (Story 4.4)
**When** je déclenche « Éditer »
**Then** l'enchaînement s'ouvre en mode édition dans le compositeur (E6), chaîne existante préchargée ; je peux la prolonger depuis la fin ou raccourcir en annulant pas-à-pas (pas d'insertion au milieu — FR-15, FR-13)
**And** je peux modifier titre, description, notes, date et réenregistrer

**Given** un enchaînement dont je ne suis pas l'auteur
**When** je tente de l'éditer ou de le supprimer
**Then** l'action est refusée par les `access` de la collection Payload (ADD-5), jamais seulement masquée dans l'UI

**Given** un enchaînement dont je suis l'auteur
**When** je le supprime
**Then** il est retiré et n'apparaît plus dans mes listes ni dans les surfaces publiques

**Given** que la collection Enchaînement existe désormais
**When** un admin tente de supprimer une Passe utilisée par un Enchaînement
**Then** le blocage de suppression de la Story 2.4 est étendu pour refuser aussi ce cas (FR-8, ADD-8) — le contenu de révision d'un élève n'est jamais cassé

### Story 4.6: Lier une vidéo YouTube à un enchaînement

As a auteur d'un enchaînement,
I want associer une URL YouTube optionnelle à mon enchaînement,
So that mes élèves peuvent voir une exécution filmée en complément de la chaîne.

**Acceptance Criteria:**

**Given** l'édition d'un enchaînement (Story 4.3 / 4.4)
**When** je renseigne une URL YouTube dans le champ vidéo optionnel
**Then** elle est enregistrée sur l'enchaînement (FR-16, FR-37)

**Given** un enchaînement portant une vidéo
**When** je consulte sa vue lecture (E5)
**Then** un lien vers la vidéo est affiché (ouvre/renvoie vers la vidéo YouTube) ; aucun lecteur intégré ni timestamp en v1 (FR-39)

**Given** un enchaînement sans vidéo
**When** je consulte sa vue lecture
**Then** aucune section vidéo n'est affichée (le champ reste optionnel)

### Story 4.7: Transitions de position — changer de prise sans danser de passe

As a danseur qui compose un enchaînement,
I want changer de prise entre deux passes sans danser de passe,
So that je peux aller jusqu'au bout d'un enchaînement comme on le fait réellement sur la piste, au lieu de rester bloqué dès que la passe suivante ne part pas d'où je suis.

**Contexte tranché le 2026-09-01, sur les données.** Trois modèles étaient en balance : (1) changement libre entre deux positions, (2) transitions déclarées entre positions, (3) transitions déclarées sur la passe d'arrivée. Le dépouillement des 120 enchaînements repris a tranché pour (2) : **103 reprises réelles, sur seulement 18 trajets distincts**, dont 95 à l'intérieur du petit groupe des prises de main. Surtout, **19 passes différentes arrivent en « main gauche / main droite » et rupturent, toutes vers le même petit groupe de cibles, sans une seule exception** — le déterminant est la position d'arrivée, jamais la passe, ce qui écarte (3). Et l'ancienne appli avait déjà exactement cet objet : la table `alternative(positionStart_id, positionAlternative_id, description)`, dix lignes de 2009 qui expliquent à elles seules plus de quatre reprises sur cinq. Le modèle n'était pas faux, il était incomplet — il lui manquait surtout les réciproques.

**Acceptance Criteria:**

**Given** le catalogue de référence
**When** un administrateur déclare une transition
**Then** elle relie deux positions **différentes** de la **même** danse, dans un **sens donné** (déclarer A → B n'ouvre pas B → A), avec un nom court facultatif et une description du geste (FR-44)
**And** un même trajet A → B ne peut être déclaré qu'une seule fois — c'est ce qui permet à la vue lecture de retrouver la transition d'une reprise par son seul couple de positions

**Given** que je compose un enchaînement et que je viens de poser une passe
**When** des transitions partent de sa position d'arrivée vers une position d'où au moins une passe repart
**Then** elles me sont proposées sous les passes possibles, nommées et décrites (FR-45)
**And** en choisir une déplace la position courante et rouvre la liste des passes possibles depuis la nouvelle position — y compris depuis un cul-de-sac, d'où aucune passe ne partait

**Given** un changement de prise choisi mais pas encore suivi d'une passe
**When** j'annule pas-à-pas
**Then** c'est le changement de prise qui est défait en premier, la passe précédente restant posée ; retirer ensuite cette passe remet en attente le changement qui la précédait
**And** l'enregistrement est refusé tant que le changement n'est suivi d'aucune passe, avec la raison affichée — seules les passes sont stockées, un changement en fin de chaîne n'aurait rien pour survivre

**Given** un enchaînement enregistré, ancien ou nouveau, comportant une reprise
**When** je consulte sa vue lecture
**Then** la reprise est **nommée** quand la transition est déclarée (le geste, son déroulé, la position d'où l'on repart) (FR-46)
**And** elle reste affichée **telle qu'avant**, sans nom, quand elle ne l'est pas — une vingtaine de reprises de l'historique attendent encore d'être écrites, et ce n'est pas une erreur

**Given** une position référencée par une transition
**When** un administrateur tente de la supprimer
**Then** la suppression est refusée, comme pour une passe (FR-8, AD-6) — sinon la transition survivrait en pointant dans le vide
**And** supprimer une **transition**, elle, ne casse rien : aucun enchaînement ne la référence, la reprise cesse simplement d'être nommée

---

## Epic 5: Découverte, favoris & profil

Boucler la boucle de valeur pour les élèves et pour Alain. Accueil « fil des nouveautés », catalogue navigable, recherche globale groupée par catégorie (E10), favoris sur les enchaînements partagés d'autrui, profil à deux listes disjointes (mes enchaînements / mes favoris), et le reverse-lookup de la fiche passe (enchaînements et vidéos partagés qui l'utilisent). Sert directement M-1 (« retrouver facilement ») et M-2 (retour des élèves).

### Story 5.1: Mettre en favori un enchaînement partagé d'autrui

As a utilisateur connecté,
I want mettre en signet un enchaînement partagé par quelqu'un d'autre,
So that je le retrouve facilement plus tard sans refouiller WhatsApp.

**Acceptance Criteria:**

**Given** un enchaînement **partagé** dont je ne suis pas l'auteur, affiché en vue lecture (Story 4.4)
**When** je clique le bouton Favori (connecté)
**Then** un `Favori` est créé, lien vers l'enchaînement (jamais une copie) (FR-25, ADD-9)
**And** un visiteur anonyme qui tente l'action est invité à se connecter puis ramené à l'enchaînement (porte d'accès 3.5)

**Given** la contrainte de favori (ADD-9)
**When** j'essaie de mettre en favori mon propre enchaînement ou un enchaînement privé
**Then** l'action n'est pas offerte / est refusée (on ne met en favori que le partagé d'autrui)

**Given** un enchaînement déjà dans mes favoris
**When** je tente de le mettre en favori une seconde fois
**Then** aucun doublon n'est créé (unicité : au plus un Favori par couple utilisateur/enchaînement)
**And** je peux le retirer de mes favoris

### Story 5.2: Profil à deux listes (mes enchaînements / mes favoris)

As a utilisateur connecté,
I want un profil montrant mes enchaînements créés et mes favoris séparément,
So that je retrouve d'un coup d'œil mon travail et le contenu que j'ai mis de côté.

**Acceptance Criteria:**

**Given** mes enchaînements (Epic 4) et mes favoris (Story 5.1)
**When** j'ouvre mon profil (E7)
**Then** deux listes **disjointes** s'affichent : « mes enchaînements » (créés) et « mes favoris » (partagés d'autrui) (FR-30, UX-DR12)
**And** les entrées placeholder du menu profil (Story 3.2) pointent désormais vers ces listes réelles

**Given** la liste « mes enchaînements »
**When** je consulte une de mes cartes
**Then** j'y vois titre, date et visibilité, avec les actions ouvrir / éditer / supprimer / basculer visibilité / copier le lien

**Given** la liste « mes favoris »
**When** je consulte une carte
**Then** je peux l'ouvrir ou le retirer des favoris

**Given** une liste vide
**When** je l'affiche
**Then** un message accueillant distinct invite à l'action (ex. favoris vides : « Pas encore de favori. Mets en signet un enchaînement partagé pour le retrouver ici. ») (UX-DR15)

### Story 5.3: Accueil — fil des nouveautés

As a visiteur ou élève,
I want voir d'un coup d'œil les derniers ajouts sur l'accueil,
So that je sais tout de suite « quoi de neuf » et j'ai un point d'entrée vers le contenu.

**Acceptance Criteria:**

**Given** des Positions, Passes et enchaînements **partagés** existants
**When** j'ouvre l'accueil (E1)
**Then** un fil des 5-10 derniers ajouts s'affiche, types mélangés, plus récents d'abord (UX-DR6)
**And** chaque entrée porte un badge de type (Position / Passe / Enchaînement), un nom/titre, une date et une vignette

**Given** le fil des nouveautés
**When** je clique une entrée
**Then** j'ouvre sa fiche Position (E3), fiche Passe (E4) ou vue lecture (E5) selon son type
**And** seuls les enchaînements **partagés** apparaissent (jamais de privé — ADD-6)

**Given** aucun contenu à afficher
**When** j'ouvre l'accueil
**Then** un état vide accueillant s'affiche (« Rien de neuf pour l'instant ») (UX-DR15)

### Story 5.4: Catalogue navigable (Positions / Passes)

As a visiteur ou élève,
I want parcourir le référentiel des Positions et des Passes,
So that j'explore ce qui existe et j'ouvre les fiches qui m'intéressent.

**Acceptance Criteria:**

**Given** le catalogue de référence (Epic 2)
**When** j'ouvre la page Catalogue (E2)
**Then** deux onglets/sections Positions | Passes présentent une grille de vignettes (image + nom) (UX-DR7)

**Given** la page Catalogue
**When** je recherche par nom
**Then** la grille se filtre sur les éléments correspondants

**Given** la section Passes
**When** j'applique le filtre par difficulté
**Then** seules les passes de la difficulté choisie s'affichent

**Given** une recherche ou un filtre sans correspondance
**When** aucun élément ne correspond
**Then** un état « aucun résultat » s'affiche proprement (UX-DR15)

### Story 5.5: Recherche globale groupée par catégorie

As a Alain (ou tout utilisateur),
I want une recherche globale qui retrouve positions, passes et enchaînements,
So that je retrouve facilement n'importe quel élément déjà créé, même ceux que j'oublie (M-1).

**Acceptance Criteria:**

**Given** la recherche globale de la barre de navigation
**When** je saisis une requête et valide
**Then** j'arrive sur une page de résultats dédiée (E10) groupés par catégorie : Positions, Passes, Enchaînements (partagés) (UX-DR14)
**And** chaque résultat est cliquable vers sa fiche/vue (E3/E4/E5)

**Given** une catégorie avec beaucoup de résultats
**When** j'affiche la page
**Then** chaque groupe montre ses premiers résultats avec un « voir tout »

**Given** la portée v1
**When** je recherche
**Then** la recherche porte sur les noms/titres (pas de plein-texte dans les descriptions)

**Given** une requête sans résultat ou vide
**When** je la soumets
**Then** un état adapté s'affiche (« Rien trouvé pour “…” » / invitation à saisir) (UX-DR15)

### Story 5.6: Fiche passe complète — enchaînements & vidéos (reverse-lookup)

As a élève,
I want voir, depuis une passe, les enchaînements et les vidéos partagés qui l'utilisent,
So that je comprends la passe en contexte et j'accède à des exécutions filmées.

**Acceptance Criteria:**

**Given** une fiche Passe (Story 2.6) et des enchaînements **partagés** l'utilisant
**When** j'affiche la fiche
**Then** une liste « enchaînements qui l'utilisent » apparaît, chacun cliquable vers sa vue lecture (FR-24, UX-DR9)

**Given** des enchaînements **partagés avec vidéo** utilisant cette passe
**When** j'affiche la fiche
**Then** une liste « vidéos » **distincte** apparaît ; un clic mène à l'enchaînement puis à sa vidéo YouTube (FR-38)

**Given** la règle de visibilité (ADD-6)
**When** un enchaînement privé (même avec vidéo) utilise la passe
**Then** il n'apparaît dans aucune des deux listes (pas de fuite de privé)

**Given** une passe utilisée par aucun enchaînement partagé
**When** j'affiche la fiche
**Then** les listes concernées sont vides/masquées proprement

---

## Epic 6: Migration des données legacy

Rapatrier le catalogue accumulé depuis `passe-finder-saveDB.gz` via l'API Local de Payload, dans l'ordre de dépendance Danses → Positions → Passes → Enchaînements, de façon vérifiable (comptage source vs cible) et rejouable sans doublon. Tous les enchaînements migrés sont rattachés à Alain ; les images manquantes reçoivent le placeholder ; les champs legacy sont archivés sans être exposés. Clôt le jalon M-3 en mettant le vrai catalogue d'Alain en production.

### Story 6.1: Extraction & mapping du dump legacy

As a développeur de la migration,
I want extraire et interpréter le dump `passe-finder-saveDB.gz` de l'ancien projet Yii,
So that je dispose des données source structurées et comptées, prêtes à être migrées dans l'ordre.

**Acceptance Criteria:**

**Given** le fichier `passe-finder-saveDB.gz` (schéma Yii 1.1.9)
**When** le script de migration (`migrate/`) le décompresse et le parse
**Then** les entités legacy pertinentes sont lues : `Danse`, `Position`, `Passe` (dont `positionStart_id`, `positionEnd_id`, `danse_id`, `difficulty`, `youtube_url`, `customName`), `Enchainement`, `EnchainementPasse`, `PersonnalizePasse` (ADD-16)

**Given** les données source lues
**When** le script établit le mapping vers le modèle cible
**Then** un comptage des éléments source par entité est produit (base de la vérification ultérieure — FR-32)
**And** la correspondance des champs source → cible est documentée, y compris les champs à archiver

### Story 6.2: Migrer le catalogue (Danses → Positions → Passes)

As a Alain,
I want migrer mes danses, positions et passes existantes dans le nouveau catalogue,
So that je retrouve tout mon référentiel accumulé sans le ressaisir.

**Acceptance Criteria:**

**Given** les données source (Story 6.1) et les collections cible (Epic 2)
**When** le script peuple via l'**API Local de Payload** dans l'ordre Danses → Positions → Passes
**Then** chaque entité est créée en respectant l'ordre de dépendance et les invariants (accès, validation même-danse) — aucune écriture ne contourne Payload (ADD-16, ADD-1)

**Given** une position migrée sans image exploitable
**When** elle est créée
**Then** elle reçoit le placeholder `no_position` (FR-33)

**Given** les champs d'archivage `hidden` définis sur la collection Passe (Story 2.3)
**When** les passes sont migrées
**Then** `passe.youtube_url` (legacy), `passe.customName` et les données `PersonnalizePasse` liées sont écrits dans ces champs d'archivage
**And** ils restent **non exposés** dans l'API/l'admin/l'UI v1, conservés pour un usage futur éventuel (FR-34, FR-35, ADD-10)

### Story 6.3: Migrer les enchaînements & liaisons ordonnées

As a Alain,
I want migrer les enchaînements existants avec leurs passes dans le bon ordre,
So that les enchaînements historiques sont disponibles et restent cohérents.

**Acceptance Criteria:**

**Given** les passes migrées (Story 6.2) et la collection Enchaînement (Epic 4)
**When** le script migre les `Enchainement` et leurs liaisons `EnchainementPasse`
**Then** chaque enchaînement est recréé avec ses passes dans l'ordre d'origine (champ tableau ordonné, index = ordre — ADD-18) (FR-31)

**Given** que les ~50 comptes historiques ne sont pas migrés
**When** les enchaînements sont créés
**Then** tous sont rattachés à Alain (admin) comme auteur (FR-36)

**Given** un enchaînement migré référençant une passe
**When** la migration s'achève
**Then** les liens passe ↔ enchaînement sont valides (aucune référence orpheline)

### Story 6.4: Vérification & rejouabilité de la migration

As a Alain,
I want vérifier que la migration est complète et pouvoir la rejouer sans dégât,
So that j'ai la preuve que rien n'est perdu et je peux corriger puis relancer en confiance (jalon M-3).

**Acceptance Criteria:**

**Given** la migration exécutée
**When** je compare les comptages source (Story 6.1) et cible
**Then** les nombres d'entités migrées correspondent aux nombres source attendus (FR-32)
**And** un rapport de migration lisible est produit (comptages, éventuels écarts justifiés)

**Given** une migration déjà exécutée
**When** je la relance
**Then** elle ne duplique pas les données (rejouable / idempotente — FR-32)

**Given** un écart ou une erreur pendant la migration
**When** le script s'exécute
**Then** l'échec est explicite (entité et cause identifiées), permettant correction puis relance sans repartir de zéro
