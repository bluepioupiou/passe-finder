# passe-finder

Site de découverte et de création d'enchaînements, passes et positions de danse.

Monolithe **Next.js + Payload** (TypeScript), base **SQLite**, déployé sur AWS.

## Démarrage rapide

Prérequis : **Node.js 24 LTS** (requis par Payload 3.88).

```bash
# 1. installer les dépendances
npm install

# 2. créer le fichier d'environnement local à partir du modèle
cp .env.example .env
#    puis renseigner PAYLOAD_SECRET (une valeur aléatoire longue) et DATABASE_URI

# 3. démarrer le serveur de développement
npm run dev
```

Puis ouvrir :

- http://localhost:3000 — le site
- http://localhost:3000/admin — le back-office (au premier lancement, on crée le compte admin)

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm start` | démarre le build de production |
| `npm run generate:types` | régénère les types après un changement de collection |
| `npm run test:int` | tests d'intégration (Vitest) |

## Docker (image de production)

L'application se package en une image Docker unique (monolithe). La base SQLite vit
sur un **volume** monté en `/data` (jamais dans l'image — sinon les données seraient
perdues à chaque redéploiement).

```bash
# 1. construire l'image
docker build -t passe-finder .

# 2. lancer le conteneur (secret requis + volume pour la base)
docker run --rm -p 3000:3000 \
  -e PAYLOAD_SECRET="une-valeur-aleatoire-longue" \
  -e DATABASE_URI="file:/data/passe-finder.db" \
  -v passe-finder-data:/data \
  passe-finder
```

- `PAYLOAD_SECRET` est **obligatoire** : sans lui, le conteneur s'arrête au démarrage
  avec un message d'erreur explicite (pas de plantage silencieux).
- `-v passe-finder-data:/data` : volume nommé Docker → la base **persiste** entre les
  redémarrages et recréations du conteneur.
- La réplication continue du volume vers AWS S3 (sauvegarde) est ajoutée à la Story 1.4 ;
  le pipeline de build/déploiement automatique à la Story 1.3.

## Integration continue

Chaque push sur `v2`/`main` declenche GitHub Actions : verification des types,
lint, tests d'integration, puis construction de l'image Docker, **test de fumee
contre le conteneur** et publication sur `ghcr.io`. Si un test echoue, rien
n'est publie.

> Toute evolution de collection Payload impose de generer sa migration
> (`npm run payload -- migrate:create <nom>`), sinon la CI echoue.

Details : [docs/structure-et-choix-techniques.md](docs/structure-et-choix-techniques.md).

## Comment ça marche / structure du projet

👉 Voir **[docs/structure-et-choix-techniques.md](docs/structure-et-choix-techniques.md)** — explique
l'organisation des dossiers (dont les fameux `(frontend)` / `(payload)`), le rôle de
`payload.config.ts`, le choix de SQLite, la convention de langue, et ce qui reste à construire.

## Convention de langue

- **Code en anglais** : noms de fichiers, de champs, de collections, routes techniques.
- **Interface en français** : libellés du back-office et textes du site.

## Planification (BMAD)

Les documents de conception (brief, PRD, architecture, UX, epics/stories, suivi de sprint) vivent
dans `_bmad-output/`.
