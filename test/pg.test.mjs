// test/pg.test.mjs — LE DÉPÔT POSTGRESQL, CONTRE UNE VRAIE BASE.
//
// Sauté tant que RP_PG_URL est absent (aucun PostgreSQL joignable sans mot
// de passe sur la machine de développement) : `RP_PG_URL=postgres://...
// node --test test/pg.test.mjs` le fait tourner, par exemple sur le VPS ou
// contre une base jetable. On ne teste JAMAIS contre la production : la base
// pointée est vidée au début (schéma re-posé par base/migrate.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const URL_PG = process.env.RP_PG_URL;

/** Une entrée valide de référence. */
function entree(slug) {
  return {
    slug,
    titre: 'Encadrer les loyers des résidences étudiantes à Paris',
    probleme: 'Les loyers des résidences étudiantes ont augmenté de 32 % en dix ans.',
    proposition: 'Étendre l’encadrement des loyers aux résidences étudiantes conventionnées CROUS.',
    beneficiaires: 'Les 600 000 étudiants des zones tendues.',
    arbitrage: 'Rendements privés plafonnés, caution publique en contrepartie.',
    indicateur: 'Le loyer médian publié par l’OLAP.',
    theme: 'logement',
    niveau: 'etat',
    pseudo: 'Lou',
    effet: 'cout',
    montantEuros: 650e6,
    poste: 'etat-justice',
  };
}

test('dépôt PostgreSQL : migrations + parcours', { skip: URL_PG ? false : 'RP_PG_URL absent — sauté' }, async (t) => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const exec = promisify(execFile);

  // Le schéma se repose à neuf : base d'essai, jamais la production.
  await exec('node', ['base/migrate.mjs'], { env: { ...process.env, RP_PG_URL: URL_PG } });

  const { DepotPg } = await import('../dist/serveur.mjs');
  const depot = new DepotPg(URL_PG);
  t.after(() => depot.fin());

  await t.test('création, lecture, thème', async () => {
    const idee = await depot.cree(entree('essai-loyers'), 'empreinte-a');
    assert.ok(idee.id > 0);
    const lue = await depot.ideeParSlug('essai-loyers');
    assert.ok(lue);
    assert.equal(lue.titre, idee.titre);
    assert.equal(lue.effet, 'cout');
    assert.equal(lue.montantEuros, 650e6);
    assert.equal(lue.poste, 'etat-justice');
    assert.equal((await depot.liste({ recherche: 'caution' })).length, 1, 'la recherche lit l’arbitrage');
    const duTheme = await depot.liste({ theme: 'logement' });
    assert.equal(duTheme.length, 1);
    assert.equal((await depot.liste({ theme: 'sante' })).length, 0);
  });

  await t.test('avis dédupliqués par empreinte, modifiables', async () => {
    assert.equal((await depot.donneAvis('essai-loyers', 'empreinte-a', { position: 'pour', arbitrage: null })).pour, 1);
    assert.equal((await depot.donneAvis('essai-loyers', 'empreinte-a', { position: 'pour', arbitrage: null })).pour, 1);
    assert.equal((await depot.donneAvis('essai-loyers', 'empreinte-b', { position: 'pour', arbitrage: null })).pour, 2);
    const d = await depot.donneAvis('essai-loyers', 'empreinte-a', { position: null, arbitrage: 'incomplet' });
    assert.deepEqual(d, { pour: 2, contre: 0, sansAvis: 0, arbComplet: 0, arbPartiel: 0, arbIncomplet: 1 });
    await depot.donneAvis('essai-loyers', 'empreinte-b', { position: 'contre', arbitrage: null });
    assert.deepEqual(await depot.avisDe('essai-loyers', 'empreinte-a'), { position: 'pour', arbitrage: 'incomplet' });
    assert.equal(await depot.avisDe('essai-loyers', 'empreinte-z'), null);
    const lue = await depot.ideeParSlug('essai-loyers');
    assert.equal(lue.avis.pour, 1);
    assert.equal(lue.avis.contre, 1);
    await assert.rejects(depot.donneAvis('nulle-part', 'empreinte-a', { position: 'pour', arbitrage: null }));
  });

  await t.test('signalement, masquage, suppression', async () => {
    await depot.signale('essai-loyers', 'Autre', 'détail');
    const vue = await depot.pourAdmin();
    assert.equal(vue.idees.length, 1);
    assert.equal(vue.signalements.length, 1);
    const id = vue.idees[0].id;
    await depot.changeStatut(id, 'masquee');
    assert.equal(await depot.ideeParSlug('essai-loyers'), null);
    await depot.changeStatut(id, 'publiee');
    assert.ok(await depot.ideeParSlug('essai-loyers'));
    await depot.supprime(id);
    assert.equal((await depot.pourAdmin()).idees.length, 0);
  });
});
