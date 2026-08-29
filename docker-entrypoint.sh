#!/bin/sh
# Point d'entrée du conteneur de production.
# 1) Applique les migrations Payload (crée/met à jour le schéma SQLite sur le volume).
# 2) Démarre le serveur Next.js.
# `set -e` : si les migrations échouent (ou si une variable d'env requise manque,
# via src/env.ts), le conteneur s'arrête avec un message clair — pas de démarrage
# sur une base incohérente.
set -e

echo "→ Application des migrations Payload..."
npm run payload -- migrate

echo "→ Vérification du mode WAL (requis par la sauvegarde Litestream)..."
node deploy/activer-wal.mjs

echo "→ Démarrage du serveur Next.js..."
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
