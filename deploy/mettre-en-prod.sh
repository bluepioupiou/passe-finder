#!/bin/sh
# Mise en production de Passe Finder, avec retour arriere.
#
# Lance par le job de deploiement (.github/workflows/ci.yml), une fois le
# fichier .env ecrit. Deux variables sont attendues dans l'environnement :
#   IMAGE_PRECEDENTE  l'image en service AVANT ce deploiement (vide au premier)
#
# ---------------------------------------------------------------------------
# POURQUOI CE SCRIPT EXISTE (incident du 2026-09-01)
# ---------------------------------------------------------------------------
# Le deploiement se resumait a `docker compose up -d`. Une migration qui echoue
# laissait alors : le conteneur en boucle de redemarrage (`set -e` dans
# l'entrypoint), un schema a moitie applique, et le site indisponible jusqu'a
# reparation manuelle. C'est arrive deux fois.
#
# Trois changements, dans cet ordre d'importance :
#
#  1. UN SEUL ECRIVAIN pendant les migrations. Litestream v0.5 ECRIT dans la
#     base (table `_litestream_seq`) ; le laisser tourner pendant
#     `payload migrate`, c'est deux ecrivains sur un fichier SQLite, et une
#     migration qui se fait couper au milieu. L'application est arretee avec
#     lui — un conteneur en boucle relance les migrations toutes les quelques
#     secondes et redevient exactement le probleme qu'on ecarte.
#
#  2. UN INSTANTANE DE LA BASE juste avant de migrer, pris quand plus personne
#     n'ecrit. C'est ce qui rend le retour arriere possible : sans lui, on
#     saurait revenir a l'ancienne image, mais pas a l'ancien schema — et
#     l'ancienne image ne sait pas lire le nouveau (renommer une valeur de
#     visibilite suffit a la rendre aveugle).
#
#  3. UNE PAGE DE MISE A JOUR pendant l'operation, plutot qu'un 502 brut.
#
# CE QUE CE SCRIPT NE PROMET PAS : que le deploiement reussisse. Il promet
# qu'un echec rende le site tel qu'il etait cinq minutes plus tot, et qu'il le
# dise fort (code de sortie non nul, donc CI rouge).
# ---------------------------------------------------------------------------
set -e

cd /opt/passe-finder

INSTANTANE=/data/avant-deploiement.db
INSTANTANE_PRIS=non

# Combien de temps on laisse l'application devenir saine avant de declarer
# l'echec. 120 s : le demarrage de Next.js sur une machine a 1 Go n'est pas
# instantane, et un premier demarrage apres migration lit toute la base.
ATTENTE_MAX=120

# --- La page de mise a jour -------------------------------------------------
# Un simple fichier, que Caddy teste a chaque requete (voir le Caddyfile).
afficher_maintenance() {
  mkdir -p maintenance
  touch maintenance/actif
}

retirer_maintenance() {
  rm -f maintenance/actif
}

# --- L'application est-elle saine ? -----------------------------------------
# On lit le HEALTHCHECK deja declare dans l'image plutot que d'inventer une
# seconde definition de « saine » : une requete sur la page d'accueil.
attendre_sante() {
  i=0
  while [ "$i" -lt "$ATTENTE_MAX" ]; do
    conteneur="$(sudo docker compose ps -q app 2>/dev/null || true)"

    if [ -n "$conteneur" ]; then
      etat="$(sudo docker inspect --format '{{.State.Health.Status}}' "$conteneur" 2>/dev/null || echo inconnu)"
      [ "$etat" = "healthy" ] && return 0
      # `unhealthy` est un verdict, pas une etape : inutile d'attendre la suite.
      [ "$etat" = "unhealthy" ] && return 1
    fi

    sleep 2
    i=$((i + 2))
  done

  return 1
}

# --- Le retour arriere ------------------------------------------------------
#
# REMET LES DEUX MOITIES : la base d'abord, l'image ensuite. Dans cet ordre,
# parce que l'ancienne image redemarrera sur l'ancien schema — l'inverse la
# ferait demarrer sur le nouveau, qu'elle ne sait pas lire.
#
# NE LEVE JAMAIS : chaque geste est tolerant. Un retour arriere qui s'arrete au
# milieu laisserait un etat que personne n'a prevu ; on va au bout de ce qu'on
# peut, et on laisse la page de mise a jour affichee si on n'y arrive pas.
retour_arriere() {
  echo ""
  echo "!! ECHEC DU DEPLOIEMENT — retour a l'etat d'avant."

  sudo docker compose stop app litestream || true

  if [ "$INSTANTANE_PRIS" = "oui" ]; then
    echo "-> Restauration de la base d'avant migration..."
    sudo docker compose run --rm --no-deps -T --entrypoint node app deploy/restaurer-instantane.mjs \
      || echo "!! la restauration de la base a echoue"
  else
    echo "-> Pas d'instantane : la base n'a pas ete touchee, rien a restaurer."
  fi

  if [ -n "$IMAGE_PRECEDENTE" ]; then
    echo "-> Retour a l'image $IMAGE_PRECEDENTE..."
    sed -i "s|^IMAGE=.*|IMAGE=$IMAGE_PRECEDENTE|" .env || true
  else
    echo "!! Aucune image precedente connue (premier deploiement ?) : on redemarre avec la nouvelle."
  fi

  sudo docker compose up -d || true

  if attendre_sante; then
    retirer_maintenance
    echo "-> Site revenu a son etat d'avant le deploiement."
  else
    echo "!! Le site ne revient pas non plus. La page de mise a jour RESTE affichee."
    echo "   Journaux : sudo docker compose logs --tail=100 app"
  fi

  exit 1
}

# --- Le deploiement ---------------------------------------------------------

echo "-> Recuperation de l'image..."
sudo docker compose pull

echo "-> Affichage de la page de mise a jour..."
afficher_maintenance
# Caddy teste le fichier a chaque requete : la page est en place des maintenant,
# donc AVANT que l'application ne s'arrete. Personne ne voit le site tomber.

echo "-> Arret de l'application et de la replication..."
sudo docker compose stop app litestream

echo "-> Instantane de la base, avant toute migration..."
if sudo docker compose run --rm --no-deps -T --entrypoint node app deploy/instantane-base.mjs; then
  INSTANTANE_PRIS=oui
else
  echo "!! Impossible de prendre l'instantane de la base."
  echo "   On s'arrete AVANT de migrer : sans filet, on ne deploie pas."
  sudo docker compose up -d || true
  attendre_sante && retirer_maintenance
  exit 1
fi

echo "-> Application des migrations, base pour nous seuls..."
# Un conteneur jetable : `--no-deps` pour ne reveiller personne, `--entrypoint`
# pour ne pas enchainer sur le demarrage de Next.js.
sudo docker compose run --rm --no-deps --entrypoint sh app -c 'npm run payload -- migrate' || retour_arriere

echo "-> Redemarrage des conteneurs..."
sudo docker compose up -d --remove-orphans || retour_arriere

echo "-> Attente que l'application soit saine..."
attendre_sante || retour_arriere

echo "-> Retrait de la page de mise a jour..."
retirer_maintenance

echo "-> Nettoyage des images devenues inutiles..."
sudo docker image prune -f || true

echo ""
echo "Deploiement termine."
