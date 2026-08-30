# Tranche « creation d'un enchainement » : moteur, compositeur, enregistrement

Status: review

> **Nature de ce document.** Tranche verticale demandee par Alain le 2026-08-30 :
> « l'US sur la creation d'un enchainement. Uniquement les comptes connectes,
> pas de gestion des ruptures de position pour le moment. Pour y acceder, un
> bouton "+" dans la barre de menu ouvre un menu deroulant "creer un
> enchainement", juste avant la recherche ; absent si on n'est pas connecte.
> Pas d'ecole, de cours ou autre : on cree un enchainement avec la date
> (aujourd'hui par defaut), une description, etc. »
>
> Elle couvre trois stories :
> - **4.1** — moteur de composition (les passes possibles depuis la position courante)
> - **4.2** — compositeur (composition guidee, chaine en construction, annulation)
> - **4.3** — enregistrement (titre, date, description, notes, visibilite, auteur)

## Perimetre livre

1. **Moteur** (`src/composition.ts`) : `passesDepuis`, `positionCourante`,
   plus la conversion de date. Fonctions pures, sans Payload, partagees par le
   serveur et le navigateur — une seule implementation du « quelles passes
   partent d'ici », donc rien qui puisse diverger (ADD-4).
2. **Entree « + »** dans la barre de navigation (`MenuCreation`), juste avant la
   recherche, rendue UNIQUEMENT pour un compte connecte. C'est un menu et non un
   lien : les creations a venir (proposer une position, une passe) s'y ajouteront
   sans reprendre la barre.
3. **Page `/enchainements/nouveau`** : quatre blocs numerotes — depart, chaine,
   passes possibles, enregistrement.
4. **Action serveur d'enregistrement** : auteur pris dans la session,
   `overrideAccess: false`, visibilite ramenee a une valeur connue (defaut prive).

## Criteres verifies

1. **Given** un visiteur anonyme, **When** il regarde la barre ou ouvre
   `/enchainements/nouveau`, **Then** le « + » n'existe pas et la page invite a
   se connecter (FR-9). ✅ e2e `enchainements.e2e.spec.ts`.
   La porte reelle est cote serveur : la page ET l'action verifient la session,
   independamment l'une de l'autre.

2. **Given** une position de depart choisie, **When** le rail se remplit,
   **Then** il ne contient que les passes dont `positionDebut` = position
   courante (FR-10, ADD-4). ✅ tests unitaires `composition.int.spec.ts` +
   e2e (la position d'arrivee affichee devient bien l'etape suivante).

3. **Given** une passe cliquee, **When** elle s'ajoute, **Then** la position
   courante avance et le rail se recharge (FR-11). ✅ e2e.

4. **Given** une chaine en construction, **When** j'annule la derniere passe,
   **Then** elle est retiree et la position courante recule d'un cran (FR-13).
   ✅ e2e : une seule croix, sur le dernier maillon.

5. **Given** une position sans passe sortante, **When** le rail se recharge,
   **Then** un message d'invitation s'affiche, pas d'ecran bloque (UX-DR11). ✅

6. **Given** un enregistrement, **When** il aboutit, **Then** l'enchainement est
   persiste via l'API Payload, lie a mon compte, ordre porte par le tableau
   (FR-14, ADD-1, ADD-18) et **prive par defaut** (FR-17, ADD-6). ✅ e2e :
   le badge « Prive » est present sur la fiche qui suit.

7. **Given** un echec d'enregistrement, **When** il revient, **Then** l'erreur
   s'affiche et la chaine composee reste a l'ecran (NFR-4, UX-DR16). ✅ par
   construction : l'action renvoie un resultat, elle ne leve pas, et le
   compositeur ne navigue qu'en cas de succes.

## Decisions prises en chemin

**Le compositeur est un composant CLIENT, pas une suite de liens serveur.**
La composition tenue dans l'URL aurait ete plus proche du reste du site
(recherche, filtres) et fonctionnerait sans JavaScript. Ecartee : chaque ajout
de passe serait une navigation, et le titre ou la description en cours de frappe
risquaient d'y passer. « Rien de ce qui est compose ne se perd » pese plus que
« ca marche sans JavaScript » sur un ecran reserve aux connectes.

**Le compositeur ne recoit PAS le catalogue, mais sa projection.**
Les 110 passes completes pesent ~130 Ko de JSON (descriptions, deroules,
metadonnees) dont le compositeur n'affiche rien. `vuesDuCatalogue` n'envoie que
nom, difficulte lisible, les deux extremites et l'image deja resolue : ~10 Ko.
La projection vit dans `catalogue.ts` (cote serveur, elle lit `libelleDifficulte`
et `imageDePosition`) pour que `composition.ts` reste libre de toute dependance
a Payload, puisqu'il part dans le navigateur.

**La chaine en construction est VERTICALE, la ou la vue lecture deroule un
serpentin.** Difference assumee, a valider a l'ecran avec Alain : pendant la
composition chaque ajout doit se poser au bout sans deplacer ce qui precede,
alors qu'un serpentin se recompose a chaque clic et fait sauter ailleurs la
carte qu'on vient de poser. Si le serpentin est prefere ici aussi, il faudra
faire accepter a `ChaineEnchainement` les vues legeres (aujourd'hui il exige les
types Payload complets).

**Aucune rupture n'est composable** (demande d'Alain). Le rail ne propose que des
passes qui partent de la position courante : les enchainements crees dans l'app
sont donc continus par construction, ce qui laisse intact l'historique migre et
ses 59 chaines discontinues. Les transitions de main restent a instruire.

**Pas d'ecran de connexion public.** L'invitation pointe vers `/admin` : la v1
n'a pas encore de connexion publique (Story 3.2). Provisoire et assume, plutot
qu'un faux formulaire.

## Effets de bord assumes

- **Toute page devient dynamique.** La barre de navigation lit desormais la
  session. Chaque page portait deja `dynamic = 'force-dynamic'`, et une barre
  mise en cache montrerait de toute facon l'etat du premier visiteur venu.
- **Le « + » et la recherche forment un groupe** (`.nav__outils`) : sans lui, la
  loupe changeait de place selon qu'on est connecte ou non.
- **`ImagePosition` accepte aussi une vue legere**, dont l'image est deja
  resolue. La regle « vraie image ou placeholder » reste au meme endroit.

## Reparations de tests, faites en passant

Le filet e2e etait **rouge avant cette tranche** :

- `login.ts` et `admin.e2e.spec.ts` attendaient `.step-nav__first`, un detail de
  mise en page du back-office que Payload a renomme depuis. La connexion
  reussissait, l'assertion tombait. Remplacees par des reperes stables (lien de
  deconnexion, entree de collection).
- `seedTestUser` / `cleanupTestUser` prennent desormais des identifiants : deux
  fichiers qui partagent le meme compte se le suppriment mutuellement.
- Playwright tourne avec **un seul worker**, partout. Deux fichiers ecrivant en
  parallele dans SQLite, avec le serveur de dev qui tient la base, tombaient sur
  « database is locked » — un echec qui ne dit rien du produit. La suite entiere
  tient en une trentaine de secondes en serie.
  Recoupe l'action item `tests-separer-back-et-front`, qui reste ouvert pour les
  tests d'integration.

## Reste a faire (hors perimetre demande)

- **Video YouTube** (Story 4.6) : le champ existe dans la collection et la fiche
  l'affiche deja, mais le compositeur ne le propose pas. Alain n'avait demande
  que « la date, une description, etc. » ; a ajouter s'il le souhaite (un champ).
- **Editer un enchainement existant** (Story 4.5) : le compositeur ne sait que
  creer. L'ecran est prevu pour servir aux deux (E6).
- **Toast « Enregistre » + copier le lien** (UX-DR16) : remplaces ici par
  l'atterrissage sur la fiche. Les controles de partage relevent de 4.4 et
  attendent l'Epic 3.
- **Ecole / cours** : hors modele v1, comme demande.
