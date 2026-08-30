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

# PAS d'import de donnees ici (decision Alain, 2026-08-30).
# La reprise du catalogue historique est un geste d'INITIALISATION, fait une
# seule fois. Maintenant que la base existe et qu'elle est sauvegardee en
# continu, l'automatiser au demarrage n'apporte plus rien : le seul garde-fou
# possible etait « la base est-elle vide ? », une heuristique tout-ou-rien qui
# ne sait pas voir qu'une entite (les enchainements) manque alors que les
# autres sont la.
# Les scripts restent disponibles dans l'image, a lancer a la main :
#   docker compose exec app npm run migrate:enchainements
# (voir docs/mise-en-production.md).

echo "→ Démarrage du serveur Next.js..."
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
