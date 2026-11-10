// serveur/serveur.ts — LA BOUCLE HTTP, MINCE.
//
// Elle ouvre des sockets, décode des formulaires, appelle le dépôt et rend
// des pages. AUCUNE règle métier ne vit ici : le gabarit juge dans
// gabarit.ts, les données vivent derrière l'interface Depot, le rendu dans
// rendu.ts. La règle vient de MateMaterial : plomberie mince, traversée pour
// de vrai par les tests (test/http.test.mjs parle HTTP sur de vraies sockets).
//
// LES GARDE-FOUS (un serveur public est exposé, sans exception) :
//  · corps de requête plafonné (64 Kio — le formulaire le plus gros fait
//    ~7 Kio) ;
//  · rythme plafonné par empreinte : dépôts, soutiens, signalements, essais
//    de connexion admin ;
//  · champ-piège anti-robots (honeypot) sur le dépôt ;
//  · en-têtes de sécurité sur TOUTES les réponses (CSP sans exception
//    possible, nosniff, referrer) ;
//  · HTML form-encodé seulement : pas de JSON entrant à valider.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import type { Depot } from './depot';
import { slugDepuisTitre, valideEntree, type ValeursBrutes } from './gabarit';
import { DepotMemoire } from './depot-memoire';
import {
  cookieAdmin,
  cookieAdminEfface,
  empreinteIp,
  ipDe,
  jetonAdminValide,
  Limiteur,
  lisCookies,
  motDePasseValide,
  COOKIE_ADMIN,
  fabriqueJetonAdmin,
} from './securite';
import * as rendu from './rendu';
import type { Assets } from './rendu';
import { THEMES } from './themes';

export { DepotMemoire } from './depot-memoire';
export { slugDepuisTitre, valideEntree, nettoie } from './gabarit';
export { echappe, empreinteIp, empreinteMotDePasse, motDePasseValide, Limiteur } from './securite';
export { BUDGET_ETAT, FINANCES_PUBLIQUES, ÉVOLUTION } from './reperes';
export { THEMES } from './themes';
export type { Assets } from './rendu';

export interface OptionsServeur {
  depot: Depot;
  /** Secret long et aléatoire : empreintes, jetons admin. */
  sel: string;
  /** sel$hash scrypt — si absent, /admin répond « non configuré ». */
  empreinteMdpAdmin?: string;
  assets: Assets;
  /** Répertoire des fichiers statiques (défaut : dist/statique à côté du bundle). */
  racineStatique?: string;
  /** Origine publique (https://ratiopol.fr) pour le sitemap. */
  origine?: string;
  /** Pour les tests : horloge et empreinte injectables. */
  maintenant?: () => number;
}

const TAILLE_CORPS_MAX = 64 * 1024;

const TYPES_MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function enTetesSecurite(res: ServerResponse): void {
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function envoieTexte(res: ServerResponse, code: number, corps: string, type = 'text/html; charset=utf-8'): void {
  enTetesSecurite(res);
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(corps) });
  res.end(corps);
}

function redirige(res: ServerResponse, chemin: string): void {
  enTetesSecurite(res);
  res.writeHead(303, { Location: chemin });
  res.end();
}

/** Le client veut-il du JSON (le JS de la page demande du JSON, le
 *  formulaire sans-JS suit la redirection) ? */
function veutJson(req: IncomingMessage): boolean {
  return (req.headers.accept ?? '').includes('application/json');
}

async function lisFormulaire(req: IncomingMessage): Promise<URLSearchParams | null> {
  const longueur = Number(req.headers['content-length'] ?? 0);
  if (!Number.isFinite(longueur) || longueur > TAILLE_CORPS_MAX) return null;
  const morceaux: Buffer[] = [];
  let total = 0;
  for await (const morceau of req) {
    total += (morceau as Buffer).length;
    if (total > TAILLE_CORPS_MAX) return null;
    morceaux.push(morceau as Buffer);
  }
  return new URLSearchParams(Buffer.concat(morceaux).toString('utf8'));
}

function versBrutes(form: URLSearchParams): ValeursBrutes {
  return {
    titre: form.get('titre') ?? undefined,
    probleme: form.get('probleme') ?? undefined,
    proposition: form.get('proposition') ?? undefined,
    beneficiaires: form.get('beneficiaires') ?? undefined,
    arbitrage: form.get('arbitrage') ?? undefined,
    indicateur: form.get('indicateur') ?? undefined,
    theme: form.get('theme') ?? undefined,
    niveau: form.get('niveau') ?? undefined,
    pseudo: form.get('pseudo') ?? undefined,
    email: form.get('email') ?? undefined,
    consentement: form.get('consentement') ?? undefined,
  };
}

function suffixeAleatoire(): string {
  return Math.random().toString(36).slice(2, 7);
}

async function sertStatique(racine: string, chemin: string, res: ServerResponse): Promise<void> {
  // Chemin aseptisé : sous dist/statique, jamais de remontée.
  const propre = normalize(chemin).replace(/^(\.\.[/\\])+/, '');
  const fichier = join(racine, propre);
  if (!fichier.startsWith(racine)) {
    envoieTexte(res, 404, 'introuvable', 'text/plain; charset=utf-8');
    return;
  }
  try {
    const infos = await stat(fichier);
    if (!infos.isFile()) throw new Error('pas un fichier');
    const octets = await readFile(fichier);
    const ext = fichier.slice(fichier.lastIndexOf('.'));
    enTetesSecurite(res);
    res.writeHead(200, {
      'Content-Type': TYPES_MIME[ext] ?? 'application/octet-stream',
      'Content-Length': octets.length,
      // Noms empreintés par build.mjs : immuables, cache un an.
      'Cache-Control': propre === 'favicon.svg' ? 'public, max-age=86400' : 'public, max-age=31536000, immutable',
    });
    res.end(octets);
  } catch {
    envoieTexte(res, 404, 'introuvable', 'text/plain; charset=utf-8');
  }
}

export function creeServeur(opts: OptionsServeur): Server {
  const { depot, sel, empreinteMdpAdmin, assets } = opts;
  const racineStatique = opts.racineStatique ?? join(process.cwd(), 'dist', 'statique');
  const origine = opts.origine ?? '';
  const maintenant = opts.maintenant ?? Date.now;

  // Les plafonds de rythme, par empreinte d'IP.
  const limiteur = new Limiteur();
  const PLAFONDS = {
    depot: { max: 5, fenetre: 10 * 60 * 1000 },
    soutien: { max: 20, fenetre: 60 * 1000 },
    signalement: { max: 10, fenetre: 60 * 60 * 1000 },
    connexion: { max: 10, fenetre: 60 * 60 * 1000 },
  } as const;

  async function sitemapXml(): Promise<string> {
    const idees = await depot.liste({ limite: 100 });
    const urls = idees
      .map((i) => `  <url><loc>${origine}/idee/${i.slug}</loc></url>`)
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origine}/</loc></url>
  <url><loc>${origine}/proposer</loc></url>
  <url><loc>${origine}/themes</loc></url>
  <url><loc>${origine}/reperes</loc></url>
${urls}
</urlset>`;
  }

  return createServer(async (req, res) => {
    try {
      await traite(req, res);
    } catch (erreur) {
      console.error('erreur non traitée', erreur);
      if (!res.headersSent) envoieTexte(res, 500, 'erreur interne', 'text/plain; charset=utf-8');
      else res.end();
    }
  });

  async function traite(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'local'}`);
    const chemin = url.pathname;
    // HEAD se traite comme GET : les outils de suivi sonnent en HEAD et un
    // 404 les aurait déclenchés à tort. Node retire le corps d'une réponse
    // HEAD tout seul (_hasBody), on n'envoie donc rien en trop.
    const methode = req.method === 'HEAD' ? 'GET' : req.method ?? 'GET';
    const ip = ipDe(req);
    const empreinte = empreinteIp(ip, sel, new Date(maintenant()));
    const veJ = veutJson(req);

    // ---- Journal de visites (contrat maison : nginx journalise, on répond 204)
    if (chemin === '/_vu') {
      enTetesSecurite(res);
      res.writeHead(204);
      res.end();
      return;
    }
    if (chemin === '/sante') {
      envoieTexte(res, 200, 'ok', 'text/plain; charset=utf-8');
      return;
    }

    // ---- Statiques
    if (methode === 'GET' && (chemin.startsWith('/statique/') || chemin === '/favicon.ico')) {
      if (chemin === '/favicon.ico') {
        redirige(res, '/statique/favicon.svg');
        return;
      }
      await sertStatique(racineStatique, chemin.slice('/statique/'.length), res);
      return;
    }
    if (methode === 'GET' && chemin === '/robots.txt') {
      envoieTexte(res, 200, 'User-agent: *\nAllow: /\nDisallow: /admin\n', 'text/plain; charset=utf-8');
      return;
    }
    if (methode === 'GET' && chemin === '/sitemap.xml') {
      envoieTexte(res, 200, await sitemapXml(), 'application/xml; charset=utf-8');
      return;
    }

    // ---- Pages lecture
    if (methode === 'GET' && chemin === '/') {
      const [recentes, soutenues] = await Promise.all([
        depot.liste({ tri: 'recent', limite: 12 }),
        depot.liste({ tri: 'soutenus', limite: 6 }),
      ]);
      envoieTexte(res, 200, rendu.pageAccueil(recentes, soutenues, assets));
      return;
    }
    if (methode === 'GET' && chemin === '/themes') {
      envoieTexte(res, 200, rendu.pageThemes(assets));
      return;
    }
    if (methode === 'GET' && chemin.startsWith('/theme/')) {
      const id = chemin.slice('/theme/'.length);
      if (!THEMES.some((t) => t.id === id)) {
        envoieTexte(res, 404, rendu.page404(assets));
        return;
      }
      const tri = url.searchParams.get('tri') === 'soutenus' ? 'soutenus' : 'recent';
      const idees = await depot.liste({ theme: id, tri, limite: 50 });
      envoieTexte(res, 200, rendu.pageTheme(id, idees, tri, assets));
      return;
    }
    if (methode === 'GET' && chemin === '/proposer') {
      envoieTexte(res, 200, rendu.pageProposer(assets));
      return;
    }
    if (methode === 'GET' && chemin.startsWith('/idee/')) {
      const slug = chemin.slice('/idee/'.length).replace(/\/$/, '');
      const idee = await depot.ideeParSlug(slug);
      if (!idee) {
        envoieTexte(res, 404, rendu.page404(assets));
        return;
      }
      envoieTexte(res, 200, rendu.pageIdee(idee, url.searchParams.get('merci') === '1', assets));
      return;
    }
    if (methode === 'GET' && chemin === '/recherche') {
      const q = (url.searchParams.get('q') ?? '').slice(0, 100).trim();
      const idees = q === '' ? [] : await depot.liste({ recherche: q, limite: 50 });
      envoieTexte(res, 200, rendu.pageRecherche(q, idees, assets));
      return;
    }
    // La feuille de données des graphiques de /reperes (la CSP interdit le
    // style inline : les valeurs calculées passent par cette feuille même
    // origine, que la page lie dans son head).
    if (methode === 'GET' && chemin === '/graphiques.css') {
      envoieTexte(res, 200, rendu.feuilleGraphiques(), 'text/css; charset=utf-8');
      return;
    }
    if (methode === 'GET' && chemin === '/reperes') {
      // Vue du graphique : lien ?vue=camembert, défaut barres — tout inconnu
      // retombe sur le défaut (pas de page cassée par un mauvais lien).
      const vue = url.searchParams.get('vue') === 'camembert' ? 'camembert' : 'barres';
      envoieTexte(res, 200, rendu.pageReperes(assets, vue));
      return;
    }
    if (methode === 'GET' && chemin === '/apropos') {
      envoieTexte(res, 200, rendu.pageAPropos(assets));
      return;
    }
    if (methode === 'GET' && chemin === '/moderation') {
      envoieTexte(res, 200, rendu.pageModeration(assets));
      return;
    }
    if (methode === 'GET' && chemin === '/mentions') {
      envoieTexte(res, 200, rendu.pageMentions(assets));
      return;
    }

    // ---- Dépôt d'une idée
    if (methode === 'POST' && chemin === '/proposer') {
      if (!limiteur.autorise(`depot:${empreinte}`, PLAFONDS.depot.max, PLAFONDS.depot.fenetre, maintenant())) {
        envoieTexte(res, 429, 'Trop d’envois — revenez dans quelques minutes.', 'text/plain; charset=utf-8');
        return;
      }
      const form = await lisFormulaire(req);
      if (!form) {
        envoieTexte(res, 413, 'formulaire trop volumineux', 'text/plain; charset=utf-8');
        return;
      }
      // Champ-piège rempli = automate : on refuse sans indice.
      if ((form.get('site-web') ?? '') !== '') {
        envoieTexte(res, 403, 'refusé', 'text/plain; charset=utf-8');
        return;
      }
      const brutes = versBrutes(form);
      const { erreurs, entree } = valideEntree(brutes);
      if (!entree) {
        if (veJ) {
          enTetesSecurite(res);
          res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ erreurs }));
          return;
        }
        envoieTexte(res, 422, rendu.pageProposer(assets, brutes, erreurs));
        return;
      }
      const slug = `${slugDepuisTitre(entree.titre)}-${suffixeAleatoire()}`;
      const idee = await depot.cree({ ...entree, slug }, empreinte);
      if (veJ) {
        enTetesSecurite(res);
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ slug: idee.slug }));
        return;
      }
      redirige(res, `/idee/${idee.slug}`);
      return;
    }

    // ---- Soutien
    const mSoutien = chemin.match(/^\/idee\/([^/]+)\/soutien$/);
    if (methode === 'POST' && mSoutien) {
      const slug = mSoutien[1]!;
      if (!limiteur.autorise(`soutien:${empreinte}`, PLAFONDS.soutien.max, PLAFONDS.soutien.fenetre, maintenant())) {
        envoieTexte(res, 429, 'trop de soutiens à la suite', 'text/plain; charset=utf-8');
        return;
      }
      if (!(await lisFormulaire(req))) {
        envoieTexte(res, 413, 'corps refusé', 'text/plain; charset=utf-8');
        return;
      }
      try {
        const total = await depot.soutien(slug, empreinte);
        if (veJ) {
          enTetesSecurite(res);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ soutiens: total }));
          return;
        }
        redirige(res, `/idee/${slug}`);
      } catch {
        envoieTexte(res, 404, rendu.page404(assets));
      }
      return;
    }

    // ---- Signalement
    const mSignalement = chemin.match(/^\/idee\/([^/]+)\/signalement$/);
    if (methode === 'POST' && mSignalement) {
      const slug = mSignalement[1]!;
      if (!limiteur.autorise(`signalement:${empreinte}`, PLAFONDS.signalement.max, PLAFONDS.signalement.fenetre, maintenant())) {
        envoieTexte(res, 429, 'trop de signalements', 'text/plain; charset=utf-8');
        return;
      }
      const form = await lisFormulaire(req);
      if (!form) {
        envoieTexte(res, 413, 'corps refusé', 'text/plain; charset=utf-8');
        return;
      }
      try {
        await depot.signale(slug, (form.get('motif') ?? 'Autre').slice(0, 100), (form.get('message') ?? '').slice(0, 1000));
      } catch {
        envoieTexte(res, 404, rendu.page404(assets));
        return;
      }
      redirige(res, `/idee/${slug}?merci=1`);
      return;
    }

    // ---- Admin
    if (chemin === '/admin' || chemin.startsWith('/admin/')) {
      if (!empreinteMdpAdmin) {
        envoieTexte(res, 503, 'modération non configurée (RP_EMPREINTE_MDP_ADMIN absent)', 'text/plain; charset=utf-8');
        return;
      }
      const cookies = lisCookies(req.headers.cookie);
      const authentifie = jetonAdminValide(cookies.get(COOKIE_ADMIN), sel, maintenant());

      if (methode === 'GET' && chemin === '/admin') {
        if (!authentifie) {
          envoieTexte(res, 200, rendu.pageAdminConnexion(assets));
          return;
        }
        envoieTexte(res, 200, rendu.pageAdmin(await depot.pourAdmin(), assets));
        return;
      }
      if (methode === 'POST' && chemin === '/admin/connexion') {
        if (!limiteur.autorise(`connexion:${empreinte}`, PLAFONDS.connexion.max, PLAFONDS.connexion.fenetre, maintenant())) {
          envoieTexte(res, 429, 'trop d’essais', 'text/plain; charset=utf-8');
          return;
        }
        const form = await lisFormulaire(req);
        if (!form || !motDePasseValide(form.get('mdp') ?? '', empreinteMdpAdmin)) {
          envoieTexte(res, 403, rendu.pageAdminConnexion(assets, true));
          return;
        }
        enTetesSecurite(res);
        res.writeHead(303, { Location: '/admin', 'Set-Cookie': cookieAdmin(fabriqueJetonAdmin(sel, maintenant())) });
        res.end();
        return;
      }
      if (methode === 'POST' && authentifie) {
        const m = chemin.match(/^\/admin\/idee\/(\d+)\/(masquer|publier|supprimer)$/);
        const form = await lisFormulaire(req); // consomme le corps
        void form;
        if (!m) {
          envoieTexte(res, 404, rendu.page404(assets));
          return;
        }
        const id = Number(m[1]);
        try {
          if (m[2] === 'masquer') await depot.changeStatut(id, 'masquee');
          else if (m[2] === 'publier') await depot.changeStatut(id, 'publiee');
          else await depot.supprime(id);
        } catch {
          envoieTexte(res, 404, rendu.page404(assets));
          return;
        }
        redirige(res, '/admin');
        return;
      }

      if (methode === 'POST' && chemin === '/admin/deconnexion') {
        enTetesSecurite(res);
        res.writeHead(303, { Location: '/', 'Set-Cookie': cookieAdminEfface() });
        res.end();
        return;
      }

      // GET admin non authentifié sur une action → connexion.
      if (methode === 'GET') {
        envoieTexte(res, 200, rendu.pageAdminConnexion(assets));
        return;
      }
      envoieTexte(res, 403, rendu.pageAdminConnexion(assets));
      return;
    }

    envoieTexte(res, 404, rendu.page404(assets));
  }
}

/* ------------------------------------------------------------------ */
/* Point d'entrée (node dist/serveur.mjs)                             */
/* ------------------------------------------------------------------ */

const estPrincipal = process.argv[1]?.endsWith('serveur.mjs') ?? false;
if (estPrincipal) {
  const sel = process.env.RP_SEL;
  const urlPg = process.env.RP_PG_URL;
  if (!sel || !urlPg) {
    console.error('RP_SEL (secret long) et RP_PG_URL (base PostgreSQL) sont requis.');
    process.exit(1);
  }
  const { DepotPg } = await import('./postgres');
  const manifeste = JSON.parse(await readFile(join(process.cwd(), 'dist', 'manifeste.json'), 'utf8')) as Assets;
  const depot = new DepotPg(urlPg);
  const serveur = creeServeur({
    depot,
    sel,
    empreinteMdpAdmin: process.env.RP_EMPREINTE_MDP_ADMIN,
    assets: manifeste,
    origine: process.env.RP_ORIGINE,
  });
  const port = Number(process.env.RP_PORT ?? 8090);
  serveur.listen(port, '127.0.0.1', () => {
    console.log(`RatioPol écoute sur 127.0.0.1:${port}`);
  });
}
