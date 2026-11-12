// serveur/budget.ts — L'ARITHMÉTIQUE DU SIMULATEUR POSTE PAR POSTE (/budget).
//
// Pur, sans I/O : le serveur rend la page sans JavaScript avec les mêmes
// nombres que le navigateur recalcule ensuite (web/budget.ts) — les deux
// calculateurs partagent ces fonctions et coïncident au caractère près,
// comme le gabarit avant eux. Les montants viennent de reperes.ts (source
// officielle, test de cohérence) ; ici, une seule opération : multiplier un
// montant publió par un pourcentage posé par le visiteur, puis sommer.
//
// Règles d'objectivité (docs/decisions.md, page Repères) : aucun effet
// économique n'est modélisé — doubler un impôt ne double pas son rendement,
// couper une mission n'économise pas mécaniquement son montant — la note de
// méthode de la page le dit. Les nombres ne portent aucun jugement.

import { BUDGET_ETAT, type Poste } from './reperes';

/** Les bornes d'un curseur, en % du montant de la loi : un poste peut être
 *  supprimé (−100) ou doublé (+100), pas davantage. */
export const VARIATION_MIN = -100;
export const VARIATION_MAX = 100;

/** Un curseur de la page : un poste publié, et le côté du solde qu'il
 *  touche. L'id est le nom du champ de formulaire (et la clé des
 *  variations) : ce sont les ids stables de reperes.ts. */
export interface Curseur {
  id: string;
  nom: string;
  /** Milliards d'euros, montant de la loi de finances initiale. */
  mds: number;
  /** « dep » : une hausse creuse le solde. « rec » : une hausse l'arrange. */
  sens: 'dep' | 'rec';
}

function curseurDe(p: Poste & { id: string }, sens: 'dep' | 'rec'): Curseur {
  return { id: p.id, nom: p.nom, mds: p.mds, sens };
}

/** Les recettes non fiscales ne sont pas un Poste de reperes.ts (aucune
 *  idée ne les vise) : le curseur porte son id, propre à /budget. */
export const CURSEURS: Curseur[] = [
  ...BUDGET_ETAT.depenses.map((p) => curseurDe(p as Poste & { id: string }, 'dep')),
  curseurDe(BUDGET_ETAT.autresDepenses as Poste & { id: string }, 'dep'),
  ...BUDGET_ETAT.recettesFiscales.map((p) => curseurDe(p as Poste & { id: string }, 'rec')),
  { id: 'recette-non-fiscales', nom: 'Recettes non fiscales', mds: BUDGET_ETAT.recettesNonFiscalesMds, sens: 'rec' },
];

/** Les variations posées par le visiteur : id de poste → % (entier dans
 *  les bornes). Ce qui est inconnu, vide ou hors bornes n'entre pas. */
export type Variations = Record<string, number>;

const CURSEURS_PAR_ID = new Map(CURSEURS.map((c) => [c.id, c]));

/** Lit des paramètres d'URL (?etat-defense=-50&recette-ir=10) : ne garde
 *  que les ids connus, ramène dans les bornes. Côté navigateur, les inputs
 *  range natifs font le même travail seuls — la double lecture ne sert
 *  qu'au GET du formulaire sans JavaScript. */
export function litVariations(params: URLSearchParams): Variations {
  const variations: Variations = {};
  for (const [cle, brute] of params) {
    if (!CURSEURS_PAR_ID.has(cle)) continue;
    const n = Math.round(Number(brute));
    if (!Number.isFinite(n)) continue;
    variations[cle] = Math.min(VARIATION_MAX, Math.max(VARIATION_MIN, n));
  }
  return variations;
}

export interface ResultatBudget {
  /** Σ des variations de dépenses, en Md€ (négatif = crédits retirés). */
  depensesMds: number;
  /** Σ des variations de recettes, en Md€. */
  recettesMds: number;
  /** Le solde de la loi + recettes − dépenses. */
  soldeMds: number;
  /** L'écart avec le solde de la loi, en Md€. */
  ecartMds: number;
}

/** Le recalcul entier : partir du solde publié (tous budgets — général,
 *  annexes, comptes spéciaux) et lui appliquer les variations. Les postes
 *  non bougés comptent pour zéro : au désarmement complet, la bande rend
 *  exactement les chiffres de la loi. */
export function calculeBudget(variations: Variations): ResultatBudget {
  let depensesMds = 0;
  let recettesMds = 0;
  for (const c of CURSEURS) {
    const delta = (c.mds * (variations[c.id] ?? 0)) / 100;
    if (c.sens === 'dep') depensesMds += delta;
    else recettesMds += delta;
  }
  const ecartMds = recettesMds - depensesMds;
  return { depensesMds, recettesMds, soldeMds: BUDGET_ETAT.soldeMds + ecartMds, ecartMds };
}

/** La variation d'un poste, en Md€. */
export function variationPoste(c: Curseur, pct: number): number {
  return (c.mds * pct) / 100;
}

/* ------------------------------------------------------------------ */
/* Les formatages partagés                                            */
/* ------------------------------------------------------------------ */

const formatteur = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** « −134,6 Md€ » — le signe moins typographique vient du CLDR ; le
 *  serveur rend ce texte tel quel dans la bande, le navigateur l'écrit
 *  dans les mêmes spans : jamais deux écritures du même nombre. */
export function mdsTexte(mds: number): string {
  return `${formatteur.format(mds)} Md€`;
}

/** « +10,0 Md€ » signé côté plus ; le moins typographique du formateur
 *  suffit côté baisse ; « 0,0 Md€ » sans signe au point mort. */
export function deltaTexte(mds: number): string {
  return mds > 0 ? `+${formatteur.format(mds)} Md€` : `${formatteur.format(mds)} Md€`;
}
