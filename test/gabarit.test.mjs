// test/gabarit.test.mjs — LE GABARIT JUGÉ EN PUR.
//
// La règle du projet (docs/04 §1) vit dans serveur/gabarit.ts ; elle se
// vérifie sans serveur ni base : tout ce qui suit importe le BINAIRE construit
// (dist/serveur.mjs) — on teste ce qui part en production, pas les sources.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valideEntree, slugDepuisTitre, nettoie } from '../dist/serveur.mjs';

/** Une entrée conforme, de référence. */
function conforme(surcharge = {}) {
  return {
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
    email: '',
    consentement: 'on',
    ...surcharge,
  };
}

test('une entrée conforme passe, nettoyée', () => {
  const { erreurs, entree } = valideEntree(conforme());
  assert.deepEqual(erreurs, {});
  assert.ok(entree);
  assert.equal(entree.email, null);
  // Les espaces multiples sont réduits, les bords coupés.
  const { entree: e2 } = valideEntree(conforme({ pseudo: '  Lou   Dupont ' }));
  assert.equal(e2.pseudo, 'Lou Dupont');
});

test('le slogan vague est refusé, champ par champ', () => {
  const { erreurs, entree } = valideEntree(conforme({
    titre: 'justice',
    probleme: 'c’est injuste',
    proposition: 'il faut changer ça',
    beneficiaires: 'tout le monde',
    arbitrage: 'les riches paient',
    indicateur: 'bonheur',
  }));
  assert.equal(entree, null);
  for (const champ of ['titre', 'probleme', 'proposition', 'beneficiaires', 'arbitrage', 'indicateur']) {
    assert.ok(erreurs[champ], `le champ ${champ} doit être signalé`);
  }
});

test('chaque borne se vérifie aux deux bouts', () => {
  const cas = [
    ['titre', 'a'.repeat(11), 'a'.repeat(141)],
    ['probleme', 'a'.repeat(59), 'a'.repeat(2001)],
    ['proposition', 'a'.repeat(59), 'a'.repeat(2001)],
    ['beneficiaires', 'a'.repeat(19), 'a'.repeat(601)],
    ['arbitrage', 'a'.repeat(19), 'a'.repeat(1001)],
    ['indicateur', 'a'.repeat(9), 'a'.repeat(401)],
    ['pseudo', 'ab', 'a'.repeat(41)],
  ];
  for (const [champ, court, long] of cas) {
    assert.ok(valideEntree(conforme({ [champ]: court })).erreurs[champ], `${champ} court refusé`);
    assert.ok(valideEntree(conforme({ [champ]: long })).erreurs[champ], `${champ} long refusé`);
  }
});

test('thème et niveau doivent exister, consentement exigé', () => {
  assert.ok(valideEntree(conforme({ theme: 'triche' })).erreurs.theme);
  assert.ok(valideEntree(conforme({ niveau: 'galaxie' })).erreurs.niveau);
  assert.ok(valideEntree(conforme({ consentement: undefined })).erreurs.consentement);
  assert.equal(valideEntree(conforme()).erreurs.consentement, undefined);
});

test("l'e-mail optionnel doit ressembler à une adresse", () => {
  assert.ok(valideEntree(conforme({ email: 'pas-une-adresse' })).erreurs.email);
  const ok = valideEntree(conforme({ email: 'lou@exemple.fr' }));
  assert.equal(ok.erreurs.email, undefined);
  assert.equal(ok.entree.email, 'lou@exemple.fr');
});

test('le pseudonyme refuse les caractères de code', () => {
  assert.ok(valideEntree(conforme({ pseudo: '<script>' })).erreurs.pseudo);
  assert.ok(valideEntree(conforme({ pseudo: 'Lou 🎉' })).erreurs.pseudo);
  assert.equal(valideEntree(conforme({ pseudo: 'Anne-Charlotte' })).erreurs.pseudo, undefined);
});

test('nettoie réduit espaces et retours ligne', () => {
  assert.equal(nettoie('  a   b  '), 'a b');
  assert.equal(nettoie(undefined), '');
});

test('le slug perd ses accents et ses parasites', () => {
  assert.equal(slugDepuisTitre('École, éléves & autonomie'), 'ecole-eleves-autonomie');
  assert.equal(slugDepuisTitre('ÀÀÀ!!! ...'), 'aaa');
  assert.equal(slugDepuisTitre('   '), 'idee');
  const long = slugDepuisTitre('a'.repeat(100));
  assert.ok(long.length <= 48);
});
