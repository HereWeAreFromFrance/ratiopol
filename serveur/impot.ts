// serveur/impot.ts — L'IMPÔT SUR LE REVENU 2026, L'ARITHMÉTIQUE OFFICIELLE.
//
// Pur, sans I/O : le barème progressif et la décote de la brochure
// pratique IR 2026 (impots.gouv.fr, « Calcul de l'impôt », pages 369-382),
// recopiés à l'identique — formule comprise : impôt = R × taux − N × k,
// où R est le revenu net imposable et N le nombre de parts. Le serveur
// rend la page sans JavaScript avec ces nombres, le navigateur (web/impot.ts)
// recalcule les mêmes : les deux calculateurs partagent ce module et
// coïncident par construction.
//
// Ce qui est calculé : le barème, la décote. Ce qui ne l'est PAS (et est
// dit sur la page) : crédits et réductions d'impôt, plafonnement du
// quotient familial (sans effet à 1 ou 2 parts), prélèvements à la source.

export interface TrancheIr {
  /** Plafond de Q = R/N (revenu par part) — le plafond de la dernière
   *  tranche est infini. */
  plafondQ: number;
  /** Taux marginal de la tranche. */
  taux: number;
  /** Constante k de la formule officielle : impôt = R × taux − N × k. */
  deductionParPart: number;
}

/** Le barème 2026 (imposition des revenus 2025), loi de finances pour
 *  2026. Bornes et constantes recopiées de la fiche de calcul de la
 *  brochure IR 2026 : « impôt égal à (R × 0,11) − (N × 1 276,00) », etc. */
export const BAREME_IR = {
  année: '2026',
  revenus: '2025',
  millésime: 'loi de finances pour 2026 — brochure pratique IR 2026 (impots.gouv.fr)',
  tranches: [
    { plafondQ: 11600, taux: 0, deductionParPart: 0 },
    { plafondQ: 29579, taux: 0.11, deductionParPart: 1276.0 },
    { plafondQ: 84577, taux: 0.3, deductionParPart: 6896.01 },
    { plafondQ: 181917, taux: 0.41, deductionParPart: 16199.48 },
    { plafondQ: Number.POSITIVE_INFINITY, taux: 0.45, deductionParPart: 23476.16 },
  ] as TrancheIr[],
  /** La décote, recopiée mot pour mot de la brochure : si l'impôt est
   *  inférieur au seuil, décote = plancher − 45,25 % de l'impôt. */
  decote: {
    celibataire: { seuil: 1982, plancher: 897, taux: 0.4525 },
    couple: { seuil: 3277, plancher: 1483, taux: 0.4525 },
  },
} as const;

/** La situation retenue par le simulateur : une part (célibataire,
 *  divorcé, veuf) ou deux (imposition commune). Le choix porte la
 *  décote qui va avec ; les demi-parts des enfants ne sont pas simulées
 *  (plafonnement du quotient familial : une autre arithmétique, dite
 *  sur la page). */
export type Foyer = 'celibataire' | 'couple';

export const PARTS_FOYER: Record<Foyer, number> = { celibataire: 1, couple: 2 };

export interface ResultatIr {
  /** Impôt selon le barème, avant décote (≥ 0). */
  brut: number;
  /** La décote appliquée, 0 si non éligible. */
  decote: number;
  /** Impôt après décote — le chiffre à payer avant crédits et réductions. */
  apresDecote: number;
  /** Taux moyen : impôt après décote ÷ revenu. */
  tauxMoyen: number;
  /** Taux marginal : celui de la tranche atteinte par le revenu par part. */
  tauxMarginal: number;
}

/** Le calcul entier. R = revenu NET IMPOSABLE (après abattement de 10 %
 *  ou frais réels) ; le revenu par part Q = R/N choisit la tranche ; la
 *  formule officielle donne l'impôt ; la décote s'applique sous son
 *  seuil. Un tout petit impôt ne devient jamais négatif. */
export function calculeIr(revenuNetImposable: number, foyer: Foyer): ResultatIr {
  const parts = PARTS_FOYER[foyer];
  const r = Math.max(0, revenuNetImposable);
  const q = r / parts;
  const tranche = BAREME_IR.tranches.find((t) => q <= t.plafondQ) ?? BAREME_IR.tranches[BAREME_IR.tranches.length - 1]!;
  const brut = Math.max(0, r * tranche.taux - parts * tranche.deductionParPart);
  const bareme = foyer === 'couple' ? BAREME_IR.decote.couple : BAREME_IR.decote.celibataire;
  const decote = brut > 0 && brut < bareme.seuil ? Math.max(0, bareme.plancher - bareme.taux * brut) : 0;
  const apresDecote = Math.max(0, brut - decote);
  return {
    brut,
    decote,
    apresDecote,
    tauxMoyen: r > 0 ? apresDecote / r : 0,
    tauxMarginal: tranche.taux,
  };
}
