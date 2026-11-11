// serveur/gabarit.ts — LE GABARIT D'IDÉE, CŒUR DU PROJET.
//
// RatioPol refuse les opinions non actionnables (docs/04-pistes-produit.md
// §1) : toute idée doit dire son problème, sa proposition, ses bénéficiaires,
// son arbitrage et son indicateur de réussite. Ce fichier encode cette règle
// en PUR — aucune dépendance, aucune I/O — pour se juger dans les tests
// (test/gabarit.test.mjs) et servir identiquement côté client (aide à la
// saisie) et côté serveur (autorité : le serveur est la seule vérité).
//
// Les bornes de longueur sont en CARACTÈRES APRÈS NETTOYAGE (trim, espaces
// multiples réduits). Elles veulent forcer la concrétude sans exclure qui ne
// écrit pas bien : 60 caractères de problème, c'est deux phrases — assez
// pour nommer une situation, pas assez pour un pamphlet.
//
// L'IMPACT CHIFFRÉ (décision du 11/11/2026) : effet sur les finances
// publiques, montant annuel estimé, poste budgétaire touché. OPTIONNEL —
// la concrétude reste exigée par les cinq champs ; le chiffrage rend les
// idées comparables entre elles et avec les Repères. Seule la cohérence
// est exigée : un montant dit s'il coûte ou rapporte.
//
// Pas d'e-mail (même décision) : il était validé puis jeté, jamais stocké.
// Minimisation : on ne collecte pas ce qu'on n'utilise pas.

import { THEMES, NIVEAUX } from './themes';
import { posteCibleParId } from './reperes';

/** Bornes par champ : [min, max] en caractères. */
export const BORNES = {
  titre: [12, 140],
  probleme: [60, 2000],
  proposition: [60, 2000],
  beneficiaires: [20, 600],
  arbitrage: [20, 1000],
  indicateur: [10, 400],
  pseudo: [3, 40],
} as const;

export type ChampIdee = keyof typeof BORNES | 'theme' | 'niveau' | 'effet' | 'montant' | 'poste' | 'consentement';

/** Effet déclaré sur les finances publiques. */
export const EFFETS = [
  { id: 'cout', nom: 'Coûte (dépense en plus ou recette en moins)' },
  { id: 'gain', nom: 'Rapporte (économie ou recette en plus)' },
  { id: 'neutre', nom: 'Neutre pour les finances publiques' },
] as const;
export type Effet = (typeof EFFETS)[number]['id'];

/** Unités du montant annuel, en euros. */
export const UNITES = [
  { id: 'k', nom: 'k€ par an', euros: 1e3 },
  { id: 'M', nom: 'M€ par an', euros: 1e6 },
  { id: 'Md', nom: 'Md€ par an', euros: 1e9 },
] as const;

/** Plafond du montant : au-delà de la dépense publique totale (1 714 Md€),
 *  c'est une faute de frappe, pas une estimation. */
export const MONTANT_MAX_EUROS = 2000e9;

/** Les valeurs brutes sorties d'un formulaire (tout est optionnel et sale). */
export interface ValeursBrutes {
  titre?: unknown;
  probleme?: unknown;
  proposition?: unknown;
  beneficiaires?: unknown;
  arbitrage?: unknown;
  indicateur?: unknown;
  theme?: unknown;
  niveau?: unknown;
  pseudo?: unknown;
  effet?: unknown;
  montant?: unknown;
  unite?: unknown;
  poste?: unknown;
  consentement?: unknown;
}

/** Une entrée valide, prête à être stockée. */
export interface EntreeValide {
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
  /** Montant annuel estimé par l'auteur, en euros (toujours positif :
   *  le sens est dans `effet`). */
  montantEuros: number | null;
  /** Id d'un poste de reperes.ts (POSTES_CIBLES). */
  poste: string | null;
}

/** Erreurs par champ : champ → message humain. Vide = entrée valide. */
export type Erreurs = Partial<Record<ChampIdee, string>>;

/** Normalise un texte : trim, espaces et retours ligne multiples réduits. */
export function nettoie(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

const MESSAGES = {
  titre: 'Le titre doit faire entre 12 et 140 caractères — assez pour dire quoi, pour qui, où.',
  probleme: 'Décrivez le problème constaté en 60 à 2000 caractères : la situation actuelle, avec des faits si vous en avez.',
  proposition: 'Dites ce que vous proposeriez de changer précisément, en 60 à 2000 caractères — une règle, une loi, une pratique.',
  beneficiaires: 'Dites qui gagnerait quoi, en 20 à 600 caractères.',
  arbitrage: 'Dites qui paie, qui perd quoi ou ce que ça coûte, en 20 à 1000 caractères — une idée sans arbitrage n’est pas une décision.',
  indicateur: 'Donnez un indicateur de réussite en 10 à 400 caractères : comment saura-t-on que ça marche ?',
  pseudo: 'Le pseudonyme doit faire 3 à 40 caractères (lettres, chiffres, espaces, apostrophes, tirets).',
  theme: 'Choisissez un thème dans la liste.',
  niveau: 'Choisissez le niveau territorial concerné.',
  effet: 'Choisissez un effet dans la liste — ou laissez « Je ne sais pas ».',
  montant: 'Le montant est un nombre positif (ex. 2,5) avec son unité, au plus 2 000 Md€ par an — et il faut dire s’il coûte ou rapporte.',
  poste: 'Choisissez un poste dans la liste — ou laissez « Aucun ».',
  consentement: 'Le consentement à la publication est nécessaire : votre contribution révèle une opinion politique.',
} as const;

/** LA VALIDATION — autorité côté serveur. */
export function valideEntree(brutes: ValeursBrutes): { erreurs: Erreurs; entree: EntreeValide | null } {
  const erreurs: Erreurs = {};
  const champs: Record<string, string> = {};

  for (const champ of Object.keys(BORNES) as (keyof typeof BORNES)[]) {
    const [min, max] = BORNES[champ];
    const texte = nettoie(brutes[champ]);
    if (texte.length < min || texte.length > max) erreurs[champ] = MESSAGES[champ];
    champs[champ] = texte;
  }

  // Le pseudonyme, en plus des bornes, n'accepte que des caractères de nom.
  if (!erreurs.pseudo && !/^[\p{L}\p{N}][\p{L}\p{N} .,'’-]*$/u.test(champs.pseudo!)) {
    erreurs.pseudo = MESSAGES.pseudo;
  }

  const theme = nettoie(brutes.theme);
  if (!THEMES.some((t) => t.id === theme)) erreurs.theme = MESSAGES.theme;

  const niveau = nettoie(brutes.niveau);
  if (!NIVEAUX.some((n) => n.id === niveau)) erreurs.niveau = MESSAGES.niveau;

  // L'impact chiffré, optionnel mais cohérent.
  const effetBrut = nettoie(brutes.effet);
  const effet = EFFETS.find((x) => x.id === effetBrut)?.id ?? null;
  if (effetBrut !== '' && !effet) erreurs.effet = MESSAGES.effet;

  const montantBrut = nettoie(brutes.montant).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  let montantEuros: number | null = null;
  if (montantBrut !== '') {
    const unite = UNITES.find((u) => u.id === nettoie(brutes.unite));
    const n = /^\d+(\.\d{1,3})?$/.test(montantBrut) ? Number(montantBrut) : NaN;
    montantEuros = unite && n > 0 ? Math.round(n * unite.euros) : null;
    if (montantEuros === null || montantEuros > MONTANT_MAX_EUROS || (effet !== 'cout' && effet !== 'gain')) {
      erreurs.montant = MESSAGES.montant;
    }
  }

  const posteBrut = nettoie(brutes.poste);
  if (posteBrut !== '' && !posteCibleParId(posteBrut)) erreurs.poste = MESSAGES.poste;

  if (brutes.consentement !== 'on' && brutes.consentement !== 'true' && brutes.consentement !== true) {
    erreurs.consentement = MESSAGES.consentement;
  }

  if (Object.keys(erreurs).length > 0) return { erreurs, entree: null };

  return {
    erreurs,
    entree: {
      titre: champs.titre!,
      probleme: champs.probleme!,
      proposition: champs.proposition!,
      beneficiaires: champs.beneficiaires!,
      arbitrage: champs.arbitrage!,
      indicateur: champs.indicateur!,
      pseudo: champs.pseudo!,
      theme,
      niveau,
      effet,
      montantEuros,
      poste: posteBrut === '' ? null : posteBrut,
    },
  };
}

/** Un slug lisible depuis le titre : sans accents, minuscules, tirets. */
export function slugDepuisTitre(titre: string): string {
  const base = titre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
    .replace(/-+$/g, '');
  return base === '' ? 'idee' : base;
}
