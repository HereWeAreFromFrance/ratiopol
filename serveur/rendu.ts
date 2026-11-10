// serveur/rendu.ts — LES PAGES, EN HTML SERVI TOUT CUIT.
//
// Le rendu vit côté serveur : chaque idée a une URL propre, indexable,
// partageable, lisible sans JavaScript (doc 04, décision « l'outil d'abord »).
// Les gabarits sont de simples fonctions qui retournent du HTML — pas de
// moteur, pas de dépendance. TOUT texte qui vient d'un visiteur passe par
// echappe() : c'est la seule porte anti-XSS, elle est toujours fermée.

import type { Idee, Signalement } from './depot';
import { MOTIFS_SIGNALEMENT } from './depot';
import type { Erreurs, ValeursBrutes } from './gabarit';
import { BORNES } from './gabarit';
import { NIVEAUX, THEMES, themeParId, niveauParId } from './themes';
import { BUDGET_ETAT, FINANCES_PUBLIQUES, SOURCES_REPERES, ÉVOLUTION, type Poste } from './reperes';
import { echappe } from './securite';

/** Les fichiers statiques construits par build.mjs (noms empreintés). */
export interface Assets {
  js: string;
  css: string;
}

const formatteurDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const formatteurMds = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatteurEntier = new Intl.NumberFormat('fr-FR');

function dateFr(d: Date): string {
  return formatteurDate.format(d);
}

function e(s: string): string {
  return echappe(s);
}

/* ------------------------------------------------------------------ */
/* Squelette                                                          */
/* ------------------------------------------------------------------ */

function squelette(opts: {
  titre: string;
  description: string;
  contenu: string;
  assets: Assets;
  corpsSup?: string;
  /** Feuille CSS supplémentaire, même origine (la CSP interdit le style
   *  inline, pas une feuille servie par le site lui-même). */
  cssSup?: string;
}): string {
  const { titre, description, contenu, assets, cssSup } = opts;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titre)}</title>
<meta name="description" content="${e(description)}">
<link rel="stylesheet" href="${e(assets.css)}">
${cssSup ? `<link rel="stylesheet" href="${e(cssSup)}">` : ''}
<link rel="icon" href="/statique/favicon.svg" type="image/svg+xml">
</head>
<body>
<header class="entete">
  <div class="conteneur entete-inner">
    <a class="marque" href="/">Ratio<em>Pol</em></a>
    <nav class="entete-nav" aria-label="Principale">
      <a href="/proposer">Proposer une idée</a>
      <a href="/themes">Thèmes</a>
      <a href="/reperes">Repères</a>
      <a href="/apropos">À propos</a>
    </nav>
  </div>
</header>
<main>
${contenu}
</main>
<footer class="pied">
  <div class="conteneur pied-inner">
    <span>RatioPol — des idées concrètes, pas des slogans.</span>
    <span><a href="/moderation">Modération</a> · <a href="/mentions">Mentions &amp; données</a> · <a href="mailto:contact@ratiopol.fr">contact@ratiopol.fr</a></span>
  </div>
</footer>
<script src="${e(assets.js)}" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Fragments                                                          */
/* ------------------------------------------------------------------ */

function carteIdee(idee: Idee): string {
  const theme = themeParId(idee.theme);
  return `<a class="carte-idee" href="/idee/${e(idee.slug)}">
  <span class="badge-theme">${e(theme ? theme.nom : idee.theme)}</span>
  <h3>${e(idee.titre)}</h3>
  <p>${e(idee.proposition)}</p>
  <span class="carte-idee-meta">
    <span>${e(idee.pseudo)}, ${e(dateFr(idee.creeeLe))}</span>
    <span>${idee.soutiens} soutien${idee.soutiens > 1 ? 's' : ''}</span>
  </span>
</a>`;
}

function grille(idees: Idee[]): string {
  if (idees.length === 0) {
    return `<p class="vide">Aucune idée ici pour l'instant.<br>La première est à vous&nbsp;: <a href="/proposer">proposez-la</a>.</p>`;
  }
  return `<div class="grille-idees">${idees.map(carteIdee).join('\n')}</div>`;
}

function sectionTitre(nom: string, lien?: { href: string; texte: string }): string {
  const droite = lien ? `<a href="${e(lien.href)}">${e(lien.texte)} →</a>` : '';
  return `<div class="section-titre"><h2>${e(nom)}</h2>${droite}</div>`;
}

/* ------------------------------------------------------------------ */
/* Accueil                                                            */
/* ------------------------------------------------------------------ */

export function pageAccueil(recentes: Idee[], soutenues: Idee[], assets: Assets): string {
  const contenu = `
<div class="conteneur">
  <section class="heros">
    <h1>Des idées concrètes, pas des slogans.</h1>
    <p>RatioPol recueille des propositions politiques argumentées — avec leur
    problème, leurs bénéficiaires et leur arbitrage. Gratuit, anonyme si vous
    voulez, ouvert à tous en France.</p>
    <div class="heros-actions">
      <a class="bouton bouton-primaire" href="/proposer">Proposer une idée</a>
      <a class="bouton bouton-secondaire" href="/themes">Parcourir par thème</a>
    </div>
  </section>
  <section class="section accueil-france">
    ${sectionTitre('La France en chiffres', { href: '/reperes', texte: 'Tous les repères' })}
    <div class="accueil-france-grille">
      <div class="accueil-france-courbe">
        <div class="reperes-courbe-legend">
          <span><span class="reperes-point rcc-d0"></span> Dépenses publiques</span>
          <span><span class="reperes-point rcc-r0"></span> Recettes publiques</span>
        </div>
        ${courbeÉvolution('bornes')}
      </div>
      <div class="accueil-france-cartes">
        ${statRepere('Dépenses publiques', `${formatteurMds.format(FINANCES_PUBLIQUES.dépensesPib)} % du PIB`, `${formatteurMds.format(FINANCES_PUBLIQUES.dépensesMds)} Md€ en ${FINANCES_PUBLIQUES.année}`, '/reperes')}
        ${statRepere('Déficit public', `${formatteurMds.format(FINANCES_PUBLIQUES.déficitPib)} % du PIB`, `${formatteurMds.format(FINANCES_PUBLIQUES.déficitMds)} Md€ en ${FINANCES_PUBLIQUES.année}`, '/reperes')}
        ${statRepere('Dette publique', `${formatteurMds.format(FINANCES_PUBLIQUES.dettePib)} % du PIB`, `${formatteurEntier.format(FINANCES_PUBLIQUES.detteMds)} Md€ au ${FINANCES_PUBLIQUES.detteDate}`, '/reperes')}
      </div>
    </div>
    <div class="accueil-france-appel">
      <p>Un chiffre vous intrigue&nbsp;? Chaque question peut devenir une proposition
      concrète — la vôtre.</p>
      <div class="heros-actions">
        <a class="bouton bouton-secondaire" href="/reperes">Voir tous les repères&nbsp;→</a>
        <a class="bouton bouton-primaire" href="/proposer">Proposer une idée&nbsp;→</a>
      </div>
      <p class="reperes-note">Sources&nbsp;: Insee (comptes nationaux) et loi de finances
      initiale ${BUDGET_ETAT.année} — le détail complet est sur la page
      <a href="/reperes">Repères</a>.</p>
    </div>
  </section>
  <section class="section">
    ${sectionTitre('Les plus soutenues', { href: '/themes', texte: 'Tous les thèmes' })}
    ${grille(soutenues)}
  </section>
  <section class="section">
    ${sectionTitre('Dernières idées')}
    ${grille(recentes)}
  </section>
</div>`;
  return squelette({
    titre: 'RatioPol — des idées concrètes, pas des slogans',
    description: 'Partagez et lisez des propositions politiques concrètes, anonymement ou non. Gratuit, ouvert à tous en France.',
    contenu,
    assets,
    cssSup: '/graphiques.css',
  });
}

/* ------------------------------------------------------------------ */
/* Thèmes                                                             */
/* ------------------------------------------------------------------ */

export function pageThemes(assets: Assets): string {
  const liens = THEMES.filter((t) => t.id !== 'autre')
    .map((t) => `<a class="bouton bouton-secondaire" href="/theme/${t.id}">${e(t.nom)}</a>`)
    .join('\n');
  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">Thèmes</h1>
    <p class="page-sous-titre">Toutes les idées, classées par sujet.</p>
    <div class="heros-actions">${liens}</div>
  </section>
</div>`;
  return squelette({ titre: 'Thèmes — RatioPol', description: 'Toutes les idées par thème.', contenu, assets });
}

export function pageTheme(idTheme: string, idees: Idee[], tri: 'recent' | 'soutenus', assets: Assets): string {
  const theme = themeParId(idTheme);
  const nom = theme ? theme.nom : idTheme;
  const lienTri = tri === 'recent' ? 'soutenus' : 'recent';
  const texteTri = tri === 'recent' ? 'Les plus soutenues' : 'Plus récentes';
  const contenu = `
<div class="conteneur">
  <section class="section">
    <div class="section-titre">
      <h2>${e(nom)}</h2>
      <a href="/theme/${e(idTheme)}?tri=${lienTri}">${texteTri} →</a>
    </div>
    ${idTheme === 'impots' ? '<p class="reperes-note">Les chiffres officiels du budget de l’État et des finances publiques sont sur la page <a href="/reperes">Repères</a>.</p>' : ''}
    ${grille(idees)}
  </section>
</div>`;
  return squelette({ titre: `${nom} — RatioPol`, description: `Idées citoyennes sur ${nom}.`, contenu, assets });
}

/* ------------------------------------------------------------------ */
/* Repères (les chiffres officiels des finances publiques)            */
/* ------------------------------------------------------------------ */

/** Une ligne poste + barre proportionnelle. La barre est relative au plus
 *  gros poste (lisibilité) ; sa largeur vient de la feuille générée
 *  (préfixe + index — la CSP interdit le style inline). La part affichée
 *  est relative à totalPourPart, ou absente quand un total n'a pas de sens
 *  (sous-secteurs qui se chevauchent). Un poste avec thème devient un lien
 *  vers les idées de ce thème — la donnée reste la première information. */
function lignesPostes(postes: Poste[], totalPourPart: number | null, préfixe: string): string {
  const plusGros = Math.max(...postes.map((p) => p.mds));
  return postes
    .map((p, i) => {
      const part = totalPourPart === null ? '' : ` · ${Math.round((p.mds / totalPourPart) * 100)}&nbsp;%`;
      const theme = p.theme ? themeParId(p.theme) : undefined;
      const corps = `
  <div class="reperes-ligne-tete"><span class="reperes-ligne-nom">${e(p.nom)}</span><span class="reperes-ligne-valeur">${formatteurMds.format(p.mds)}&nbsp;Md€${part}</span></div>
  <div class="reperes-piste"><div class="reperes-plein rcw-${préfixe}${i}"></div></div>
  ${theme ? `<span class="reperes-ligne-theme">${e(theme.nom)}&nbsp;→</span>` : ''}`;
      if (!theme) return `<div class="reperes-ligne">${corps}
</div>`;
      return `<a class="reperes-ligne" href="/theme/${e(p.theme!)}">${corps}
</a>`;
    })
    .join('\n');
}

function totalPoste(libelle: string, mds: number): string {
  return `<div class="reperes-total"><span>${e(libelle)}</span><span>${formatteurMds.format(mds)}&nbsp;Md€</span></div>`;
}

function ligneCalcul(libelle: string, mds: number, signe: '+' | '−' | ''): string {
  const montant = signe === '' ? formatteurMds.format(mds) : `${signe}${formatteurMds.format(mds)}`;
  return `<div class="reperes-calcul-ligne"><span>${e(libelle)}</span><span>${montant}&nbsp;Md€</span></div>`;
}

function statRepere(libelle: string, valeur: string, detail: string, href?: string): string {
  const contenu = `
  <span class="reperes-stat-libelle">${e(libelle)}</span>
  <span class="reperes-stat-valeur">${e(valeur)}</span>
  <span class="reperes-stat-detail">${e(detail)}</span>`;
  return href
    ? `<a class="reperes-stat reperes-stat-cliquable" href="${e(href)}">${contenu}
</a>`
    : `<div class="reperes-stat">${contenu}
</div>`;
}

/** La couleur de série d'un poste : les six premiers, dans l'ordre publié,
 *  prennent les slots de la palette (l'ordre des slots est le mécanisme
 *  anti-confusion daltonienne — il ne se recycle pas) ; les suivants
 *  partagent le neutre « reste ». Chaque part reste nommée et chiffrée en
 *  texte dans la légende : la couleur ne porte jamais l'information seule. */
function couleurSerie(index: number): string {
  return index < 6 ? `var(--r-serie-${index + 1})` : 'var(--r-serie-neutre)';
}

/** Le disque du camembert : conic-gradient calculé côté serveur. Chaque
 *  part est séparée de sa voisine par un filet papier — la règle des
 *  espaces entre pleins. La valeur atterrit dans la feuille générée, pas
 *  dans un style inline : la CSP du site les interdit. */
function cameCercle(postes: Poste[]): string {
  const somme = postes.reduce((s, p) => s + p.mds, 0);
  const stops: string[] = [];
  let cum = 0;
  postes.forEach((p, i) => {
    const part = (p.mds / somme) * 100;
    const fin = cum + part;
    const filet = Math.min(0.3, part / 4);
    stops.push(`${couleurSerie(i)} ${cum.toFixed(2)}% ${(fin - filet).toFixed(2)}%`);
    stops.push(`var(--r-papier) ${(fin - filet).toFixed(2)}% ${fin.toFixed(2)}%`);
    cum = fin;
  });
  return `conic-gradient(from -90deg, ${stops.join(', ')})`;
}

/** La feuille de données des graphiques (accueil et /reperes), servie par
 *  /graphiques.css : une classe
 *  par poste (couleur de série, largeur de barre) et une par camembert (le
 *  gradient). Ce sont des DONNÉES de graphique — elles vivent dans une
 *  feuille générée et pas dans page.css (qui ne contient que du design), ni
 *  en attribut style (bloqué par la CSP `default-src 'self'`). Calculée une
 *  fois : les données sont des constantes de module. */
let feuilleGraphiquesCache: string | null = null;

export function feuilleGraphiques(): string {
  if (feuilleGraphiquesCache) return feuilleGraphiquesCache;
  const règles: string[] = [];
  const liste = (préfixe: string, postes: Poste[]) => {
    const plusGros = Math.max(...postes.map((p) => p.mds));
    postes.forEach((p, i) => {
      const largeur = Math.max(1, (p.mds / plusGros) * 100).toFixed(1).replace(/\.0$/, '');
      règles.push(`.rcc-${préfixe}${i} { background: ${couleurSerie(i)}; }`);
      règles.push(`.rcw-${préfixe}${i} { width: ${largeur}%; }`);
    });
    règles.push(`.rcc-came-${préfixe} { background: ${cameCercle(postes)}; }`);
  };
  liste('d', [...BUDGET_ETAT.depenses, BUDGET_ETAT.autresDepenses]);
  liste('r', BUDGET_ETAT.recettesFiscales);
  liste('s', FINANCES_PUBLIQUES.sousSecteurs);
  // Les deux lignes de la courbe d'évolution : une classe pour le trait
  // (fill laissé à l'attribut fill="none" — le CSS des classes écraserait
  // sinon l'attribut et remplirait l'aire sous la courbe), une pour les
  // points.
  règles.push('.rcv-d-trait { stroke: var(--r-serie-1); }');
  règles.push('.rcv-r-trait { stroke: var(--r-serie-2); }');
  règles.push('.rcv-d { fill: var(--r-serie-1); }');
  règles.push('.rcv-r { fill: var(--r-serie-2); }');
  feuilleGraphiquesCache = règles.join('\n');
  return feuilleGraphiquesCache;
}

/** La vue camembert d'une liste de postes : le disque + la légende complète
 *  (tous les postes, montants et parts en texte, lignes cliquables vers le
 *  thème — comme les barres). */
function cameDe(postes: Poste[], totalPourPart: number | null, préfixe: string): string {
  const legende = postes
    .map((p, i) => {
      const theme = p.theme ? themeParId(p.theme) : undefined;
      // totalPourPart nul = sous-secteurs qui se chevauchent : la part n'a
      // pas de sens, elle n'est pas affichée — le montant Md€ reste.
      const part = totalPourPart === null ? '' : ` · ${Math.round((p.mds / totalPourPart) * 100)}&nbsp;%`;
      const contenu = `
      <span class="reperes-point rcc-${préfixe}${i}"></span>
      <span class="reperes-legend-nom">${e(p.nom)}</span>
      <span class="reperes-legend-valeur">${formatteurMds.format(p.mds)}&nbsp;Md€${part}</span>
      ${theme ? `<span class="reperes-ligne-theme">${e(theme.nom)}&nbsp;→</span>` : ''}`;
      return theme
        ? `<li><a class="reperes-legend-ligne" href="/theme/${e(p.theme!)}">${contenu}
      </a></li>`
        : `<li><div class="reperes-legend-ligne">${contenu}
      </div></li>`;
    })
    .join('\n');
  return `<div class="reperes-came">
  <div class="reperes-came-cercle rcc-came-${préfixe}" role="img"
       aria-label="Parts de chaque poste — la légende à côté les nomme et les chiffre toutes"></div>
  <ul class="reperes-legend">
${legende}
  </ul>
</div>`;
}

/** La courbe d'évolution : SVG inline généré côté serveur, lisible sans
 *  JavaScript, la valeur de chaque point est écrite (pas de survol). Une
 *  seule échelle — jamais de double axe. Version « bornes » (accueil) :
 *  seules 2021 et 2025 sont étiquetées, en corps plus grand — la série
 *  entière reste tracée, la version complète est sur /reperes. */
function courbeÉvolution(étiquettes: 'toutes' | 'bornes' = 'toutes'): string {
  const ev = ÉVOLUTION;
  const gauche = 56;
  const droite = 584;
  const haut = 24;
  const bas = 304;
  const yDe = (v: number) => bas - (v - 50) * ((bas - haut) / 10);
  const xDe = (i: number) => gauche + (i * (droite - gauche)) / (ev.années.length - 1);
  const ligne = (série: number[], classe: string) =>
    `<polyline class="${classe}" fill="none" stroke-width="2" points="${série
      .map((v, i) => `${xDe(i).toFixed(1)},${yDe(v).toFixed(1)}`)
      .join(' ')}"/>`;
  const points = (série: number[], classe: string, étiquetteAuDessus: boolean) =>
    série
      .map((v, i) => {
        const x = xDe(i);
        const y = yDe(v);
        const finale = étiquettes === 'bornes' && i !== 0 && i !== série.length - 1;
        // Le premier point est près de l'axe des ordonnées : son étiquette
        // part à droite pour ne pas chevaucher les textes de la grille.
        const ancre = i === 0 ? 'start' : 'middle';
        const étiquetteX = (i === 0 ? x + 9 : x).toFixed(1);
        const texte = (y + (étiquetteAuDessus ? -10 : 22)).toFixed(1);
        const classeTexte = finale ? '' : ` class="reperes-courbe-etiquette${étiquettes === 'bornes' ? ' reperes-courbe-etiquette-forte' : ''}"`;
        return `<circle class="${classe}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>${finale ? '' : `
    <text${classeTexte} x="${étiquetteX}" y="${texte}" text-anchor="${ancre}">${formatteurMds.format(v)}</text>`}`;
      })
      .join('\n');
  const grille = [50, 52, 54, 56, 58, 60]
    .map((v) => {
      const y = yDe(v);
      return `<line class="reperes-courbe-grille" x1="${gauche}" y1="${y.toFixed(1)}" x2="${droite}" y2="${y.toFixed(1)}"/>
    <text class="reperes-courbe-axe" x="${gauche - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${v}&nbsp;%</text>`;
    })
    .join('\n');
  const années = ev.années
    .map((a, i) => `<text class="reperes-courbe-axe" x="${xDe(i).toFixed(1)}" y="328" text-anchor="middle">${a}</text>`)
    .join('\n');
  return `<svg class="reperes-courbe" viewBox="0 0 640 340" role="img"
     aria-label="Dépenses et recettes publiques en % du PIB, de ${ev.années[0]} à ${ev.années[ev.années.length - 1]} : dépenses ${ev.dépensesPib
       .map((v) => formatteurMds.format(v))
       .join(', ')} ; recettes ${ev.recettesPib.map((v) => formatteurMds.format(v)).join(', ')}">
  ${grille}
  ${ligne(ev.dépensesPib, 'rcv-d-trait')}
  ${ligne(ev.recettesPib, 'rcv-r-trait')}
  ${points(ev.dépensesPib, 'rcv-d', true)}
  ${points(ev.recettesPib, 'rcv-r', false)}
  ${années}
</svg>`;
}

/** Le sélecteur de vue : deux liens sobres, l'état courant porté par
 *  aria-current (et stylé). Sans JavaScript : ce sont des liens. */
function ongletsVue(vue: 'barres' | 'camembert'): string {
  const onglet = (id: 'barres' | 'camembert', nom: string) =>
    `<a href="/reperes${id === 'barres' ? '' : `?vue=${id}`}"${vue === id ? ' aria-current="true"' : ''}>${nom}</a>`;
  return `<div class="reperes-onglets" role="navigation" aria-label="Type de graphique">
  ${onglet('barres', 'Barres')}
  ${onglet('camembert', 'Camembert')}
</div>`;
}

export function pageReperes(assets: Assets, vue: 'barres' | 'camembert' = 'barres'): string {
  const be = BUDGET_ETAT;
  const fp = FINANCES_PUBLIQUES;
  const ev = ÉVOLUTION;
  const depensesListe = [...be.depenses, be.autresDepenses];
  const contenu = `
<div class="conteneur">
  <section class="section">
    <h1 class="page-titre">Repères</h1>
    <p class="page-sous-titre">Les chiffres officiels des finances publiques françaises, avec leur
    source et leur date. Aucun commentaire&nbsp;: ce sont des repères partagés, pour poser un
    problème — et surtout son arbitrage — sur des bases solides. Chaque ligne mène vers les idées
    du thème qui lui correspond.</p>

    <div class="section-titre reperes-sur-titre"><h2>L’essentiel — toutes les administrations publiques (${fp.année})</h2></div>
    <div class="reperes-stats">
      ${statRepere('Dépenses publiques', `${formatteurMds.format(fp.dépensesMds)} Md€`, `${formatteurMds.format(fp.dépensesPib)} % du PIB`)}
      ${statRepere('Recettes publiques', `${formatteurMds.format(fp.recettesMds)} Md€`, `${formatteurMds.format(fp.recettesPib)} % du PIB`)}
      ${statRepere('Déficit public', `${formatteurMds.format(fp.déficitMds)} Md€`, `${formatteurMds.format(fp.déficitPib)} % du PIB`)}
      ${statRepere('Dette publique', `${formatteurEntier.format(fp.detteMds)} Md€`, `${formatteurMds.format(fp.dettePib)} % du PIB au ${fp.detteDate}`)}
    </div>
    <p class="reperes-note">Le budget de l’État, détaillé plus bas, n’est qu’une partie de cet
    ensemble&nbsp;: la Sécurité sociale et les collectivités dépensent davantage que lui.</p>
    ${ongletsVue(vue)}
  </section>

  <section class="section">
    <div class="section-titre"><h2>Budget de l’État — dépenses (${be.année})</h2></div>
    <p class="reperes-note">Crédits de paiement du budget général — ${be.millésime}. Les missions
    principales sont listées&nbsp;; les autres sont regroupées — rien n’est omis, le total est
    celui de la loi.</p>
    ${vue === 'camembert' ? cameDe(depensesListe, be.totalDepensesMds, 'd') : `<div class="reperes-colonnes">
      ${lignesPostes(depensesListe, be.totalDepensesMds, 'd')}
    </div>`}
    ${totalPoste('Total du budget général', be.totalDepensesMds)}
    <p class="reperes-note">Emplois de l’État autorisés&nbsp;:
    ${formatteurEntier.format(be.emploisAutorises)} (équivalents temps plein travaillés).</p>
  </section>

  <section class="section">
    <div class="section-titre"><h2>Budget de l’État — recettes (${be.année})</h2></div>
    <p class="reperes-note">Recettes fiscales «&nbsp;nettes&nbsp;»&nbsp;: comptées après
    remboursements et dégrèvements d’impôts (${formatteurMds.format(be.depenses[0].mds)}&nbsp;Md€,
    inscrits en dépenses ci-dessus).</p>
    <div class="reperes-recettes">
      <div>
        ${vue === 'camembert' ? cameDe(be.recettesFiscales, be.totalFiscalesMds, 'r') : lignesPostes(be.recettesFiscales, be.totalFiscalesMds, 'r')}
        ${totalPoste('Total des recettes fiscales nettes', be.totalFiscalesMds)}
      </div>
      <div>
        <h3 class="reperes-sous-titre">Des recettes brutes aux recettes nettes</h3>
        <div class="reperes-calcul">
          ${ligneCalcul('Recettes non fiscales', be.recettesNonFiscalesMds, '')}
          ${ligneCalcul('Recettes avant prélèvements', be.recettesAvantPrélèvementsMds, '')}
          ${be.prélèvements.map((p) => ligneCalcul(`Moins&nbsp;: ${p.nom}`, p.mds, '−')).join('\n')}
          ${ligneCalcul('Plus&nbsp;: fonds de concours', be.fondsDeConcoursMds, '+')}
          ${totalPoste('Recettes nettes du budget général', be.recettesNettesMds)}
        </div>
        <div class="reperes-stats">
          ${statRepere('Charges nettes du budget général', `${formatteurMds.format(be.chargesNettesMds)} Md€`, `loi de finances initiale ${be.année}`)}
          ${statRepere('Solde de l’État', `${formatteurMds.format(be.soldeMds)} Md€`, 'budget général, budgets annexes et comptes spéciaux')}
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="section-titre"><h2>Qui dépense — sous-secteurs (${fp.année})</h2></div>
    <p class="reperes-note">${e(fp.noteSousSecteurs)}</p>
    ${vue === 'camembert' ? cameDe(fp.sousSecteurs, null, 's') : `<div class="reperes-colonnes">
      ${lignesPostes(fp.sousSecteurs, null, 's')}
    </div>`}
  </section>

  <section class="section">
    <div class="section-titre"><h2>Évolution — dépenses et recettes publiques (${ev.années[0]}-${ev.années[ev.années.length - 1]})</h2></div>
    <p class="reperes-note">En % du PIB, comptes nationaux (source plus bas). La série ne se
    limite pas à la courbe&nbsp;: chaque valeur est écrite sur le tracé et la table repliable
    donne les montants.</p>
    <div class="reperes-courbe-legend">
      <span><span class="reperes-point rcc-d0"></span> Dépenses publiques</span>
      <span><span class="reperes-point rcc-r0"></span> Recettes publiques</span>
    </div>
    ${courbeÉvolution()}
    <details class="reperes-table-details">
      <summary>La série complète en table</summary>
      <div class="reperes-table-scroll">
        <table class="reperes-table">
          <thead><tr><th>Année</th><th>Dépenses (% du PIB)</th><th>Recettes (% du PIB)</th><th>Dépenses (Md€)</th><th>Recettes (Md€)</th></tr></thead>
          <tbody>
            ${ev.années
              .map(
                (a, i) => `<tr><th>${a}</th><td>${formatteurMds.format(ev.dépensesPib[i])}</td><td>${formatteurMds.format(ev.recettesPib[i])}</td><td>${formatteurMds.format(ev.dépensesMds[i])}</td><td>${formatteurMds.format(ev.recettesMds[i])}</td></tr>`
              )
              .join('\n')}
          </tbody>
        </table>
      </div>
    </details>
  </section>

  <section class="section">
    <div class="section-titre"><h2>Sources</h2></div>
    <ul class="liste-simple">
      ${SOURCES_REPERES.map((s) => `<li><a href="${e(s.url)}">${e(s.nom)}</a></li>`).join('\n')}
    </ul>
    <p class="reperes-note">Les totaux affichés sont ceux publiés par les sources&nbsp;; la somme
    des montants arrondis peut s’en écarter de 0,1&nbsp;Md€ et celle des parts arrondies
    de 100&nbsp;%. Cette page est mise à jour à la main à chaque nouvelle loi de finances.</p>
  </section>

  <section class="section">
    <p class="reperes-appel">Une idée à partir de ces chiffres&nbsp;?
    <a href="/proposer">Proposez-la</a> — l’arbitrage est déjà à moitié écrit.</p>
  </section>
</div>`;
  return squelette({
    titre: 'Repères — les chiffres officiels des finances publiques — RatioPol',
    description:
      'Budget de l’État et finances publiques de la France : dépenses, recettes, déficit, dette, évolution. Chiffres officiels, sourcés et datés, sans commentaire.',
    contenu,
    assets,
    cssSup: '/graphiques.css',
  });
}

/* ------------------------------------------------------------------ */
/* Page idée                                                          */
/* ------------------------------------------------------------------ */

function bloc(titre: string, texte: string): string {
  return `<section class="idee-bloc"><h2>${e(titre)}</h2><p>${e(texte)}</p></section>`;
}

export function pageIdee(idee: Idee, merci: boolean, assets: Assets): string {
  const theme = themeParId(idee.theme);
  const niveau = niveauParId(idee.niveau);
  const motifs = MOTIFS_SIGNALEMENT.map((m) => `<option value="${e(m)}">${e(m)}</option>`).join('');
  const contenu = `
<article class="conteneur lecture">
  <div class="idee-tete">
    <span class="badge-theme">${e(theme ? theme.nom : idee.theme)}</span>
    <span class="carte-idee-meta"><span>${e(niveau ? niveau.nom : idee.niveau)} · ${e(idee.pseudo)} · ${e(dateFr(idee.creeeLe))}</span></span>
  </div>
  <h1 class="page-titre" style="margin-top:var(--r-esp-4)">${e(idee.titre)}</h1>
  <div class="idee-corps">
    ${bloc('Le problème constaté', idee.probleme)}
    ${bloc('La proposition', idee.proposition)}
    ${bloc('Les bénéficiaires', idee.beneficiaires)}
    ${bloc("L'arbitrage — qui paie, qui perd quoi", idee.arbitrage)}
    ${bloc('Comment saura-t-on que ça marche', idee.indicateur)}
  </div>
  <div class="idee-pied">
    <form method="post" action="/idee/${e(idee.slug)}/soutien" class="js-soutien">
      <button class="bouton bouton-primaire" type="submit">Je soutiens cette idée</button>
    </form>
    <span><span class="compteur-soutiens js-total">${idee.soutiens}</span> soutien${idee.soutiens > 1 ? 's' : ''} <span aria-hidden="true">·</span> indicatif</span>
  </div>
  ${merci ? '<p class="champ-erreur" role="status">Signalement enregistré — merci. La modération le lira.</p>' : ''}
  <details style="margin-top:var(--r-esp-6)">
    <summary style="cursor:pointer;color:var(--r-encre-douce)">Signaler cette idée</summary>
    <form class="formulaire" method="post" action="/idee/${e(idee.slug)}/signalement">
      <div class="champ">
        <label for="motif">Motif</label>
        <select id="motif" name="motif" required>${motifs}</select>
      </div>
      <div class="champ">
        <label for="message-signalement">Détail (optionnel)</label>
        <textarea id="message-signalement" name="message" maxlength="1000"></textarea>
      </div>
      <button class="bouton bouton-secondaire" type="submit">Envoyer le signalement</button>
    </form>
  </details>
</article>`;
  return squelette({
    titre: `${idee.titre} — RatioPol`,
    description: idee.proposition.slice(0, 200),
    contenu,
    assets,
  });
}

/* ------------------------------------------------------------------ */
/* Proposer (le formulaire guidé)                                     */
/* ------------------------------------------------------------------ */

function valeur(brutes: ValeursBrutes | undefined, champ: keyof ValeursBrutes): string {
  const v = brutes?.[champ];
  return typeof v === 'string' ? e(v) : '';
}

function champTexte(opts: {
  nom: string;
  libelle: string;
  aide: string;
  erreur?: string;
  valeur: string;
  type?: 'text' | 'email';
  tailleMax: number;
}): string {
  const type = opts.type ?? 'text';
  return `<div class="champ">
  <label for="${opts.nom}">${e(opts.libelle)}</label>
  <span class="aide">${e(opts.aide)}</span>
  ${opts.erreur ? `<p class="champ-erreur" role="alert">${e(opts.erreur)}</p>` : ''}
  <input id="${opts.nom}" name="${opts.nom}" type="${type}" value="${opts.valeur}" maxlength="${opts.tailleMax}"
         ${opts.nom === 'titre' ? 'required' : ''} data-compteur>
  <span class="compteur-caracteres"></span>
</div>`;
}

function champZone(opts: { nom: string; libelle: string; aide: string; erreur?: string; valeur: string; tailleMax: number }): string {
  return `<div class="champ">
  <label for="${opts.nom}">${e(opts.libelle)}</label>
  <span class="aide">${e(opts.aide)}</span>
  ${opts.erreur ? `<p class="champ-erreur" role="alert">${e(opts.erreur)}</p>` : ''}
  <textarea id="${opts.nom}" name="${opts.nom}" maxlength="${opts.tailleMax}" data-compteur>${opts.valeur}</textarea>
  <span class="compteur-caracteres"></span>
</div>`;
}

export function pageProposer(assets: Assets, valeurs?: ValeursBrutes, erreurs?: Erreurs): string {
  const themesOptions = THEMES.map((t) => {
    const sel = typeof valeurs?.theme === 'string' && valeurs.theme === t.id ? ' selected' : '';
    return `<option value="${t.id}"${sel}>${e(t.nom)}</option>`;
  }).join('');
  const niveauxOptions = NIVEAUX.map((n) => {
    const sel = typeof valeurs?.niveau === 'string' && valeurs.niveau === n.id ? ' selected' : '';
    return `<option value="${n.id}"${sel}>${e(n.nom)}</option>`;
  }).join('');

  const recap = erreurs && Object.keys(erreurs).length > 0
    ? `<div class="recap-erreurs" role="alert"><strong>L'idée n'est pas publiée — quelques points à revoir&nbsp;:</strong><ul>${Object.values(erreurs).map((m) => `<li>${e(m)}</li>`).join('')}</ul></div>`
    : '';

  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">Proposer une idée</h1>
    <p class="page-sous-titre">Une idée RatioPol est CONCRÈTE : elle nomme un problème, propose un
    changement identifiable, dit qui en profite et ce que ça coûte. Ce n'est pas une pétition ni
    un commentaire — c'est ce qu'un élu ou un citoyen pourrait reprendre tel quel. Chaque champ
    est guidé, la longueur est bornée pour vous y aider.</p>
    <p class="reperes-note">Pour vous appuyer sur des faits&nbsp;: les <a href="/reperes">chiffres
    officiels du budget</a> (dépenses, recettes, déficit, dette) sont sur la page Repères.</p>
    ${recap}
    <form class="formulaire" method="post" action="/proposer">
      ${champTexte({ nom: 'titre', libelle: 'Titre', aide: 'En une phrase : quoi, pour qui, où. Ex. : « Encadrer les loyers des résidences étudiantes à Paris ».', erreur: erreurs?.titre, valeur: valeur(valeurs, 'titre'), tailleMax: BORNES.titre[1] })}
      ${champZone({ nom: 'probleme', libelle: '1 · Le problème constaté', aide: 'La situation actuelle, en vous appuyant sur des faits si vous en avez (chiffres, exemples vécus).', erreur: erreurs?.probleme, valeur: valeur(valeurs, 'probleme'), tailleMax: BORNES.probleme[1] })}
      ${champZone({ nom: 'proposition', libelle: '2 · La proposition', aide: 'Ce que vous changeriez précisément : une règle, une loi, une pratique administrative.', erreur: erreurs?.proposition, valeur: valeur(valeurs, 'proposition'), tailleMax: BORNES.proposition[1] })}
      ${champZone({ nom: 'beneficiaires', libelle: '3 · Les bénéficiaires', aide: 'Qui gagnerait quoi, concrètement.', erreur: erreurs?.beneficiaires, valeur: valeur(valeurs, 'beneficiaires'), tailleMax: BORNES.beneficiaires[1] })}
      ${champZone({ nom: 'arbitrage', libelle: "4 · L'arbitrage", aide: 'Qui paie, qui perd quoi, quel ordre de grandeur. Une idée sans arbitrage n’est pas une décision.', erreur: erreurs?.arbitrage, valeur: valeur(valeurs, 'arbitrage'), tailleMax: BORNES.arbitrage[1] })}
      ${champZone({ nom: 'indicateur', libelle: '5 · Comment saura-t-on que ça marche', aide: 'Un indicateur observable : un chiffre qui bougerait si votre idée était appliquée.', erreur: erreurs?.indicateur, valeur: valeur(valeurs, 'indicateur'), tailleMax: BORNES.indicateur[1] })}
      <div class="champ">
        <label for="theme">Thème</label>
        ${erreurs?.theme ? `<p class="champ-erreur" role="alert">${e(erreurs.theme)}</p>` : ''}
        <select id="theme" name="theme" required>${themesOptions}</select>
      </div>
      <div class="champ">
        <label for="niveau">Niveau territorial concerné</label>
        ${erreurs?.niveau ? `<p class="champ-erreur" role="alert">${e(erreurs.niveau)}</p>` : ''}
        <select id="niveau" name="niveau" required>${niveauxOptions}</select>
      </div>
      ${champTexte({ nom: 'pseudo', libelle: 'Pseudonyme', aide: 'Le nom qui sera affiché. Il ne dit pas qui vous êtes — c’est le principe.', erreur: erreurs?.pseudo, valeur: valeur(valeurs, 'pseudo'), tailleMax: BORNES.pseudo[1] })}
      ${champTexte({ nom: 'email', libelle: 'E-mail (optionnel)', aide: 'Seulement si vous acceptez d’être contacté au sujet de votre idée. Jamais affiché.', erreur: erreurs?.email, valeur: valeur(valeurs, 'email'), type: 'email', tailleMax: 254 })}
      <div class="champ-piege" aria-hidden="true">
        <label for="site-web">Ne pas remplir</label>
        <input id="site-web" name="site-web" type="text" tabindex="-1" autocomplete="off">
      </div>
      <div class="champ">
        <label class="case-cocher">
          <input type="checkbox" name="consentement" ${valeurs?.consentement === 'on' ? 'checked' : ''} required>
          <span>Je consens à la publication de ma contribution. Elle révèle une opinion politique
          (donnée sensible, RGPD art. 9) et sera publiée sous licence libre <a href="/mentions#licence">CC&nbsp;BY&nbsp;4.0</a> —
          réutilisable par quiconque, y compris des élus. Consultez <a href="/mentions">Mentions &amp; données</a>.</span>
        </label>
        ${erreurs?.consentement ? `<p class="champ-erreur" role="alert">${e(erreurs.consentement)}</p>` : ''}
      </div>
      <button class="bouton bouton-primaire" type="submit">Publier mon idée</button>
    </form>
  </section>
</div>`;
  return squelette({
    titre: 'Proposer une idée — RatioPol',
    description: 'Publiez une proposition politique concrète : problème, proposition, bénéficiaires, arbitrage.',
    contenu,
    assets,
  });
}

/* ------------------------------------------------------------------ */
/* Recherche                                                          */
/* ------------------------------------------------------------------ */

export function pageRecherche(q: string, idees: Idee[], assets: Assets): string {
  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">Recherche</h1>
    <form class="recherche-barre" method="get" action="/recherche" role="search">
      <input type="search" name="q" value="${e(q)}" placeholder="Chercher une idée, un mot…" aria-label="Chercher">
      <button class="bouton bouton-primaire" type="submit">Chercher</button>
    </form>
    ${q === '' ? '' : grille(idees)}
  </section>
</div>`;
  return squelette({ titre: 'Recherche — RatioPol', description: 'Chercher parmi les idées.', contenu, assets });
}

/* ------------------------------------------------------------------ */
/* Pages statiques                                                    */
/* ------------------------------------------------------------------ */

export function pageAPropos(assets: Assets): string {
  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">À propos</h1>
    <div class="prose">
      <p><strong>RatioPol</strong> est un lieu gratuit où déposer et lire des idées politiques
      <em>concrètes</em>. Pas de pétition, pas de compteur de colère : chaque idée dit son
      problème, sa proposition, ses bénéficiaires, son arbitrage et son indicateur de réussite.</p>
      <p>Le site est indépendant, sans publicité, sans tracker, sans revente de données. Il
      n'appartient à aucun parti, aucun syndicat, aucune entreprise. Les idées publiées le sont
      sous licence libre CC&nbsp;BY&nbsp;4.0 : n'importe qui — citoyen, association, élu, cabinet
      ministériel — peut les reprendre, les citer, s'en servir.</p>
      <p>Pourquoi ce format à cinq champs&nbsp;? Parce qu'une idée qui ne dit pas qui paie et qui
      perd quoi n'est pas une décision, c'est un souhait. En forçant l'arbitrage, RatioPol rend
      chaque proposition réutilisable dans un vrai débat — et honnête sur son coût.</p>
      <p>Le site ne poursuit aucun objectif commercial. Il existera tant que quelqu'un le fera
      vivre, et son code est pensé pour tourner léger.</p>
    </div>
  </section>
</div>`;
  return squelette({
    titre: 'À propos — RatioPol',
    description: 'RatioPol : un lieu gratuit, indépendant et sans publicité pour les idées politiques concrètes.',
    contenu,
    assets,
  });
}

export function pageModeration(assets: Assets): string {
  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">Modération</h1>
    <div class="prose">
      <p>La règle centrale tient en une phrase&nbsp;: <strong>on critique des actes et des idées,
      jamais des personnes.</strong> Nommer un élu pour analyser son vote est légitime&nbsp;;
      l'insulter, l'accuser sans faits précis et vérifiables, ou le viser dans sa vie privée ne
      l'est pas.</p>
      <p>Les idées sont publiées immédiatement, puis modérées a posteriori. Chaque page d'idée
      porte un lien « Signaler »&nbsp;; tout signalement est lu par un humain. Un contenu
      manifestement illicite (injure, diffamation, incitation à la haine) est retiré promptement
      après signalement — c'est l'obligation de la LCEN et du DSA, et c'est notre règle propre.</p>
      <p>Les contributeurs restent pseudonymes au public, mais la plateforme connaît les éléments
      d'identification techniques prévus par la loi (LCEN art. 6-II) et les communique à la
      justice sur réquisition. Le pseudonymat protège des regards, pas de la loi.</p>
      <p>Ce qui n'est PAS de la modération&nbsp;: supprimer une idée parce qu'elle dérange,
      parce qu'elle est minoritaire, ou parce qu'elle vise un projet soutenu par l'équipe. La
      ligne éditoriale de RatioPol n'existe pas — seul le gabarit (concret, argumenté) filtre à
      l'entrée.</p>
    </div>
  </section>
</div>`;
  return squelette({
    titre: 'Modération — RatioPol',
    description: 'Règles de modération de RatioPol : on critique des actes et des idées, jamais des personnes.',
    contenu,
    assets,
  });
}

export function pageMentions(assets: Assets): string {
  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">Mentions &amp; données</h1>
    <div class="prose">
      <p><strong>Éditeur&nbsp;:</strong> le site est édité à titre personnel et non professionnel.
      Contact&nbsp;: <a href="mailto:contact@ratiopol.fr">contact@ratiopol.fr</a>.
      Hébergement&nbsp;: serveur dédié dans l'Union européenne.</p>

      <h2 id="donnees">Vos données</h2>
      <p>Vos contributions révèlent des opinions politiques, qui sont des données sensibles
      (RGPD art. 9). Elles ne sont publiées qu'avec votre consentement explicite, recueilli au
      moment du dépôt — la case à cocher du formulaire.</p>
      <ul class="liste-simple">
        <li><strong>Ce qu'on garde&nbsp;:</strong> le contenu de votre idée, le pseudonyme choisi,
        le thème, la date. L'e-mail uniquement si vous le donnez (pour être contacté), jamais
        affiché.</li>
        <li><strong>Ce qu'on ne garde pas&nbsp;:</strong> pas de compte, pas de trace de navigation
        profilée, pas de cookie publicitaire, pas d'adresse IP en clair. Pour dédupliquer les
        soutiens, seule une empreinte illisible (hachage du jour) est conservée.</li>
        <li><strong>Vos droits&nbsp;:</strong> retirer votre consentement, faire supprimer ou
        rectifier une idée, récupérer son contenu — écrivez à
        <a href="mailto:contact@ratiopol.fr">contact@ratiopol.fr</a>, réponse sous
        30 jours. La suppression retire l'idée et ses soutiens.</li>
      </ul>

      <h2 id="licence">Licence des idées</h2>
      <p>Chaque idée publiée l'est sous licence <strong>Creative Commons BY 4.0</strong>&nbsp;:
      n'importe qui peut la copier, la citer, l'adapter et la réutiliser — y compris à des fins
      commerciales ou politiques — à condition d'en citer le pseudonyme et RatioPol. C'est le
      cœur du projet&nbsp;: une idée publique doit circuler librement, jusqu'aux bancs de
      l'Assemblée.</p>
    </div>
  </section>
</div>`;
  return squelette({
    titre: 'Mentions & données — RatioPol',
    description: 'Mentions légales, données personnelles (RGPD art. 9) et licence CC BY 4.0 des idées publiées.',
    contenu,
    assets,
  });
}

export function page404(assets: Assets): string {
  const contenu = `
<div class="conteneur">
  <p class="vide">Cette page n'existe pas (ou plus).<br><a href="/">Revenir aux idées</a>.</p>
</div>`;
  return squelette({ titre: 'Introuvable — RatioPol', description: 'Page introuvable.', contenu, assets });
}

/* ------------------------------------------------------------------ */
/* Admin                                                              */
/* ------------------------------------------------------------------ */

export function pageAdminConnexion(assets: Assets, erreur = false): string {
  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">Modération — accès</h1>
    ${erreur ? '<p class="champ-erreur" role="alert">Mot de passe incorrect.</p>' : ''}
    <form class="formulaire" method="post" action="/admin/connexion">
      <div class="champ">
        <label for="mdp">Mot de passe</label>
        <input id="mdp" name="mdp" type="password" autocomplete="current-password" required>
      </div>
      <button class="bouton bouton-primaire" type="submit">Entrer</button>
    </form>
  </section>
</div>`;
  return squelette({ titre: 'Modération — RatioPol', description: 'Accès modération.', contenu, assets });
}

export function pageAdmin(vue: { idees: Idee[]; signalements: Signalement[] }, assets: Assets): string {
  const lignes = vue.idees
    .map((i) => {
      const action = i.statut === 'publiee'
        ? `<form method="post" action="/admin/idee/${i.id}/masquer"><button class="bouton bouton-secondaire">Masquer</button></form>`
        : `<form method="post" action="/admin/idee/${i.id}/publier"><button class="bouton bouton-secondaire">Republier</button></form>`;
      return `<tr>
  <td><a href="/idee/${e(i.slug)}">${e(i.titre.slice(0, 60))}</a>${i.statut === 'masquee' ? ' <em>(masquée)</em>' : ''}</td>
  <td>${e(i.pseudo)}</td>
  <td>${e(themeParId(i.theme)?.nom ?? i.theme)}</td>
  <td>${i.soutiens}</td>
  <td style="display:flex;gap:var(--r-esp-2);flex-wrap:wrap">
    ${action}
    <form method="post" action="/admin/idee/${i.id}/supprimer"><button class="bouton bouton-secondaire">Supprimer</button></form>
  </td>
</tr>`;
    })
    .join('\n');

  const signalements = vue.signalements
    .map((s) => `<li><a href="/idee/${e(s.slug)}">${e(s.slug)}</a> — ${e(s.motif)}${s.message ? ` — «&nbsp;${e(s.message.slice(0, 200))}&nbsp;»` : ''} (${e(dateFr(s.le))})</li>`)
    .join('\n');

  const contenu = `
<div class="conteneur" style="overflow-x:auto">
  <section class="section">
    <h1 class="page-titre">Modération</h1>
    <h2 style="margin-top:var(--r-esp-6)">Signalements à lire</h2>
    ${signalements === '' ? '<p class="page-sous-titre">Aucun signalement.</p>' : `<ul class="liste-simple">${signalements}</ul>`}
    <h2 style="margin-top:var(--r-esp-8)">Idées (${vue.idees.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:var(--r-txt-sm);margin-top:var(--r-esp-4)">
      <thead><tr style="text-align:left;color:var(--r-encre-douce)">
        <th>Idée</th><th>Pseudo</th><th>Thème</th><th>Soutiens</th><th>Actions</th>
      </tr></thead>
      <tbody>${lignes}</tbody>
    </table>
  </section>
</div>`;
  return squelette({ titre: 'Modération — RatioPol', description: 'Tableau de modération.', contenu, assets });
}
