# Image de production du monolithe Next.js + Payload (Story 1.2).
# Multi-stage : deps → builder → runner.
# L'image finale conserve les node_modules complets : le CLI `payload migrate`
# doit tourner au démarrage (docker-entrypoint.sh) pour créer/mettre à jour le
# schéma SQLite. Base Node 24 (requise par Payload >= 3.88).

FROM node:24-alpine AS base
# libc6-compat : compat glibc pour certains binaires natifs (dont sharp) sur Alpine/musl.
RUN apk add --no-cache libc6-compat

# ---------------------------------------------------------------------------
# 1) Dépendances (lockfile strict, reproductible)
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
# .npmrc (legacy-peer-deps=true) requis pour que la résolution corresponde au lockfile.
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci

# ---------------------------------------------------------------------------
# 2) Build
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Le build importe payload.config.ts → src/env.ts, qui EXIGE PAYLOAD_SECRET et
# (en production) DATABASE_URI. Valeurs de build fournies EN LIGNE : valables
# uniquement pour cette commande, jamais stockées dans une couche de l'image.
# Les vraies valeurs sont fournies au runtime.
RUN PAYLOAD_SECRET=build-time-placeholder \
    DATABASE_URI=file:./build-time-placeholder.db \
    npm run build

# ---------------------------------------------------------------------------
# 3) Image finale
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# AD-10 : la base SQLite vit sur un volume persistant monté en /data,
# jamais dans la couche image éphémère. Surchargage possible au runtime.
ENV DATABASE_URI=file:/data/passe-finder.db
# NB : PAYLOAD_SECRET n'a PAS de valeur par défaut → doit être fourni au runtime
# (sinon échec explicite au démarrage, cf. src/env.ts).

# Utilisateur non-root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Répertoire de données du volume, inscriptible par l'utilisateur nextjs.
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME /data

# Les images televersees vivent ici. Sans volume, elles disparaitraient a chaque
# redeploiement (la couche image est jetable). Le volume les protege des
# livraisons ; leur copie horaire vers S3 (service `sauvegarde-medias` du
# docker-compose) les protege de la perte de la machine.
RUN mkdir -p /app/media && chown nextjs:nodejs /app/media
VOLUME /app/media

# Application : node_modules (pour `payload` + `next`), build, config, migrations.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/.npmrc ./.npmrc
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/deploy ./deploy
# Sources de l'import du catalogue historique, lu au premier demarrage.
COPY --from=builder --chown=nextjs:nodejs /app/migrate ./migrate
COPY --from=builder --chown=nextjs:nodejs /app/images ./images
COPY --from=builder --chown=nextjs:nodejs /app/passe-finder-saveDB.gz ./passe-finder-saveDB.gz

USER nextjs
EXPOSE 3000

# Vérifie que l'app répond (busybox wget présent sur Alpine).
# Forme shell : $PORT est développé au runtime, donc la sonde suit le port réel
# même si PORT est surchargé au `docker run`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --quiet --spider "http://127.0.0.1:${PORT:-3000}/" || exit 1

# Migrations puis démarrage (cf. docker-entrypoint.sh).
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
