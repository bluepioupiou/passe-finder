---
name: passe-finder-v2
status: final
created: 2026-07-21
updated: 2026-07-21
sources: [_bmad-output/planning-artifacts/prds/prd-passe-finder-2026-07-20/prd.md, _bmad-output/planning-artifacts/architecture/architecture-passe-finder-2026-07-21/ARCHITECTURE-SPINE.md]
design: DESIGN.md
---

# EXPERIENCE — Passe Finder v2

## Foundation

- **Form-factor : web responsive, multi-surface.** Création (compositeur) pensée d'abord pour **PC/grand écran** ; consultation (élèves) pensée d'abord pour **mobile**. Les deux surfaces sont de premier ordre.
- **Système visuel :** voir [DESIGN.md](DESIGN.md) (Lin & Sauge). Cette spine ne fixe que le comportement ; les valeurs visuelles vivent dans DESIGN.md et sont référencées par nom (`{colors.accent}`, `{rounded.md}`…).
- **Admin :** le back-office catalogue est le **`/admin` généré par Payload** — comportement et apparence hérités de Payload, hors périmètre de design custom (seul l'ordre Position→Passe→Enchaînement et les libellés français comptent).
- Les deux spines l'emportent sur toute maquette en cas de conflit.

## Information Architecture

**Public (sans connexion)**
- **Accueil** — **fil des nouveautés** : les 5-10 derniers éléments ajoutés, **types mélangés** (nouvelle position, nouvelle passe, nouvel enchaînement partagé), plus récents d'abord. Coup d'œil rapide sur « quoi de neuf ».
- **Catalogue** — parcours des **Positions** et **Passes** ; recherche/filtre.
- **Fiche Position** — détails + deux listes : passes **qui y arrivent** et passes **qui en partent** (FR-23), chacune cliquable.
- **Fiche Passe** — détails + deux listes distinctes : **enchaînements qui l'utilisent** (FR-24) et **vidéos** des enchaînements-avec-vidéo qui l'utilisent (FR-38) ; positions départ/arrivée cliquables (FR-22).
- **Vue lecture d'un enchaînement** — entête (titre, description, date) + la **chaîne** ; bouton **Favori** (si connecté et enchaînement d'autrui).

**Connecté (mêmes droits pour tous, sauf rôle admin)**
- **Compositeur** — créer un enchaînement (écran-climax, voir Key Flows).
- **Mon profil** — deux listes disjointes : **mes enchaînements** (créés) · **mes favoris** (partagés d'autrui).
- **Inscription / Connexion / Mot de passe oublié.**

**Navigation globale (barre haut).** Gauche : logo→Accueil, **Catalogue**, **recherche globale** (mène à la page de résultats E10, toutes catégories). Droite : si connecté → **« Créer un enchaînement »** (mis en avant, `{colors.accent}`) + menu profil (*mes enchaînements*, *mes favoris*, déconnexion) ; sinon → **« Se connecter »**. Mobile : version compacte (menu replié).

**Fermeture IA.** Chaque besoin du PRD atterrit sur un écran ; chaque écran est atteint par un parcours. Le rendu de chaîne (positions + flèches-passes) est **partagé** entre le compositeur et la vue lecture.

## Voice and Tone

Français, tutoiement, chaleureux et direct — le ton d'un prof qui aide, pas d'un logiciel. Microcopie concrète : les boutons disent ce qui se passe (« Enregistrer » → toast « Enregistré »). Pas d'excuses ni de jargon. Exemples : « Aucune passe ne part d'ici — enregistre ou annule la dernière passe. » ; vide favoris : « Pas encore de favori. Mets en signet un enchaînement partagé pour le retrouver ici. »

## Component Patterns (comportement)

- **Sélecteur de position de départ** — liste déroulante ; à la sélection, la position se **verrouille** (état visuel `{colors.accent-soft}`) et le rail « Passes possibles » apparaît.
- **Rail des passes possibles** — trois blocs empilés : **Position de départ** (verrouillée) · **Dernière position** (courante) · **Passes possibles d'ici**. Chaque passe montre sa position d'arrivée (`→ ouverte`) ; clic = ajoute la passe à la chaîne.
- **Chaîne (rendu partagé)** — séquence continue `position → flèche(nom de passe) → position`. **Jamais deux positions adjacentes sans flèche-passe.** PC : zigzag (boustrophedon) selon la largeur, retour à la ligne via **flèche coudée** portant le nom. Mobile : colonne verticale, même logique.
- **Annulation** — retire la dernière passe (et sa position d'arrivée). Forme retenue : **croix × sur le dernier maillon _et_ bouton « ↶ Annuler dernière »** dans la barre (les deux).
- **Barre de sauvegarde (compositeur)** — en bas ; champs titre/description/notes/visibilité à gauche, **Enregistrer aligné à droite**.
- **Bouton Favori** — sur la vue lecture d'un enchaînement partagé d'autrui uniquement (jamais sur les siens).

## State Patterns

- **Cul-de-sac de composition** — dernière position sans passe sortante : message d'invitation (enregistrer ou annuler), pas d'écran bloqué.
- **Position verrouillée** — la position de départ figée est visuellement distincte ; on ne peut la changer qu'en réinitialisant la composition.
- **Vides** — accueil sans enchaînement partagé, profil sans enchaînement, favoris vides : messages accueillants qui invitent à l'action.
- **Chargement / erreur** — états standards ; une sauvegarde échouée est explicite et non destructive (l'enchaînement en cours n'est jamais perdu — NFR-4).
- **Sauvegarde réussie** — confirmation claire (toast) + accès à l'URL de partage.
- **Image manquante** — placeholder `no_position` + nom de la position visible.

## Interaction Primitives

- **Composer, c'est cliquer** — construire un enchaînement = enchaîner des clics dans le rail, sans glisser-déposer en v1. Undo d'une étape suffit (réordonner/insérer au milieu : hors v1, FR-13).
- **Partage** — un enchaînement partagé a une **URL simple** copiable (collable dans WhatsApp), ouvrable **sans connexion** en lecture seule.
- **Navigation dans le graphe** — depuis une fiche, on circule position ↔ passe ↔ enchaînement par liens (retour arrière préservé).

## Accessibility Floor

- **Texte alternatif** obligatoire sur chaque image de position = son `nom` (les images portent du sens).
- **Contraste** conforme via la palette DESIGN.md (accent sauge sur fond clair/sombre vérifié lisible).
- **Clavier** : compositeur et formulaires entièrement utilisables au clavier ; focus visible (`{colors.accent}`).
- **Cibles tactiles** confortables sur mobile (lecture élève au pouce).
- **Respect** de `prefers-reduced-motion` et du thème clair/sombre du lecteur.

## Key Flows

### KF-1 — Alain publie l'enchaînement du cours (climax du produit)
_Protagoniste : Alain, sur PC, en rentrant du cours._
1. « Créer un enchaînement » → choisit la **position de départ** (liste déroulante) → elle se **verrouille**.
2. Le rail affiche les **passes possibles d'ici** ; il clique une passe → la chaîne s'allonge, la « dernière position » avance, le rail se recharge.
3. Il répète ; la chaîne se déploie en **zigzag**. Au besoin, **× / Annuler dernière** revient d'une étape.
4. **Climax :** en quelques clics, l'enchaînement du soir est là, cohérent (le graphe l'a guidé). Il remplit titre/description/date, laisse **Privé** ou passe en **Partagé**, **Enregistre**.
5. Il copie l'**URL de partage** dans WhatsApp.

### KF-2 — Léa révise sur son téléphone
_Protagoniste : Léa, élève, mobile, via le lien WhatsApp._
1. Ouvre le lien → **vue lecture** : entête (titre, description, date) puis la **chaîne verticale**.
2. Touche une passe → **fiche passe** (détails, vidéos si dispo) ; revient à l'enchaînement.
3. **Climax :** elle se connecte, met l'enchaînement **en favori** → le retrouve dans **profil › mes favoris**, sans refouiller WhatsApp.

## Responsive & Platform

- **Compositeur** : optimisé grand écran (rail + zigzag large, 8 images/ligne) ; sur petit écran, le zigzag se resserre (≈4/ligne) puis bascule vertical.
- **Vue lecture** : optimisée mobile (chaîne verticale, entête en haut) ; sur grand écran, peut adopter le zigzag.
- **Scroll** : chaînes longues → défilement vertical assumé ; la barre de sauvegarde du compositeur reste accessible (à caler au build : ancrée en bas vs. en fin de page). _(Détail d'implémentation ouvert.)_

## Détail par écran

### E1 — Accueil (public)
- **Rôle :** coup d'œil rapide sur les nouveautés ; point d'entrée des élèves.
- **Éléments :** **fil des 5-10 derniers ajouts**, types mélangés — chaque entrée porte un **badge de type** (Position / Passe / Enchaînement), un nom/titre, une date, une vignette. Seuls les enchaînements **partagés** y apparaissent (les positions/passes du catalogue sont publiques). Accès au Catalogue et à la recherche depuis la nav.
- **Actions :** ouvrir l'élément (→ fiche Position E3 / fiche Passe E4 / vue lecture E5) ; aller au Catalogue.
- **États :** vide (« Rien de neuf pour l'instant »). Volume volontairement court (5-10) ; on rouvrira la question d'une pagination/fil plus long si le besoin apparaît.

### E2 — Catalogue (public)
- **Rôle :** explorer le référentiel Positions et Passes.
- **Éléments :** **deux onglets** (Positions | Passes) ou deux sections ; grille de vignettes (image + nom) ; recherche par nom ; pour les Passes, filtre par **difficulté**.
- **Actions :** ouvrir une fiche (→ E3/E4).
- **États :** vide, recherche sans résultat.

### E3 — Fiche Position (public)
- **Rôle :** tout savoir d'une position et circuler dans le graphe.
- **Éléments :** grande image (ou `no_position`), **nom**, description ; deux listes — **passes qui y arrivent** / **passes qui en partent** (FR-23), chacune cliquable (→ E4).
- **Actions :** naviguer vers une passe.

### E4 — Fiche Passe (public)
- **Rôle :** comprendre une passe et retrouver où elle est utilisée.
- **Éléments :** **nom**, description (comment faire), **difficulté** ; images **position début → fin** cliquables (→ E3, FR-22) ; **liste des enchaînements** qui l'utilisent (FR-24) ; **liste des vidéos** des enchaînements-avec-vidéo qui l'utilisent (FR-38) — deux listes distinctes.
- **Actions :** naviguer vers une position, un enchaînement, ou une vidéo (YouTube).

### E5 — Vue lecture d'un enchaînement (public)
- **Rôle :** réviser (le cœur du besoin élève).
- **Éléments :** entête **titre / description / date / auteur** ; la **chaîne** (rendu partagé) ; au survol d'une passe (PC), détails.
- **Actions :** selon le spectateur —
  - **Visiteur ou autre connecté :** bouton **Favori** (si partagé & pas l'auteur).
  - **Auteur :** contrôles **Éditer** (→ E6 en mode édition, FR-15), **Supprimer**, **basculer Privé/Partagé**, **Copier le lien**.
- **États :** enchaînement privé → 404/accès refusé pour les autres ; lien copié → confirmation.

### E6 — Compositeur / Éditeur (connecté)
- **Rôle :** créer **ou éditer** un enchaînement (même écran, FR-15). Voir Component/State Patterns et KF-1.
- **Éléments :** rail (départ verrouillé · dernière position · passes possibles) ; chaîne en construction ; barre de sauvegarde (titre, description, notes, date, **visibilité par défaut Privé**).
- **Actions :** ajouter une passe, annuler la dernière (× / bouton), enregistrer, définir la visibilité, copier le lien après partage.
- **États :** cul-de-sac (aucune passe sortante) ; sauvegarde réussie / échouée (non destructive).
- **Note :** en mode édition, la chaîne existante est préchargée ; on repart de la fin pour prolonger, ou on annule pas-à-pas pour raccourcir (pas d'insertion au milieu — FR-13).

### E7 — Mon profil (connecté)
- **Rôle :** retrouver son travail.
- **Éléments :** **deux listes disjointes** — *mes enchaînements* (créés) · *mes favoris* (partagés d'autrui). Par carte : titre, date, visibilité (pour les siens).
- **Actions :** ouvrir ; pour les siens : éditer, supprimer, basculer visibilité, copier le lien ; pour les favoris : ouvrir, retirer des favoris.
- **États :** chaque liste peut être vide (messages accueillants distincts).

### E8 — Inscription / Connexion / Mot de passe oublié (public)
- **Rôle :** obtenir un compte pour agir (composer, favori).
- **Éléments :** formulaires email + mot de passe (auth Payload) ; lien « mot de passe oublié ».
- **Actions :** créer un compte, se connecter, réinitialiser.
- **Note :** déclenché naturellement quand un visiteur tente une action réservée (favori, composer) — retour à l'action après connexion.

### E9 — Back-office admin (`/admin`, admin seul)
- **Rôle :** gérer le catalogue de référence (Positions, Passes, Danses) et modérer.
- **Éléments :** interface **générée par Payload** (hors design custom) ; libellés en français ; ordre de création respectant Position → Passe → Enchaînement.
- **Note :** l'image d'une position est non bloquante (placeholder `no_position`) ; suppression bloquée si l'élément est référencé (AD-6 de l'archi).

### E10 — Résultats de recherche (public)
- **Rôle :** retrouver rapidement n'importe quoi (sert directement M-1 « retrouver facilement une passe, une position, un enchaînement »).
- **Éléments :** page dédiée, atteinte depuis la **recherche globale** de la nav. Résultats **groupés par catégorie** — **Positions**, **Passes**, **Enchaînements** (partagés) — chacun cliquable vers sa fiche/vue (E3/E4/E5). Recherche par nom/titre.
- **Actions :** ouvrir un résultat ; affiner la requête.
- **États :** sans résultat (« Rien trouvé pour “…” »), requête vide.
- **Note :** chaque groupe montre ses premiers résultats avec un « voir tout » si une catégorie en a beaucoup ; portée = noms/titres en v1 (pas de recherche plein-texte dans les descriptions).
