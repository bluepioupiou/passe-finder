# Tranche « lecture des enchainements » : menu, liste + recherche, fiche

Status: review

> **Nature de ce document.** Tranche verticale demandee par Alain le 2026-08-30 :
> « affichage du menu pour y aller, liste des cards enchainement avec recherche,
> affichage d'une fiche enchainement ». Elle recoupe trois stories, chacune
> reduite au volet LECTURE :
> - **4.4** — vue lecture d'un enchainement (volet lecture publique + acces prive)
> - **5.4** — catalogue navigable (nouveau volet « liste des enchainements »)
> - **5.5** — recherche globale groupee (le groupe « Enchainements » qui manquait)
>
> Les volets NON livres sont ceux qui dependent des comptes (Epic 3) : controles
> d'auteur (basculer prive/partage, editer, supprimer, copier le lien) et bouton
> Favori. Ils n'ont pas d'emplacement fantome dans la page : un bouton inerte se
> lit comme une panne, pas comme une fonction a venir (meme choix que la zone de
> compte de la barre de navigation, Story 1.6).

## Perimetre livre

1. Entree « Enchainements » dans la barre de navigation (et sur l'accueil).
2. Page `/enchainements` : cartes filtrables par titre, dans le rythme des
   cartes Position et Passe (titre d'abord, description coupee).
3. Page `/enchainements/<id>` : entete, chaine deroulee, notes, video eventuelle.
4. Groupe « Enchainements » dans les resultats de `/recherche`, avec « voir tout ».

## Criteres verifies

1. **Given** un enchainement en visibilite **partage**, **When** j'ouvre son URL
   sans etre connecte, **Then** la vue lecture s'affiche (entete + chaine) et
   l'URL est simple et collable (FR-18, FR-19, UX-DR10). ✅ 107 enchainements
   accessibles anonymement.

2. **Given** un enchainement en visibilite **privee**, **When** un anonyme ouvre
   son URL, **Then** il recoit 404 (FR-17, ADD-6). ✅ verifie sur les 12 prives
   (ids 102-108 et 110-114) ; couvert aussi en test d'integration sur le chemin
   exact de la page (`findByID` + `overrideAccess: false` -> `null`).

3. **Given** la vue lecture, **When** je clique une passe de la chaine, **Then**
   j'arrive sur sa fiche ; les positions menent aux leurs (FR-20). ✅ e2e.

4. **Given** la liste, **When** je tape un titre, **Then** la grille se reduit
   sans aller-retour serveur, comme le reste du catalogue (Story 5.4). ✅ e2e.

5. **Given** une recherche globale, **When** des enchainements correspondent,
   **Then** ils forment leur propre groupe, avec « voir tout » vers la liste
   pre-filtree (UX-DR14). ✅ « ensam » -> 9 enchainements.

## Ce que la lecture a revele

**Les ruptures se voient enfin.** Les 59 enchainements discontinus (transitions
de main, cf. la tranche 4-3/6-3) montrent la position d'ou l'on repart en train
d'en RECOUVRIR une autre, decalee en bas a droite, avec une petite marque `↻`.
Le geste raconte « on n'enchaine pas d'ici » sans encadre ni phrase au milieu de
la chaine ; l'explication complete (« On arrivait en X — on repart de Y ») arrive
au survol et au clavier.

**Des descriptions historiques contiennent du HTML** (`<a href='musiques/...mp3'>`
dans au moins deux enchainements de la choregraphie 2012). React l'echappe, donc
le balisage s'affiche en toutes lettres sur la carte et sur la fiche. Rien n'est
casse ni dangereux, mais c'est laid. A instruire : nettoyer ces descriptions a la
main (une poignee), ou reprendre les liens vers les musiques comme un champ a
part entiere.

**L'auteur n'est pas affiche**, alors que UX-DR10 le prevoit dans l'entete. La
collection `users` n'a que l'email : l'ecrire sur une page publique reviendrait a
le donner aux moissonneurs de spam. A rouvrir avec l'Epic 3, qui donnera un nom
d'affichage aux comptes.

**Le survol PC est remplace par un affichage permanent.** FR-19 prevoit des
details au survol d'une passe ; la difficulte est affichee en permanence sous le
nom. Sur telephone — la ou les eleves revisent (NFR-1) — un detail reserve au
survol n'existe pas.

## Choix d'implementation

- **La visibilite reste dans la collection.** Les trois pages lisent avec
  `overrideAccess: false` et l'utilisateur de la session : ce sont les `access`
  de `Enchainement` qui filtrent (ADD-5), jamais un `where` d'interface. Un
  Alain connecte (cookie `/admin`) voit donc ses prives, sans code dedie.
- **Le catalogue est charge en deux requetes** (`src/catalogue.ts`) puis indexe
  en memoire. Laisser Payload resoudre la profondeur 3 (enchainement -> passe ->
  position -> image) sur 119 enchainements d'une dizaine de maillons relisait
  les 30 memes positions des milliers de fois.
- **Rendu de chaine partage** (`ChaineEnchainement`) : voir « Le rendu de la
  chaine » ci-dessous. Le compositeur (Story 4.2) le reutilisera plutot que
  d'ecrire un second rendu.
- **Regles de chaine isolees et pures** (`src/enchainements.ts`) : detection des
  ruptures, extremites, date. Testables sans base ni rendu.
- **Date lue en UTC** : Payload stocke une date « jour seul » a minuit UTC ;
  formatee dans le fuseau du serveur, une date d'hiver reculerait d'un jour.

## Le rendu de la chaine (2e passe, avec Alain a l'ecran)

Le premier rendu — une grande chaine verticale, une vignette de position par
noeud — a ete refuse pour trois raisons, toutes justes :

1. **Ce qui est enchaine, ce sont les PASSES**, et c'est la position qu'on
   voyait. La passe porte desormais le nom et le poids, sur une carte ; la
   position redevient une articulation, une bulle de 40px.
2. **Le desktop gachait sa largeur** : 12 passes faisaient 3400px de defilement.
3. **La reprise etait trop voyante** : un encart pleine largeur au milieu du
   fil, pour un evenement qui n'est pas une erreur.

Le rendu retenu est un **serpentin de cartes de largeur egale** : la premiere
ligne va vers la droite, on descend a l'extremite, la ligne suivante repart vers
la gauche. Jamais de retour a la ligne « comme du texte », qui obligerait l'oeil
a retraverser l'ecran. Trois colonnes au-dela de 900px, deux au-dela de 560px,
une seule sur telephone — ou il ne reste qu'un fil du haut vers le bas.

**La bulle de position est posee A CHEVAL sur le bord entre deux cartes** et
n'est dessinee qu'une fois : elle appartient aux deux. Les colonnes sont donc
volontairement serrees (8px) ; les lignes, elles, s'ecartent (40px) pour loger
la bulle du changement de ligne, qui se pose au milieu de l'ecart.

**Le vocabulaire d'Alain est devenu le modele du code.** Il a enumere les
typologies de cartes : gauche→droite, gauche→bas, haut→droite, droite→gauche,
droite→bas, haut→gauche, haut→bas. C'est exactement la signature de
`typologie(index, colonnes, dernier)` dans `src/enchainements.ts` — fonction
pure, sept tests. Chaque carte est traversee par un demi-trait d'entree et un
demi-trait de sortie qui se rejoignent en son centre ; seule la sortie porte une
tete. Le CSS ne connait plus que quatre orientations de demi-trait, ecrites une
seule fois.

Trois points d'implementation qui se sont payes comptant :

- **`grid-auto-flow: row dense` est indispensable.** Les cartes de la ligne
  retour reclament explicitement leur colonne (3, puis 2, puis 1) ; sans `dense`,
  le placement automatique refuse de revenir en arriere et ouvre une ligne par
  carte — la chaine se desagrege en escalier.
- **Les traits sont rendus trois fois** (un jeu par nombre de colonnes) et le
  CSS affiche celui qui correspond. Leur orientation depend du nombre de
  colonnes, que seul le CSS connait ; l'alternative etait de reecrire toute la
  geometrie en `nth-child` pour chaque point de rupture. Les versions inutiles
  sont en `display: none`, donc absentes de l'arbre d'accessibilite : rien n'est
  annonce en double.
- **Le nom ne prend jamais toute la largeur utile** (`max-width: 100% - 32px`) :
  un nom long comme « Changement de cote changement de main » recouvrait la
  fleche et la carte perdait son sens de lecture.

### File List

**Nouveaux fichiers :**
- `src/enchainements.ts` — regles de lecture (chaine, ruptures, extremites, date) et `typologie` (le serpentin).
- `src/catalogue.ts` — chargement indexe des positions et passes.
- `src/components/ChaineEnchainement.tsx` + `chaine-enchainement.css` — rendu partage de la chaine (serpentin de cartes).
- `src/app/(frontend)/enchainements/page.tsx` + `enchainements.css` — liste + recherche.
- `src/app/(frontend)/enchainements/[id]/page.tsx` + `fiche-enchainement.css` — vue lecture.
- `tests/int/enchainements.int.spec.ts` — regles de chaine (dont les ruptures).
- `tests/e2e/enchainements.e2e.spec.ts` — nav -> liste -> recherche -> fiche -> passe.

**Modifies :**
- `src/components/Navigation.tsx` — entree « Enchainements », invite de recherche.
- `src/app/(frontend)/page.tsx` — bouton « Voir les enchainements ».
- `src/app/(frontend)/recherche/page.tsx` — groupe « Enchainements ».
- `tests/int/enchainement.int.spec.ts` — refus par identifiant d'un prive.

## Change Log

| Date | Version | Description | Auteur |
| --- | --- | --- | --- |
| 2026-08-30 | 0.1.0 | Tranche lecture des enchainements : entree de menu, liste filtrable, fiche avec chaine et reprises, groupe de recherche. Controles d'auteur et favori en attente de l'Epic 3. | Amelia (dev agent) |
| 2026-08-30 | 0.2.0 | Rendu de chaine repris avec Alain a l'ecran : serpentin de cartes de largeur egale, position en bulle a cheval sur deux cartes, reprise par recouvrement + info-bulle. `typologie` et ses tests. | Amelia (dev agent) |
