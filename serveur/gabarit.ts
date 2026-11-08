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

import { THEMES, NIVEAUX } from './themes';

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

export type ChampIdee = keyof typeof BORNES | 'theme' | 'niveau' | 'email' | 'consentement';

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
  email?: unknown;
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
  email: string | null;
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
  email: 'Cette adresse e-mail ne semble pas valide.',
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

  const email = nettoie(brutes.email);
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) erreurs.email = MESSAGES.email;

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
      email: email === '' ? null : email,
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
