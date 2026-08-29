#!/bin/sh
# Sauvegarde continue des images televersees vers S3.
#
# POURQUOI : la base est repliquee en continu par Litestream, mais les images
# vivent sur un volume Docker de la machine. Sans ce script, perdre la machine
# = perdre toute image ajoutee depuis le back-office (les 30 positions
# historiques, elles, sont rejouables depuis le depot).
#
# COPY, PAS SYNC : `rclone copy` n'efface JAMAIS cote S3. Une image supprimee
# par erreur dans l'admin reste donc recuperable dans le bucket. C'est ce qui
# fait la difference entre une sauvegarde et une simple copie distante.
#
# La configuration rclone passe entierement par des variables d'environnement
# (RCLONE_CONFIG_S3_*) : aucun fichier de configuration a deposer sur le
# serveur, aucun secret ecrit sur disque en plus du .env existant.
set -e

# Fichier de configuration vide : rclone est entierement pilote par les
# variables ci-dessus, mais sans ce fichier il ecrit un avertissement a
# chaque passage, ce qui bruiterait les journaux pour rien.
touch "${RCLONE_CONFIG:-/tmp/rclone.conf}"

DESTINATION="s3:${S3_BUCKET}/medias"
INTERVALLE="${INTERVALLE_SAUVEGARDE:-3600}"

echo "Sauvegarde des images : ${DESTINATION}, toutes les ${INTERVALLE}s."

while true; do
  # `|| echo` : un echec (reseau, S3 momentanement indisponible) ne doit pas
  # tuer la boucle. On log et on retente au tour suivant.
  if rclone copy /medias "$DESTINATION" \
    --s3-no-check-bucket \
    --stats-one-line \
    --stats=0 \
    --log-level INFO; then
    echo "-> Sauvegarde terminee."
  else
    echo "-> ECHEC de la sauvegarde. Nouvelle tentative dans ${INTERVALLE}s."
  fi
  sleep "$INTERVALLE"
done
