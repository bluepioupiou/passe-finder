#!/bin/sh
# Restauration complete de Passe Finder depuis S3 : base + images.
#
# QUAND S'EN SERVIR : la machine est perdue (ou tu veux verifier que la
# sauvegarde fonctionne vraiment). Sur une machine neuve, l'ordre est :
#   1. bootstrap.sh (Docker, swap, dossiers) ;
#   2. les fichiers de deploiement et le .env dans /opt/passe-finder ;
#   3. CE SCRIPT ;
#   4. `sudo docker compose up -d`.
#
# POURQUOI AVANT le premier demarrage : au demarrage, l'application importe le
# catalogue historique si la base est vide (docker-entrypoint.sh). Tu
# repartirais donc des 30 positions d'origine au lieu de ton etat reel.
# Si l'application a deja demarre, ce script arrete la pile et ecrase la base
# creee — c'est justement ce qu'on veut.
#
# DESTRUCTIF : ecrase la base et complete les images de la machine par celles
# du bucket. D'ou la confirmation explicite.
set -e

cd /opt/passe-finder

if [ ! -f .env ]; then
  echo "ERREUR : /opt/passe-finder/.env est absent."
  echo "Lance d'abord un deploiement (il ecrit ce fichier) ou cree-le a la main."
  exit 1
fi

echo "=== Restauration de Passe Finder depuis S3 ==="
echo ""
echo "Cette operation ECRASE la base de donnees locale par celle du bucket,"
echo "et recopie les images sauvegardees dans le volume."
printf "Taper 'oui' pour continuer : "
read -r reponse
[ "$reponse" = "oui" ] || { echo "Abandon."; exit 1; }

# --- 1. Arret de la pile ---------------------------------------------------
# `stop` et non `down -v` : les volumes doivent survivre, on ne fait
# qu'immobiliser les ecritures pendant la restauration.
echo "-> Arret des conteneurs..."
sudo docker compose stop

# --- 2. Suppression de la base locale --------------------------------------
# Litestream refuse de restaurer par-dessus un fichier existant. L'image
# Litestream est distroless (aucun shell) : on passe par une image jetable
# montee sur le meme volume.
VOLUME_BASE="$(sudo docker volume ls -q | grep -E '_donnees$' | head -n1)"
if [ -z "$VOLUME_BASE" ]; then
  echo "ERREUR : volume de donnees introuvable. La pile a-t-elle deja tourne ici ?"
  exit 1
fi
echo "-> Suppression de la base locale (volume $VOLUME_BASE)..."
sudo docker run --rm -v "$VOLUME_BASE":/data alpine:3 \
  rm -f /data/passe-finder.db /data/passe-finder.db-wal /data/passe-finder.db-shm

# --- 3. Restauration de la base --------------------------------------------
# `--no-deps` : surtout ne pas demarrer l'application maintenant (voir en-tete).
echo "-> Restauration de la base depuis S3 (Litestream)..."
sudo docker compose run --rm --no-deps litestream \
  restore -config /etc/litestream.yml /data/passe-finder.db

# --- 4. Restauration des images --------------------------------------------
# `copy` : complete le volume sans rien effacer. Une image presente localement
# et absente du bucket (ajoutee dans l'heure precedant la panne) est conservee.
echo "-> Restauration des images depuis S3 (rclone)..."
sudo docker compose run --rm --no-deps --entrypoint /bin/sh sauvegarde-medias \
  -c 'rclone copy "s3:$S3_BUCKET/medias" /medias --s3-no-check-bucket --stats-one-line --stats=0 --log-level INFO'

# --- 5. Redemarrage ---------------------------------------------------------
echo "-> Redemarrage de la pile..."
sudo docker compose up -d

echo ""
echo "=== Restauration terminee ==="
echo "Verifie le site, puis les journaux : sudo docker compose logs --tail=30"
