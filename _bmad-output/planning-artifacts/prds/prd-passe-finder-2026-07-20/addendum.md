---
title: Passe Finder v2 — PRD Addendum
related: prd.md
updated: 2026-07-21
---

# Addendum PRD : Passe Finder v2

Contenu technique / décisionnel qui n'a pas sa place dans le PRD (capacités, pas implémentation) mais qui doit nourrir la phase Architecture. **Contrainte transverse :** Alain est débutant/intermédiaire sur AWS et les stacks modernes, et voit ce projet comme une occasion d'apprendre — pour chaque choix technique, **expliquer le _pourquoi_**, pas seulement l'appliquer.

## Authentification (renvoi FR-24 / FR-25)

Le PRD n'impose que la **capacité** « comptes utilisateurs ». Le **mécanisme** est à trancher en Architecture, options identifiées :

- **Fournisseur managé (ex. AWS Cognito, ou Google Sign-In)** — délègue le stockage des mots de passe, la réinitialisation et une partie de la sécurité. Souvent recommandé sur AWS ; à mettre en balance avec la courbe d'apprentissage et le verrouillage fournisseur.
- **Email + mot de passe géré par l'appli** — plus de contrôle et de simplicité conceptuelle, mais on porte soi-même le hachage, la réinitialisation, la sécurité des sessions.

À arbitrer avec le _pourquoi_ explicité (sécurité portée vs. apprentissage vs. simplicité).

## Migration depuis le dump legacy (renvoi F5)

- **Source :** `passe-finder-saveDB.gz` à la racine de l'ancien projet Yii 1.1.9 / PHP 5 (dossier voisin `passe-finder/`), dépôt git séparé, sans contrainte de compatibilité.
- **Schéma legacy pertinent :** `Danse`, `Position`, `Passe` (champs `positionStart_id`, `positionEnd_id`, `danse_id`, `difficulty`, `youtube_url`, `customName`), `Enchainement`, `EnchainementPasse`, `PersonnalizePasse`.
- **Ordre de migration :** Danses → Positions → Passes → Enchaînements → liaisons ordonnées (dépendance structurante Position → Passe → Enchaînement).
- **Champs archivés non exposés en v1 :** `passe.youtube_url` (le champ vidéo vit désormais sur l'enchaînement), `passe.customName` et `PersonnalizePasse` (personnalisation, hors v1). Conservés en migration pour usage futur, pas affichés.
- **Comptes :** les ~50 comptes historiques ne sont pas repris ; tous les enchaînements migrés sont rattachés à Alain (admin).

## Modèle vidéo (renvoi F6, piste Vision)

- v1 : `youtube_url` optionnel **sur l'enchaînement** ; la fiche passe fait un **reverse-lookup** vers les enchaînements partagés-avec-vidéo qui la contiennent (lien, pas de lecteur intégré).
- Vision (hors v1) : lecteur embarqué au bon **timestamp / chapitrage** pour pointer le moment exact de la passe dans une vidéo plus longue. Le choix « YouTube plutôt qu'hébergement propre » (pour ne pas devenir un service de stockage vidéo) reste ouvert au débat le moment venu.

## Déploiement (renvoi §6)

Cible : **AWS avec CI/CD** (commit → production sans geste technique manuel). Services précis, IaC, pipeline : à définir en Architecture, _pourquoi_ explicité (c'est un objectif d'apprentissage autant qu'un jalon technique).
