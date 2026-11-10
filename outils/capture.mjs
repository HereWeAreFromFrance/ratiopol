// outils/capture.mjs — UNE CAPTURE D'ÉCRAN DU SITE LOCAL.
//
// Démarre le serveur construit (dépôt mémoire, deux idées d'exemple), ouvre
// un Chrome sans tête et sauvegarde des captures dans captures/.
// Usage : lourd node outils/capture.mjs
// Réutilise le puppeteer-core de MateMaterial — RatioPol n'a pas besoin de
// sa propre dépendance navigateur.

import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire('/home/paul/Programmation/MateMaterial/');
const puppeteer = require('puppeteer-core');
const CHROME = '/usr/bin/google-chrome-stable';

const m = await import('../dist/serveur.mjs');
const assets = JSON.parse(await readFile('dist/manifeste.json', 'utf8'));
const serveur = m.creeServeur({ depot: new m.DepotMemoire(), sel: 'essai-capture', assets });
await new Promise((r) => serveur.listen(8124, '127.0.0.1', r));
const base = 'http://127.0.0.1:8124';

// Deux idées d'exemple, déposées par le vrai chemin HTTP.
const exemples = [
  {
    titre: 'Encadrer les loyers des résidences étudiantes à Paris',
    probleme:
      'Les loyers des résidences étudiantes parisiennes ont augmenté de 32 % en dix ans, pendant que les bourses restaient fixes. Des étudiants travaillent plus de quinze heures par semaine pour payer une chambre de 9 m².',
    proposition:
      'Étendre l’encadrement des loyers aux résidences étudiantes gérées par des opérateurs privés sous convention CROUS, dans toutes les zones tendues.',
    beneficiaires:
      'Les 600 000 étudiants des zones tendues, qui verraient leur loyer plafonné ; les petits propriétaires restent indemnisés par le dispositif.',
    arbitrage:
      'Le plafonnement pèse sur les rendements des opérateurs privés, compensé par des garanties de caution publique ; coût administratif de quelques millions par an.',
    indicateur: 'Le loyer médian des résidences étudiantes en zone tendue, publié chaque année par l’OLAP.',
    theme: 'logement',
    niveau: 'etat',
    pseudo: 'Lou',
  },
  {
    titre: 'Rendre la carte grise gratuite pour les deux-roues électriques',
    probleme:
      'La carte grise d’un scooter électrique neuf coûte encore plusieurs dizaines d’euros selon les régions, alors même que l’État veut favoriser ce mode de déplacement urbain.',
    proposition:
      'Supprimer la taxe régionale d’immatriculation pour les deux-roues électriques neufs, en compensation forfaitaire aux régions.',
    beneficiaires:
      'Les acheteurs de deux-roues électriques — environ 60 000 ménages par an — et les villes moins bruyantes.',
    arbitrage: 'Les régions perdent une recette faible, compensée euro pour euro par une dotation de l’État.',
    indicateur: 'Le prix médian d’immatriculation d’un deux-roues électrique neuf, et les ventes annuelles.',
    theme: 'transports',
    niveau: 'etat',
    pseudo: 'Camille',
  },
];

const slugs = [];
for (const ex of exemples) {
  const reponse = await fetch(base + '/proposer', {
    method: 'POST',
    body: new URLSearchParams({ ...ex, consentement: 'on' }),
    redirect: 'manual',
  });
  slugs.push(reponse.headers.get('location').replace('/idee/', ''));
}

const navigateur = await puppeteer.launch({ executablePath: CHROME, headless: true });
await mkdir('captures', { recursive: true });

const pages = [
  ['accueil', base + '/', false],
  ['proposer', base + '/proposer', false],
  ['reperes', base + '/reperes', true],
  ['idee', base + '/idee/' + slugs[0], true],
];
for (const [largeur, hauteur] of [[360, 780], [1440, 900]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/accueil-${largeur}.png`, fullPage: true });
  console.log('capture', `accueil-${largeur}`);
  await page.close();
}
const accueilSombre = await navigateur.newPage();
await accueilSombre.setViewport({ width: 1440, height: 900 });
await accueilSombre.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await accueilSombre.goto(base + '/', { waitUntil: 'networkidle0' });
await accueilSombre.screenshot({ path: 'captures/accueil-sombre-1440.png', fullPage: true });
console.log('capture accueil-sombre-1440');
await accueilSombre.close();
for (const [nom, url, pleine] of pages) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/${nom}.png`, fullPage: pleine });
  console.log('capture', nom);
  await page.close();
}

// Repères : les tailles d'écran (mobile → desktop) et le thème sombre.
for (const [largeur, hauteur] of [[360, 780], [768, 1024], [1440, 900]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/reperes', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/reperes-${largeur}.png`, fullPage: true });
  console.log('capture', `reperes-${largeur}`);
  await page.close();
}
const sombre = await navigateur.newPage();
await sombre.setViewport({ width: 1440, height: 900 });
await sombre.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await sombre.goto(base + '/reperes', { waitUntil: 'networkidle0' });
await sombre.screenshot({ path: 'captures/reperes-sombre.png', fullPage: true });
console.log('capture reperes-sombre');
await sombre.close();

// La vue camembert : desktop, mobile, sombre.
for (const [largeur, hauteur] of [[1440, 900], [360, 780]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/reperes?vue=camembert', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/reperes-camembert-${largeur}.png`, fullPage: true });
  console.log('capture', `reperes-camembert-${largeur}`);
  await page.close();
}
const sombreCame = await navigateur.newPage();
await sombreCame.setViewport({ width: 1440, height: 900 });
await sombreCame.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await sombreCame.goto(base + '/reperes?vue=camembert', { waitUntil: 'networkidle0' });
await sombreCame.screenshot({ path: 'captures/reperes-camembert-sombre.png', fullPage: true });
console.log('capture reperes-camembert-sombre');
await sombreCame.close();

// Grands écrans : les paliers ≥ 1920 px CSS. Viewport CSS, pas pixels
// physiques — un 4K à échelle OS 150 % tombe à 2560.
for (const [largeur, hauteur] of [[1920, 1080], [2560, 1350], [3840, 2000]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/reperes', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/reperes-${largeur}.png`, fullPage: true });
  console.log('capture', `reperes-${largeur}`);
  await page.close();
}
for (const [largeur, hauteur] of [[2560, 1350], [3840, 2000]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/reperes?vue=camembert', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/reperes-camembert-${largeur}.png`, fullPage: true });
  console.log('capture', `reperes-camembert-${largeur}`);
  await page.close();
}
for (const [largeur, hauteur] of [[1920, 1080], [2560, 1350], [3840, 2000]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/accueil-${largeur}.png`, fullPage: true });
  console.log('capture', `accueil-${largeur}`);
  await page.close();
}
for (const [nom, url] of [['reperes', '/reperes'], ['accueil', '/']]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: 2560, height: 1350 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(base + url, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/${nom}-sombre-2560.png`, fullPage: true });
  console.log('capture', `${nom}-sombre-2560`);
  await page.close();
}

// Le simulateur d'hypothèse (/reperes) : d'abord sans JavaScript — non-
// régression stricte, la page doit rester exactement celle du serveur —
// puis avec, poignées déplacées au clavier et au pointeur, résultats relus
// dans le DOM pour vérifier le recalcul arithmétique.
// Chaque scénario capture le graphe seul (vérification du dessin) et la
// page entière (vérification de l'intégration à la mise en page).
const captureSim = async (page, nom) => {
  const graphe = await page.$('svg[data-sim]');
  await graphe.screenshot({ path: `captures/${nom}-graphe.png` });
  await page.screenshot({ path: `captures/${nom}.png`, fullPage: true });
  console.log('capture', nom);
};

for (const [largeur, hauteur] of [[1440, 900], [360, 780]]) {
  const page = await navigateur.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/reperes', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/reperes-sim-sans-js-${largeur}.png`, fullPage: true });
  const graphe = await page.$('svg.reperes-courbe');
  await graphe.screenshot({ path: `captures/reperes-sim-sans-js-${largeur}-graphe.png` });
  console.log('capture', `reperes-sim-sans-js-${largeur}`);
  await page.close();
}

const litResultats = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      ['dep', 'rec', 'solde-pib', 'solde-mds', 'ecart'].map((nom) => [
        nom,
        document.querySelector(`[data-sim-${nom}]`)?.textContent ?? 'absent',
      ]),
    ),
  );

const simPage = async (largeur, hauteur, sombre = false) => {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  if (sombre) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(base + '/reperes', { waitUntil: 'networkidle0' });
  return page;
};

// Défaut : poignées au statu quo (valeurs 2025) — solde attendu −5,1 %,
// −152,6 Md€, écart 0,0 point.
let page = await simPage(1440, 900);
console.log('statu quo :', JSON.stringify(await litResultats(page)));
await captureSim(page, 'reperes-sim-defaut-1440');

// Au clavier (0,1 point par cran) : dépenses 57,3 → 55,3, recettes
// 52,2 → 53,7 — solde attendu −1,6 %, −47,9 Md€, écart +3,5 points.
const poignees = await page.$$('g[role="slider"]');
if (poignees.length !== 2) throw new Error(`poignées attendues : 2, trouvées : ${poignees.length}`);
// focus() de puppeteer ne prend que les HTMLElement : pour le <g> SVG, on
// passe par le DOM.
const cibleClavier = async (poignee) => poignee.evaluate((g) => g.focus());
await cibleClavier(poignees[0]);
for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown');
await cibleClavier(poignees[1]);
for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowUp');
console.log('au clavier :', JSON.stringify(await litResultats(page)));
await captureSim(page, 'reperes-sim-hausse-1440');
await page.close();

// Sombre, au clavier dans l'autre sens : 42 et 25 crans dépassent les
// bornes 50-60 — dépenses 57,3 → 60,0, recettes 52,2 → 50,0. Le scénario
// démontre le blocage aux bornes : solde attendu −10,0 %, −299,1 Md€,
// écart −4,9 points.
const pageSombre = await simPage(1440, 900, true);
const poigneesSombre = await pageSombre.$$('g[role="slider"]');
await poigneesSombre[0].evaluate((g) => g.focus());
for (let i = 0; i < 42; i++) await pageSombre.keyboard.press('ArrowUp');
await poigneesSombre[1].evaluate((g) => g.focus());
for (let i = 0; i < 25; i++) await pageSombre.keyboard.press('ArrowDown');
console.log('sombre :', JSON.stringify(await litResultats(pageSombre)));
await captureSim(pageSombre, 'reperes-sim-baisse-sombre-1440');
await pageSombre.close();

// Mobile, au pointeur : on glisse la poignée des recettes de 52,2 à 51,2
// (cy attendu 270,4 dans le viewBox) — solde attendu −6,1 %, −182,5 Md€,
// écart −1,0 point (le singulier).
const pageMobile = await simPage(360, 780);
const slidersMobile = await pageMobile.$$('g[role="slider"]');
const svgSim = await pageMobile.$('svg[data-sim]');
await slidersMobile[1].scrollIntoView();
const boiteSvg = await svgSim.boundingBox();
const boiteRec = await slidersMobile[1].boundingBox();
const cx = boiteRec.x + boiteRec.width / 2;
const cy = boiteRec.y + boiteRec.height / 2;
const cible = boiteSvg.y + (270.4 / 340) * boiteSvg.height;
await pageMobile.mouse.move(cx, cy);
await pageMobile.mouse.down();
await pageMobile.mouse.move(cx, cible, { steps: 8 });
await pageMobile.mouse.up();
console.log('au pointeur :', JSON.stringify(await litResultats(pageMobile)));
console.log('aria recettes :', await slidersMobile[1].evaluate((g) => `${g.getAttribute('aria-valuenow')} / ${g.getAttribute('aria-valuetext')}`));
await svgSim.screenshot({ path: 'captures/reperes-sim-glisser-360-graphe.png' });
await pageMobile.screenshot({ path: 'captures/reperes-sim-glisser-360.png', fullPage: true });
console.log('capture reperes-sim-glisser-360');
await pageMobile.close();

await navigateur.close();
serveur.close();
process.exit(0);
