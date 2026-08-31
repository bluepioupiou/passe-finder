# Structure du projet & choix techniques

Ce document explique **comment le code est organisé** et **pourquoi** on a fait ces choix.
Il s'adresse à quelqu'un qui découvre la stack (Next.js + Payload). Rien à connaître d'avance.

> Référence de conception : `_bmad-output/planning-artifacts/architecture/architecture-passe-finder-2026-07-21/ARCHITECTURE-SPINE.md`.

---

## 1. L'idée générale : un seul programme, deux casquettes

Passe Finder v2 est un **monolithe** : **un seul projet**, **un seul serveur**, **un seul déploiement**.
Ce programme unique porte deux casquettes en même temps :

1. **Next.js** — le framework web qui affiche les pages (accueil, catalogue, fiches, compositeur…).
2. **Payload** — un outil qui fournit *gratuitement* : la base de données, un back-office d'administration (`/admin`), l'authentification (comptes/connexion), et les règles de permission.

Payload est **monté à l'intérieur** de Next.js : ils tournent dans le **même processus**, pas comme deux serveurs séparés qui se parleraient par le réseau.

**Pourquoi ce choix ?** Le projet est maintenu par une seule personne (toi). Un monolithe est beaucoup plus simple à comprendre, faire tourner et déboguer qu'un empilement de micro-services. C'est un choix assumé de **simplicité de maintenance** (les versions précédentes ont été abandonnées par excès de complexité).

---

## 2. Arborescence

```text
passe-finder/
├─ src/
│  ├─ app/                    # Les pages et les routes web (Next.js)
│  │  ├─ (frontend)/          # ← LE SITE PUBLIC (voir §3)
│  │  │  ├─ layout.tsx        #   gabarit racine du site (<html lang="fr">, styles)
│  │  │  ├─ page.tsx          #   la page d'accueil → URL "/"
│  │  │  └─ styles.css
│  │  └─ (payload)/           # ← LE BACK-OFFICE (généré par Payload, voir §3)
│  │     ├─ layout.tsx        #   gabarit racine de l'admin
│  │     ├─ admin/…           #   l'interface /admin
│  │     └─ api/…             #   l'API REST + GraphQL de Payload
│  ├─ collections/            # Le MODÈLE DE DONNÉES (voir §4)
│  │  └─ Users.ts             #   pour l'instant : juste les comptes utilisateurs
│  ├─ engine/                 # (vide) Moteur de composition — arrive à l'Epic 4
│  ├─ payload.config.ts       # LE FICHIER CENTRAL de configuration Payload (voir §5)
│  └─ payload-types.ts        # types TypeScript générés automatiquement (ne pas éditer)
├─ migrate/                   # (vide) Script d'import des anciennes données — Epic 6
├─ tests/                     # Tests automatisés (harnais posé, étoffé à la Story 1.3)
│  ├─ e2e/                    #   tests "de bout en bout" (Playwright, dans un navigateur)
│  └─ int/                    #   tests d'intégration (Vitest)
├─ Dockerfile                 # Recette d'empaquetage pour la prod — finalisé à la Story 1.2
├─ next.config.ts             # config Next.js
├─ package.json               # dépendances + commandes (npm run …)
├─ .env.example               # modèle des variables d'environnement (secrets)
└─ passe-finder-saveDB.gz     # ancienne base à migrer (Epic 6) — ne pas y toucher
```

Les dossiers `engine/` et `migrate/` sont **volontairement vides** aujourd'hui (un fichier `.gitkeep` sert juste à les faire exister). Ils réservent la place pour des epics futurs, pour qu'on n'ait pas à réorganiser l'arbre plus tard.

---

## 3. Les parenthèses `(frontend)` et `(payload)` : les « route groups »

C'est la question qui revient le plus souvent. Voici la règle.

Dans le dossier `src/app/`, **chaque dossier ajoute normalement un morceau à l'URL** :

```
src/app/catalogue/page.tsx      →  URL  /catalogue
```

**Mais un dossier entre parenthèses est invisible dans l'URL.** Il sert seulement à *ranger*. C'est ce que Next.js appelle un **route group** :

```
src/app/(frontend)/page.tsx                          →  URL  /          (le "(frontend)" saute)
src/app/(payload)/admin/[[...segments]]/page.tsx     →  URL  /admin/…   (le "(payload)" saute)
src/app/(payload)/api/[...slug]/route.ts             →  URL  /api/…
```

### Pourquoi les utiliser ici ?

Parce que **chaque groupe possède son propre `layout.tsx` racine** — et c'est exactement ce qu'on veut :

| Groupe | Son `layout.tsx` | Rôle |
| --- | --- | --- |
| `(frontend)` | notre gabarit à nous (`<html lang="fr">`, nos styles) | Les pages **publiques** que l'on conçoit (accueil, catalogue, fiches, compositeur…). |
| `(payload)` | le gabarit fourni par Payload (ses CSS, ses providers) | Le **back-office `/admin`** et l'**API**, entièrement générés par Payload — on n'y touche pas. |

Sans route group, Next.js n'autorise **qu'un seul** gabarit racine pour toute l'application. Grâce aux parenthèses, on en a **deux, indépendants** : notre site d'un côté, l'admin de Payload de l'autre — sans qu'aucun préfixe moche n'apparaisse dans les URLs.

> À retenir : **parenthèses = rangement/gabarit, pas d'effet sur l'URL.** Les crochets, eux (`[...slug]`, `[[...segments]]`), veulent dire « attrape-tout » — c'est Payload qui gère ce qu'il y a derrière `/admin` et `/api`.

---

## 4. Le modèle de données : les « collections »

Dans Payload, une **collection** = un type de données (une « table »). On les décrit dans `src/collections/`.

Aujourd'hui il n'y a que **`Users`** (les comptes). C'est le strict minimum pour que l'authentification et l'écran `/admin` fonctionnent.

Les collections **métier** viendront dans les prochains epics, avec ces noms (en anglais dans le code, contenu en français) :
`Danse`, `Position`, `Passe`, `Enchainement`, `Favori`.

**Convention importante :** le **code est en anglais** (noms de fichiers, de champs, d'URL techniques), mais **tout ce que voit l'utilisateur est en français** (libellés du back-office, textes du site). C'est pour ça que `payload.config.ts` force la langue de l'admin en français (`i18n`).

---

## 5. `payload.config.ts` : le fichier central

C'est **le cœur** de la configuration. Tout Payload part de là. Les points clés du nôtre :

- **`db: sqliteAdapter(...)`** — on stocke les données dans **SQLite** (un simple fichier `.db`). Le chemin vient de la variable d'environnement `DATABASE_URI`.
- **`collections: [Users]`** — la liste des types de données (une seule pour l'instant).
- **`admin: { user: Users.slug }`** — quelle collection sert à se connecter au back-office.
- **`i18n: { fallbackLanguage: 'fr' }`** — back-office en français.
- **`secret: process.env.PAYLOAD_SECRET`** — une clé secrète pour signer les sessions (jamais dans le code, toujours via `.env`).

### Pourquoi SQLite (et pas une grosse base type PostgreSQL) ?

- **Coût** : c'est un simple fichier, zéro service de base de données à payer. Objectif du projet : ~50 €/an.
- **Simplicité** : rien à installer ni administrer.
- **Fiabilité** : à la mise en production (Story 1.4), ce fichier sera copié en continu vers un stockage AWS S3, pour qu'aucune donnée ne soit perdue même si le serveur disparaît.
- **Limite assumée** : SQLite lie la base à un seul serveur. À l'échelle du projet (toi + tes élèves) c'est amplement suffisant.

### Règle d'or : « Payload est le seul scribe »

**Toute écriture** dans la base passe **obligatoirement par Payload** (son API, ses règles). On n'écrit jamais « en direct » dans le fichier SQLite. Ça garantit qu'aucune règle de permission ou de validation ne soit contournée. (Les *lectures* rapides, elles, pourront se faire directement — ce sera le rôle du futur `engine/`.)

---

## 6. Les variables d'environnement (`.env`)

Certaines valeurs sont **secrètes** ou **propres à la machine** : elles ne vont **jamais** dans le code ni sur GitHub.
On les met dans un fichier `.env` (ignoré par git). Le modèle à copier est `.env.example` :

| Variable | À quoi ça sert |
| --- | --- |
| `PAYLOAD_SECRET` | clé secrète qui signe les sessions/connexions. Mettre une valeur aléatoire longue. |
| `DATABASE_URI` | emplacement de la base SQLite. En local : `file:./passe-finder.db`. |

Pour démarrer : `cp .env.example .env` puis renseigner les valeurs.

---

## 7. Les commandes utiles (`package.json`)

| Commande | Effet |
| --- | --- |
| `npm install` | installe les dépendances (à faire une fois) |
| `npm run dev` | démarre le serveur de développement (http://localhost:3000) |
| `npm run build` | fabrique la version optimisée pour la production |
| `npm start` | démarre la version de production (après `build`) |
| `npm run generate:types` | régénère `payload-types.ts` après avoir modifié une collection |
| `npm run test:unit` | tests unitaires : fonctions pures, aucune base, moins d'une seconde |
| `npm run test:int` | tests d'intégration : vrai Payload sur une base dédiée (`.tmp/test.db`) |
| `npm run test:e2e` | tests de bout en bout dans un navigateur (Playwright) |
| `npm test` | les trois, dans cet ordre (le plus rapide échoue en premier) |

---

## 8. Choix de versions (revérifiés le 2026-08-24)

| Brique | Version | Note |
| --- | --- | --- |
| Node.js | **24 LTS** | **requis** par Payload 3.88 (`engines >= 24.15.0`). |
| Next.js | 16.3.2 | dernière version stable. |
| React | 19.2 | fourni avec Next 16. |
| Payload | 3.88.0 | dernière stable ; `payload` et tous les `@payloadcms/*` doivent rester **sur la même version**. |
| TypeScript | 6.0.3 | version épinglée par le template Payload. |
| Base de données | `@payloadcms/db-sqlite` | SQLite via l'adaptateur Drizzle de Payload. |

> L'architecture (rédigée le 21/07) visait Node 22 et TypeScript 5 ; l'écosystème a avancé depuis, d'où Node 24 / TS 6. C'est un ajustement normal, vérifié avant de coder.

---

## 8bis. L'integration continue (CI)

A chaque `git push` sur `v2` (ou `main`), GitHub Actions execute automatiquement
`.github/workflows/ci.yml`. Rien a lancer a la main.

**Deux etapes, dans l'ordre :**

| Etape | Ce qu'elle fait | Si ca echoue |
| --- | --- | --- |
| **Qualite** | verification des types, lint, tests d'integration | tout s'arrete |
| **Image** | construit l'image Docker, la demarre, lance le test de fumee, puis publie | rien n'est publie |

**Le test de fumee** (`tests/e2e/smoke.e2e.spec.ts`) tourne contre le **vrai
conteneur**, pas contre le serveur de developpement. Il verifie trois choses :
la page d'accueil s'affiche, `/admin` repond, et **la base de donnees repond**.

**Pourquoi tester contre le conteneur ?** En developpement, Payload cree les
tables tout seul ; en production, seules les migrations le font. Un test lance
contre `npm run dev` ne verrait donc jamais une migration oubliee. Lance contre
le conteneur, il l'attrape immediatement.

> **Regle a retenir** : des qu'une collection change (ajout de champ, nouvelle
> collection), il faut generer la migration correspondante :
> ```bash
> npm run payload -- migrate:create un-nom-parlant
> ```
> puis commiter le fichier genere. Sans cela, **la CI echoue** (c'est voulu :
> mieux vaut un pipeline rouge qu'une production cassee).

**Ou va l'image ?** Sur `ghcr.io` (le registre d'images de GitHub), avec deux
etiquettes : le SHA du commit (immuable) et `latest`. L'authentification utilise
le jeton fourni par GitHub : aucun secret a creer.

**Ce qui n'est PAS encore automatise** : la recuperation de cette image par le
serveur AWS Lightsail et le redemarrage du conteneur. C'est l'objet d'une story
dediee, une fois l'instance provisionnee. Aujourd'hui la chaine va donc de
*commit* a *image publiee*, pas encore jusqu'a la production.

## 9. Ce qui n'est PAS encore là (et où ça arrive)

Le scaffold est volontairement **minimal**. La suite, epic par epic :

| Manque actuel | Story / Epic |
| --- | --- |
| Image Docker de production finalisée | Story 1.2 |
| CI : build, tests et publication de l'image | Story 1.3 (fait) |
| Deploiement automatique vers AWS Lightsail | story dediee (a venir) |
| Sauvegarde continue de la base vers S3 | Story 1.4 |
| Design « Lin & Sauge » (couleurs, thème clair/sombre, composants) | Story 1.5 |
| Barre de navigation | Story 1.6 |
| Mesure d'audience (Cloudflare) | Story 1.7 |
| Collections métier (Position, Passe, Enchaînement…) + rôle admin | Epics 2 & 3 |
| Import de l'ancienne base (`passe-finder-saveDB.gz`) | Epic 6 |
