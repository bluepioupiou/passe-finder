---
title: Passe Finder v2 — Addendum
related: brief.md
updated: 2026-07-10
---

# Addendum : Passe Finder v2

Contenu qui n'a pas sa place dans le brief lui-même mais qui doit nourrir les phases suivantes (PRD, architecture).

## Cadrage initial, et pourquoi il a été resserré

La première formulation du projet couvrait deux faces : les danseurs (retrouver/apprendre des passes, proposer un nom alternatif, trouver des écoles proches, échanger avec profs/élèves de son cours) **et** les écoles (visibilité, partage de contenu, communication de cours en remplacement de WhatsApp).

Cette formulation a été délibérément resserrée après discussion : le v1 se concentre sur Alain et ses élèves ; le volet "écoles tierces" (visibilité, communication) est repoussé en Vision, pas en scope v1 — voir la section Vision du brief pour le raisonnement complet. Si une future itération du PRD envisage de réélargir vers les écoles, ce cadrage initial (et pourquoi il a été mis de côté) est le point de départ à reconsidérer plutôt qu'à redécouvrir.

## Contexte technique pour la phase Architecture

- L'ancien projet (Yii 1.1.9 / PHP 5, abandonné) vit dans un dossier voisin : `passe-finder/`. Il contient un dump de données `passe-finder-saveDB.gz` à la racine — c'est la source de la migration prévue en v1.
- Modèles de l'ancien schéma pertinents pour comprendre la donnée à migrer : `Passe` (avec `positionStart_id`, `positionEnd_id`, `danse_id`, `difficulty`, `youtube_url`, `customName`), `Position`, `Enchainement`, `EnchainementPasse`, `PersonnalizePasse`, `Danse`.
- Le nouveau projet (`passe-finder-v2/`) est un dépôt git séparé et vide, sans contrainte de compatibilité avec le code legacy.

## Contrainte de collaboration pour les phases suivantes

Alain est débutant/intermédiaire sur AWS et les stacks modernes envisagées, et voit ce projet comme une occasion d'apprendre. Pour l'architecture et l'implémentation à venir : expliquer le *pourquoi* des choix techniques, pas seulement les appliquer silencieusement.

## Paysage concurrentiel (digest de recherche)

**Catalogues de figures :**
- **DanceLib** — concurrent le plus proche : bibliothèque de figures multi-danses (dont WCS), vidéos sous plusieurs angles, offre dédiée écoles. Reste un catalogue de fiches isolées, pas un modèle composable.
- **PoleMovebook** — même logique pour la pole dance (~400 figures), preuve que le modèle "bibliothèque de figures par style" fonctionne en niche.
- **STEEZY** — gros acteur danse urbaine, cours filmés en studio, abonnement ; pas de logique catalogue/social/école.
- Ressources statiques WCS (PDF, wikis passionnés) : demande réelle côté WCS, mais aucun outil dynamique/collaboratif dominant.

**Alternatives à WhatsApp pour les écoles :**
- **Temple du Swing** (Paris) — précédent direct : appli dédiée avec vidéos de cours, planning, messagerie intégrée.
- Logiciels génériques de gestion d'écoles (Wellyx, Swyvel, Kydemy, MyScol, Viviarto, Eversports Manager) : la communication y est secondaire, greffée à la facturation/planning.
- Insight clé : WhatsApp reste dominant parce qu'il est gratuit et sans friction ; les suites de gestion demandent un abonnement + changement d'habitude pour un gain perçu faible côté communication seule. Pour qu'un futur volet "écoles" ait une chance, il devra remplacer entièrement l'usage WhatsApp gratuitement.

**Précédent "même passe, noms différents" :**
- BJJ (techniques nommées par éponymes, bases collaboratives type GrappleMap) et escalade (Mountain Project : convention "premier arrivé nomme" + modération communautaire par commentaires) montrent qu'il n'existe pas de résolution automatique satisfaisante — seulement des systèmes de tags/synonymes avec modération humaine.

## Piste "comprendre une passe par la vidéo" (détail Vision)

Dans une version précédente, un enchaînement pouvait être lié à une vidéo YouTube, et il était possible de retrouver tous les enchaînements contenant une passe donnée — donc, en théorie, toutes les vidéos (de personnes différentes) montrant cette passe. Idée non aboutie à l'époque : un chapitrage/timestamp pointant vers le moment précis de la passe dans une vidéo plus longue.

Le choix "YouTube plutôt qu'hébergement vidéo propre" avait été fait pour ne pas transformer le site en service de stockage vidéo — Alain considère ce choix toujours ouvert au débat pour la suite.
