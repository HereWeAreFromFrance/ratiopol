// serveur/postgres.ts — LE DÉPÔT POSTGRESQL (production).
//
// Une base dédiée `ratiopol_database` sur le PostgreSQL 18 du VPS (une base
// par projet, coutume maison). Le schéma vit dans base/migrations/ et se pose
// par `npm run migrer` (RP_PG_URL). Toute requête est PARAMÉTRÉE : aucune
// concaténation de texte utilisateur dans le SQL, jamais.

import postgres from 'postgres';
import type { Avis, Decompte, Depot, Idee, JugementArbitrage, OptionsListe, Position, Signalement, VoirAdmin } from './depot';
import type { Effet } from './gabarit';

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
  effet: string | null;
  montant_euros: number | bigint | string | null;
  poste: string | null;
  statut: string;
  creee_le: Date;
  pour: Nombre;
  contre: Nombre;
  sans_avis: Nombre;
  arb_complet: Nombre;
  arb_partiel: Nombre;
  arb_incomplet: Nombre;
}

/** count(*) et BIGINT arrivent en texte : on convertit à la lecture. */
type Nombre = number | bigint | string | null;
const n = (v: Nombre): number => Number(v ?? 0);

/** Le décompte des avis d'une idée, en colonnes — jointure LATERAL, pour
 *  que la liste, la page et l'admin comptent tous de la même façon. */
const COLONNES_AVIS = `
  count(*) FILTER (WHERE a.position = 'pour')        AS pour,
  count(*) FILTER (WHERE a.position = 'contre')      AS contre,
  count(*) FILTER (WHERE a.position = 'sans-avis')   AS sans_avis,
  count(*) FILTER (WHERE a.arbitrage = 'complet')    AS arb_complet,
  count(*) FILTER (WHERE a.arbitrage = 'partiel')    AS arb_partiel,
  count(*) FILTER (WHERE a.arbitrage = 'incomplet')  AS arb_incomplet`;

function enDecompte(l: Pick<LigneIdee, 'pour' | 'contre' | 'sans_avis' | 'arb_complet' | 'arb_partiel' | 'arb_incomplet'>): Decompte {
  return {
    pour: n(l.pour),
    contre: n(l.contre),
    sansAvis: n(l.sans_avis),
    arbComplet: n(l.arb_complet),
    arbPartiel: n(l.arb_partiel),
    arbIncomplet: n(l.arb_incomplet),
  };
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
    effet: (l.effet as Effet | null) ?? null,
    montantEuros: l.montant_euros === null ? null : Number(l.montant_euros),
    poste: l.poste,
    statut: l.statut === 'masquee' ? 'masquee' : 'publiee',
    creeeLe: new Date(l.creee_le),
    avis: enDecompte(l),
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

  /** Le SELECT commun : l'idée et son décompte d'avis. */
  private selectIdees() {
    return this.sql`
      SELECT i.*, d.* FROM idees i
      LEFT JOIN LATERAL (
        SELECT ${this.sql.unsafe(COLONNES_AVIS)} FROM avis a WHERE a.idee_id = i.id
      ) d ON true`;
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
        filtre = this.sql`${filtre} AND (titre ILIKE ${motif} OR probleme ILIKE ${motif} OR proposition ILIKE ${motif}
          OR beneficiaires ILIKE ${motif} OR arbitrage ILIKE ${motif} OR indicateur ILIKE ${motif})`;
      }
    }

    const tri = opts.tri === 'soutenus' ? this.sql`pour DESC, creee_le DESC` : this.sql`creee_le DESC`;
    const limite = Math.min(opts.limite ?? 50, 100);

    const lignes = await this.sql<LigneIdee[]>`
      ${this.selectIdees()}
      WHERE ${filtre}
      ORDER BY ${tri}
      LIMIT ${limite}
    `;
    return lignes.map(enIdee);
  }

  async ideeParSlug(slug: string): Promise<Idee | null> {
    const lignes = await this.sql<LigneIdee[]>`
      ${this.selectIdees()}
      WHERE i.slug = ${slug} AND i.statut = 'publiee'
      LIMIT 1
    `;
    return lignes.length === 0 ? null : enIdee(lignes[0]!);
  }

  async cree(entree: Parameters<Depot['cree']>[0], empreinte: string): Promise<Idee> {
    const lignes = await this.sql<LigneIdee[]>`
      INSERT INTO idees (slug, titre, probleme, proposition, beneficiaires, arbitrage,
                         indicateur, theme, niveau, pseudo, effet, montant_euros, poste, empreinte)
      VALUES (${entree.slug}, ${entree.titre}, ${entree.probleme}, ${entree.proposition},
              ${entree.beneficiaires}, ${entree.arbitrage}, ${entree.indicateur},
              ${entree.theme}, ${entree.niveau}, ${entree.pseudo}, ${entree.effet},
              ${entree.montantEuros}, ${entree.poste}, ${empreinte})
      RETURNING id, slug, titre, probleme, proposition, beneficiaires, arbitrage,
                indicateur, theme, niveau, pseudo, effet, montant_euros, poste, statut, creee_le,
                0 AS pour, 0 AS contre, 0 AS sans_avis, 0 AS arb_complet, 0 AS arb_partiel, 0 AS arb_incomplet
    `;
    return enIdee(lignes[0]!);
  }

  async donneAvis(slug: string, empreinte: string, avis: Avis): Promise<Decompte> {
    // Un avis par (idée, empreinte), modifiable : la moitié nulle garde
    // l'existant (COALESCE), l'autre le remplace.
    const posees = await this.sql<{ idee_id: number | bigint }[]>`
      INSERT INTO avis (idee_id, empreinte, position, arbitrage)
      SELECT id, ${empreinte}, ${avis.position}, ${avis.arbitrage} FROM idees
      WHERE slug = ${slug} AND statut = 'publiee'
      ON CONFLICT (idee_id, empreinte) DO UPDATE SET
        position  = COALESCE(EXCLUDED.position, avis.position),
        arbitrage = COALESCE(EXCLUDED.arbitrage, avis.arbitrage),
        le = now()
      RETURNING idee_id
    `;
    if (posees.length === 0) throw new Error('idée inconnue');
    const lignes = await this.sql<LigneIdee[]>`
      SELECT ${this.sql.unsafe(COLONNES_AVIS)} FROM avis a WHERE a.idee_id = ${Number(posees[0]!.idee_id)}
    `;
    return enDecompte(lignes[0]!);
  }

  async avisDe(slug: string, empreinte: string): Promise<Avis | null> {
    const lignes = await this.sql<{ position: string | null; arbitrage: string | null }[]>`
      SELECT a.position, a.arbitrage FROM avis a JOIN idees i ON i.id = a.idee_id
      WHERE i.slug = ${slug} AND a.empreinte = ${empreinte}
    `;
    const l = lignes[0];
    return l ? { position: l.position as Position | null, arbitrage: l.arbitrage as JugementArbitrage | null } : null;
  }

  async signale(slug: string, motif: string, message: string): Promise<void> {
    await this.sql`
      INSERT INTO signalements (idee_id, motif, message)
      SELECT id, ${motif}, ${message} FROM idees WHERE slug = ${slug}
    `;
  }

  async pourAdmin(): Promise<VoirAdmin> {
    const idees = await this.sql<LigneIdee[]>`
      ${this.selectIdees()}
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
    await this.sql`DELETE FROM avis WHERE idee_id = ${id}`;
    await this.sql`DELETE FROM signalements WHERE idee_id = ${id}`;
    await this.sql`DELETE FROM idees WHERE id = ${id}`;
  }
}
