# Stories 3.1 / 3.2 — Inscription, connexion & état connecté

**Livré le** 2026-08-31 · **Statut** `review` · **Couvre** FR-26, UX-DR4, ADD-5, AD-9
· **Livre aussi** le volet « seul l'auteur modifie » de la Story 4.5

Tranche demandée après 3-4 : « un élève crée son compte, se connecte, se
déconnecte, et la navigation le reflète ». Livrée **avec son prérequis**, qui
s'est révélé plus large que prévu.

---

## Le prérequis — c'était là qu'était le danger

Avant d'ouvrir l'inscription, il fallait faire tomber les droits par défaut de
Payload : **« tout compte connecté peut tout »**. Sans conséquence tant que
personne ne pouvait se connecter ; le jour de l'inscription publique, ils
auraient laissé le premier inscrit venu :

| Ce qu'il aurait pu faire | Règle posée |
| --- | --- |
| Réécrire et supprimer les enchaînements des autres élèves | `auteurOuAdmin` sur `update` / `delete` |
| **Lire les enchaînements privés de tout le monde** | `read` : partagés de tous **plus les siens** |
| Lire et modifier les autres comptes (emails de la classe, mots de passe) | `soiMemeOuAdmin` sur `read` / `update` / `delete` |

La deuxième ligne n'était pas dans le plan : `read` renvoyait `true` dès qu'une
session existait. Le commentaire de `enchainements/page.tsx` décrivait pourtant
déjà le comportement voulu (« l'auteur connecté voit en plus les siens ») — le
code ne l'avait jamais fait. Trouvé en posant la règle, pas en le cherchant.

**Toutes ces règles renvoient une contrainte de requête, jamais un booléen.**
La différence n'est pas cosmétique : Payload applique la contrainte à la
*sélection des documents*, donc elle vaut aussi pour les opérations par lot et
pour les API REST et GraphQL. Un `true` aurait autorisé l'opération sur
n'importe quel document.

---

## Ce qui est livré

### Les deux écrans (E8)

`/inscription` et `/connexion` partagent un seul composant de formulaire : mêmes
champs, même gestion d'erreur, même rythme. Ce qui change (libellé, action, lien
vers l'autre porte) est passé en propriétés.

Deux choix de fond :

- **Message identique pour « compte inconnu » et « mot de passe faux ».** Deux
  messages distincts diraient à un inconnu quelles adresses ont un compte ici.
  À l'inscription en revanche, « un compte existe déjà avec cette adresse » est
  explicite : l'AC le demande, et le formulaire ne serait pas utilisable sans.
- **Un compte neuf est connecté dans la foulée** (FR-26), plutôt que renvoyé
  vers un second formulaire.

### `?suite=` — revenir à ce qu'on voulait faire

Le compositeur ne renvoie plus vers `/admin` mais vers `/connexion`, en
emportant la destination. **Seul un chemin interne est accepté** : sans ce
filtre, `?suite=https://ailleurs` ferait de la page de connexion un tremplin
vers un site tiers — une redirection ouverte, c'est-à-dire un hameçonnage
crédible signé de notre domaine. Le double slash est refusé pour la même raison.

C'est une anticipation **partielle** de 3-5, côté formulaire seulement.

### La barre de navigation

Connecté : un menu de compte (l'email, « créer un enchaînement », la
déconnexion). Anonyme : « Se connecter ». Cela ferme le placeholder laissé
ouvert depuis la Story 1.6 — une zone volontairement vide tant qu'un bouton
désactivé s'y serait lu comme une panne.

La déconnexion est un **formulaire**, pas un lien : elle change l'état du
serveur, elle ne doit pas partir sur une simple visite d'URL (préchargement,
robot d'indexation, bouton « précédent »).

### `/admin` réservé aux administrateurs

`access.admin` sur la collection `users`. **Possible seulement maintenant** :
jusqu'à 3-2, `/admin` était l'unique porte de connexion du site, la fermer plus
tôt aurait privé les élèves de tout moyen de se connecter.

Conséquence sur les tests, qui vaut d'être notée : le helper e2e connectait
**tous** les scénarios par `/admin/login`. Il est scindé en `login` (page
publique, comptes ordinaires) et `loginBackOffice` (administrateurs), et le
scénario d'administration sème désormais un compte portant le drapeau. Effet
secondaire heureux : les scénarios applicatifs empruntent maintenant le chemin
des vraies personnes.

### Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/collections/acces.ts` | `auteurOuAdmin`, `soiMemeOuAdmin` |
| `src/collections/Enchainement.ts` | lecture par visibilité + propriété ; écriture réservée à l'auteur |
| `src/collections/Users.ts` | inscription publique, chacun son compte, `/admin` aux admins |
| `src/app/(frontend)/compte/actions.ts` | **nouveau** — inscription, connexion, déconnexion, pose du cookie |
| `src/app/(frontend)/{connexion,inscription}/page.tsx` | **nouveaux** — les deux écrans |
| `src/components/FormulaireCompte.tsx` | **nouveau** — le formulaire partagé |
| `src/components/MenuCompte.tsx` | **nouveau** — le menu de compte de la barre |
| `tests/int/proprietaire.int.spec.ts` | **nouveau** — 9 tests sur les règles ci-dessus |
| `tests/e2e/compte.e2e.spec.ts` | **nouveau** — 6 tests, le parcours complet |

---

## Vérification

**37 unitaires**, **21 intégration** (9 ajoutés), **23 e2e** (6 ajoutés), typage
et lint verts, build de production OK.

Les tests d'intégration vérifient l'**état en base** après un refus, pas
seulement que l'appel a levé : un refus qui laisserait passer l'écriture ne
serait pas un refus.

Trois assertions e2e existantes ont dû être resserrées, et chaque fois pour la
même raison — un sélecteur global devenu ambigu :

- « Se connecter » existe maintenant **deux fois** sur la page du compositeur
  (barre + contenu) ;
- l'email apparaît **deux fois** une fois connecté, parce que la page d'accueil
  affiche « Bienvenue, \<email\> » ;
- `role="alert"` est aussi porté par l'annonceur de route de Next.

---

## Non fait

- **3-3 (mot de passe oublié)** attend un expéditeur d'e-mail — la seule story
  de l'Epic 3 à en avoir besoin (voir l'artefact de 3-4 pour le raisonnement
  SES / Resend, et pourquoi Cognito a été écarté).
- **3-5 (porte d'accès réutilisable)** reste entière. `?suite=` en est la moitié
  visible ; la **redirection automatique** d'un anonyme vers la connexion n'est
  pas posée — chaque page refuse encore à sa manière.
- **Les écrans** d'édition et de suppression d'un enchaînement (4-5). Seule la
  règle d'accès est livrée.

## À instruire

La page d'accueil affiche **« Bienvenue, \<email\> »**, héritage du scaffold.
Tant que personne ne pouvait se connecter, personne ne le voyait. Maintenant que
de vrais comptes existent, publier une adresse e-mail en `h1` n'a plus de sens —
sur un téléphone montré à quelqu'un, c'est même une fuite. À reprendre avec
**5-3 (accueil, E1)**, qui doit de toute façon remplacer cette page par le fil
des nouveautés.
