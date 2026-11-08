#!/bin/sh
# deploiement/installer-vps.sh — LA PREMIÈRE POSE DE RATIOPOL SUR LE VPS.
#
# À lancer SUR LE VPS (ssh vps-projets), une seule fois, depuis un clone du
# dépôt. Tout ce qu'il pose est idempotent : le relancer ne casse rien.
#
# Prérequis : le DNS de ratiopol.fr (et www) pointe vers le VPS ;
# PostgreSQL 18 tourne ; node ≥ 22 est installé.
#
# Après la pose : certbot --nginx -d ratiopol.fr -d www.ratiopol.fr,
# puis décommenter HSTS dans ratiopol.nginx.conf.

set -eu
REPERTOIRE=/opt/ratiopol
SERVICE=/etc/systemd/system/ratiopol.service
ENV=/etc/ratiopol.env

echo "— Base de données PostgreSQL (une base par projet, coutume maison)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='ratiopol_database'" | grep -q 1 || \
  sudo -u postgres createdb -O debian ratiopol_database

echo "— Répertoire $REPERTOIRE"
sudo mkdir -p "$REPERTOIRE"
sudo chown debian:debian "$REPERTOIRE"

echo "— Configuration $ENV (les secrets vivent là, jamais dans le dépôt)"
if [ ! -f "$ENV" ]; then
  MOT_DE_PASSE_ADMIN="$(head -c 32 /dev/urandom | base64 | tr -d '=+/')"
  # L'empreinte scrypt du mot de passe admin se calcule sur la machine de
  # développement : npm exec -- node -e "…" (voir README, section Admin).
  sudo tee "$ENV" >/dev/null <<FIN
# RatioPol — configuration du serveur (secrets : chmod 600, hors dépôt)
RP_PORT=8090
RP_SEL=$(head -c 48 /dev/urandom | base64 | tr -d '=+/\n')
# Socket Unix + peer auth (pg_hba.conf : local all all peer) — TCP exigerait
# un mot de passe, la coutume maison n'en pose pas. Le `?host=` écrase le
# host de l'URL (postgres.js) ; « localhost » seul passerait par TCP.
RP_PG_URL=postgres://debian@localhost/ratiopol_database?host=/var/run/postgresql
RP_ORIGINE=https://ratiopol.fr
# RP_EMPREINTE_MDP_ADMIN=  ← à poser après génération (voir README)
FIN
  sudo chmod 600 "$ENV"
  echo "  posé. Générez puis posez RP_EMPREINTE_MDP_ADMIN pour ouvrir /admin"
  echo "  (mot de passe admin de secours suggéré : $MOT_DE_PASSE_ADMIN)"
fi

echo "— Unité systemd"
sudo cp deploiement/ratiopol.service "$SERVICE"
sudo systemctl daemon-reload
sudo systemctl enable ratiopol

echo "— nginx"
sudo cp deploiement/proxy_params_ratio.conf /etc/nginx/proxy_params_ratio.conf
sudo cp deploiement/ratiopol.nginx.conf /etc/nginx/sites-available/ratiopol
sudo ln -sf /etc/nginx/sites-available/ratiopol /etc/nginx/sites-enabled/ratiopol
sudo nginx -t && sudo systemctl reload nginx

echo "— Premier déploiement"
node deploiement/deployer.mjs || {
  echo "Le premier déploiement a échoué — vérifiez /etc/ratiopol.env et les journaux :"
  echo "  journalctl -u ratiopol -n 50"
  exit 1
}

echo
echo "RatioPol est posé. Reste à faire :"
echo "  1. certbot --nginx -d ratiopol.fr -d www.ratiopol.fr"
echo "  2. décommenter HSTS dans /etc/nginx/sites-available/ratiopol puis reload"
echo "  3. poser RP_EMPREINTE_MDP_ADMIN dans $ENV et restart ratiopol"
echo "  4. compléter l'adresse de contact de /mentions"
