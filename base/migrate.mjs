// base/migrate.mjs — POSE LES MIGRATIONS, DANS L'ORDRE, UNE SEULE FOIS.
//
// Usage : RP_PG_URL=postgres://... npm run migrer
// Chaque fichier base/migrations/NNN-*.sql passe dans SA transaction ; la
// table schema_migrations retient ce qui est déjà posé. Idempotent : relancer
// ne fait rien.

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.RP_PG_URL;
if (!url) {
  console.error('RP_PG_URL est requis (ex. postgres://localhost/ratiopol_database)');
  process.exit(1);
}

const sql = postgres(url);

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  nom TEXT PRIMARY KEY,
  posee_le TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

const dossier = join(process.cwd(), 'base', 'migrations');
const fichiers = (await readdir(dossier)).filter((f) => /^\d{3}-.*\.sql$/.test(f)).sort();

for (const fichier of fichiers) {
  const deja = await sql`SELECT 1 FROM schema_migrations WHERE nom = ${fichier}`;
  if (deja.length > 0) {
    console.log(`  = ${fichier} (déjà posée)`);
    continue;
  }
  const contenu = await readFile(join(dossier, fichier), 'utf8');
  await sql.begin(async (tx) => {
    await tx.unsafe(contenu);
    await tx`INSERT INTO schema_migrations (nom) VALUES (${fichier})`;
  });
  console.log(`  + ${fichier} posée`);
}

await sql.end();
console.log('Migrations terminées.');
