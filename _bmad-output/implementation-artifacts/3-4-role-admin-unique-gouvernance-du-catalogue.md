# Story 3.4 — Rôle admin unique & gouvernance du catalogue

**Livré le** 2026-08-30 · **Statut** `review` · **Couvre** FR-29, ADD-5, AD-3, AD-9

Première story de l'Epic 3, prise en tête parce qu'elle est le **prérequis de
3-1** : ouvrir l'inscription avant de poser ce verrou reviendrait à donner à
chaque nouvel inscrit le droit d'éditer le catalogue de référence.

---

## La question posée avant de lancer

Alain : « il va falloir mettre en place la création d'utilisateurs ? Il n'y a pas
un service AWS simple pour éviter de gérer tout ça — l'envoi de mail, le forgot
password ? »

La question rouvrait **AD-9** (« auth Payload intégrée, pas de fournisseur
externe »). Elle a été instruite, pas écartée, et AD-9 est **confirmée**. Le
raisonnement, parce qu'il resservira :

La demande mélangeait deux problèmes de nature différente.

| | État réel |
| --- | --- |
| **Authentification** (comptes, sessions, hachage, tokens de reset, verrouillage) | **Déjà acquis et gratuit.** `auth: true` sur la collection `users` fournit tout, y compris les opérations `forgot-password` / `reset-password`. Il ne reste qu'à poser des écrans dessus (Stories 3.1 à 3.3). |
| **Acheminement du mail** | **Le seul vrai trou.** Payload *fabrique* le message, il ne le *livre* pas. Au démarrage : `No email adapter provided. Email will be written to console`. |

**Cognito ne ferme pas ce trou.** Son envoi d'email intégré est plafonné et AWS
renvoie vers SES dès qu'on veut son propre domaine en expéditeur : on aurait
*deux* systèmes au lieu d'un, sans avoir supprimé la corvée visée.

Et il coûterait cher sur les invariants du projet :

- l'identité vivrait hors de Payload, à resynchroniser avec `enchainement.auteur` ;
- les `access` — c'est-à-dire toute la sécurité actuelle, celle qui a attrapé le
  défaut « privé » à la migration — seraient à réécrire autour d'un jeton externe ;
- `/admin` s'authentifie via `users` : double connexion, ou pont à maintenir ;
- un deuxième plan de contrôle à opérer, ce qui joue frontalement contre **CM-1**,
  le risque n°1 du projet (charge de maintenance solo).

Le coût financier n'était pas l'argument : à ~50 comptes, Cognito comme SES sont
gratuits ou à quelques centimes. C'est la complexité qui a tranché.

### Conséquence de séquence (le vrai gain de l'analyse)

**Une seule story a besoin d'un expéditeur : 3-3.** 3-4, 3-1, 3-2 et 3-5 n'en ont
pas besoin, à condition de ne pas activer la vérification d'adresse à
l'inscription. Le choix **SES / Resend est donc reporté à 3-3**, et il est
réversible (même SMTP derrière `@payloadcms/email-nodemailer`) — contrairement à
Cognito, qui aurait été un aller simple.

---

## Ce qui est livré

### 1. Le drapeau, et l'impossibilité de se l'attribuer

`users.admin` (case à cocher, défaut `false`) porte un **accès de champ** :

```ts
access: { create: champAdminSeul, update: champAdminSeul }
```

C'est le verrou de l'AC « aucune interface d'auto-promotion ». Le choix du niveau
CHAMP est délibéré : il refuse la valeur **quel que soit le document visé**, donc
il couvre d'un seul geste trois attaques distinctes — se promouvoir soi-même,
promouvoir quelqu'un d'autre, et glisser `admin: true` dans le corps d'une future
inscription (3-1).

Masquer la case dans l'interface n'aurait rien verrouillé : l'API REST et l'API
GraphQL exposent le même champ. C'est exactement ce que dit ADD-5 — les règles
vivent dans les `access`, jamais dans l'UI.

### 2. Le catalogue passe sous le drapeau

`Danse`, `Position`, `Passe` **et `Media`** : `create` / `update` / `delete`
réservés à `adminSeul` (`src/collections/acces.ts`). La lecture reste publique
(FR-21) — verrouiller l'écriture ne devait pas fermer la consultation, qui est la
moitié du produit.

**Media est inclus délibérément.** Laisser le téléversement ouvert aurait rendu le
verrou des positions décoratif : on ne pourrait pas modifier la position, mais on
pourrait remplacer l'image qu'elle affiche.

Le prédicat est partagé plutôt que recopié quatre fois, pour que « admin » veuille
dire la même chose partout et qu'un futur passage booléen → liste de rôles se
fasse à un seul endroit.

### 3. L'amorçage, hors application

L'accès de champ crée un problème d'amorçage classique : sur une instance neuve,
**personne** ne peut créer le premier administrateur depuis l'application. La
porte prévue est une **commande lancée à la main, une fois** :

```bash
docker compose exec app npm run promouvoir:admin -- alain@exemple.fr
```

Elle **promeut un compte existant, elle n'en crée pas** : pas de mot de passe
dans une variable d'environnement, et cela fonctionne en production où le compte
d'Alain existe déjà. Idempotente — relancée, elle affiche « Rien à faire ».

Sans argument, elle reconnaît le cas « un seul compte en base » et le promeut en
annonçant lequel. **Avec plusieurs comptes, elle refuse de deviner** : donner les
clés du catalogue au mauvais compte serait silencieux, et personne ne le
remarquerait avant un dégât.

#### Pourquoi pas une variable, ni une migration

Trois formes ont été examinées. La première version livrée passait par une
variable `ADMIN_EMAIL` lue au démarrage ; Alain a proposé à la place une
**migration promouvant « le compte au premier ID, puisqu'en général il n'y en a
qu'un »**. Sa critique de la variable était fondée — secret CI et redéploiement
pour un geste unique, plus un `find` à chaque démarrage. Mais la migration a deux
défauts rédhibitoires :

1. **Sur une instance neuve, il n'y aurait jamais d'administrateur.** Les
   migrations tournent *avant* le démarrage du serveur (`docker-entrypoint.sh`),
   donc la table `users` est encore vide. La migration ne trouverait personne, ne
   ferait rien — et Payload l'enregistrerait quand même comme appliquée. Elle ne
   repasserait jamais. C'est exactement le défaut tout-ou-rien de l'ancien import
   conditionnel du catalogue, rejeté quelques jours plus tôt pour la même raison.
2. **Elle ne marcherait pas en local.** En développement le schéma est synchronisé
   en `push` : les migrations n'y tournent pas.

S'y ajoute que « premier ID » ne dit pas *qui* : six mois plus tard, le nom du
fichier n'apprend rien sur le compte qui détient les clés.

Retenu : le script à la main, même forme et même place que les `migrate:*`, dont
la reprise du catalogue a montré que la forme convenait. Le cas « un seul compte »
que visait Alain est bien reconnu — mais par **constat au moment du lancement**,
pas par pari sur un identifiant.

### 4. Le constat au démarrage

Le démarrage ne promeut personne, mais il **avertit** quand aucun compte ne porte
le drapeau. Un verrouillage silencieux serait le pire des deux mondes : le site
fonctionne parfaitement pour les visiteurs et pour les comptes qui composent, et
la cause se présenterait comme « je n'arrive plus à modifier une position ».

### Fichiers

| Fichier | Rôle |
| --- | --- |
| `src/collections/acces.ts` | **nouveau** — `estAdmin`, `adminSeul`, `champAdminSeul` |
| `src/collections/Users.ts` | champ `admin` + accès de champ + libellés FR |
| `src/collections/{Danse,Position,Passe,Media}.ts` | écriture réservée ; TODO « Story 3.4 » refermés |
| `src/collections/Enchainement.ts` | TODO **retagués** (4.4 / 4.5), risque explicité |
| `src/seed.ts` | `avertirSiAucunAdmin` + `initialiser` (point d'entrée unique d'`onInit`) |
| `migrate/promouvoir-admin.ts` | **nouveau** — la commande de promotion |
| `src/migrations/20260830_202812_drapeau_admin.ts` | une colonne, `ALTER TABLE` |
| `tests/int/acces.int.spec.ts` | **nouveau** — 7 tests |

---

## Vérification

**49 tests d'intégration verts** (42 + 7), **17 e2e verts**, **build de production OK**.

Les 7 nouveaux tests passent tous par **`overrideAccess: false`** — sans cela,
l'API Local de Payload court-circuite les droits (c'est ce qui permet aux semis et
aux migrations d'écrire) et le test vérifierait seulement que Payload sait écrire
dans sa base.

Couverture : lecture publique préservée · création refusée au non-admin et à
l'anonyme · cycle complet autorisé à l'admin · téléversement refusé au non-admin ·
auto-promotion sans effet · `admin: true` glissé à l'inscription sans effet.

Les deux tests de promotion vérifient l'**état final** plutôt que la forme du
refus : Payload peut soit rejeter l'opération, soit ignorer le champ interdit. Les
deux sont acceptables ; ce qui ne l'est pas, c'est que le drapeau change.

### Note d'environnement

Le premier passage de la suite était rouge sur `SQLITE_BUSY` : le serveur
`npm run dev` tournait et tenait la base. C'est l'action item ouvert
`tests-separer-back-et-front`, pas une régression. Un run interrompu laisse en
outre sa fixture utilisateur en base, ce qui fait échouer le run suivant sur un
email en double — cercle vicieux à casser à la main. `enchainement.int.spec.ts`
gagnerait à supprimer-puis-créer sa fixture dans `beforeAll`, comme le fait déjà
`tests/helpers/seedUser.ts`.

---

## Non fait, volontairement

- **`/admin` reste ouvert à tout compte connecté.** Le fermer aux seuls admins
  serait cohérent, mais `/admin` est *aujourd'hui la seule porte de connexion du
  site* — le compositeur y renvoie. La fermer maintenant priverait les élèves de
  tout moyen de se connecter. **À trancher avec 3-2**, quand une page de connexion
  publique existera.
- **La collection `users` garde les accès par défaut de Payload** sur `create` et
  `update`. À reprendre avec 3-1 (inscription ouverte) et 3-2 (un compte ne doit
  pouvoir modifier que le sien).

## ⚠️ Danger relevé en passant — à traiter avant 3-1

`Enchainement.update` / `delete` acceptent encore **tout compte connecté**. Le TODO
portait « Story 3.4 » alors que la règle appartient à **4-5** ; il est retagué et
son commentaire dit désormais le risque en toutes lettres.

Inoffensif tant que personne ne peut se connecter hors `/admin`. Mais le jour où
3-1 livre l'inscription publique, **le premier inscrit peut réécrire le travail des
autres élèves**. 3-1 ne doit pas partir sans cette règle.

## Effet de bord assumé

La collection `users` prend des libellés français (« Utilisateurs »), comme toutes
les autres (NFR-7, back-office en français). Le test e2e hérité du scaffold
attendait « Users » : l'assertion est corrigée — c'est le libellé qui a raison.
