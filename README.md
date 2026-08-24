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
