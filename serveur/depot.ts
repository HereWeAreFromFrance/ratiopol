// serveur/depot.ts — LE DÉPÔT D'IDÉES, SON CONTRAT.
//
// Le serveur ne sait pas où vivent les idées. Il parle à cette interface, et
// rien d'autre. Deux implantations existent : DepotMemoire (les tests, qui
// jugent les routes SANS base de données) et DepotPg (la production,
// PostgreSQL). La règle vient de MateMaterial/serveur/transport.ts : la
// plomberie doit être mince, et les tests la traversent pour de vrai.

import type { Effet } from './gabarit';

/** Position d'un lecteur sur l'idée. */
export const POSITIONS = ['pour', 'contre', 'sans-avis'] as const;
export type Position = (typeof POSITIONS)[number];

/** Jugement sur l'ARBITRAGE, séparé de l'adhésion : on peut trouver un
 *  arbitrage honnête et complet sans être d'accord avec l'idée. */
export const JUGEMENTS_ARBITRAGE = ['complet', 'partiel', 'incomplet'] as const;
export type JugementArbitrage = (typeof JUGEMENTS_ARBITRAGE)[number];

/** Les avis comptés sur une idée (indicatifs — cf. docs/04 §3). */
export interface Decompte {
  pour: number;
  contre: number;
  sansAvis: number;
  arbComplet: number;
  arbPartiel: number;
  arbIncomplet: number;
}

export const DECOMPTE_VIDE: Decompte = { pour: 0, contre: 0, sansAvis: 0, arbComplet: 0, arbPartiel: 0, arbIncomplet: 0 };

/** L'avis d'UN lecteur (une empreinte) : chaque moitié est optionnelle. */
export interface Avis {
  position: Position | null;
  arbitrage: JugementArbitrage | null;
}

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
  /** Impact chiffré déclaré par l'auteur (optionnel, cf. gabarit.ts). */
  effet: Effet | null;
  montantEuros: number | null;
  poste: string | null;
  statut: 'publiee' | 'masquee';
  creeeLe: Date;
  avis: Decompte;
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
  /** « soutenus » : par nombre de « d'accord ». */
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
    effet: Effet | null;
    montantEuros: number | null;
    poste: string | null;
  }, empreinte: string): Promise<Idee>;
  /** Pose ou modifie l'avis d'une empreinte (une moitié nulle ne touche pas
   *  à l'existant) ; retourne le décompte à jour. Rejette si l'idée n'est
   *  pas publiée. `empreinte` vient de securite.empreinteAvis. */
  donneAvis(slug: string, empreinte: string, avis: Avis): Promise<Decompte>;
  /** L'avis déjà donné par cette empreinte, pour l'afficher. */
  avisDe(slug: string, empreinte: string): Promise<Avis | null>;
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
