// test/http.test.mjs — LE PARCOURS COMPLET, SUR DE VRAIES SOCKETS.
//
// Le serveur démarre pour de vrai (port éphémère, dépôt en mémoire) et ces
// tests lui parlent en HTTP. Dépôt → publication → soutien → signalement →
// modération, plus les garde-fous (gabarit, champ-piège, rythme, XSS,
// en-têtes de sécurité). La règle vient de MateMaterial : la plomberie se
// traverse pour de vrai — ici, sans exception levée à la main.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { creeServeur, DepotMemoire, empreinteMotDePasse } from '../dist/serveur.mjs';

const ASSETS = { js: '/statique/main-test.js', css: '/statique/page-test.css' };
const SEL = 'sel-de-test-assez-long';
const MDP_ADMIN = empreinteMotDePasse('le-mot-de-passe-du-test');

/** Une requête HTTP brute contre le serveur de test. Connection: close :
 *  sans lui, le keep-alive garde des sockets ouvertes et server.close()
 *  n'arrive jamais — les tests pendraient à la fin de chaque session. */
function requete(port, methode, chemin, corps, entetes = {}) {
  return new Promise((resoud, rejette) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: methode,
        path: chemin,
        agent: false,
        headers: { Connection: 'close', ...entetes },
      },
      (res) => {
        const morceaux = [];
        res.on('data', (m) => morceaux.push(m));
        res.on('end', () => {
          const corps = Buffer.concat(morceaux).toString('utf8');
          const cookies = {};
          for (const c of res.headers['set-cookie'] ?? []) {
            const [nom, valeur] = c.split(';')[0].split('=');
            cookies[nom.trim()] = decodeURIComponent(valeur ?? '');
          }
          resoud({ status: res.statusCode, entetes: res.headers, corps, cookies });
        });
      }
    );
    req.on('error', rejette);
    if (corps !== undefined) req.write(corps);
    req.end();
  });
}

function corpsValide(surcharge = {}) {
  return new URLSearchParams({
    titre: 'Encadrer les loyers des résidences étudiantes à Paris',
    probleme:
      'Les loyers des résidences étudiantes parisiennes ont augmenté de 32 % en dix ans, pendant que les bourses restaient fixes.',
    proposition:
      'Étendre l’encadrement des loyers aux résidences étudiantes gérées par des opérateurs privés sous convention CROUS.',
    beneficiaires: 'Les 600 000 étudiants des zones tendues, qui verraient leur loyer plafonné.',
    arbitrage: 'Le plafonnement pèse sur les rendements privés, compensés par une caution publique.',
    indicateur: 'Le loyer médian des résidences étudiantes, publié par l’OLAP.',
    theme: 'logement',
    niveau: 'etat',
    pseudo: 'Lou',
    consentement: 'on',
    ...surcharge,
  }).toString();
}

/** Démarre un serveur neuf et retourne { port, ferme } — un par test qui
 *  dépose, pour ne jamais partager le plafond de rythme des dépôts. */
async function demarre() {
  const serveur = creeServeur({
    depot: new DepotMemoire(),
    sel: SEL,
    empreinteMdpAdmin: MDP_ADMIN,
    assets: ASSETS,
  });
  await new Promise((resoud) => serveur.listen(0, '127.0.0.1', resoud));
  return { port: serveur.address().port, ferme: () => serveur.close() };
}

test("l'accueil répond, avec ses en-têtes de sécurité", async () => {
  const { port, ferme } = await demarre();
  const r = await requete(port, 'GET', '/');
  assert.equal(r.status, 200);
  assert.match(r.corps, /RatioPol/);
  assert.match(r.entetes['content-security-policy'] ?? '', /default-src 'self'/);
  assert.equal(r.entetes['x-content-type-options'], 'nosniff');
  // Le lien vers les assets passe bien par le manifeste.
  assert.match(r.corps, /main-test\.js/);
  ferme();
});

test('HEAD est traité comme GET, sans corps', async () => {
  const { port, ferme } = await demarre();
  const r = await requete(port, 'HEAD', '/');
  assert.equal(r.status, 200);
  assert.equal(r.corps, '');
  ferme();
});

test('parcours complet : dépôt, page, soutiens dédupliqués, signalement', async () => {
  const { port, ferme } = await demarre();

  // Le formulaire nu répond.
  assert.equal((await requete(port, 'GET', '/proposer')).status, 200);

  // Dépôt conforme → redirection vers la page de l'idée.
  const post = await requete(port, 'POST', '/proposer', corpsValide(), {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  assert.equal(post.status, 303);
  const slug = post.entetes.location.replace('/idee/', '');
  assert.match(slug, /^encadrer-les-loyers-des-residences-etudiantes-a-\w{5}$/);

  // La page de l'idée existe et porte le contenu.
  const page = await requete(port, 'GET', `/idee/${slug}`);
  assert.equal(page.status, 200);
  assert.match(page.corps, /Encadrer les loyers/);
  assert.match(page.corps, /arbitrage — qui paie/);

  // Deux soutiens de la même empreinte ne comptent qu'une fois (JSON).
  const s1 = await requete(port, 'POST', `/idee/${slug}/soutien`, '', { Accept: 'application/json' });
  const s2 = await requete(port, 'POST', `/idee/${slug}/soutien`, '', { Accept: 'application/json' });
  assert.equal(JSON.parse(s1.corps).soutiens, 1);
  assert.equal(JSON.parse(s2.corps).soutiens, 1);

  // L'accueil montre l'idée et son soutien.
  const accueil = await requete(port, 'GET', '/');
  assert.match(accueil.corps, /1 soutien/);

  // Un signalement passe et ramène la page avec le remerciement.
  const sig = await requete(port, 'POST', `/idee/${slug}/signalement`, 'motif=Autre&message=', {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  assert.equal(sig.status, 303);
  assert.equal(sig.entetes.location, `/idee/${slug}?merci=1`);
  assert.match((await requete(port, 'GET', `/idee/${slug}?merci=1`)).corps, /Signalement enregistré/);

  ferme();
});

test('hors gabarit : le formulaire revient avec des erreurs humaines', async () => {
  const { port, ferme } = await demarre();
  const r = await requete(port, 'POST', '/proposer', corpsValide({ probleme: 'injuste' }), {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  assert.equal(r.status, 422);
  assert.match(r.corps, /n.{0,2}est pas publiée/);
  assert.match(r.corps, /60 à 2000 caractères/);
  // En JSON, pour le JS de la page : les erreurs par champ.
  const j = await requete(port, 'POST', '/proposer', corpsValide({ probleme: 'injuste' }), {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  });
  assert.equal(j.status, 422);
  assert.ok(JSON.parse(j.corps).erreurs.probleme);
  ferme();
});

test('le champ-piège refuse les automates', async () => {
  const { port, ferme } = await demarre();
  const r = await requete(port, 'POST', '/proposer', corpsValide({ 'site-web': 'http://spam.example' }), {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  assert.equal(r.status, 403);
  ferme();
});

test('le rythme des dépôts est plafonné', async () => {
  const { port, ferme } = await demarre();
  const entetes = { 'Content-Type': 'application/x-www-form-urlencoded' };
  let dernier;
  for (let i = 0; i < 6; i++) {
    dernier = await requete(port, 'POST', '/proposer', corpsValide({ titre: `Idée numéro ${i} suffisamment longue` }), entetes);
  }
  assert.equal(dernier.status, 429);
  ferme();
});

test('le contenu d’un visiteur ne traverse jamais le HTML tel quel', async () => {
  const { port, ferme } = await demarre();
  const piege = '<script>alert("xss")</script> Et du texte pour atteindre la longueur minimale du champ, voilà.';
  const r = await requete(port, 'POST', '/proposer', corpsValide({ probleme: piege }), {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  assert.equal(r.status, 303);
  const page = await requete(port, 'GET', `/idee/${r.entetes.location.replace('/idee/', '')}`);
  assert.ok(!page.corps.includes('<script>alert'), 'le script ne doit pas survivre');
  assert.match(page.corps, /&lt;script&gt;/);
  ferme();
});

test('pages secondaires, recherche, thème, fichiers divers', async () => {
  const { port, ferme } = await demarre();
  await requete(port, 'POST', '/proposer', corpsValide(), {
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  assert.equal((await requete(port, 'GET', '/themes')).status, 200);
  assert.equal((await requete(port, 'GET', '/theme/logement')).status, 200);
  assert.equal((await requete(port, 'GET', '/theme/inconnu')).status, 404);
  assert.equal((await requete(port, 'GET', '/apropos')).status, 200);
  assert.equal((await requete(port, 'GET', '/moderation')).status, 200);
  assert.equal((await requete(port, 'GET', '/mentions')).status, 200);
  assert.equal((await requete(port, 'GET', '/_vu')).status, 204);
  assert.equal((await requete(port, 'GET', '/sante')).status, 200);
  assert.match((await requete(port, 'GET', '/robots.txt')).corps, /Disallow: \/admin/);

  const recherche = await requete(port, 'GET', '/recherche?q=loyers');
  assert.match(recherche.corps, /Encadrer les loyers/);
  const vide = await requete(port, 'GET', '/recherche?q=zzzzrien');
  assert.match(vide.corps, /Aucune idée ici/);
  ferme();
});

test('modération : connexion, masquage, republication, suppression', async () => {
  const { port, ferme } = await demarre();
  const entetes = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const depot = await requete(port, 'POST', '/proposer', corpsValide(), entetes);
  assert.equal(depot.status, 303);

  // Sans session : le formulaire de connexion.
  assert.match((await requete(port, 'GET', '/admin')).corps, /Mot de passe/);

  // Mauvais mot de passe.
  assert.equal((await requete(port, 'POST', '/admin/connexion', 'mdp=faux', entetes)).status, 403);

  // Bon mot de passe → cookie de session.
  const connexion = await requete(port, 'POST', '/admin/connexion', 'mdp=le-mot-de-passe-du-test', entetes);
  assert.equal(connexion.status, 303);
  const cookie = `rp_admin=${connexion.cookies['rp_admin']}`;
  assert.ok(cookie.length > 10);

  // Le tableau liste l'idée ; on la masque, elle disparaît du public…
  const tableau = await requete(port, 'GET', '/admin', '', { Cookie: cookie });
  assert.match(tableau.corps, /Encadrer les loyers/);
  const slug = depot.entetes.location.replace('/idee/', '');
  const masque = await requete(port, 'POST', '/admin/idee/1/masquer', '', { Cookie: cookie });
  assert.equal(masque.status, 303);
  assert.equal((await requete(port, 'GET', `/idee/${slug}`)).status, 404);

  // …puis revient, puis disparaît pour de bon.
  assert.equal((await requete(port, 'POST', '/admin/idee/1/publier', '', { Cookie: cookie })).status, 303);
  assert.equal((await requete(port, 'GET', `/idee/${slug}`)).status, 200);
  assert.equal((await requete(port, 'POST', '/admin/idee/1/supprimer', '', { Cookie: cookie })).status, 303);
  assert.equal((await requete(port, 'GET', `/idee/${slug}`)).status, 404);

  // Une action admin SANS session ne passe pas.
  assert.equal((await requete(port, 'POST', '/admin/idee/1/masquer', '', {})).status, 403);
  ferme();
});

test('sans empreinte de mot de passe configurée, /admin est fermé', async () => {
  const serveur = creeServeur({ depot: new DepotMemoire(), sel: SEL, assets: ASSETS });
  await new Promise((resoud) => serveur.listen(0, '127.0.0.1', resoud));
  const port = serveur.address().port;
  assert.equal((await requete(port, 'GET', '/admin')).status, 503);
  serveur.close();
});

test('un slug de remontée ne sort jamais du répertoire statique', async () => {
  const { port, ferme } = await demarre();
  const r = await requete(port, 'GET', '/statique/../../serveur/serveur.ts');
  assert.equal(r.status, 404);
  ferme();
});
