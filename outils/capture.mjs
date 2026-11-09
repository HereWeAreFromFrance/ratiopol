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
for (const [nom, url, pleine] of pages) {
  const page = await navigateur.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `captures/${nom}.png`, fullPage: pleine });
  console.log('capture', nom);
  await page.close();
}

await navigateur.close();
serveur.close();
process.exit(0);
