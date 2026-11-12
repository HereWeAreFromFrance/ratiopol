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
    // Une idée chiffrée : le bloc « impact » et sa part du poste officiel.
    effet: 'cout',
    montant: '45',
    unite: 'M',
    poste: 'etat-ecologie',
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

// Le groupe « impact chiffré » du formulaire, seul (la capture pleine page
// du formulaire serait trop haute pour être lue).
{
  const page = await navigateur.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(base + '/proposer', { waitUntil: 'networkidle0' });
  await (await page.$('.champ-groupe')).screenshot({ path: 'captures/proposer-impact.png' });
  console.log('capture proposer-impact');
  await page.close();
}

// Fiches de thème et page « Comment agir ».
for (const [nom, chemin, largeur, sombreF] of [['theme-logement-1440', '/theme/logement', 1440, false], ['theme-energie-360', '/theme/energie', 360, false], ['theme-justice-sombre', '/theme/justice', 1440, true], ['agir-1280', '/agir', 1280, false]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: 900 });
  if (sombreF) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(base + chemin, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/${nom}.png`, fullPage: true });
  console.log('capture', nom);
  await page.close();
}

// La page Thèmes : familles de cartes, desktop, mobile et sombre.
for (const [largeur, hauteur, sombreT] of [[1440, 900, false], [360, 780, false], [1440, 900, true]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  if (sombreT) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(base + '/themes', { waitUntil: 'networkidle0' });
  const nom = `themes-${largeur}${sombreT ? '-sombre' : ''}`;
  await page.screenshot({ path: `captures/${nom}.png`, fullPage: true });
  console.log('capture', nom);
  await page.close();
}

// Page idée chiffrée : mobile, desktop, sombre ; puis un avis donné par le
// JS (bouton enfoncé, décompte mis à jour sans rechargement).
for (const [largeur, hauteur, sombreIdee] of [[360, 780, false], [1280, 900, false], [1280, 900, true]]) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  if (sombreIdee) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(base + '/idee/' + slugs[1], { waitUntil: 'networkidle0' });
  const nom = `idee-chiffree-${largeur}${sombreIdee ? '-sombre' : ''}`;
  await page.screenshot({ path: `captures/${nom}.png`, fullPage: true });
  console.log('capture', nom);
  await page.close();
}
{
  const page = await navigateur.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(base + '/idee/' + slugs[1], { waitUntil: 'networkidle0' });
  await page.click('button[name="position"][value="contre"]');
  await page.click('button[name="arbitrage"][value="complet"]');
  await page.waitForFunction(() => document.querySelector('button[value="complet"]')?.getAttribute('aria-pressed') === 'true');
  const etat = await page.evaluate(() => [...document.querySelectorAll('.js-avis button')].map((b) => `${b.value}=${b.getAttribute('aria-pressed')}:${b.querySelector('.idee-avis-compte')?.textContent}`).join(' '));
  console.log('avis après clics :', etat, '— URL', page.url());
  await page.screenshot({ path: 'captures/idee-avis-donne.png', fullPage: true });
  console.log('capture idee-avis-donne');
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

const simPage = async (largeur, hauteur, sombre = false, chemin = '/reperes') => {
  const page = await navigateur.newPage();
  await page.setViewport({ width: largeur, height: hauteur });
  if (sombre) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(base + chemin, { waitUntil: 'networkidle0' });
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

// L'accueil porte le même simulateur (mêmes data-*). Sans JavaScript
// d'abord : non-régression stricte — la page doit rester celle du serveur,
// bande au statu quo comprise. Puis avec JS : l'étiquette vivante doit
// suivre la poignée qui bouge.
for (const [largeur, hauteur] of [[1440, 900], [360, 780]]) {
  const page = await navigateur.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setViewport({ width: largeur, height: hauteur });
  await page.goto(base + '/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/accueil-sim-sans-js-${largeur}.png`, fullPage: true });
  const graphe = await page.$('svg.reperes-courbe');
  await graphe.screenshot({ path: `captures/accueil-sim-sans-js-${largeur}-graphe.png` });
  console.log('capture', `accueil-sim-sans-js-${largeur}`);
  await page.close();
}

// Clair 1440, au clavier en deux temps : chaque capture montre l'étiquette
// vivante de la poignée qui vient de bouger (la poignée garde le focus).
// Dépenses 57,3 → 56,8 : étiquette attendue « 56,8 % », solde −5,6 %.
let pageAccueilSim = await simPage(1440, 900, false, '/');
const poigneesAccueil = await pageAccueilSim.$$('g[role="slider"]');
await poigneesAccueil[0].evaluate((g) => g.focus());
for (let i = 0; i < 5; i++) await pageAccueilSim.keyboard.press('ArrowDown');
console.log('accueil dépenses :', JSON.stringify(await litResultats(pageAccueilSim)));
const grapheAccueil = await pageAccueilSim.$('svg[data-sim]');
await grapheAccueil.screenshot({ path: 'captures/accueil-sim-dep-1440-graphe.png' });
console.log('capture accueil-sim-dep-1440-graphe');
// Puis recettes 52,2 → 53,7 : étiquette « 53,7 % », solde −1,6 %.
await poigneesAccueil[1].evaluate((g) => g.focus());
for (let i = 0; i < 15; i++) await pageAccueilSim.keyboard.press('ArrowUp');
console.log('accueil complet :', JSON.stringify(await litResultats(pageAccueilSim)));
await grapheAccueil.screenshot({ path: 'captures/accueil-sim-clavier-1440-graphe.png' });
await pageAccueilSim.screenshot({ path: 'captures/accueil-sim-clavier-1440.png', fullPage: true });
console.log('capture accueil-sim-clavier-1440');
await pageAccueilSim.close();

// Sombre 1440 : dépenses 57,3 → 59,5, recettes 52,2 → 51,2 — solde
// attendu −8,3 %, −248,3 Md€, écart −3,2 points.
const pageAccueilSombre = await simPage(1440, 900, true, '/');
const poigneesAccueilSombre = await pageAccueilSombre.$$('g[role="slider"]');
await poigneesAccueilSombre[0].evaluate((g) => g.focus());
for (let i = 0; i < 22; i++) await pageAccueilSombre.keyboard.press('ArrowUp');
await poigneesAccueilSombre[1].evaluate((g) => g.focus());
for (let i = 0; i < 10; i++) await pageAccueilSombre.keyboard.press('ArrowDown');
console.log('accueil sombre :', JSON.stringify(await litResultats(pageAccueilSombre)));
await (await pageAccueilSombre.$('svg[data-sim]')).screenshot({ path: 'captures/accueil-sim-sombre-1440-graphe.png' });
await pageAccueilSombre.screenshot({ path: 'captures/accueil-sim-sombre-1440.png', fullPage: true });
console.log('capture accueil-sim-sombre-1440');
await pageAccueilSombre.close();

// Mobile 360, au pointeur : on glisse les recettes de 52,2 à 51,2 —
// l'étiquette reste visible au relâchement (la poignée garde le focus).
const pageAccueilMobile = await simPage(360, 780, false, '/');
const slidersAccueil = await pageAccueilMobile.$$('g[role="slider"]');
const svgAccueil = await pageAccueilMobile.$('svg[data-sim]');
await slidersAccueil[1].scrollIntoView();
const boiteSvgAccueil = await svgAccueil.boundingBox();
const boiteRecAccueil = await slidersAccueil[1].boundingBox();
const cxAccueil = boiteRecAccueil.x + boiteRecAccueil.width / 2;
const cyAccueil = boiteRecAccueil.y + boiteRecAccueil.height / 2;
const cibleAccueil = boiteSvgAccueil.y + (270.4 / 340) * boiteSvgAccueil.height;
await pageAccueilMobile.mouse.move(cxAccueil, cyAccueil);
await pageAccueilMobile.mouse.down();
await pageAccueilMobile.mouse.move(cxAccueil, cibleAccueil, { steps: 8 });
await pageAccueilMobile.mouse.up();
console.log('accueil pointeur :', JSON.stringify(await litResultats(pageAccueilMobile)));
const etiquetteMobile = await pageAccueilMobile.$$eval('.reperes-sim-etiquette', (texts) =>
  texts.map((t) => {
    const style = getComputedStyle(t);
    return { texte: t.textContent, visible: style.opacity === '1' };
  }),
);
console.log('étiquettes :', JSON.stringify(etiquetteMobile));
await svgAccueil.screenshot({ path: 'captures/accueil-sim-glisser-360-graphe.png' });
await pageAccueilMobile.screenshot({ path: 'captures/accueil-sim-glisser-360.png', fullPage: true });
console.log('capture accueil-sim-glisser-360');
await pageAccueilMobile.close();

// Le simulateur poste par poste (/budget) : sans JavaScript (le bouton
// « Recalculer » reste, le GET re-rend le calcul du serveur), puis avec —
// curseurs natifs déplacés, bande relue dans le DOM pour vérifier que le
// recalcul du navigateur coïncide avec l'arithmétique de budget.ts.
const litBudget = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      ['dep', 'rec', 'solde', 'ecart'].map((nom) => [
        nom,
        document.querySelector(`[data-bud-${nom}]`)?.textContent ?? 'absent',
      ]),
    ),
  );

for (const [largeur, hauteur] of [[1440, 900], [360, 780]]) {
  const pageSansJs = await navigateur.newPage();
  await pageSansJs.setJavaScriptEnabled(false);
  await pageSansJs.setViewport({ width: largeur, height: hauteur });
  await pageSansJs.goto(base + '/budget', { waitUntil: 'networkidle0' });
  await pageSansJs.screenshot({ path: `captures/budget-sans-js-${largeur}.png`, fullPage: true });
  console.log('capture', `budget-sans-js-${largeur}`);
  await pageSansJs.close();
}

// Sans JavaScript, curseurs soumis en GET : le serveur re-rend sa page —
// Défense −50 %, IR +10 % → écart attendu +43,2 Md€, solde −91,3 Md€
// (à l'arrondi des montants publiés près).
const pageGet = await navigateur.newPage();
await pageGet.setJavaScriptEnabled(false);
await pageGet.setViewport({ width: 1440, height: 900 });
await pageGet.goto(base + '/budget?etat-defense=-50&recette-ir=10', { waitUntil: 'networkidle0' });
console.log('sans JS, GET :', JSON.stringify(await litBudget(pageGet)));
await pageGet.screenshot({ path: 'captures/budget-sans-js-recalcule-1440.png', fullPage: true });
console.log('capture budget-sans-js-recalcule-1440');
await pageGet.close();

// Avec JavaScript : le bouton disparaît (bud-live), les curseurs natifs
// répondent au clavier — Défense −50 crans, IR +10 crans. Même bande
// attendue que le GET ci-dessus : les deux calculateurs coïncident.
const pageBud = await navigateur.newPage();
await pageBud.setViewport({ width: 1440, height: 900 });
await pageBud.goto(base + '/budget', { waitUntil: 'networkidle0' });
const boutonCache = await pageBud.$eval('.bud-recalculer', (b) => getComputedStyle(b).display === 'none');
if (!boutonCache) throw new Error('le bouton Recalculer doit disparaître une fois le JS posé');
const defense = await pageBud.$('#bud-etat-defense');
const ir = await pageBud.$('#bud-recette-ir');
await defense.evaluate((c) => c.focus());
for (let i = 0; i < 50; i++) await pageBud.keyboard.press('ArrowLeft');
await ir.evaluate((c) => c.focus());
for (let i = 0; i < 10; i++) await pageBud.keyboard.press('ArrowRight');
console.log('au clavier :', JSON.stringify(await litBudget(pageBud)));
await pageBud.screenshot({ path: 'captures/budget-clavier-1440.png', fullPage: true });
console.log('capture budget-clavier-1440');
await pageBud.close();

// Sombre, statu quo : la page doit rester lisible sans retouche.
const pageBudSombre = await navigateur.newPage();
await pageBudSombre.setViewport({ width: 1440, height: 900 });
await pageBudSombre.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await pageBudSombre.goto(base + '/budget', { waitUntil: 'networkidle0' });
await pageBudSombre.screenshot({ path: 'captures/budget-sombre-1440.png', fullPage: true });
console.log('capture budget-sombre-1440');
await pageBudSombre.close();

// Le tableau de bord budgétaire de l'accueil : camembert double anneau,
// sélection de curseurs, écart par habitant. On vérifie que le camembert
// se RECOMPOSE (le path du premier segment change) et que la bande suit —
// puis les mêmes vues sur /budget.
const litBandeAccueil = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      ['dep', 'rec', 'solde', 'ecart', 'hab'].map((nom) => [
        nom,
        document.querySelector(`form[data-budget] [data-bud-${nom}]`)?.textContent ?? 'absent',
      ]),
    ),
  );
const cheminSegment = (page) =>
  page.evaluate(() => document.querySelector('svg[data-donut] g[data-anneau="dep"] path')?.getAttribute('d') ?? 'absent');

for (const [largeur, hauteur] of [[1440, 900], [360, 780]]) {
  const pageDash = await navigateur.newPage();
  await pageDash.setViewport({ width: largeur, height: hauteur });
  await pageDash.goto(base + '/', { waitUntil: 'networkidle0' });
  const section = await pageDash.$('.accueil-budget');
  await section.screenshot({ path: `captures/accueil-budget-${largeur}.png` });
  console.log('capture', `accueil-budget-${largeur}`);
  await pageDash.close();
}

const pageBouge = await navigateur.newPage();
await pageBouge.setViewport({ width: 1440, height: 900 });
await pageBouge.goto(base + '/', { waitUntil: 'networkidle0' });
const avant = await cheminSegment(pageBouge);
const curseurAccueil = await pageBouge.$('form[data-budget] input[name="etat-enseignement-scolaire"]');
await curseurAccueil.evaluate((c) => c.focus());
for (let i = 0; i < 50; i++) await pageBouge.keyboard.press('ArrowLeft');
const apres = await cheminSegment(pageBouge);
if (avant === apres) throw new Error('le camembert ne s’est pas recomposé');
console.log('accueil bande :', JSON.stringify(await litBandeAccueil(pageBouge)));
const sectionBouge = await pageBouge.$('.accueil-budget');
await sectionBouge.screenshot({ path: 'captures/accueil-budget-bouge-1440.png' });
console.log('capture accueil-budget-bouge-1440');
await pageBouge.close();

const pageBudDonut = await navigateur.newPage();
await pageBudDonut.setViewport({ width: 1440, height: 900 });
await pageBudDonut.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await pageBudDonut.goto(base + '/budget', { waitUntil: 'networkidle0' });
const donutSeul = await pageBudDonut.$('svg[data-donut]');
await donutSeul.screenshot({ path: 'captures/budget-donut-sombre.png' });
console.log('capture budget-donut-sombre');
await pageBudDonut.close();

// Le traducteur de montants (/reperes) : sans JavaScript (GET ?montant=10,
// le serveur rend le calcul) puis avec — le champ tape « 25 », la bande
// doit suivre en direct, le bouton disparaît.
const pageGr = await navigateur.newPage();
await pageGr.setViewport({ width: 1440, height: 900 });
await pageGr.goto(base + '/reperes?montant=10', { waitUntil: 'networkidle0' });
const sectionGr = await pageGr.$('form[data-grandeur]');
await sectionGr.screenshot({ path: 'captures/reperes-grandeur-sans-js.png' });
console.log('capture reperes-grandeur-sans-js');
await pageGr.close();

const pageGrJs = await navigateur.newPage();
await pageGrJs.setViewport({ width: 1440, height: 900 });
await pageGrJs.goto(base + '/reperes', { waitUntil: 'networkidle0' });
const champ = await pageGrJs.$('input[name="montant"]');
// Le champ vient prérempli (1 Md€) : on vide par le DOM (les inputs
// number ignoring la sélection au triple-clic), puis on tape.
await champ.evaluate((c) => {
  c.value = '';
});
await champ.type('25');
const luGr = await pageGrJs.evaluate(() =>
  Object.fromEntries(
    ['montant', 'hab', 'dep', 'dette'].map((nom) => [
      nom,
      document.querySelector(`[data-gr-${nom}]`)?.textContent ?? 'absent',
    ]),
  ),
);
console.log('traducteur 25 Md€ :', JSON.stringify(luGr));
const boutonCacheGr = await pageGrJs.$eval('.grandeur-recalculer', (b) => getComputedStyle(b).display === 'none');
if (!boutonCacheGr) throw new Error('le bouton Traduire doit disparaître une fois le JS posé');
await (await pageGrJs.$('form[data-grandeur]')).screenshot({ path: 'captures/reperes-grandeur-live.png' });
console.log('capture reperes-grandeur-live');
await pageGrJs.close();

// Les trois nouveaux sujets de /reperes : la courbe de dette (série
// officielle, chaque point étiqueté), le camembert des recettes de toutes
// les administrations, et le simulateur d'impôt — sans JavaScript (GET)
// puis en direct.
const pageDette = await navigateur.newPage();
await pageDette.setViewport({ width: 1440, height: 900 });
await pageDette.goto(base + '/reperes', { waitUntil: 'networkidle0' });
const courbeDette = await pageDette.$('polyline.rcv-dt-trait');
const svgDette = await courbeDette.evaluateHandle((p) => p.closest('svg'));
await svgDette.asElement().screenshot({ path: 'captures/reperes-dette-1440.png' });
console.log('capture reperes-dette-1440');
await pageDette.close();

const pageArgent = await navigateur.newPage();
await pageArgent.setViewport({ width: 1440, height: 900 });
await pageArgent.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await pageArgent.goto(base + '/reperes?vue=camembert', { waitUntil: 'networkidle0' });
const cameArgent = await pageArgent.$('.rcc-came-a');
await cameArgent.screenshot({ path: 'captures/reperes-argent-public-sombre.png' });
console.log('capture reperes-argent-public-sombre');
await pageArgent.close();

const pageIr = await navigateur.newPage();
await pageIr.setJavaScriptEnabled(false);
await pageIr.setViewport({ width: 1440, height: 900 });
await pageIr.goto(base + '/reperes?revenu=54000&foyer=couple', { waitUntil: 'networkidle0' });
await (await pageIr.$('form[data-impot]')).screenshot({ path: 'captures/reperes-impot-sans-js.png' });
console.log('capture reperes-impot-sans-js');
await pageIr.close();

const pageIrJs = await navigateur.newPage();
await pageIrJs.setViewport({ width: 1440, height: 900 });
await pageIrJs.goto(base + '/reperes', { waitUntil: 'networkidle0' });
const champRevenu = await pageIrJs.$('form[data-impot] input[name="revenu"]');
await champRevenu.evaluate((c) => {
  c.value = '';
});
await champRevenu.type('20000');
const luIr = await pageIrJs.evaluate(() =>
  Object.fromEntries(
    ['brut', 'decote', 'payer', 'moyen', 'marginal'].map((nom) => [
      nom,
      document.querySelector(`[data-ir-${nom}]`)?.textContent ?? 'absent',
    ]),
  ),
);
console.log('impôt 20 000 € une part :', JSON.stringify(luIr));
const boutonCacheIr = await pageIrJs.$eval('.impot-recalculer', (b) => getComputedStyle(b).display === 'none');
if (!boutonCacheIr) throw new Error('le bouton Calculer doit disparaître une fois le JS posé');
await (await pageIrJs.$('form[data-impot]')).screenshot({ path: 'captures/reperes-impot-live.png' });
console.log('capture reperes-impot-live');
await pageIrJs.close();

await navigateur.close();
serveur.close();
process.exit(0);
