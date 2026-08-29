# Story 2.4: Blocage de suppression d'un élément référencé

Status: review

## Story

As a Alain (admin),
I want être empêché de supprimer une Position ou une Passe encore utilisée,
so that je ne casse jamais par accident le contenu de révision dépendant de cet élément.

## Acceptance Criteria

1. **Given** une Position utilisée comme départ ou arrivée d'au moins une Passe, **When** je tente de la supprimer, **Then** un hook Payload refuse la suppression avec un message clair (FR-8, AD-6), **And** je peux la supprimer une fois toutes les passes qui la référencent retirées.

2. **Given** une Passe (ou une Position) non référencée, **When** je la supprime, **Then** la suppression réussit.

3. **Given** que la collection Enchaînement n'existe pas encore (livrée à l'Epic 4), **When** j'implémente ce blocage, **Then** la garde couvre le référencement Position↔Passe existant ; le volet « Passe référencée par un Enchaînement » sera ajouté à l'Epic 4 quand la collection existera (extension documentée, pas de dépendance vers l'avant).

## Tasks / Subtasks

- [x] **Task 1 — Garde sur la suppression d'une Position** (AC: #1)
  - [x] Hook `beforeDelete` comptant les passes où la position est `positionDebut` **ou** `positionFin`.
  - [x] Refus avec `APIError` 400 (et non une `Error` générique, qui produirait un « Something went wrong » — leçon de la Story 2.3).
  - [x] Message **actionnable** : nombre de passes bloquantes + leurs noms, et que faire ensuite.
- [x] **Task 2 — Suppression autorisée quand rien ne référence** (AC: #2)
  - [x] Aucune garde superflue : une position libre se supprime normalement.
- [x] **Task 3 — Extension future documentée** (AC: #3)
  - [x] Repère posé en commentaire dans `Passe.ts`, à l'endroit exact où le `beforeDelete` viendra à l'Epic 4.
  - [x] Aucun hook vide aujourd'hui : rien ne référence encore une Passe, la garde serait sans objet.
- [x] **Task 4 — Vérification**
  - [x] Refus sur position réellement utilisée ; levée de la garde après retrait de la passe ; suppression d'une position libre ; données d'Alain intactes.
  - [x] `tsc`, `lint`, `test:int` verts ; aucune migration de schéma requise.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

**AC #1 — refus sur une position utilisée** (position 4, « Mains décroisées ») :

```
DELETE /api/positions/4  ->  HTTP 400
Suppression impossible : cette position est utilisée par 11 passes
(« Carré magique », « Changement de côté enroulé gauche », « Baladé »,
« Sortie enroulée simple », « Enroulée » et 6 autres).
Retire d'abord ces passes, ou fais-les pointer vers une autre position.
```

Position toujours présente après la tentative (`GET` -> 200) : le refus n'a rien altéré.

**AC #1 bis — la garde se lève** (sur des objets jetables créés pour le test) :

| Étape | Résultat |
| --- | --- |
| supprimer la position référencée | **400** (refus) |
| supprimer la passe qui la référence | 200 |
| supprimer la même position, désormais libre | **200** |

**AC #2 — suppression d'une position non référencée** : `DELETE` -> 200, puis `GET` -> 404.

**Données d'Alain intactes** : 30 positions, 110 passes avant et après les tests. Tous les essais destructifs ont porté sur des objets jetables créés pour l'occasion, jamais sur le catalogue réel.

**Aucune migration requise** : `migrate:create` répond « No schema changes detected » — la story n'ajoute qu'un hook, sans toucher au schéma. Les 5 migrations existantes sont inchangées.

`tsc` 0 erreur, `lint` 0 erreur, `test:int` 1/1.

### Completion Notes List

Garde de suppression livrée sur Position. L'Epic 2 est fonctionnellement complet.

**Choix d'implémentation :**
- **`APIError(…, 400)` et non `Error`** : leçon directe de la Story 2.3, où une `Error` générique dans un hook produisait un `500 Something went wrong` inexploitable. Ici l'admin reçoit un refus de validation lisible.
- **Message nommant les passes bloquantes** (5 au maximum, puis « et N autres ») : un simple « suppression impossible » obligerait Alain à chercher lui-même quelles passes retirer. La requête est limitée à 5 résultats — inutile de tout charger pour construire le message.
- **Une seule requête** avec un `or` sur `positionDebut`/`positionFin`, plutôt que deux requêtes séparées.
- **Pas de hook `beforeDelete` sur Passe aujourd'hui** : rien ne référence encore une Passe (la collection Enchaînement arrive à l'Epic 4). Un hook vide donnerait l'illusion d'une protection existante. L'emplacement est signalé en commentaire à l'endroit exact où il devra s'insérer.

**Non vérifié dans cette story** : le build de l'image Docker et le test de fumée. **Docker Desktop n'était pas démarré** au moment de la vérification. Aucune raison de suspecter une régression (changement de code pur, sans schéma ni dépendance nouvelle), mais **la vérification conteneur n'est pas revendiquée** — à rejouer au prochain démarrage de Docker, ou via la CI au prochain push.

**Reste pour clore l'Epic 2** : rien fonctionnellement. Les 6 stories sont en `review`.

### File List

**Modifiés :**
- `src/collections/Position.ts` — hook `beforeDelete` refusant la suppression d'une position référencée par au moins une passe.
- `src/collections/Passe.ts` — commentaire documentant l'emplacement du futur garde (Epic 4).

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-27 | 0.1.0 | Blocage de la suppression d'une position encore utilisée par une passe, avec message nommant les passes bloquantes ; extension « passe référencée par un enchaînement » documentée pour l'Epic 4. | Amelia (dev agent) |
