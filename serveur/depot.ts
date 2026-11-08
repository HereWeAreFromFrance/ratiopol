// serveur/depot.ts — LE DÉPÔT D'IDÉES, SON CONTRAT.
//
// Le serveur ne sait pas où vivent les idées. Il parle à cette interface, et
// rien d'autre. Deux implantations existent : DepotMemoire (les tests, qui
// jugent les routes SANS base de données) et DepotPg (la production,
// PostgreSQL). La règle vient de MateMaterial/serveur/transport.ts : la
// plomberie doit être mince, et les tests la traversent pour de vrai.

/** Une idée publiée, telle que le rendu la voit. */
export interface Idee {
  id: number;
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
  statut: 'publiee' | 'masquee';
  creeeLe: Date;
  /** Nombre de soutiens distincts (indicatif — cf. docs/04 §3). */
  soutiens: number;
}

/** Un signalement d'idée, pour la modération. */
export interface Signalement {
  id: number;
  ideeId: number;
  slug: string;
  motif: string;
  message: string;
  le: Date;
}

export interface OptionsListe {
  theme?: string;
  /** Filtrer sur les mots du titre et de la proposition (recherche). */
  recherche?: string;
  tri?: 'recent' | 'soutenus';
  limite?: number;
}

export interface ResultatCreation {
  idee: Idee;
}

export interface VoirAdmin {
  idees: Idee[];
  signalements: Signalement[];
}

export interface Depot {
  liste(opts: OptionsListe): Promise<Idee[]>;
  ideeParSlug(slug: string): Promise<Idee | null>;
  /** Crée une idée ; `empreinte` sert à tracer sans identité (LCEN art. 6-II). */
  cree(entree: {
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
  }, empreinte: string): Promise<Idee>;
  /** Ajoute un soutien s'il est nouveau ; retourne le total. */
  soutien(slug: string, empreinte: string): Promise<number>;
  signale(slug: string, motif: string, message: string): Promise<void>;
  /** Tout ce que voit la modération : y compris les idées masquées. */
  pourAdmin(): Promise<VoirAdmin>;
  changeStatut(id: number, statut: 'publiee' | 'masquee'): Promise<void>;
  supprime(id: number): Promise<void>;
}

/** Le motif d'un signalement — liste fermée, affichée telle quelle. */
export const MOTIFS_SIGNALEMENT = [
  'Attaque contre une personne',
  'Haine, discrimination',
  'Hors sujet / pas une idée',
  'Publicité, spam',
  'Autre',
] as const;
