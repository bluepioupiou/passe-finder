#!/bin/sh
# Préparation d'une machine Linux neuve pour héberger Passe Finder.
#
# À lancer UNE FOIS sur le serveur (Ubuntu 24.04) :
#   curl -fsSL https://raw.githubusercontent.com/bluepioupiou/passe-finder/v2/deploy/bootstrap.sh | sh
#
# IDEMPOTENT : le relancer ne casse rien et ne duplique rien.
#
# Ce script n'installe rien de spécifique à AWS : il fonctionne sur n'importe
# quelle machine Linux (Lightsail, EC2, Hetzner, Scaleway…).

set -e

DOSSIER="/opt/passe-finder"

echo "=== Préparation de la machine pour Passe Finder ==="

# --- 1. Docker -------------------------------------------------------------
if command -v docker >/dev/null 2>&1; then
  echo "→ Docker déjà installé : $(docker --version)"
else
  echo "→ Installation de Docker…"
  curl -fsSL https://get.docker.com | sh
fi

# Permet de lancer docker sans sudo pour l'utilisateur courant.
if ! id -nG "$USER" | grep -qw docker; then
  echo "→ Ajout de $USER au groupe docker…"
  sudo usermod -aG docker "$USER"
  echo "   ⚠️  Déconnecte-toi et reconnecte-toi pour que ce droit prenne effet."
fi

# --- 2. Dossier applicatif -------------------------------------------------
if [ ! -d "$DOSSIER" ]; then
  echo "→ Création de $DOSSIER…"
  sudo mkdir -p "$DOSSIER"
fi
sudo chown -R "$USER":"$USER" "$DOSSIER"

# --- 3. Fichier d'échange (swap) ------------------------------------------
# Les instances Lightsail n'ont pas de swap par défaut. Sur une machine à 1 Go,
# c'est le filet qui évite que le noyau tue l'application lors d'un pic
# passager (démarrage, migrations, plusieurs visiteurs simultanés).
# Le swap est lent : il sert de marge de sécurité, pas de mémoire d'appoint.
if [ -f /swapfile ]; then
  echo "→ Fichier d'échange déjà présent."
else
  echo "→ Création d'un fichier d'échange de 2 Go…"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  # Rendu permanent : sans cette ligne, le swap disparaît au redémarrage.
  if ! grep -q '^/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
  # N'utiliser le swap qu'en dernier recours (défaut trop agressif pour un serveur).
  sudo sysctl -w vm.swappiness=10 >/dev/null
  if ! grep -q '^vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf >/dev/null
  fi
fi

# --- 4. Redémarrage automatique -------------------------------------------
# Les conteneurs sont déclarés `restart: unless-stopped` ; il faut que le
# service Docker démarre lui-même au boot pour que le site revienne seul
# après un redémarrage de la machine.
echo "→ Activation de Docker au démarrage…"
sudo systemctl enable docker >/dev/null 2>&1 || true
sudo systemctl start docker >/dev/null 2>&1 || true

echo ""
echo "=== Machine prête ==="
echo "Dossier applicatif : $DOSSIER"
echo ""
echo "Étapes suivantes :"
echo "  1. Renseigne les secrets dans GitHub (voir docs/mise-en-production.md)."
echo "  2. Pousse un commit : le déploiement se fera tout seul."
