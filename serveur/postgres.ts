// serveur/postgres.ts — LE DÉPÔT POSTGRESQL (production).
//
// Une base dédiée `ratiopol_database` sur le PostgreSQL 18 du VPS (une base
// par projet, coutume maison). Le schéma vit dans base/migrations/ et se pose
// par `npm run migrer` (RP_PG_URL). Toute requête est PARAMÉTRÉE : aucune
// concaténation de texte utilisateur dans le SQL, jamais.

import postgres from 'postgres';
import type { Depot, Idee, OptionsListe, Signalement, VoirAdmin } from './depot';

interface LigneIdee {
  id: number | bigint;
  slug: string;
  titre: string;
  probleme: string;
  proposition: string;
  beneficiaires: string;
  arbitrage: string;
  indicateur: string;
  theme: string;
  niveau: string;
  pseudo: string;
  statut: string;
  creee_le: Date;
  soutiens: number | bigint | string | null;
}

function enIdee(l: LigneIdee): Idee {
  return {
    id: Number(l.id),
    slug: l.slug,
    titre: l.titre,
    probleme: l.probleme,
    proposition: l.proposition,
    beneficiaires: l.beneficiaires,
    arbitrage: l.arbitrage,
    indicateur: l.indicateur,
    theme: l.theme,
    niveau: l.niveau,
    pseudo: l.pseudo,
    statut: l.statut === 'masquee' ? 'masquee' : 'publiee',
    creeeLe: new Date(l.creee_le),
    soutiens: Number(l.soutiens ?? 0),
  };
}

export class DepotPg implements Depot {
  private sql: postgres.Sql;

  constructor(url: string) {
    this.sql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  /** Pour les tests d'intégration et l'arrêt propre. */
  fin(): Promise<void> {
    return this.sql.end({ timeout: 5 });
  }

  async liste(opts: OptionsListe): Promise<Idee[]> {
    // Les conditions s'assemblent en fragments paramétrés : rien
    // d'utilisateur n'entre dans le SQL autrement qu'en paramètre $n.
    let filtre = this.sql`statut = 'publiee'`;
    if (opts.theme) filtre = this.sql`${filtre} AND theme = ${opts.theme}`;
    if (opts.recherche) {
      const mots = opts.recherche.split(/\s+/).filter(Boolean).slice(0, 8);
      for (const mot of mots) {
        const motif = '%' + mot + '%';
        filtre = this.sql`${filtre} AND (titre ILIKE ${motif} OR probleme ILIKE ${motif} OR proposition ILIKE ${motif})`;
      }
    }

    const tri = opts.tri === 'soutenus' ? this.sql`soutiens DESC, creee_le DESC` : this.sql`creee_le DESC`;
    const limite = Math.min(opts.limite ?? 50, 100);

    const lignes = await this.sql<LigneIdee[]>`
      SELECT i.*, (SELECT count(*) FROM soutiens s WHERE s.idee_id = i.id) AS soutiens
      FROM idees i
      WHERE ${filtre}
      ORDER BY ${tri}
      LIMIT ${limite}
    `;
    return lignes.map(enIdee);
  }

  async ideeParSlug(slug: string): Promise<Idee | null> {
    const lignes = await this.sql<LigneIdee[]>`
      SELECT i.*, (SELECT count(*) FROM soutiens s WHERE s.idee_id = i.id) AS soutiens
      FROM idees i
      WHERE i.slug = ${slug} AND i.statut = 'publiee'
      LIMIT 1
    `;
    return lignes.length === 0 ? null : enIdee(lignes[0]!);
  }

  async cree(entree: Parameters<Depot['cree']>[0], empreinte: string): Promise<Idee> {
    const lignes = await this.sql<LigneIdee[]>`
      INSERT INTO idees (slug, titre, probleme, proposition, beneficiaires, arbitrage,
                         indicateur, theme, niveau, pseudo, empreinte)
      VALUES (${entree.slug}, ${entree.titre}, ${entree.probleme}, ${entree.proposition},
              ${entree.beneficiaires}, ${entree.arbitrage}, ${entree.indicateur},
              ${entree.theme}, ${entree.niveau}, ${entree.pseudo}, ${empreinte})
      RETURNING id, slug, titre, probleme, proposition, beneficiaires, arbitrage,
                indicateur, theme, niveau, pseudo, statut, creee_le, 0 AS soutiens
    `;
    return enIdee(lignes[0]!);
  }

  async soutien(slug: string, empreinte: string): Promise<number> {
    // INSERT ... ON CONFLICT DO NOTHING : un soutien par (idée, empreinte).
    await this.sql`
      INSERT INTO soutiens (idee_id, empreinte)
      SELECT id, ${empreinte} FROM idees WHERE slug = ${slug} AND statut = 'publiee'
      ON CONFLICT (idee_id, empreinte) DO NOTHING
    `;
    const total = await this.sql<{ total: number | bigint | string }[]>`
      SELECT count(*) AS total FROM soutiens s
      JOIN idees i ON i.id = s.idee_id
      WHERE i.slug = ${slug}
    `;
    return Number(total[0]?.total ?? 0);
  }

  async signale(slug: string, motif: string, message: string): Promise<void> {
    await this.sql`
      INSERT INTO signalements (idee_id, motif, message)
      SELECT id, ${motif}, ${message} FROM idees WHERE slug = ${slug}
    `;
  }

  async pourAdmin(): Promise<VoirAdmin> {
    const idees = await this.sql<LigneIdee[]>`
      SELECT i.*, (SELECT count(*) FROM soutiens s WHERE s.idee_id = i.id) AS soutiens
      FROM idees i
      ORDER BY i.creee_le DESC
      LIMIT 500
    `;
    const signalements = await this.sql<(Signalement & { le: Date })[]>`
      SELECT s.id, s.idee_id AS "ideeId", i.slug, s.motif, s.message, s.le
      FROM signalements s JOIN idees i ON i.id = s.idee_id
      ORDER BY s.le DESC
      LIMIT 200
    `;
    return {
      idees: idees.map(enIdee),
      signalements: signalements.map((s) => ({ ...s, le: new Date(s.le) })),
    };
  }

  async changeStatut(id: number, statut: 'publiee' | 'masquee'): Promise<void> {
    await this.sql`UPDATE idees SET statut = ${statut} WHERE id = ${id}`;
  }

  async supprime(id: number): Promise<void> {
    await this.sql`DELETE FROM soutiens WHERE idee_id = ${id}`;
    await this.sql`DELETE FROM signalements WHERE idee_id = ${id}`;
    await this.sql`DELETE FROM idees WHERE id = ${id}`;
  }
}
