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
import { creeServeur, DepotMemoire, empreinteMotDePasse, BUDGET_ETAT, FINANCES_PUBLIQUES, ÉVOLUTION, THEMES } from '../dist/serveur.mjs';

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

test('parcours complet : dépôt, page, soutiens dédupliqués, signalement', async () => {
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
    // (web/simulateur.ts), jamais rendu par le serveur.
    assert.ok(!reperes.corps.includes('role="slider"'));
    // L'accueil trace la courbe, mais sans hypothèse : pas d'attributs sim.
    const accueil = await requete(port, 'GET', '/');
    assert.equal(accueil.status, 200);
    assert.ok(accueil.corps.includes('<svg'), 'l’accueil trace bien la courbe');
    assert.ok(!accueil.corps.includes('data-sim'), 'l’accueil ne publie pas le simulateur');
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
