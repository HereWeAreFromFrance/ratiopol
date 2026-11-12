// serveur/rendu.ts — LES PAGES, EN HTML SERVI TOUT CUIT.
//
// Le rendu vit côté serveur : chaque idée a une URL propre, indexable,
// partageable, lisible sans JavaScript (doc 04, décision « l'outil d'abord »).
// Les gabarits sont de simples fonctions qui retournent du HTML — pas de
// moteur, pas de dépendance. TOUT texte qui vient d'un visiteur passe par
// echappe() : c'est la seule porte anti-XSS, elle est toujours fermée.

import type { Avis, Decompte, Idee, Signalement } from './depot';
import { MOTIFS_SIGNALEMENT } from './depot';
import type { Erreurs, ValeursBrutes } from './gabarit';
import { BORNES, EFFETS, UNITES, slugDepuisTitre } from './gabarit';
import { COMMENT_AGIR, ficheDe, type Competence, type Fiche } from './fiches';
import { FAMILLES, NIVEAUX, THEMES, themeParId, themesDe, niveauParId } from './themes';
import { BUDGET_ETAT, FINANCES_PUBLIQUES, POPULATION, POSTES_CIBLES, SOURCES_REPERES, ÉVOLUTION, posteCibleParId, posteThemeParId, type Poste } from './reperes';
import { ANNEAU, CURSEURS, calculeBudget, cheminsAnneau, deltaTexte, eurosDeltaTexte, eurosTexte, mdsTexte, parHabitant, variationPoste, VARIATION_MAX, VARIATION_MIN, type Curseur, type Variations } from './budget';
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

const formatteurMontant = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Un montant en euros, dans l'unité la plus lisible (k€, M€, Md€). */
export function montantTexte(euros: number): string {
  if (euros >= 1e9) return `${formatteurMontant.format(euros / 1e9)}\u00a0Md€`;
  if (euros >= 1e6) return `${formatteurMontant.format(euros / 1e6)}\u00a0M€`;
  return `${formatteurMontant.format(euros / 1e3)}\u00a0k€`;
}

/** La part d'un montant dans un poste officiel : une division, affichée
 *  au dixième — sous le dixième, on le dit plutôt que d'écrire « 0,0 % ». */
export function partTexte(euros: number, posteMds: number): string {
  const pct = (euros / (posteMds * 1e9)) * 100;
  return pct < 0.1 ? 'moins de 0,1\u00a0%' : `${formatteurMds.format(pct)}\u00a0%`;
}

/** L'effet chiffré en quelques mots, pour les cartes. */
function impactCourt(idee: Idee): string {
  if (idee.effet === 'neutre') return 'neutre pour les finances publiques';
  if (idee.effet !== 'cout' && idee.effet !== 'gain') return '';
  const verbe = idee.effet === 'cout' ? 'coûte' : 'rapporte';
  return idee.montantEuros === null ? verbe : `${verbe} ≈\u00a0${montantTexte(idee.montantEuros)}/an`;
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
      <a href="/budget">Budget</a>
      <a href="/agir">Agir</a>
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
    <span>${idee.avis.pour} d’accord · ${idee.avis.contre} pas d’accord${impactCourt(idee) ? ` · ${e(impactCourt(idee))}` : ''}</span>
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
    problème, leurs bénéficiaires et leur arbitrage. Anonyme si vous voulez,
    ouvert à tous en France.</p>
    <div class="heros-actions">
      <a class="bouton bouton-primaire" href="/proposer">Proposer une idée</a>
      <a class="bouton bouton-secondaire" href="/themes">Parcourir par thème</a>
    </div>
  </section>
  <section class="section accueil-themes" aria-labelledby="accueil-themes-titre">
    <div class="section-titre"><h2 id="accueil-themes-titre">Les grands thèmes</h2><a href="/themes">Tous les thèmes et leurs sujets →</a></div>
    <div class="accueil-themes-grille">${FAMILLES.map((f) => `
      <div class="accueil-famille">
        <h3>${e(f.nom)}</h3>
        <ul>${themesDe(f.id).map((t) => `<li><a href="/theme/${e(t.id)}" title="${e(t.accroche)}">${e(t.nom)}</a></li>`).join('')}</ul>
      </div>`).join('')}
    </div>
  </section>
  <section class="section accueil-france">
    ${sectionTitre('La France en chiffres', { href: '/reperes', texte: 'Tous les repères' })}
    <div class="accueil-france-grille">
      <div class="accueil-france-courbe">
        <div class="reperes-courbe-legend">
          <span><span class="reperes-point rcc-courbe-d"></span> Dépenses publiques</span>
          <span><span class="reperes-point rcc-courbe-r"></span> Recettes publiques</span>
        </div>
        ${courbeÉvolution('bornes', true)}
        ${simBlocÉvolution(true)}
      </div>
      <div class="accueil-france-cartes">
        ${statRepere('Dépenses publiques', `${formatteurMds.format(FINANCES_PUBLIQUES.dépensesPib)} % du PIB`, `${formatteurMds.format(FINANCES_PUBLIQUES.dépensesMds)} Md€ en ${FINANCES_PUBLIQUES.année}`, '/reperes')}
        ${statRepere('Déficit public', `${formatteurMds.format(FINANCES_PUBLIQUES.déficitPib)} % du PIB`, `${formatteurMds.format(FINANCES_PUBLIQUES.déficitMds)} Md€ en ${FINANCES_PUBLIQUES.année}`, '/reperes')}
        ${statRepere('Dette publique', `${formatteurMds.format(FINANCES_PUBLIQUES.dettePib)} % du PIB`, `${formatteurEntier.format(FINANCES_PUBLIQUES.detteMds)} Md€ au ${FINANCES_PUBLIQUES.detteDate}`, '/reperes')}
        ${statRepere('Dette par habitant', eurosTexte(parHabitant(FINANCES_PUBLIQUES.detteMds)), `dépenses publiques : ${eurosTexte(parHabitant(FINANCES_PUBLIQUES.dépensesMds))} par habitant et par an`, '/reperes')}
      </div>
    </div>
    <div class="accueil-france-appel">
      <p>Un chiffre vous intrigue&nbsp;? Chaque question peut devenir une proposition
      concrète — la vôtre.</p>
      <div class="heros-actions">
        <a class="bouton bouton-secondaire" href="/budget">Votre budget ${BUDGET_ETAT.année}&nbsp;→</a>
        <a class="bouton bouton-secondaire" href="/reperes">Voir tous les repères&nbsp;→</a>
        <a class="bouton bouton-primaire" href="/proposer">Proposer une idée&nbsp;→</a>
      </div>
      <p class="reperes-note">Sources&nbsp;: Insee (comptes nationaux) et loi de finances
      initiale ${BUDGET_ETAT.année} — le détail complet est sur la page
      <a href="/reperes">Repères</a>. Rapports par habitant&nbsp;: division par la
      population au ${POPULATION.date} (Insee, bilan démographique 2025).</p>
    </div>
  </section>
  <section class="section accueil-budget">
    ${sectionTitre('Le budget de l’État, à vous de jouer', { href: '/budget', texte: 'Les vingt curseurs' })}
    <form class="bud-formulaire" method="get" action="/budget" data-budget data-solde="${BUDGET_ETAT.soldeMds}">
      <div class="accueil-budget-grille">
        <div class="bud-donut-bloc">${donutBudget({})}</div>
        <div>
          <div class="reperes-sim-resultats reperes-sim-resultats-compact">
            ${bandeBudget(calculeBudget({}))}
          </div>
          <fieldset class="bud-groupe bud-groupe-compact">
            <legend>Dépenses — les plus grosses missions</legend>
            <div class="bud-colonnes">${lignesBudget(CURSEURS.filter((c) => c.sens === 'dep').slice(0, 6), {})}</div>
          </fieldset>
          <fieldset class="bud-groupe bud-groupe-compact">
            <legend>Recettes — les trois grands impôts</legend>
            <div class="bud-colonnes">${lignesBudget(CURSEURS.filter((c) => c.sens === 'rec').slice(0, 3), {})}</div>
          </fieldset>
          <div class="bud-actions">
            <button class="bouton bouton-secondaire bud-recalculer" type="submit">Recalculer</button>
            <a href="/budget">Les vingt curseurs du budget&nbsp;→</a>
          </div>
        </div>
      </div>
    </form>
    <p class="reperes-note">Six missions et trois impôts ici, chaque poste de la loi sur la page
    <a href="/budget">Votre budget</a>. Le camembert se recompose et chaque indicateur bouge&nbsp;;
    l'écart par habitant divise par la population officielle (${formatteurEntier.format(POPULATION.habitants)}
    habitants au ${POPULATION.date}, Insee). Arithmétique pure, aucun effet économique modélisé
    — pas une prévision.</p>
  </section>
  <section class="section">
    ${sectionTitre('Le plus de « d’accord »', { href: '/themes', texte: 'Tous les thèmes' })}
    ${grille(soutenues)}
  </section>
  <section class="section">
    ${sectionTitre('Dernières idées')}
    ${grille(recentes)}
  </section>
</div>`;
  return squelette({
    titre: 'RatioPol — des idées concrètes, pas des slogans',
    description: 'Partagez et lisez des propositions politiques concrètes, anonymement ou non. Ouvert à tous en France.',
    contenu,
    assets,
    cssSup: '/graphiques.css',
  });
}

/* ------------------------------------------------------------------ */
/* Thèmes                                                             */
/* ------------------------------------------------------------------ */

/** Une carte de thème : son nom et ses sujets concrets. */
function carteTheme(t: { id: string; nom: string; accroche: string }): string {
  return `<a class="carte-theme" href="/theme/${e(t.id)}"><h3>${e(t.nom)}</h3><p>${e(t.accroche)}</p></a>`;
}

export function pageThemes(assets: Assets): string {
  const familles = FAMILLES.map((f) => `
  <section class="themes-famille" aria-labelledby="famille-${f.id}">
    <h2 id="famille-${f.id}">${e(f.nom)}</h2>
    <div class="themes-grille">${themesDe(f.id).map(carteTheme).join('')}</div>
  </section>`).join('');
  const autre = themeParId('autre');
  const contenu = `
<div class="conteneur">
  <section class="section">
    <h1 class="page-titre">Thèmes</h1>
    <p class="page-sous-titre">Tous les sujets de l’action publique, du loyer à l’intelligence artificielle.
    Choisissez-en un pour lire les idées — ou pour proposer la vôtre.</p>
    ${familles}
    ${autre ? `<p class="reperes-note">Votre sujet n’y est pas&nbsp;? <a href="/theme/autre">${e(autre.nom)}</a> l’accueille.</p>` : ''}
  </section>
</div>`;
  return squelette({
    titre: 'Thèmes — RatioPol',
    description: `Les idées citoyennes classées en ${THEMES.length - 1} thèmes : logement, santé, énergie, budget, services publics, intelligence artificielle…`,
    contenu,
    assets,
  });
}

/** Les postes officiels rattachés à un thème (mêmes liens que les Repères). */
function chiffresDuTheme(idTheme: string): string {
  const postes = POSTES_CIBLES.filter((p) => posteThemeParId(p.id) === idTheme);
  if (postes.length === 0) return '';
  const lignes = postes.map((p) => `${e(p.nom)}&nbsp;: ${formatteurMds.format(p.mds)}&nbsp;Md€ <span class="theme-chiffres-source">(${e(p.groupe)})</span>`);
  return `<p class="theme-chiffres"><a href="/reperes">Chiffres officiels</a> — ${lignes.join(' · ')}</p>`;
}

/** Le domaine d'une URL, pour dire où mène un lien de source. */
function domaine(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function lienSource(nom: string, url: string): string {
  return `<a href="${e(url)}" rel="noopener">${e(nom)}</a> <span class="fiche-domaine">${e(domaine(url))}</span>`;
}

/** Les chiffres clés d'un thème : la valeur en grand, puis ce qu'elle
 *  mesure, son périmètre et sa source — jamais l'une sans les autres. */
function sectionChiffresCles(fiche: Fiche, idTheme: string): string {
  const cartes = fiche.chiffres.map((c) => `<figure class="fiche-chiffre">
      <p class="fiche-valeur${c.valeur.length > 18 ? ' fiche-valeur-longue' : ''}">${e(c.valeur)}</p>
      <figcaption>
        <p class="fiche-libelle">${e(c.libelle)}</p>
        <p class="fiche-precision">${e(c.precision)}</p>
        <p class="fiche-source">${lienSource(c.source, c.url)}</p>
      </figcaption>
    </figure>`).join('\n');
  return `<section class="section" aria-labelledby="chiffres-titre">
    ${sectionTitre('Les chiffres clés')}
    <div class="fiche-chiffres">${cartes}</div>
    ${chiffresDuTheme(idTheme)}
    <p class="reperes-note" id="chiffres-titre-note">Chiffres officiels recopiés tels que publiés, sans commentaire.
    Sources vérifiées le ${e(dateFr(new Date(fiche.verifieeLe)))}.</p>
  </section>`;
}

/** `ancres` : seulement sur /agir, où chaque voie est unique et visée par
 *  les liens des pages de thème (un thème peut citer deux fois « Commune »). */
function listeCompetences(competences: Competence[], ancres = false): string {
  return `<dl class="fiche-competences">${competences.map((c) => `<div${ancres ? ` id="${e(slugDepuisTitre(c.niveau))}"` : ''}>
      <dt>${e(c.niveau)}</dt>
      <dd>${e(c.role)} <span class="fiche-source">— ${lienSource(c.source, c.url)}</span></dd>
    </div>`).join('')}</dl>`;
}

/** L'encart « comment agir » d'une page de thème : les voies, en bref. */
function encartAgir(idTheme: string, nom: string): string {
  const voies = ficheDe(COMMENT_AGIR)?.competences ?? [];
  const liens = voies.map((v) => `<li><a href="/agir#${e(slugDepuisTitre(v.niveau))}">${e(v.niveau)}</a></li>`).join('');
  return `<section class="section fiche-agir" aria-labelledby="agir-titre">
    <h2 id="agir-titre">Agir sur «&nbsp;${e(nom)}&nbsp;»</h2>
    <p>Écrivez une idée concrète — problème, proposition, bénéficiaires, arbitrage, indicateur — et faites-la circuler.</p>
    <div class="heros-actions">
      <a class="bouton bouton-primaire" href="/proposer?theme=${e(idTheme)}">Proposer une idée sur ce thème</a>
    </div>
    ${liens ? `<p class="fiche-agir-voies-titre">Les voies officielles pour porter une idée&nbsp;:</p><ul class="fiche-agir-voies">${liens}</ul>` : ''}
  </section>`;
}

export function pageTheme(idTheme: string, idees: Idee[], tri: 'recent' | 'soutenus', assets: Assets): string {
  const theme = themeParId(idTheme);
  const nom = theme ? theme.nom : idTheme;
  const fiche = ficheDe(idTheme);
  const lienTri = tri === 'recent' ? 'soutenus' : 'recent';
  const texteTri = tri === 'recent' ? 'Le plus de « d’accord »' : 'Plus récentes';
  const contenu = `
<div class="conteneur">
  <section class="section">
    <p class="fiche-fil"><a href="/themes">Thèmes</a></p>
    <h1 class="page-titre">${e(nom)}</h1>
    ${theme ? `<p class="page-sous-titre">${e(theme.accroche)}.</p>` : ''}
    ${fiche ? '' : chiffresDuTheme(idTheme)}
  </section>
  ${fiche && fiche.chiffres.length > 0 ? sectionChiffresCles(fiche, idTheme) : ''}
  ${fiche && fiche.competences.length > 0 ? `<section class="section" aria-labelledby="decide-titre">
    <div class="section-titre"><h2 id="decide-titre">Qui décide</h2></div>
    ${listeCompetences(fiche.competences)}
  </section>` : ''}
  <section class="section" id="idees">
    <div class="section-titre">
      <h2>Les idées</h2>
      <a href="/theme/${e(idTheme)}?tri=${lienTri}#idees">${texteTri} →</a>
    </div>
    ${grille(idees)}
  </section>
  ${encartAgir(idTheme, nom)}
  ${fiche && fiche.ressources.length > 0 ? `<section class="section">
    ${sectionTitre('Pour aller plus loin')}
    <ul class="liste-simple">${fiche.ressources.map((r) => `<li>${lienSource(r.nom, r.url)}</li>`).join('')}</ul>
  </section>` : ''}
</div>`;
  return squelette({
    titre: `${nom} — chiffres, qui décide, idées — RatioPol`,
    description: `${nom} : les chiffres officiels, qui décide et les idées citoyennes concrètes. ${theme ? theme.accroche : ''}.`,
    contenu,
    assets,
  });
}

/** Toutes les voies officielles pour porter une idée. */
export function pageAgir(assets: Assets): string {
  const fiche = ficheDe(COMMENT_AGIR);
  const contenu = `
<div class="conteneur lecture">
  <section class="section">
    <h1 class="page-titre">Comment agir</h1>
    <p class="page-sous-titre">Une idée écrite sur RatioPol est publique et réutilisable par tous.
    Voici les voies officielles pour la porter jusqu’aux décideurs — avec leurs règles exactes et leurs sources.</p>
    ${fiche ? listeCompetences(fiche.competences, true) : '<p class="vide">Bientôt.</p>'}
    ${fiche && fiche.ressources.length > 0 ? `<h2 class="reperes-sur-titre">Pour aller plus loin</h2>
    <ul class="liste-simple">${fiche.ressources.map((r) => `<li>${lienSource(r.nom, r.url)}</li>`).join('')}</ul>` : ''}
    ${fiche ? `<p class="reperes-note">Règles vérifiées le ${e(dateFr(new Date(fiche.verifieeLe)))} sur les sources citées.</p>` : ''}
    <div class="heros-actions"><a class="bouton bouton-primaire" href="/proposer">Proposer une idée</a></div>
  </section>
</div>`;
  return squelette({
    titre: 'Comment agir — pétitions, élus, consultations — RatioPol',
    description: 'Les voies officielles pour porter une idée politique : pétitions de l’Assemblée et du Sénat, élus, consultations publiques, référendum d’initiative partagée.',
    contenu,
    assets,
  });
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
  // Le camembert double anneau du simulateur (accueil et /budget) : les
  // SEGMENTS sont des paths SVG, ils se colorent par fill — mêmes séries,
  // même ordre que les camemberts de /reperes (rcc-*). La sixième part des
  // recettes (non fiscales) prend le 6e slot de la palette. Les MÊMES
  // règles posent background : les pastilles de légende des lignes de
  // curseur (span HTML) et les segments (path SVG) portent la même classe
  // — la ligne EST la légende de sa part.
  [...BUDGET_ETAT.depenses, BUDGET_ETAT.autresDepenses].forEach((_, i) =>
    règles.push(`.rcd-${i} { fill: ${couleurSerie(i)}; background: ${couleurSerie(i)}; }`));
  [...BUDGET_ETAT.recettesFiscales, 'non-fiscales'].forEach((_, i) =>
    règles.push(`.rcr-${i} { fill: ${couleurSerie(i)}; background: ${couleurSerie(i)}; }`));
  // Les deux lignes de la courbe d'évolution : une classe pour le trait
  // (fill laissé à l'attribut fill="none" — le CSS des classes écraserait
  // sinon l'attribut et remplirait l'aire sous la courbe), une pour les
  // points.
  règles.push('.rcv-d-trait { stroke: var(--r-serie-1); }');
  règles.push('.rcv-r-trait { stroke: var(--r-serie-2); }');
  règles.push('.rcv-d { fill: var(--r-serie-1); }');
  règles.push('.rcv-r { fill: var(--r-serie-2); }');
  // Les pastilles de la légende de la courbe : classes DÉDIÉES, alignées sur
  // les traits ci-dessus. Ne pas réutiliser rcc-d0/rcc-r0 (classes des
  // camemberts, où le 1er poste des recettes prend aussi la série 1) :
  // la légende de courbe et le trait doivent se correspondre au pixel.
  règles.push('.rcc-courbe-d { background: var(--r-serie-1); }');
  règles.push('.rcc-courbe-r { background: var(--r-serie-2); }');
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

/** Le PIB déduit des comptes publiés : dépenses en Md€ rapportées aux
 *  dépenses en % du PIB. C'est la seule grandeur que le simulateur ajoute
 *  aux données publiées — elle est calculée ici, rendue en attribut, et
 *  jamais recalculée côté navigateur. */
function pibMdsDéduit(): number {
  return (FINANCES_PUBLIQUES.dépensesMds / FINANCES_PUBLIQUES.dépensesPib) * 100;
}

/** L'écart de solde en points, signé, à un dixième de point — la même
 *  écriture que côté navigateur (web/simulateur.ts) pour que la ligne
 *  rendue par le serveur (statu quo) et la ligne recalculée coïncident
 *  caractère pour caractère. Un signe, jamais un adjectif. */
function ecartTexte(ecart: number): string {
  const signe = ecart > 0 ? '+' : '';
  // En français, « point » reste au singulier sous 2 (0,0 point, 1,5 point).
  const singulier = Math.abs(Math.round(ecart * 10)) < 20;
  return `${signe}${formatteurMds.format(ecart)}&nbsp;${singulier ? 'point' : 'points'}`;
}

/** La courbe d'évolution : SVG inline généré côté serveur, lisible sans
 *  JavaScript, la valeur de chaque point est écrite (pas de survol). Une
 *  seule échelle — jamais de double axe. Version « bornes » (accueil) :
 *  seules 2021 et 2025 sont étiquetées, en corps plus grand — la série
 *  entière reste tracée, la version complète est sur /reperes.
 *  Avec sim=true, le graphe publie en attributs data-* tout ce que le
 *  simulateur du navigateur (web/simulateur.ts) doit savoir : le JS ne
 *  recopie aucune valeur, il ne fait que de l'arithmétique sur celles-ci. */
function courbeÉvolution(étiquettes: 'toutes' | 'bornes' = 'toutes', sim = false): string {
  const ev = ÉVOLUTION;
  const gauche = 56;
  const droite = 584;
  const haut = 24;
  const bas = 304;
  const echelleBasse = 50;
  const echelleHaute = 60;
  const yDe = (v: number) => bas - (v - echelleBasse) * ((bas - haut) / (echelleHaute - echelleBasse));
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
  const donnees = sim
    ? ` data-sim="1"
     data-min="${echelleBasse}" data-max="${echelleHaute}"
     data-x-dernier="${droite}" data-x-pas="${(droite - gauche) / (ev.années.length - 1)}"
     data-y-haut="${haut}" data-y-bas="${bas}"
     data-annees="${ev.années.join(',')}"
     data-dep="${ev.dépensesPib.join(',')}" data-rec="${ev.recettesPib.join(',')}"
     data-pib-mds="${pibMdsDéduit().toFixed(1)}"`
    : '';
  return `<svg class="reperes-courbe" viewBox="0 0 640 340" role="img"${donnees}
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

/** Le bloc « votre hypothèse » : de l'arithmétique pure sur la courbe,
 *  rien d'autre. Rendu statique = statu quo (les valeurs de la dernière
 *  année publiée) ; le JS du navigateur met ces mêmes spans à jour quand
 *  on déplace les poignées (web/simulateur.ts). Aucun adjectif, aucune
 *  couleur de jugement : des nombres et un signe. Sans JavaScript, cette
 *  ligne rendue par le serveur est déjà le résultat complet. Version
 *  compacte pour l'accueil, où la courbe partage l'espace avec les cartes. */
function simBlocÉvolution(compact = false): string {
  const ev = ÉVOLUTION;
  const dernier = ev.années.length - 1;
  const année = ev.années[dernier];
  const dep = ev.dépensesPib[dernier];
  const rec = ev.recettesPib[dernier];
  const solde = rec - dep;
  // Au statu quo, l'écart avec l'année publiée est nul par construction —
  // la formule reste exactement celle que le navigateur appliquera ensuite.
  const ecart = solde - solde;
  return `
    <h3 class="reperes-sous-titre">Votre hypothèse pour ${année + 1}</h3>
    <div class="reperes-sim-resultats${compact ? ' reperes-sim-resultats-compact' : ''}">
      <span>Dépenses&nbsp;: <strong data-sim-dep>${formatteurMds.format(dep)}&nbsp;%</strong></span>
      <span>Recettes&nbsp;: <strong data-sim-rec>${formatteurMds.format(rec)}&nbsp;%</strong></span>
      <span>Solde simulé&nbsp;: <strong data-sim-solde-pib>${formatteurMds.format(solde)}&nbsp;% du PIB</strong></span>
      <span>soit <strong data-sim-solde-mds>${formatteurMds.format((solde / 100) * pibMdsDéduit())}&nbsp;Md€</strong></span>
      <span>Écart avec ${année}&nbsp;: <strong data-sim-ecart>${ecartTexte(ecart)}</strong></span>
    </div>
    <p class="reperes-note">Simulation arithmétique sur vos hypothèses — pas une prévision, pas
    les chiffres officiels. PIB ${année} déduit des comptes publiés.</p>`;
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
    celui de la loi. Bougez ces postes vous-même&nbsp;: <a href="/budget">votre budget ${be.année}</a>.</p>
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
      <span><span class="reperes-point rcc-courbe-d"></span> Dépenses publiques</span>
      <span><span class="reperes-point rcc-courbe-r"></span> Recettes publiques</span>
    </div>
    ${courbeÉvolution('toutes', true)}
    ${simBlocÉvolution()}
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
/* Votre budget — le simulateur poste par poste                        */
/* ------------------------------------------------------------------ */

/** Une ligne manipulable : la pastille de légende (la couleur de SA part
 *  du camembert), le nom (label du curseur), le montant de la loi, la
 *  variation recalculée, la barre proportionnelle des Repères (même
 *  feuille /graphiques.css — absente sur un poste que les Repères ne
 *  tracent pas, comme les recettes non fiscales) et le curseur natif.
 *  Le lien de thème reste la porte vers les idées — la ligne n'est pas
 *  un lien, elle contient un champ. */
function ligneBudget(c: Curseur, classeBarre: string, classePoint: string, pct: number): string {
  const idChamp = `bud-${c.id}`;
  const idTheme = posteThemeParId(c.id);
  const theme = idTheme ? themeParId(idTheme) : undefined;
  return `
  <div class="bud-ligne">
    <div class="reperes-ligne-tete">
      <span class="reperes-ligne-nom">${classePoint ? `<span class="reperes-point ${classePoint}" aria-hidden="true"></span> ` : ''}<label for="${idChamp}">${e(c.nom)}</label>${theme ? ` <a class="reperes-ligne-theme" href="/theme/${e(idTheme!)}">${e(theme.nom)}&nbsp;→</a>` : ''}</span>
      <span class="reperes-ligne-valeur">${mdsTexte(c.mds)}&nbsp;· <output for="${idChamp}" data-bud-var>${deltaTexte(variationPoste(c, pct))}</output></span>
    </div>
    ${classeBarre ? `<div class="reperes-piste"><div class="reperes-plein ${classeBarre}"></div></div>` : ''}
    <input type="range" id="${idChamp}" name="${c.id}" min="${VARIATION_MIN}" max="${VARIATION_MAX}" step="1" value="${pct}" data-mds="${c.mds}" data-sens="${c.sens}">
  </div>`;
}

/** Les classes de barres et de pastilles des curseurs : même ordre que
 *  feuilleGraphiques() — les lignes reprennent les pistes des Repères et
 *  les pastilles de leur part de camembert (la ligne est sa propre
 *  légende). Les recettes non fiscales n'ont ni barre ni part ailleurs :
 *  elles gardent la 6e pastille des recettes. */
function classesBudget(): Map<string, { barre: string; point: string }> {
  const classes = new Map<string, { barre: string; point: string }>();
  [...BUDGET_ETAT.depenses, BUDGET_ETAT.autresDepenses].forEach((p, i) => classes.set(p.id!, { barre: `rcw-d${i}`, point: `rcd-${i}` }));
  BUDGET_ETAT.recettesFiscales.forEach((p, i) => classes.set(p.id!, { barre: `rcw-r${i}`, point: `rcr-${i}` }));
  classes.set('recette-non-fiscales', { barre: '', point: 'rcr-5' });
  return classes;
}

/** Les lignes de curseurs d'une sélection de postes. */
function lignesBudget(selection: Curseur[], variations: Variations): string {
  const classes = classesBudget();
  return selection
    .map((c) => {
      const cl = classes.get(c.id) ?? { barre: '', point: '' };
      return ligneBudget(c, cl.barre, cl.point, variations[c.id] ?? 0);
    })
    .join('\n');
}

/** Les indicateurs de la bande, partagés par /budget et l'accueil : le
 *  solde de la loi, les variations, votre solde, l'écart — et sa
 *  traduction par habitant, la division qui rend la politique budgétaire
 *  lisible depuis un fauteuil. Les spans data-bud-* vivent sous la main de
 *  web/budget.ts ; sans JavaScript, le GET du serveur les rend calculés. */
function bandeBudget(r: ReturnType<typeof calculeBudget>): string {
  return `<span>Solde de la loi&nbsp;: <strong>${mdsTexte(BUDGET_ETAT.soldeMds)}</strong></span>
        <span>Vos dépenses&nbsp;: <strong data-bud-dep>${deltaTexte(r.depensesMds)}</strong></span>
        <span>Vos recettes&nbsp;: <strong data-bud-rec>${deltaTexte(r.recettesMds)}</strong></span>
        <span>Votre solde&nbsp;: <strong data-bud-solde>${mdsTexte(r.soldeMds)}</strong></span>
        <span>Écart avec la loi&nbsp;: <strong data-bud-ecart>${deltaTexte(r.ecartMds)}</strong></span>
        <span>soit par habitant&nbsp;: <strong data-bud-hab>${eurosDeltaTexte(parHabitant(r.ecartMds))}</strong></span>`;
}

/** Le camembert double anneau : les missions autour, les recettes dedans.
 *  Premier tracé calculé ici (avec les variations du GET — statu quo à
 *  l'arrivée) ; web/budget.ts recompose chaque path à chaque curseur avec
 *  la même géométrie (cheminsAnneau, partagé). Chaque segment porte son
 *  id et son montant de loi : le navigateur n'a rien à recopier, et les
 *  postes sans curseur sur la page d'accueil restent dessinés. */
function donutBudget(variations: Variations): string {
  const depenses = BUDGET_ETAT.depenses.map((p) => p as Poste & { id: string });
  depenses.push(BUDGET_ETAT.autresDepenses as Poste & { id: string });
  const recettes: (Poste & { id: string })[] = [
    ...BUDGET_ETAT.recettesFiscales.map((p) => p as Poste & { id: string }),
    { id: 'recette-non-fiscales', nom: 'Recettes non fiscales', mds: BUDGET_ETAT.recettesNonFiscalesMds },
  ];
  const anneau = (postes: (Poste & { id: string })[], classe: string, groupe: 'dep' | 'rec'): string => {
    const valeurs = postes.map((p) => p.mds * (1 + (variations[p.id] ?? 0) / 100));
    const chemins = cheminsAnneau(valeurs, ANNEAU[groupe]);
    return `    <g data-anneau="${groupe}">
${postes.map((p, i) => `      <path class="${classe}${i}" data-id="${p.id}" data-mds="${p.mds}" d="${chemins[i]}"/>`).join('\n')}
    </g>`;
  };
  return `<svg class="bud-donut" viewBox="0 0 320 320" data-donut="1" role="img"
    aria-label="Le budget de l’État en deux anneaux : les missions de dépenses autour, les grandes recettes dedans. Les parts bougent avec les curseurs, les montants se lisent dans les lignes.">
${anneau(depenses, 'rcd-', 'dep')}
${anneau(recettes, 'rcr-', 'rec')}
    <text class="bud-donut-texte" x="160" y="152" text-anchor="middle">Budget de l’État</text>
    <text class="bud-donut-texte" x="160" y="176" text-anchor="middle">${BUDGET_ETAT.année}</text>
  </svg>`;
}

/** La page /budget : les postes de la loi de finances deviennent des
 *  curseurs, le solde se recalcule. Sans JavaScript, le formulaire se
 *  soumet en GET et le serveur re-rend la même page avec le même calcul
 *  (serveur/budget.ts, partagé avec web/budget.ts) : les deux chemins
 *  coïncident au caractère près, comme pour le simulateur de courbe. */
export function pageBudget(assets: Assets, variations: Variations): string {
  const be = BUDGET_ETAT;
  const r = calculeBudget(variations);
  const lignes = (sens: 'dep' | 'rec'): string => lignesBudget(CURSEURS.filter((c) => c.sens === sens), variations);
  const contenu = `
<div class="conteneur">
  <section class="section">
    <h1 class="page-titre">Votre budget ${be.année}</h1>
    <p class="page-sous-titre">Le budget de l’État entre vos mains&nbsp;: un curseur par mission,
    un par grande recette. Bougez — le solde se recalcule. Les montants sont ceux de la loi&nbsp;;
    l’arithmétique est la vôtre.</p>

    <form class="bud-formulaire" method="get" action="/budget" data-budget data-solde="${be.soldeMds}">
      <div class="reperes-sim-resultats">
        ${bandeBudget(r)}
      </div>
      <div class="bud-donut-bloc">
        ${donutBudget(variations)}
      </div>

      <fieldset class="bud-groupe">
        <legend>Dépenses — les missions du budget général</legend>
        <p class="reperes-note">Chaque curseur varie les crédits de la mission, de −100&nbsp;%
        (suppression) à +100&nbsp;% (doublement). «&nbsp;Autres missions&nbsp;» regroupe les
        18 autres missions de la loi.</p>
        <div class="bud-colonnes">${lignes('dep')}
        </div>
      </fieldset>

      <fieldset class="bud-groupe">
        <legend>Recettes — les grandes recettes de l’État</legend>
        <p class="reperes-note">Recettes fiscales nettes (après remboursements et dégrèvements)
        et recettes non fiscales. Les prélèvements au profit des collectivités et de l’Union
        européenne ne sont pas des curseurs&nbsp;: ce sont des transferts, pas des économies.</p>
        <div class="bud-colonnes">${lignes('rec')}
        </div>
      </fieldset>

      <div class="bud-actions">
        <button class="bouton bouton-secondaire bud-recalculer" type="submit">Recalculer</button>
        <a href="/budget">Revenir à la loi de finances</a>
      </div>
    </form>

    <p class="reperes-note">Arithmétique pure&nbsp;: votre solde part du solde de la loi
    (${mdsTexte(be.soldeMds)} — budget général, budgets annexes et comptes spéciaux) et chaque
    point de curseur ajoute ou retire exactement sa part du montant publié. Aucun effet
    économique n’est modélisé&nbsp;: doubler un impôt ne double pas forcément son rendement,
    supprimer une mission n’économise pas mécaniquement son montant. Ce n’est pas une prévision.</p>
    <p class="reperes-note">Montants&nbsp;: ${be.millésime} — les mêmes que la page
    <a href="/reperes">Repères</a>, qui en donne les sources. Mis à jour à chaque loi de finances.</p>
  </section>

  <section class="section">
    <p class="reperes-appel">Un curseur que vous assumeriez&nbsp;? <a href="/proposer">Écrivez
    l’idée qui va avec</a> — le simulateur vous a déjà donné l’ordre de grandeur de l’arbitrage.</p>
  </section>
</div>`;
  return squelette({
    titre: `Votre budget ${be.année} — le budget de l’État en curseurs — RatioPol`,
    description: `Bougez les crédits de chaque mission et les grandes recettes de l’État : le solde se recalcule. Montants de la loi de finances ${be.année}, arithmétique pure, aucune prévision.`,
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

/** L'impact chiffré déclaré par l'auteur, rapporté au chiffre officiel du
 *  poste visé. Règles des Repères : le dénominateur porte sa source et son
 *  millésime, aucun adjectif ; l'estimation est dite « de l'auteur ». */
function blocImpact(idee: Idee): string {
  const titre = '<h2>L’impact chiffré — estimation de l’auteur</h2>';
  const effet = EFFETS.find((x) => x.id === idee.effet);
  const poste = idee.poste ? posteCibleParId(idee.poste) : undefined;
  if (!effet && idee.montantEuros === null && !poste) {
    return `<section class="idee-bloc idee-impact">${titre}<p class="idee-impact-note">L’auteur n’a pas chiffré cette idée.</p></section>`;
  }
  const lignes: string[] = [];
  if (effet) lignes.push(`<div><dt>Effet sur les finances publiques</dt><dd>${e(effet.nom)}</dd></div>`);
  if (idee.montantEuros !== null) lignes.push(`<div><dt>Montant estimé</dt><dd>${montantTexte(idee.montantEuros)} par an</dd></div>`);
  if (poste) {
    lignes.push(`<div><dt>Poste touché</dt><dd><a href="/reperes">${e(poste.nom)}</a> — ${formatteurMds.format(poste.mds)}&nbsp;Md€ (${e(poste.groupe)})</dd></div>`);
  }
  const part = poste && idee.montantEuros !== null
    ? `Soit ${partTexte(idee.montantEuros, poste.mds)} du montant de ce poste. `
    : '';
  return `<section class="idee-bloc idee-impact">${titre}
    <dl class="idee-impact-liste">${lignes.join('')}</dl>
    <p class="idee-impact-note">${part}Estimation déclarée par l’auteur, non vérifiée par RatioPol&nbsp;;
    le montant du poste est le chiffre officiel publié.</p>
  </section>`;
}

/** Les boutons d'avis : de vrais formulaires (marchent sans JS), un bouton
 *  enfoncé pour l'avis déjà donné depuis cette adresse. */
function boutonsAvis(
  slug: string,
  champ: 'position' | 'arbitrage',
  question: string,
  choix: { valeur: string; libelle: string; cle: keyof Decompte }[],
  decompte: Decompte,
  actuel: string | null,
): string {
  const idQ = `q-${champ}`;
  const boutons = choix
    .map((c) => `<button class="bouton bouton-secondaire" type="submit" name="${champ}" value="${c.valeur}" aria-pressed="${actuel === c.valeur}">${e(c.libelle)} <span class="idee-avis-compte" data-cle="${c.cle}">${decompte[c.cle]}</span></button>`)
    .join('\n');
  return `<form method="post" action="/idee/${e(slug)}/avis" class="js-avis idee-avis-groupe">
    <p class="idee-avis-question" id="${idQ}">${question}</p>
    <div class="idee-avis-boutons" role="group" aria-labelledby="${idQ}">${boutons}</div>
  </form>`;
}

function sectionAvis(idee: Idee, sonAvis: Avis | null): string {
  return `<section class="idee-avis" id="avis" aria-labelledby="avis-titre">
    <h2 id="avis-titre">Votre avis</h2>
    ${boutonsAvis(idee.slug, 'position', 'Sur le fond, cette idée&nbsp;:', [
      { valeur: 'pour', libelle: 'D’accord', cle: 'pour' },
      { valeur: 'contre', libelle: 'Pas d’accord', cle: 'contre' },
      { valeur: 'sans-avis', libelle: 'Sans avis', cle: 'sansAvis' },
    ], idee.avis, sonAvis?.position ?? null)}
    ${boutonsAvis(idee.slug, 'arbitrage', 'L’arbitrage (qui paie, qui perd quoi) est exposé de façon&nbsp;:', [
      { valeur: 'complet', libelle: 'Complète', cle: 'arbComplet' },
      { valeur: 'partiel', libelle: 'Partielle', cle: 'arbPartiel' },
      { valeur: 'incomplet', libelle: 'Incomplète', cle: 'arbIncomplet' },
    ], idee.avis, sonAvis?.arbitrage ?? null)}
    <p class="idee-avis-note">Les deux questions sont indépendantes&nbsp;: on peut juger un arbitrage
    complet sans être d’accord avec l’idée. Un avis par idée et par connexion, modifiable.
    Indicatif&nbsp;: ni vote, ni sondage représentatif.</p>
  </section>`;
}

export function pageIdee(idee: Idee, sonAvis: Avis | null, merci: boolean, assets: Assets): string {
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
    ${blocImpact(idee)}
  </div>
  ${sectionAvis(idee, sonAvis)}
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

/** Le select d'une liste fermée, avec la valeur déjà saisie resélectionnée. */
function options(liste: readonly { id: string; nom: string }[], choisi: unknown): string {
  return liste.map((o) => `<option value="${e(o.id)}"${choisi === o.id ? ' selected' : ''}>${e(o.nom)}</option>`).join('');
}

/** 6 · L'impact chiffré : optionnel, cohérent (gabarit.ts). */
function champsImpact(valeurs?: ValeursBrutes, erreurs?: Erreurs): string {
  const erreur = (m?: string): string => (m ? `<p class="champ-erreur" role="alert">${e(m)}</p>` : '');
  const groupes = [...new Set(POSTES_CIBLES.map((p) => p.groupe))]
    .map((g) => `<optgroup label="${e(g)}">${options(POSTES_CIBLES.filter((p) => p.groupe === g).map((p) => ({ id: p.id, nom: `${p.nom} — ${formatteurMds.format(p.mds)} Md€` })), valeurs?.poste)}</optgroup>`)
    .join('');
  const unite = typeof valeurs?.unite === 'string' && valeurs.unite !== '' ? valeurs.unite : 'M';
  return `<fieldset class="champ-groupe">
        <legend>6 · L’impact chiffré <span class="champ-optionnel">(optionnel)</span></legend>
        <span class="aide">Un ordre de grandeur suffit. Il rend votre idée comparable aux autres et aux
        <a href="/reperes">chiffres officiels</a>. Laissez vide si vous ne savez pas.</span>
        <div class="champ">
          <label for="effet">Effet sur les finances publiques</label>
          ${erreur(erreurs?.effet)}
          <select id="effet" name="effet"><option value="">Je ne sais pas</option>${options(EFFETS, valeurs?.effet)}</select>
        </div>
        <div class="champ">
          <label for="montant">Montant annuel estimé</label>
          <span class="aide">Ex. : 2,5 Md€ par an. Une dépense ponctuelle&nbsp;: divisez-la par sa durée.</span>
          ${erreur(erreurs?.montant)}
          <div class="champ-ligne">
            <input id="montant" name="montant" type="text" inputmode="decimal" value="${valeur(valeurs, 'montant')}" maxlength="20" autocomplete="off">
            <select name="unite" aria-label="Unité du montant">${options(UNITES, unite)}</select>
          </div>
        </div>
        <div class="champ">
          <label for="poste">Poste budgétaire touché</label>
          <span class="aide">Le poste des Repères le plus proche de votre idée — le montant sera rapporté à son chiffre officiel.</span>
          ${erreur(erreurs?.poste)}
          <select id="poste" name="poste"><option value="">Aucun / je ne sais pas</option>${groupes}</select>
        </div>
      </fieldset>`;
}

export function pageProposer(assets: Assets, valeurs?: ValeursBrutes, erreurs?: Erreurs): string {
  const optionTheme = (t: { id: string; nom: string }): string =>
    `<option value="${t.id}"${valeurs?.theme === t.id ? ' selected' : ''}>${e(t.nom)}</option>`;
  const themesOptions = FAMILLES.map((f) => `<optgroup label="${e(f.nom)}">${themesDe(f.id).map(optionTheme).join('')}</optgroup>`).join('')
    + themesDe('').map(optionTheme).join('');
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
        <span class="aide">Le plus proche de votre idée — « Autre » sinon. <a href="/themes">Voir les thèmes et leurs sujets</a>.</span>
        ${erreurs?.theme ? `<p class="champ-erreur" role="alert">${e(erreurs.theme)}</p>` : ''}
        <select id="theme" name="theme" required>${themesOptions}</select>
      </div>
      <div class="champ">
        <label for="niveau">Niveau territorial concerné</label>
        ${erreurs?.niveau ? `<p class="champ-erreur" role="alert">${e(erreurs.niveau)}</p>` : ''}
        <select id="niveau" name="niveau" required>${niveauxOptions}</select>
      </div>
      ${champTexte({ nom: 'pseudo', libelle: 'Pseudonyme', aide: 'Le nom qui sera affiché. Il ne dit pas qui vous êtes — c’est le principe.', erreur: erreurs?.pseudo, valeur: valeur(valeurs, 'pseudo'), tailleMax: BORNES.pseudo[1] })}
      ${champsImpact(valeurs, erreurs)}
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
        <li><strong>Ce qu'on garde&nbsp;:</strong> le contenu de votre idée (chiffrage compris),
        le pseudonyme choisi, le thème, la date. Aucune adresse e-mail.</li>
        <li><strong>Ce qu'on ne garde pas&nbsp;:</strong> pas de compte, pas de trace de navigation
        profilée, pas de cookie publicitaire, pas d'adresse IP en clair. Pour qu'un avis
        (d'accord, pas d'accord, jugement de l'arbitrage) ne compte qu'une fois, seule une
        empreinte illisible est conservée — différente pour chaque idée, si bien que vos avis
        sur plusieurs idées ne peuvent pas être reliés entre eux.</li>
        <li><strong>Vos droits&nbsp;:</strong> retirer votre consentement, faire supprimer ou
        rectifier une idée, récupérer son contenu — écrivez à
        <a href="mailto:contact@ratiopol.fr">contact@ratiopol.fr</a>, réponse sous
        30 jours. La suppression retire l'idée et ses avis.</li>
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
  <td>${i.avis.pour} / ${i.avis.contre} / ${i.avis.sansAvis}</td>
  <td>${i.avis.arbComplet} / ${i.avis.arbPartiel} / ${i.avis.arbIncomplet}</td>
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
        <th>Idée</th><th>Pseudo</th><th>Thème</th><th>D’accord / pas / sans avis</th><th>Arbitrage complet / partiel / incomplet</th><th>Actions</th>
      </tr></thead>
      <tbody>${lignes}</tbody>
    </table>
  </section>
</div>`;
  return squelette({ titre: 'Modération — RatioPol', description: 'Tableau de modération.', contenu, assets });
}
