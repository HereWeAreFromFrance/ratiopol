// test/http.test.mjs — LE PARCOURS COMPLET, SUR DE VRAIES SOCKETS.
//
// Le serveur démarre pour de vrai (port éphémère, dépôt en mémoire) et ces
// tests lui parlent en HTTP. Dépôt → publication → avis → signalement →
// modération, plus les garde-fous (gabarit, champ-piège, rythme, XSS,
// en-têtes de sécurité). La règle vient de MateMaterial : la plomberie se
// traverse pour de vrai — ici, sans exception levée à la main.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { creeServeur, DepotMemoire, empreinteAvis, empreinteMotDePasse, BUDGET_ETAT, FINANCES_PUBLIQUES, ÉVOLUTION, POSTES_CIBLES, FAMILLES, FICHES, THEMES } from '../dist/serveur.mjs';

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
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const r = await requete(port, 'GET', '/');
    assert.equal(r.status, 200);
    assert.match(r.corps, /RatioPol/);
    assert.match(r.entetes['content-security-policy'] ?? '', /default-src 'self'/);
    assert.equal(r.entetes['x-content-type-options'], 'nosniff');
    // Le lien vers les assets passe bien par le manifeste.
    assert.match(r.corps, /main-test\.js/);
    // « La France en chiffres » : la section, ses trois chiffres, ses
    // deux portes de sortie et la feuille de données des graphiques.
    assert.match(r.corps, /La France en chiffres/);
    for (const chiffre of ['57,3', '5,1', '119,0']) {
      assert.ok(r.corps.includes(chiffre), `chiffre manquant à l'accueil : ${chiffre}`);
    }
    assert.match(r.corps, /href="\/reperes"/);
    assert.match(r.corps, /href="\/proposer"/);
    assert.match(r.corps, /\/graphiques\.css/);
    // Les grands thèmes, directement visibles : les six familles et
    // chaque thème (hors « Autre »), avant « La France en chiffres ».
    assert.ok(r.corps.indexOf('Les grands thèmes') < r.corps.indexOf('La France en chiffres'));
    for (const t of THEMES.filter((x) => x.id !== 'autre')) {
      assert.ok(r.corps.includes(`href="/theme/${t.id}"`), `thème absent de l'accueil : ${t.id}`);
    }

  } finally {
    ferme();
  }
});

test('HEAD est traité comme GET, sans corps', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const r = await requete(port, 'HEAD', '/');
    assert.equal(r.status, 200);
    assert.equal(r.corps, '');

  } finally {
    ferme();
  }
});

test('parcours complet : dépôt, page, avis dédupliqués et modifiables, signalement', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {

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

    // La page offre les deux questions, sans avis enfoncé au départ.
    assert.match(page.corps, /name="position" value="contre" aria-pressed="false"/);
    assert.match(page.corps, /name="arbitrage" value="partiel"/);
    assert.doesNotMatch(page.corps, /aria-pressed="true"/);

    // Deux « d'accord » de la même adresse ne comptent qu'une fois (JSON).
    const json = { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' };
    const a1 = await requete(port, 'POST', `/idee/${slug}/avis`, 'position=pour', json);
    const a2 = await requete(port, 'POST', `/idee/${slug}/avis`, 'position=pour', json);
    assert.equal(JSON.parse(a1.corps).decompte.pour, 1);
    assert.equal(JSON.parse(a2.corps).decompte.pour, 1);

    // Le jugement de l'arbitrage s'ajoute sans toucher à la position…
    const a3 = JSON.parse((await requete(port, 'POST', `/idee/${slug}/avis`, 'arbitrage=partiel', json)).corps);
    assert.deepEqual(a3.avis, { position: 'pour', arbitrage: 'partiel' });
    assert.equal(a3.decompte.arbPartiel, 1);
    // …et la position se change : elle passe de « pour » à « contre ».
    const a4 = JSON.parse((await requete(port, 'POST', `/idee/${slug}/avis`, 'position=contre', json)).corps);
    assert.equal(a4.decompte.pour, 0);
    assert.equal(a4.decompte.contre, 1);
    assert.equal(a4.avis.arbitrage, 'partiel');

    // Un avis vide ou inventé est refusé.
    assert.equal((await requete(port, 'POST', `/idee/${slug}/avis`, 'position=adore', json)).status, 400);
    // Une idée inconnue : 404.
    assert.equal((await requete(port, 'POST', '/idee/nulle-part/avis', 'position=pour', json)).status, 404);

    // Sans JS : POST natif → retour à la section des avis.
    const natif = await requete(port, 'POST', `/idee/${slug}/avis`, 'position=sans-avis', {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    assert.equal(natif.status, 303);
    assert.equal(natif.entetes.location, `/idee/${slug}#avis`);

    // La page montre l'avis déjà donné depuis cette adresse.
    const relue = await requete(port, 'GET', `/idee/${slug}`);
    assert.match(relue.corps, /value="sans-avis" aria-pressed="true"/);
    assert.match(relue.corps, /value="partiel" aria-pressed="true"/);
    assert.match(relue.corps, /value="pour" aria-pressed="false"/);

    // L'ancienne porte /soutien (pages en cache) vaut « d'accord ».
    const vieux = JSON.parse((await requete(port, 'POST', `/idee/${slug}/soutien`, '', json)).corps);
    assert.equal(vieux.decompte.pour, 1);
    assert.equal(vieux.decompte.sansAvis, 0);

    // L'accueil montre l'idée et son décompte.
    const accueil = await requete(port, 'GET', '/');
    assert.match(accueil.corps, /1 d’accord · 0 pas d’accord/);

    // Un signalement passe et ramène la page avec le remerciement.
    const sig = await requete(port, 'POST', `/idee/${slug}/signalement`, 'motif=Autre&message=', {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    assert.equal(sig.status, 303);
    assert.equal(sig.entetes.location, `/idee/${slug}?merci=1`);
    assert.match((await requete(port, 'GET', `/idee/${slug}?merci=1`)).corps, /Signalement enregistré/);


  } finally {
    ferme();
  }
});

test('hors gabarit : le formulaire revient avec des erreurs humaines', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
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

  } finally {
    ferme();
  }
});

test('le champ-piège refuse les automates', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const r = await requete(port, 'POST', '/proposer', corpsValide({ 'site-web': 'http://spam.example' }), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    assert.equal(r.status, 403);

  } finally {
    ferme();
  }
});

test('le rythme des dépôts est plafonné', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const entetes = { 'Content-Type': 'application/x-www-form-urlencoded' };
    let dernier;
    for (let i = 0; i < 6; i++) {
      dernier = await requete(port, 'POST', '/proposer', corpsValide({ titre: `Idée numéro ${i} suffisamment longue` }), entetes);
    }
    assert.equal(dernier.status, 429);

  } finally {
    ferme();
  }
});

test('le contenu d’un visiteur ne traverse jamais le HTML tel quel', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const piege = '<script>alert("xss")</script> Et du texte pour atteindre la longueur minimale du champ, voilà.';
    const r = await requete(port, 'POST', '/proposer', corpsValide({ probleme: piege }), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    assert.equal(r.status, 303);
    const page = await requete(port, 'GET', `/idee/${r.entetes.location.replace('/idee/', '')}`);
    assert.ok(!page.corps.includes('<script>alert'), 'le script ne doit pas survivre');
    assert.match(page.corps, /&lt;script&gt;/);

  } finally {
    ferme();
  }
});

test('pages secondaires, recherche, thème, fichiers divers', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser un
  // serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    await requete(port, 'POST', '/proposer', corpsValide(), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    assert.equal((await requete(port, 'GET', '/themes')).status, 200);
    assert.equal((await requete(port, 'GET', '/theme/logement')).status, 200);
    assert.equal((await requete(port, 'GET', '/theme/inconnu')).status, 404);
    assert.equal((await requete(port, 'GET', '/apropos')).status, 200);
    const reperes = await requete(port, 'GET', '/reperes');
    assert.equal(reperes.status, 200);
    // La page porte les chiffres et renvoie vers la source officielle.
    assert.match(reperes.corps, /Enseignement scolaire/);
    assert.match(reperes.corps, /budget\.gouv\.fr/);
    assert.match(reperes.corps, /insee\.fr/);
    // La vue camembert existe ; le conic-gradient vit dans la feuille de
    // données /graphiques.css (la CSP interdit le style inline). La courbe
    // d'évolution est un SVG inline sur la vue par défaut. Une vue inconnue
    // retombe sur les barres (pas de page cassée par un mauvais lien).
    const came = await requete(port, 'GET', '/reperes?vue=camembert');
    assert.equal(came.status, 200);
    assert.match(came.corps, /reperes-came-cercle/);
    assert.match(came.corps, /rcc-came-d/);
    assert.match(came.corps, /\/graphiques\.css/);
    const feuille = await requete(port, 'GET', '/graphiques.css');
    assert.equal(feuille.status, 200);
    assert.match(feuille.entetes['content-type'] ?? '', /text\/css/);
    assert.match(feuille.corps, /conic-gradient/);
    assert.match(feuille.corps, /\.rcw-d0 \{ width: 100%/);
    // Les pastilles de la légende de la courbe ont leurs classes DÉDIÉES,
    // alignées sur les traits : dépenses = série 1, recettes = série 2.
    // (Le bug historique : rcc-r0, classe du camembert des recettes, valait
    // série 1 — la légende montrait bleu pour un trait orange.)
    assert.match(feuille.corps, /\.rcc-courbe-d \{ background: var\(--r-serie-1\)/);
    assert.match(feuille.corps, /\.rcc-courbe-r \{ background: var\(--r-serie-2\)/);
    assert.ok(!reperes.corps.includes('rcc-r0'), 'la légende de courbe ne réutilise plus les classes camembert');
    assert.match(reperes.corps, /<svg/);
    assert.match(reperes.corps, /polyline/);
    assert.match(reperes.corps, /rcw-d0/);
    assert.ok(!reperes.corps.includes('rcc-came-'), 'la vue barres ne trace pas de camembert');
    const vueFausse = await requete(port, 'GET', '/reperes?vue=camembert3d');
    assert.equal(vueFausse.status, 200);
    assert.ok(!vueFausse.corps.includes('rcc-came-'));
    assert.equal((await requete(port, 'GET', '/moderation')).status, 200);
    assert.equal((await requete(port, 'GET', '/mentions')).status, 200);
    assert.equal((await requete(port, 'GET', '/_vu')).status, 204);
    assert.equal((await requete(port, 'GET', '/sante')).status, 200);
    assert.match((await requete(port, 'GET', '/robots.txt')).corps, /Disallow: \/admin/);

    const recherche = await requete(port, 'GET', '/recherche?q=loyers');
    assert.match(recherche.corps, /Encadrer les loyers/);
    const vide = await requete(port, 'GET', '/recherche?q=zzzzrien');
    assert.match(vide.corps, /Aucune idée ici/);
  } finally {
    ferme();
  }
});

test('modération : connexion, masquage, republication, suppression', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
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

  } finally {
    ferme();
  }
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
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const r = await requete(port, 'GET', '/statique/../../serveur/serveur.ts');
    assert.equal(r.status, 404);

  } finally {
    ferme();
  }
});

test('l’impact chiffré : formulaire, page, part du poste officiel', async () => {
  const { port, ferme } = await demarre();
  try {
    const formulaire = (await requete(port, 'GET', '/proposer')).corps;
    // Plus de champ e-mail ; les trois champs d'impact, optionnels.
    assert.doesNotMatch(formulaire, /name="email"/);
    for (const champ of ['effet', 'montant', 'unite', 'poste']) assert.match(formulaire, new RegExp(`name="${champ}"`));
    assert.match(formulaire, /<option value="etat-justice">Justice — 13,0 Md€<\/option>/);

    const entetes = { 'Content-Type': 'application/x-www-form-urlencoded' };
    // Incohérent : un montant sans sens → le formulaire revient, valeurs gardées.
    const ko = await requete(port, 'POST', '/proposer', corpsValide({ montant: '650', unite: 'M', poste: 'etat-justice' }), entetes);
    assert.equal(ko.status, 422);
    assert.match(ko.corps, /coûte ou rapporte/);
    assert.match(ko.corps, /value="650"/);
    assert.match(ko.corps, /<option value="etat-justice" selected>/);

    // Cohérent : 650 M€ sur la Justice (13,0 Md€) → 5,0 %.
    const ok = await requete(port, 'POST', '/proposer', corpsValide({ effet: 'cout', montant: '650', unite: 'M', poste: 'etat-justice' }), entetes);
    assert.equal(ok.status, 303);
    const page = (await requete(port, 'GET', ok.entetes.location)).corps;
    assert.match(page, /L’impact chiffré — estimation de l’auteur/);
    assert.match(page, /650\u00a0M€ par an/);
    assert.match(page, /Soit 5,0\u00a0% du montant de ce poste/);
    assert.match(page, /Dépenses de l’État — LFI 2026/);
    // La carte d'accueil le résume.
    assert.match((await requete(port, 'GET', '/')).corps, /coûte ≈\u00a0650\u00a0M€\/an/);

    // Une idée non chiffrée le dit, sans plus.
    const nue = await requete(port, 'POST', '/proposer', corpsValide({ titre: 'Une autre idée de logement étudiant' }), entetes);
    assert.match((await requete(port, 'GET', nue.entetes.location)).corps, /L’auteur n’a pas chiffré cette idée/);
  } finally {
    ferme();
  }
});

test('l’empreinte d’avis : stable dans le temps, propre à chaque idée', () => {
  const a = empreinteAvis('203.0.113.7', SEL, 'idee-a');
  // Pas de jour dans le hachage : demain, la même adresse est reconnue.
  assert.equal(a, empreinteAvis('203.0.113.7', SEL, 'idee-a'));
  // Une autre idée donne une autre empreinte : les avis d'une personne ne
  // se relient pas entre eux.
  assert.notEqual(a, empreinteAvis('203.0.113.7', SEL, 'idee-b'));
  assert.notEqual(a, empreinteAvis('203.0.113.8', SEL, 'idee-a'));
  assert.doesNotMatch(a, /203/);
});

test('les thèmes : exhaustifs, rangés en familles, tous joignables', async () => {
  // Ids uniques (ils sont stockés avec les idées), accroche partout.
  const ids = THEMES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'id de thème en double');
  for (const t of THEMES) assert.ok(t.accroche.length > 10, `accroche vide : ${t.id}`);
  // Chaque thème est dans une famille, sauf « Autre », le filet.
  for (const t of THEMES.filter((x) => x.id !== 'autre')) {
    assert.ok(FAMILLES.some((f) => f.id === t.famille), `thème sans famille : ${t.id}`);
  }
  // Des familles lisibles : ni vides, ni des murs.
  for (const f of FAMILLES) {
    const n = THEMES.filter((t) => t.famille === f.id).length;
    assert.ok(n >= 2 && n <= 6, `famille ${f.id} : ${n} thèmes`);
  }
  // Les anciens ids, stockés avec des idées, existent toujours.
  for (const ancien of ['logement', 'sante', 'ecole', 'travail', 'environnement', 'securite', 'impots', 'institutions', 'numerique', 'territoires', 'transports', 'autre']) {
    assert.ok(ids.includes(ancien), `ancien thème disparu : ${ancien}`);
  }

  const { port, ferme } = await demarre();
  try {
    const page = (await requete(port, 'GET', '/themes')).corps;
    for (const t of THEMES) assert.ok(page.includes(`href="/theme/${t.id}"`), `thème absent de /themes : ${t.id}`);
    for (const f of FAMILLES) assert.ok(page.includes(f.nom.replace('&', '&amp;').replace('’', '’')), `famille absente : ${f.nom}`);
    // Chaque page de thème répond, avec son accroche.
    for (const t of THEMES) {
      const r = await requete(port, 'GET', `/theme/${t.id}`);
      assert.equal(r.status, 200, t.id);
    }
    // Un thème rattaché à des postes montre ses chiffres officiels.
    assert.match((await requete(port, 'GET', '/theme/justice')).corps, /Justice&nbsp;: 13,0&nbsp;Md€/);
    // Le formulaire groupe les thèmes par famille ; un nouveau thème passe.
    const formulaire = (await requete(port, 'GET', '/proposer')).corps;
    assert.match(formulaire, /<optgroup label="Numérique"><option value="numerique">/);
    const depot = await requete(port, 'POST', '/proposer', corpsValide({ theme: 'ia' }), { 'Content-Type': 'application/x-www-form-urlencoded' });
    assert.equal(depot.status, 303);
  } finally {
    ferme();
  }
});

/** Les domaines des sources admises : statistique publique, administrations,
 *  institutions, autorités et organismes publics. Un nouveau domaine se
 *  justifie ici, par écrit — c'est la règle « source officielle ». */
const DOMAINES_OFFICIELS = [
  '.gouv.fr', 'insee.fr', 'europa.eu', 'senat.fr', 'assemblee-nationale.fr', 'ccomptes.fr', 'vie-publique.fr',
  'banque-france.fr', 'cnil.fr', 'arcep.fr', 'arcom.fr', 'cre.fr', 'citepa.org', 'rte-france.com', 'injep.fr',
  'caf.fr', 'cor-retraites.fr', 'conseil-constitutionnel.fr', 'defenseurdesdroits.fr', 'santepubliquefrance.fr',
  'elysee.fr', 'lecese.fr', 'securite-sociale.fr',
];
const officiel = (url) => {
  const hote = new URL(url).hostname;
  return url.startsWith('https://')
    && DOMAINES_OFFICIELS.some((d) => (d.startsWith('.') ? hote.endsWith(d) : hote === d || hote.endsWith('.' + d)));
};

test('les fiches « pour agir » : complètes, sourcées, officielles, sans jugement', async () => {
  // Chaque thème (sauf « Autre ») a sa fiche, plus les voies d'action.
  for (const t of THEMES.filter((x) => x.id !== 'autre')) {
    const f = FICHES.find((x) => x.theme === t.id);
    assert.ok(f, `fiche manquante : ${t.id}`);
    assert.ok(f.chiffres.length >= 5, `trop peu de chiffres : ${t.id}`);
    assert.ok(f.competences.length >= 2, `« qui décide » trop court : ${t.id}`);
  }
  assert.ok(FICHES.find((f) => f.theme === 'comment-agir').competences.length >= 5);
  // Aucun thème inconnu, aucune fiche en double.
  const ids = FICHES.map((f) => f.theme);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(id === 'comment-agir' || THEMES.some((t) => t.id === id), `fiche orpheline : ${id}`);

  // Un chiffre = un libellé, une valeur, un périmètre, une source, une URL
  // officielle, et l'extrait qui le prouve.
  const MOTS_DE_JUGEMENT = /\b(record|seulement|inquiétant|alarmant|explos|massi(f|ve)|catastroph|scandal|dramatique|à peine)/i;
  for (const f of FICHES) {
    assert.match(f.verifieeLe, /^\d{4}-\d{2}-\d{2}$/);
    for (const c of f.chiffres) {
      for (const champ of ['libelle', 'valeur', 'precision', 'source', 'url', 'extrait']) {
        assert.ok(typeof c[champ] === 'string' && c[champ].trim().length > 0, `${f.theme} : « ${c.libelle} » sans ${champ}`);
      }
      assert.ok(officiel(c.url), `${f.theme} : source non officielle ${c.url}`);
      for (const champ of ['libelle', 'valeur', 'precision']) {
        assert.doesNotMatch(c[champ], MOTS_DE_JUGEMENT, `${f.theme} : jugement dans « ${c[champ]} »`);
      }
    }
    for (const x of [...f.competences, ...f.ressources]) assert.ok(officiel(x.url), `${f.theme} : lien non officiel ${x.url}`);
  }

  // Les pages : un thème montre ses chiffres et qui décide ; /agir répond.
  const { port, ferme } = await demarre();
  try {
    const logement = (await requete(port, 'GET', '/theme/logement')).corps;
    assert.match(logement, /Les chiffres clés/);
    assert.match(logement, /Qui décide/);
    assert.match(logement, /5,4 millions/);
    assert.match(logement, /href="\/proposer\?theme=logement"/);
    assert.doesNotMatch(logement, /extrait/i, 'l’extrait d’audit ne s’affiche pas');
    const agir = await requete(port, 'GET', '/agir');
    assert.equal(agir.status, 200);
    assert.match(agir.corps, /Pétition au Sénat/);
    // Le lien « proposer sur ce thème » présélectionne le thème.
    assert.match((await requete(port, 'GET', '/proposer?theme=energie')).corps, /<option value="energie" selected>/);
  } finally {
    ferme();
  }
});

test('les repères budgétaires restent cohérents', () => {
  // Ce test protège la mise à jour annuelle de serveur/reperes.ts : si une
  // part ne tient plus dans son total, un montant a été mal recopié de la
  // source officielle. Tolérance 0,15 Md€ : les totaux publiés sont arrondis.
  const proche = (a, b) => Math.abs(a - b) < 0.15;

  // Les dépenses de l'État : missions principales + autres = total de la loi.
  const be = BUDGET_ETAT;
  const sommeDepenses = [...be.depenses, be.autresDepenses].reduce((s, p) => s + p.mds, 0);
  assert.ok(proche(sommeDepenses, be.totalDepensesMds), `dépenses de l'État : ${sommeDepenses} ≠ ${be.totalDepensesMds}`);

  // Les recettes : fiscales + non fiscales − prélèvements + fonds de concours = recettes nettes.
  const sommeFiscales = be.recettesFiscales.reduce((s, p) => s + p.mds, 0);
  assert.ok(proche(sommeFiscales, be.totalFiscalesMds), `recettes fiscales : ${sommeFiscales} ≠ ${be.totalFiscalesMds}`);
  const nettes = be.totalFiscalesMds + be.recettesNonFiscalesMds
    - be.prélèvements.reduce((s, p) => s + p.mds, 0) + be.fondsDeConcoursMds;
  assert.ok(proche(nettes, be.recettesNettesMds), `recettes nettes : ${nettes} ≠ ${be.recettesNettesMds}`);
  // Le solde couvre TOUS les budgets (général, annexes, comptes spéciaux) :
  // il est donc proche, mais pas égal, au solde du seul budget général.
  const soldeBudgetGeneral = be.recettesNettesMds - be.chargesNettesMds;
  assert.ok(Math.abs(soldeBudgetGeneral - be.soldeMds) < 2, `solde : ${be.soldeMds} trop loin du solde du budget général (${soldeBudgetGeneral})`);

  // Les administrations publiques : déficit = dépenses − recettes.
  const fp = FINANCES_PUBLIQUES;
  assert.ok(proche(fp.dépensesMds - fp.recettesMds, fp.déficitMds), `déficit : ${fp.dépensesMds} − ${fp.recettesMds} ≠ ${fp.déficitMds}`);
  // Le solde de l'État est négatif : les chiffres le disent, pas le contraire.
  assert.ok(be.soldeMds < 0 && fp.déficitMds > 0);

  // Chaque poste mène vers un thème existant — et aucun poste ne reste sans
  // thème (les lignes de méthode, hors Poste, ne sont pas concernées).
  const postes = [...be.depenses, be.autresDepenses, ...be.recettesFiscales, ...fp.sousSecteurs];
  for (const p of postes) {
    assert.ok(p.theme, `poste sans thème : ${p.nom}`);
    assert.ok(THEMES.some((t) => t.id === p.theme), `thème inconnu « ${p.theme} » pour : ${p.nom}`);
  }

  // Les postes qu'une idée peut viser : ids uniques, tous présents, et la
  // liste couvre chaque poste non méthodologique.
  const ids = POSTES_CIBLES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'id de poste en double');
  assert.equal(POSTES_CIBLES.length, postes.length, 'un poste n’a pas d’id');

  // La série d'évolution : cinq années chacune, et sa dernière valeur est
  // celle de « L'essentiel » (même source, même année — elles doivent dire
  // la même chose).
  assert.equal(ÉVOLUTION.années.length, 5);
  assert.equal(ÉVOLUTION.dépensesPib.length, 5);
  assert.equal(ÉVOLUTION.recettesPib.length, 5);
  assert.ok(proche(ÉVOLUTION.dépensesPib[4], fp.dépensesPib), `dépenses 2025 : courbe ${ÉVOLUTION.dépensesPib[4]} ≠ essentiel ${fp.dépensesPib}`);
  assert.ok(proche(ÉVOLUTION.recettesPib[4], fp.recettesPib), `recettes 2025 : courbe ${ÉVOLUTION.recettesPib[4]} ≠ essentiel ${fp.recettesPib}`);

  // Les parts affichées du camembert (arrondies comme la légende) font le
  // tour : leur somme reste à 100 % près d'un arrondi.
  const sommeParts = (liste, total) =>
    liste.reduce((s, p) => s + Math.round((p.mds / (total ?? liste.reduce((x, q) => x + q.mds, 0))) * 100), 0);
  assert.ok(Math.abs(sommeParts([...be.depenses, be.autresDepenses], be.totalDepensesMds) - 100) <= 1);
  assert.ok(Math.abs(sommeParts(be.recettesFiscales, be.totalFiscalesMds) - 100) <= 1);
  assert.ok(Math.abs(sommeParts(fp.sousSecteurs, null) - 100) <= 1);
});

test('le simulateur publie ses données en attributs, rien en JavaScript', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser un
  // serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const reperes = await requete(port, 'GET', '/reperes');
    assert.equal(reperes.status, 200);
    // Le graphe porte TOUT ce que le simulateur doit savoir : le JS du
    // navigateur n'en recopie aucune valeur, il ne fait qu'arithmétique.
    assert.match(reperes.corps, /data-sim="1"/);
    assert.match(reperes.corps, /data-min="50" data-max="60"/);
    assert.match(reperes.corps, /data-x-dernier="584" data-x-pas="132"/);
    assert.match(reperes.corps, /data-y-haut="24" data-y-bas="304"/);
    assert.match(reperes.corps, new RegExp(`data-annees="${ÉVOLUTION.années.join(',')}"`));
    assert.match(reperes.corps, new RegExp(`data-dep="${ÉVOLUTION.dépensesPib.join(',')}"`));
    assert.match(reperes.corps, new RegExp(`data-rec="${ÉVOLUTION.recettesPib.join(',')}"`));
    // Le PIB rendu est bien celui déduit des comptes publiés — même
    // expression que serveur/rendu.ts (pibMdsDéduit), donc même flottant.
    const pib = (FINANCES_PUBLIQUES.dépensesMds / FINANCES_PUBLIQUES.dépensesPib) * 100;
    assert.match(reperes.corps, new RegExp(`data-pib-mds="${pib.toFixed(1)}"`));
    // Sans JavaScript, pas de slider : le rôle n'est posé que par le JS
    // (web/simulateur.ts), jamais rendu par le serveur — sur aucune page.
    assert.ok(!reperes.corps.includes('role="slider"'));
    // L'accueil porte le même simulateur que /reperes : mêmes attributs,
    // même bande au statu quo, même note de méthode.
    const accueil = await requete(port, 'GET', '/');
    assert.equal(accueil.status, 200);
    assert.ok(accueil.corps.includes('<svg'), 'l’accueil trace bien la courbe');
    assert.match(accueil.corps, /data-sim="1"/);
    assert.match(accueil.corps, new RegExp(`data-pib-mds="${pib.toFixed(1)}"`));
    assert.match(accueil.corps, /data-sim-dep>57,3&nbsp;%/);
    assert.match(accueil.corps, /data-sim-ecart>0,0&nbsp;point</);
    assert.match(accueil.corps, /Votre hypothèse pour/);
    assert.match(accueil.corps, /Simulation arithmétique sur vos hypothèses/);
    assert.ok(!accueil.corps.includes('role="slider"'));
    // Les cartes chiffrées de l'accueil restent les comptes OFFICIELS
    // (151,6 Md€ publiés) — distinctes du solde déduit de la bande
    // (−152,6 Md€) : les deux figures coexistent sans se mélanger.
    assert.match(accueil.corps, /151,6 Md€ en 2025/);
    assert.match(accueil.corps, /data-sim-solde-mds>[−-]152,6&nbsp;Md€/);
  } finally {
    ferme();
  }
});

test('le simulateur affiche le statu quo par défaut, avec sa note de méthode', async () => {
  const { port, ferme } = await demarre();
  try {
    const reperes = await requete(port, 'GET', '/reperes');
    assert.equal(reperes.status, 200);
    const dernier = ÉVOLUTION.années.length - 1;
    const année = ÉVOLUTION.années[dernier];
    const dep = ÉVOLUTION.dépensesPib[dernier];
    const rec = ÉVOLUTION.recettesPib[dernier];
    const solde = rec - dep;
    const pib = (FINANCES_PUBLIQUES.dépensesMds / FINANCES_PUBLIQUES.dépensesPib) * 100;
    // Même formatteur que le serveur : une décimale, virgule française.
    const f = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    assert.match(reperes.corps, new RegExp(`Votre hypothèse pour ${année + 1}`));
    assert.match(reperes.corps, new RegExp(`data-sim-dep>${f(dep)}&nbsp;%`));
    assert.match(reperes.corps, new RegExp(`data-sim-rec>${f(rec)}&nbsp;%`));
    // Le solde est rendu signé (le signe moins typographique vient du CLDR,
    // d'où la classe de caractères) — et l'écart statu quo est nul.
    assert.match(reperes.corps, new RegExp(`data-sim-solde-pib>[−-]${f(Math.abs(solde))}&nbsp;% du PIB`));
    assert.match(reperes.corps, new RegExp(`data-sim-solde-mds>[−-]${f(Math.abs((solde / 100) * pib))}&nbsp;Md€`));
    assert.match(reperes.corps, /data-sim-ecart>0,0&nbsp;point</);
    // La note de méthode, mot pour mot : pas une prévision, pas les
    // chiffres officiels.
    assert.match(
      reperes.corps,
      new RegExp(`Simulation arithmétique sur vos hypothèses — pas une prévision, pas\\s+les chiffres officiels\\. PIB ${année} déduit des comptes publiés\\.`),
    );
  } finally {
    ferme();
  }
});

test('votre budget : un curseur par poste, recalcul identique sans JavaScript', async () => {
  const { port, ferme } = await demarre();
  // ferme() en finally : une assertion qui saute ne doit pas laisser
  // un serveur ouvert qui ferait pendre toute la suite de tests.
  try {
    const page = await requete(port, 'GET', '/budget');
    assert.equal(page.status, 200);
    assert.match(page.corps, /Votre budget 2026/);
    // Un curseur natif par poste : bornes communes, montant de la loi et
    // côté du solde en attributs — le navigateur n'a aucune valeur à
    // recopier, il ne fait que de l'arithmétique (web/budget.ts).
    assert.match(page.corps, /name="etat-defense" min="-100" max="100" step="1" value="0" data-mds="66\.5" data-sens="dep"/);
    assert.match(page.corps, /name="recette-ir"[^>]*data-mds="99\.8" data-sens="rec"/);
    assert.match(page.corps, /name="recette-non-fiscales"[^>]*data-sens="rec"/);
    // Le solde de la loi : en attribut pour le JS, dans la bande au statu
    // quo pour tout le monde — écart nul, rien bougé.
    assert.match(page.corps, /data-budget data-solde="-134\.6"/);
    assert.match(page.corps, /data-bud-solde>[−-]134,6 Md€</);
    assert.match(page.corps, /data-bud-ecart>0,0 Md€</);
    // La note de méthode : arithmétique pure, pas une prévision.
    assert.match(page.corps, /pas une prévision/);
    // Le secours sans JavaScript : le bouton est rendu par le serveur,
    // il ne disparaît que si le JS prend la main (classe bud-live).
    assert.match(page.corps, /Recalculer/);
    assert.ok(!page.corps.includes('bud-live'));

    // Sans JavaScript : le GET re-rend le calcul du serveur. Même
    // formule que serveur/budget.ts (partagé avec le navigateur) — la
    // bande sans JS et le recalcul en direct coïncident par construction.
    const f = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const defense = BUDGET_ETAT.depenses.find((p) => p.id === 'etat-defense');
    const ir = BUDGET_ETAT.recettesFiscales.find((p) => p.id === 'recette-ir');
    const dDep = (defense.mds * -50) / 100;
    const dRec = (ir.mds * 10) / 100;
    const ecart = dRec - dDep;
    const sim = await requete(port, 'GET', '/budget?etat-defense=-50&recette-ir=10');
    assert.equal(sim.status, 200);
    // Les curseurs restent là où le visiteur les a laissés.
    assert.match(sim.corps, /name="etat-defense"[^>]*value="-50"/);
    assert.match(sim.corps, /name="recette-ir"[^>]*value="10"/);
    assert.match(sim.corps, new RegExp(`data-bud-dep>${f(dDep)} Md€<`));
    assert.match(sim.corps, new RegExp(`data-bud-rec>\\+${f(dRec)} Md€<`));
    assert.match(sim.corps, new RegExp(`data-bud-ecart>\\+${f(ecart)} Md€<`));
    assert.match(sim.corps, new RegExp(`data-bud-solde>${f(BUDGET_ETAT.soldeMds + ecart)} Md€<`));

    // Inconnu ignoré, hors bornes ramené dedans : jamais de page cassée
    // par un lien trafiqué (même règle que ?vue= sur /reperes).
    const borne = await requete(port, 'GET', '/budget?etat-justice=250&invente=30');
    assert.equal(borne.status, 200);
    assert.match(borne.corps, /name="etat-justice"[^>]*value="100"/);
    assert.ok(!borne.corps.includes('name="invente"'));

    // La page est joignable : navigation, sitemap, Repères, accueil.
    assert.match((await requete(port, 'GET', '/')).corps, /href="\/budget"/);
    assert.match((await requete(port, 'GET', '/reperes')).corps, /href="\/budget"/);
    assert.match((await requete(port, 'GET', '/sitemap.xml')).corps, /\/budget</);

  } finally {
    ferme();
  }
});
