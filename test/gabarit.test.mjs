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
    consentement: 'on',
    ...surcharge,
  };
}

test('une entrée conforme passe, nettoyée', () => {
  const { erreurs, entree } = valideEntree(conforme());
  assert.deepEqual(erreurs, {});
  assert.ok(entree);
  // L'impact chiffré est optionnel : absent, il vaut null partout.
  assert.equal(entree.effet, null);
  assert.equal(entree.montantEuros, null);
  assert.equal(entree.poste, null);
  // L'e-mail n'existe plus : même envoyé, il n'est pas retenu.
  assert.equal('email' in valideEntree(conforme({ email: 'lou@exemple.fr' })).entree, false);
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

test("l'impact chiffré : optionnel, mais cohérent", () => {
  // Complet : montant français (virgule, espace) converti en euros.
  const ok = valideEntree(conforme({ effet: 'cout', montant: ' 2,5 ', unite: 'Md', poste: 'etat-justice' }));
  assert.deepEqual(ok.erreurs, {});
  assert.equal(ok.entree.effet, 'cout');
  assert.equal(ok.entree.montantEuros, 2.5e9);
  assert.equal(ok.entree.poste, 'etat-justice');
  assert.equal(valideEntree(conforme({ effet: 'gain', montant: '1 200', unite: 'k' })).entree.montantEuros, 1.2e6);
  // Le sens sans montant, et « neutre », passent.
  assert.deepEqual(valideEntree(conforme({ effet: 'gain' })).erreurs, {});
  assert.deepEqual(valideEntree(conforme({ effet: 'neutre' })).erreurs, {});
  // Un montant doit dire s'il coûte ou rapporte.
  assert.ok(valideEntree(conforme({ montant: '3', unite: 'M' })).erreurs.montant);
  assert.ok(valideEntree(conforme({ effet: 'neutre', montant: '3', unite: 'M' })).erreurs.montant);
  // Pas de nombre fantaisiste, d'unité inconnue ni de faute de frappe géante.
  for (const montant of ['-3', '0', 'beaucoup', '1e9', '3,14159']) {
    assert.ok(valideEntree(conforme({ effet: 'cout', montant, unite: 'M' })).erreurs.montant, montant);
  }
  assert.ok(valideEntree(conforme({ effet: 'cout', montant: '3', unite: 'Gt' })).erreurs.montant);
  assert.ok(valideEntree(conforme({ effet: 'cout', montant: '2001', unite: 'Md' })).erreurs.montant);
  // Listes fermées.
  assert.ok(valideEntree(conforme({ effet: 'magique' })).erreurs.effet);
  assert.ok(valideEntree(conforme({ poste: 'mission-inventee' })).erreurs.poste);
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
