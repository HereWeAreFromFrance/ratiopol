// deploiement/deployer.mjs — METTRE RATIOPOL EN LIGNE, RÉVERSIBLE.
//
// Usage : node deploiement/deployer.mjs           (déploie)
//         node deploiement/deployer.mjs --retour  (revient à la version d'avant)
//
// Les garde-fous sont la coutume maison (MateMaterial/Lumilap/VpsBoard) :
//  · les TESTS doivent être verts — un déploiement rouge ne part pas ;
//  · l'arbre git doit être PROPRE et POUSSÉ sur origin/main — ce qui part
//    est exactement ce qui est versionné ;
//  · la pose est ATOMIQUE : tout arrive sous .nouveau, puis un renommage
//    bascule actuel ↔ .precedent — le service ne voit jamais un état mi-posé ;
//  · un contrôle post-déploiement (HTTP 200 sur /sante et /) doit passer,
//    sinon RETOUR ARRIÈRE AUTOMATIQUE.
//
// La première pose (base, /etc/ratiopol.env, systemd, nginx) se fait une
// fois par installer-vps.sh — ce script ne gère que les suivantes.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

const HOTE = 'vps-projets';          // alias SSH du VPS (coutume maison)
const CHEMIN_DISTANT = '/opt/ratiopol';
const PORT = 8090;

async function sh(commande, opts = {}) {
  const { stdout, stderr } = await exec('/bin/sh', ['-c', commande], opts);
  if (stderr.trim() !== '') process.stderr.write(stderr);
  return stdout.trim();
}

async function principal() {
  const retour = process.argv.includes('--retour');

  if (retour) {
    console.log('Retour arrière…');
    await sh(`ssh ${HOTE} "cd ${CHEMIN_DISTANT} && [ -d .precedent ] && sudo systemctl stop ratiopol && rm -rf actuel && mv .precedent actuel && sudo systemctl start ratiopol && sleep 1 && curl -sf http://127.0.0.1:${PORT}/sante"`);
    console.log('Revenu à la version précédente.');
    return;
  }

  // 1. Tests verts (ils rebâtissent dist/).
  console.log('1/6 Tests…');
  await sh('node build.mjs && node --test test/gabarit.test.mjs test/http.test.mjs');

  // 2. Git propre et poussé.
  console.log('2/6 Git…');
  const sale = await sh('git status --porcelain');
  if (sale !== '') throw new Error(`arbre sale :\n${sale}`);
  const local = await sh('git rev-parse HEAD');
  const distant = await sh('git rev-parse origin/main');
  if (local !== distant) throw new Error(`commit non poussé (${local.slice(0, 8)} ≠ ${distant.slice(0, 8)})`);

  // 3. Envoi sous .nouveau (dist + code serveur + migrations + deps).
  console.log('3/6 Envoi…');
  await sh(`ssh ${HOTE} "mkdir -p ${CHEMIN_DISTANT}/.nouveau"`);
  await sh(`scp -r dist package.json base node_modules ${HOTE}:${CHEMIN_DISTANT}/.nouveau/`);

  // 4. Migrations de base.
  console.log('4/6 Base…');
  await sh(`ssh ${HOTE} "cd ${CHEMIN_DISTANT}/.nouveau && set -a && . /etc/ratiopol.env && set +a && node base/migrate.mjs"`);

  // 5. Bascule atomique + redémarrage (sans .precedent à la première pose).
  console.log('5/6 Bascule…');
  await sh(`ssh ${HOTE} "cd ${CHEMIN_DISTANT} && rm -rf .precedent && [ -d actuel ] && mv actuel .precedent; mv .nouveau actuel && sudo systemctl restart ratiopol"`);

  // 6. Contrôle — ou retour arrière.
  console.log('6/6 Contrôle…');
  const ok = await sh(`ssh ${HOTE} "sleep 1 && curl -sf http://127.0.0.1:${PORT}/sante && curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:${PORT}/ | grep -q 200 && echo CONTROLE-OK"`);
  if (!ok.includes('CONTROLE-OK')) {
    console.error('Contrôle échoué — retour arrière automatique.');
    await sh(`ssh ${HOTE} "cd ${CHEMIN_DISTANT} && sudo systemctl stop ratiopol && rm -rf actuel && mv .precedent actuel && sudo systemctl start ratiopol"`);
    process.exit(1);
  }
  console.log('Déployé et contrôlé. L’ancienne version reste dans .precedent (retour : --retour).');
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exit(1);
});
