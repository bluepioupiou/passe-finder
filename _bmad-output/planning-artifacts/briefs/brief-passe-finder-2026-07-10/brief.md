---
title: Passe Finder v2
status: ready
created: 2026-07-10
updated: 2026-07-20
---

# Product Brief: Passe Finder v2

## Résumé Exécutif

Passe Finder v2 est la troisième tentative d'Alain, prof de rock/west coast swing bénévole, de se doter d'un outil pour cataloguer les passes et positions de danse qu'il connaît, et composer/partager en quelques minutes l'enchaînement travaillé pendant un cours. Les deux versions précédentes ont eu un vrai usage (une cinquantaine de comptes actifs parmi ses élèves) mais sont devenues trop lourdes à maintenir seul, jusqu'à l'abandon — et Alain a aujourd'hui perdu son propre outil de travail.

Le produit repose sur un modèle générique à trois briques — **Position**, **Passe** (qui relie deux positions), **Enchaînement** (une séquence de passes) — qui rend la composition d'un enchaînement rapide, là où les bibliothèques de figures existantes (DanceLib en tête) restent des catalogues figés. Le v1 est volontairement recentré sur Alain et ses élèves : administration du catalogue par Alain seul, création et partage d'enchaînements par les utilisateurs connectés, migration des données déjà accumulées, le tout déployé sur AWS avec une CI/CD automatisée.

Le succès du v1 ne se mesure pas à l'adoption par d'autres écoles — c'est une ambition future, pas une condition. Il se mesure à un usage réel et régulier par Alain et ses élèves, et à un jalon technique solide : catalogue migré, déploiement continu opérationnel, moteur de création d'enchaînement fiable.

## Le Problème

Alain enseigne le rock/west coast swing bénévolement. Au fil des années, il a accumulé une connaissance de centaines de passes et positions — mais cette connaissance vit dans sa tête, pas dans un outil qu'il maîtrise. Quand il apprend une nouvelle passe aujourd'hui, il n'a plus d'endroit où la cataloguer.

Ses élèves vivent le même problème en miroir : après un cours, ils oublient une partie de ce qui a été travaillé le soir. Le seul filet de sécurité qui a vraiment fonctionné par le passé, c'est un geste simple — publier en quelques minutes l'enchaînement du cours pour qu'ils puissent réviser. Deux fois, Alain a construit un outil pour industrialiser ce geste (deux stacks différentes), et deux fois l'outil est devenu plus lourd à maintenir seul que le problème qu'il résolvait, jusqu'à l'abandon.

Le vrai déclencheur de ce problème n'est pas "convaincre des écoles d'adopter un outil" — c'est qu'Alain a perdu son propre outil de travail : cataloguer ses passes et positions, et composer/partager des enchaînements facilement avec ses élèves.

## La Solution

Passe Finder v2 est un catalogue personnel de passes et positions de danse, construit autour de trois briques génériques :

- **Position** — un état statique (une tenue, une posture)
- **Passe** — un mouvement qui relie une position de départ à une position d'arrivée
- **Enchaînement** — une séquence ordonnée de passes, composée facilement à partir du catalogue existant

Le geste central : après un cours, Alain compose l'enchaînement travaillé ce soir-là à partir de passes déjà cataloguées (ou en ajoute de nouvelles à la volée), et le publie en quelques minutes pour que ses élèves puissent réviser. Les rôles et permissions du v1 sont détaillés dans *Qui ça sert*, ci-dessous.

## Ce qui différencie

DanceLib est le concurrent le plus proche : une bibliothèque de figures multi-danses avec vidéos et offre écoles. Mais c'est une bibliothèque figée — chaque figure est une fiche isolée, pas une brique composable.

Passe Finder repose sur un modèle générique **Position ↔ Passe ↔ Enchaînement** qui permet de construire un enchaînement en quelques minutes à partir de l'existant, plutôt que de filmer/décrire chaque figure isolément. C'est ce modèle — pas la taille du catalogue — qui a permis à Alain de publier un enchaînement de cours en 5 minutes lors des versions précédentes.

L'avantage réel n'est pas un moat technique : c'est la connaissance métier d'Alain (des centaines de passes/positions déjà identifiées, un usage réel validé sur deux itérations précédentes) combinée à une modélisation plus fine que celle des outils génériques existants.

## Qui ça sert

**Alain, prof bénévole et administrateur.** Seul à créer/modifier les Positions et Passes du catalogue de référence. Besoin : cataloguer une nouvelle passe en quelques minutes pendant ou juste après un cours, et composer l'enchaînement du soir sans friction. Succès : il utilise l'outil chaque semaine, sans y penser comme une corvée.

**Ses élèves, utilisateurs connectés.** Créent leurs propres Enchaînements liés à leur profil, et choisissent de les partager ou non. Besoin : retrouver l'enchaînement d'un cours précis pour réviser, et composer leurs propres enchaînements pour s'entraîner. Succès : ils reviennent après le cours sans qu'Alain ait besoin de les relancer.

**Visiteurs non connectés.** Consultent le catalogue en lecture seule. Succès : ils trouvent assez de valeur pour vouloir créer un compte.

_Plus tard (hors v1) : personnalisation d'une position/passe (ex : nom alternatif) ; proposition de nouvelles positions/passes, soumises à validation par l'admin avant d'intégrer le catalogue de référence._

## Critères de succès

- **Usage personnel d'Alain** — il retrouve facilement une passe, une position ou un enchaînement déjà créé (y compris ceux qu'il a tendance à oublier, comme un enchaînement monté sur une musique particulière), et il enregistre/crée sans friction ses enchaînements pour les cours passés comme à venir.
- **Retour des élèves** — mesuré via des statistiques de visite simples (ex : Google Analytics/Plausible). Premier KPI : nombre de visiteurs par jour.
- **Jalon technique du v1** — passes et positions migrées depuis l'ancienne base (`passe-finder-saveDB.gz`) ; déploiement continu opérationnel (commit → mise en production sans geste technique manuel) ; moteur de création d'enchaînement fonctionnel, avec sauvegarde fiable.

## Scope

**Dans le v1 :**

- Catalogue Positions/Passes en lecture publique, création/édition réservée à l'admin (Alain)
- Migration des données existantes depuis `passe-finder-saveDB.gz`
- Comptes utilisateurs (inscription/connexion)
- Moteur de création d'enchaînement à partir du catalogue, sauvegarde liée au profil utilisateur, partage optionnel
- Web responsive
- Statistiques de visite basiques (élèves vs externes)
- Déploiement AWS avec CI/CD (commit → production automatisé)

**Explicitement hors v1 :**

- Adoption/visibilité multi-écoles, recherche d'écoles proches
- Communication de cours (remplacement de WhatsApp), messagerie profs/élèves
- Personnalisation d'une position/passe existante par un utilisateur connecté (ex : nom alternatif)
- Proposition de nouvelles passes/positions par les utilisateurs (avec workflow de validation admin)
- Visualisation 3D des passes/positions (voir Vision)
- Système de synonymes/mapping communautaire pour les noms de passes selon l'école (au-delà de la personnalisation individuelle)
- Application mobile native

## Vision

Si Passe Finder v2 tient sa promesse pour Alain et ses élèves, trois pistes s'ouvrent, dans cet ordre de priorité :

1. **Le catalogue devient collaboratif** — les élèves proposent de nouvelles passes/positions (validées par Alain), et personnalisent celles existantes avec le nom qu'ils connaissent. Sur la durée, si d'autres profs rejoignent, un système de synonymes par école (à la manière dont le BJJ ou l'escalade gèrent des noms de figures/voies différents pour la même chose, avec modération humaine plutôt qu'automatique) permet de retrouver une passe même sous un nom qu'on ne connaît pas.
2. **Comprendre une passe devient plus facile** — le but n'est pas la 3D en soi, c'est aider à *comprendre* visuellement une passe ou une position. Une piste déjà éprouvée dans une version précédente : associer un enchaînement à une vidéo YouTube, et pouvoir retrouver tous les enchaînements (donc toutes les vidéos, de personnes différentes) qui contiennent une passe donnée — avec un chapitrage/timestamp pointant vers le bon moment dans chaque vidéo. Recouper plusieurs exécutions réelles d'une même passe peut suffire à la comprendre, sans reconstruction 3D. La 3D navigable reste une piste plus tard si le besoin de comprendre persiste malgré la vidéo. Le choix "YouTube plutôt qu'hébergement vidéo propre" (pour ne pas devenir un service de stockage vidéo) reste à redébattre le moment venu.
3. **D'autres écoles rejoignent, sur leurs propres termes** — pas en étant démarchées, mais parce que le modèle Position/Passe/Enchaînement leur permet de faire ce qu'Alain fait déjà : cataloguer et partager en quelques minutes. La communication de cours (aujourd'hui sur WhatsApp) ne serait envisagée que si elle remplace entièrement cet usage sans friction ajoutée — sinon, elle n'a pas sa place dans l'outil.
