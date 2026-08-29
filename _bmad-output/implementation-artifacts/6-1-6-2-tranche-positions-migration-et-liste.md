# Tranche « positions » : migration de l'historique + liste publique

Status: review

> **Nature de ce document.** Cette tranche verticale recoupe trois stories de
> l'epic, chacune reduite a son volet « positions » :
> - **6.1** — extraction et mapping du dump legacy (volet positions)
> - **6.2** — migration Danses -> Positions (volet positions, hors passes)
> - **5.4** — catalogue navigable (volet « liste des positions », sans recherche ni filtre)
>
> Motif : Alain a demande une premiere tranche **reelle et locale** (vraies donnees
> a l'ecran) avant de poursuivre l'infrastructure. Les volets restants de 6.1/6.2
> (passes, enchainements) et de 5.4 (onglets, recherche, filtre difficulte)
> restent **a faire**.

## Perimetre livre

1. Lecture et interpretation du dump `passe-finder-saveDB.gz`.
2. Migration des positions rock vers le modele Payload, avec leurs images.
3. Page publique `/positions` affichant le catalogue reel.

## Criteres verifies

1. **Given** le dump legacy, **When** le script s'execute, **Then** les positions sont creees via l'**API Local de Payload** (AD-1), rattachees a la danse « rock 6 temps », **And** un rapport de comptage source vs cible est produit (FR-31, FR-32).

2. **Given** une position sans image exploitable, **When** elle est migree, **Then** elle est creee malgre tout et s'affiche avec le placeholder `no_position` (FR-33, FR-2).

3. **Given** une migration deja executee, **When** je la relance, **Then** aucune donnee n'est dupliquee (FR-32).

4. **Given** un visiteur anonyme, **When** il ouvre `/positions`, **Then** il voit le catalogue en lecture publique (FR-21), **And** une base vide affiche un etat vide propre.

## Resultats d'execution

```
Positions dans le dump      : 32
Positions rock a migrer     : 30
Ecartees (autres danses)    : 2
Creees                      : 30
Sans image -> placeholder   : 2
OK : le comptage cible correspond a la source.
```

**Rejouabilite (2e execution)** : `Creees : 0`, `Deja presentes (ignorees) : 30`, total inchange.

**Positions sans image** (placeholder applique) : « Final tango », « Portillon haut » — leur champ image etait vide dans la base d'origine.

## Analyse du dump (volet 6.1)

| Constat | Detail |
| --- | --- |
| Format reel | archive **tar.gz** contenant un dump **MySQL** (et non un `.sql` brut) |
| Encodage | **UTF-8 valide** (`e` accentue = U+00E9). Les tables d'origine etaient en latin1 mais `mysqldump` a converti a l'export. Aucun risque d'accents casses. |
| Table `position` | 32 lignes ; colonnes `id`, `name`, `description`, `image`, `dateCreate`, `dateMaj`, `danse_id`, `userCreate_id`, `pending` |
| Table `Danse` | 3 danses : `Rock'n Roll`, `Salsa`, `Tango` |
| Repartition | **30 positions en rock**, 2 en Salsa |
| Qualite | aucun nom ni description vide ; toutes a `pending = 0` (aucun filtrage necessaire) |
| Images | 31 fichiers presents ; **2 positions sans image** ; `position_18.png` orpheline (doublon du `.jpg`) |
| Anomalie signalee | id 1 « Position fermee » et id 44 « fermee » (espace en tete) : doublon probable, **migre tel quel** — la migration ne juge pas la donnee, a nettoyer dans l'admin si besoin |

**Champs non repris en v1** : `dateCreate`, `dateMaj`, `userCreate_id`, `pending` (hors modele cible).

## Decisions produit (Alain, 2026-08-26)

- Danse unique renommee **« rock 6 temps »** (l'historique disait « Rock'n Roll »).
- **Rock uniquement** : 30 positions migrees sur 32. Les 2 positions Salsa sont ecartees — recuperables plus tard, le modele restant multi-danse (FR-6).
- Page **volontairement peu stylee** ; le design system « Lin & Sauge » (Story 1.5) l'habillera sans reecrire la structure.

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Claude Opus 5)

### Debug Log References

- Migration : 30 creees, comptage conforme ; 2e execution : 0 creee / 30 ignorees (rejouabilite prouvee).
- `GET /positions` en local -> **200**, « 30 positions au catalogue », accents corrects (« Caresse cavaliere », « Enroulee »), descriptions completes issues du dump.
- Conteneur (base vierge) : les 4 migrations s'appliquent au demarrage, `/positions` -> **200** avec l'etat vide « Aucune position pour le moment. ».
- **Test de fumee 3/3** contre le conteneur apres ajout des collections : le garde-fou des migrations reste vert.
- `tsc` 0 erreur, `lint` 0 erreur, `test:int` 1/1.

### Completion Notes List

**Incident rencontre et corrige : le build Docker cassait.**
Apres l'ajout de la page `/positions`, `docker build` echouait sur
`SQLITE_ERROR: no such table: danses`. Deux causes imbriquees :
1. Next tentait de **pre-generer `/positions` au build** — la page interroge la base, qui n'existe pas a ce stade.
2. Le semis `onInit` se declenchait pendant le build, au plus mauvais moment.

Corrections :
- `export const dynamic = 'force-dynamic'` sur `/positions` — semantiquement juste : le contenu vient de la base et evolue quand Alain edite le catalogue.
- Garde dans `seedDanseV1()` : sortie immediate quand `NEXT_PHASE === 'phase-production-build'`.

**Choix d'implementation :**
- **Lecture du dump sans dependance** : `zlib` decompresse, puis lecture de l'en-tete tar (taille en octal a l'offset 124) pour extraire l'unique membre. Aucune bibliotheque supplementaire.
- **Parseur SQL sur mesure** tenant compte des quotes echappees (`\\'`) — les descriptions en contiennent beaucoup.
- **Rejouabilite par `legacyId`** plutot que par le nom : robuste meme si Alain renomme une position apres migration.
- **Images** : televersees via l'API Local (`filePath`), avec `alt` = nom de la position (UX-DR17). Un fichier introuvable n'interrompt jamais la migration — la position est creee et bascule sur le placeholder, avec un avertissement dans le rapport.
- **`payload run` ecarte** : il n'affichait aucune sortie de ce script (teste : un `console.log` trivial passe, mais pas le script complet). Le script npm utilise **`tsx`**, qui l'execute correctement.

**Point d'attention pour la mise en production :** les 30 positions migrees vivent dans la base **locale**. Lors du premier deploiement, il faudra soit rejouer la migration sur le serveur, soit transferer le fichier SQLite. A traiter avec la story de deploiement.

### File List

**Nouveaux fichiers :**
- `migrate/migrate-positions.ts` — script de migration (lecture dump, parsing, upload images, rapport, rejouabilite).
- `src/app/(frontend)/positions/page.tsx` — liste publique des positions.
- `src/app/(frontend)/positions/positions.css` — mise en forme minimale et provisoire.

**Modifies :**
- `package.json` — script `migrate:positions`.
- `src/seed.ts` — garde contre l'execution pendant le build Next.
- `src/app/(frontend)/page.tsx` — lien « Voir les positions » depuis l'accueil.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-26 | 0.1.0 | Tranche verticale « positions » : analyse du dump, migration de 30 positions rock (rejouable, verifiable, placeholder pour les 2 sans image) et page publique `/positions`. Correction du build Docker casse par le pre-rendu de la page. | Amelia (dev agent) |
