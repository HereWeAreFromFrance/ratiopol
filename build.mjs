// build.mjs — CONSTRUIRE RATIOPOL, EN DEUX PAS.
//
//  1. LE FRONT : esbuild bundle web/main.ts et web/page.css (qui @importe
//     jetons.css). Chaque fichier produit porte l'empreinte SHA-256 de son
//     contenu dans son nom (cache éternel, la page référente est en no-cache)
//     — la coutume Lumilap/MateMaterial, réécrite ici en petit.
//  2. LE SERVEUR : esbuild bundle serveur/serveur.ts en un seul
//     dist/serveur.mjs (platform node, format esm). `postgres` reste externe :
//     module natif-adjacent, résolu au démarrage depuis node_modules.
//
// Le manifeste dist/manifeste.json dit au serveur quels noms empreintés
// servir. Les tests importent dist/serveur.mjs : on teste le binaire réel,
// pas les sources.

import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const RACINE = process.cwd();
const DIST = join(RACINE, 'dist');
const STATIQUE = join(DIST, 'statique');

function empreinte(octets) {
  return createHash('sha256').update(octets).digest('hex').slice(0, 12);
}

async function buildFront() {
  await mkdir(STATIQUE, { recursive: true });

  // Le JavaScript du navigateur.
  await build({
    entryPoints: [join(RACINE, 'web', 'main.ts')],
    bundle: true,
    minify: true,
    format: 'esm',
    outfile: join(STATIQUE, '_main.js'),
    logLevel: 'info',
  });

  // La feuille de style (jetons.css entre par le @import de page.css).
  await build({
    entryPoints: [join(RACINE, 'web', 'page.css')],
    bundle: true,
    minify: true,
    outfile: join(STATIQUE, '_page.css'),
    logLevel: 'info',
  });

  // Chaque artefact prend le nom empreinté.
  const manifeste = {};
  for (const [provisoire, base] of [
    ['_main.js', 'main'],
    ['_page.css', 'page'],
  ]) {
    const octets = await readFile(join(STATIQUE, provisoire));
    const nom = `${base}-${empreinte(octets)}.${provisoire.endsWith('.js') ? 'js' : 'css'}`;
    await writeFile(join(STATIQUE, nom), octets);
    await rm(join(STATIQUE, provisoire));
    manifeste[provisoire.endsWith('.js') ? 'js' : 'css'] = `/statique/${nom}`;
  }

  // Le favicon (écrit ici : il n'a pas d'autre vie que statique).
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#1d3a6e"/><text x="16" y="22" font-family="Georgia, serif" font-size="16" font-weight="bold" fill="#faf7f1" text-anchor="middle">R</text></svg>`;
  await writeFile(join(STATIQUE, 'favicon.svg'), favicon, 'utf8');

  await writeFile(join(DIST, 'manifeste.json'), JSON.stringify(manifeste, null, 2), 'utf8');
  return manifeste;
}

async function buildServeur() {
  await build({
    entryPoints: [join(RACINE, 'serveur', 'serveur.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external', // postgres et node:* chargés au démarrage, pas inlinés
    outfile: join(DIST, 'serveur.mjs'),
    logLevel: 'info',
  });
}

await rm(DIST, { recursive: true, force: true });
const manifeste = await buildFront();
await buildServeur();

// Un mot sur ce qui vient d'être produit, pour l'œil humain.
const fichiers = await readdir(STATIQUE);
console.log('\nRatioPol construit :');
console.log(`  dist/serveur.mjs        (serveur, à lancer par node)`);
for (const f of fichiers.sort()) console.log(`  dist/statique/${f}`);
console.log(`  dist/manifeste.json     ${JSON.stringify(manifeste)}`);
