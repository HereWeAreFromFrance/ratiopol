// serveur/reperes.ts — LES CHIFFRES OFFICIELS DE LA PAGE /reperes.
//
// Des repères objectifs pour aider à écrire des idées concrètes — notamment
// leur arbitrage. Règle éditoriale (docs/decisions.md) : un chiffre = une
// source officielle nommée, avec son millésime ; aucun commentaire, aucun
// adjectif, aucune sélection partiale (les postes principaux ET le total,
// avec une ligne « autres »). Rien n'est calculé ici : les montants sont
// transcrits tels que publiés, en milliards d'euros à une décimale.
//
// La mise à jour se fait à la main une fois par an, quand la loi de finances
// de l'année est promulguée. Le test `les repères restent cohérents`
// (test/http.test.mjs) vérifie que les parts tiennent dans les totaux — si
// ce test saute après une mise à jour, un montant a été mal recopié.

export interface Poste {
  nom: string;
  /** Milliards d'euros, tel que publié. */
  mds: number;
}

export interface Source {
  nom: string;
  url: string;
}

/* ------------------------------------------------------------------ */
/* Le budget de l'État                                                */
/* ------------------------------------------------------------------ */

/** Les missions principales du budget général, dans l'ordre publié.
 *  Les totaux sont ceux publiés ; la somme des parts arrondies peut
 *  s'en écarter de 0,1 Md€. */
export const BUDGET_ETAT = {
  /** L'année du budget, pour les titres. */
  année: '2026',
  /** La référence juridique complète, pour les notes de méthode. */
  millésime: 'loi de finances initiale pour 2026 (loi n° 2026-103 du 19 février 2026)',
  /** Crédits de paiement du budget général. */
  totalDepensesMds: 593.9,
  depenses: [
    { nom: 'Remboursements et dégrèvements', mds: 145.6 },
    { nom: 'Enseignement scolaire', mds: 89.6 },
    { nom: 'Défense', mds: 66.5 },
    { nom: 'Engagements financiers de l’État', mds: 60.3 },
    { nom: 'Recherche et enseignement supérieur', mds: 31.6 },
    { nom: 'Solidarité, insertion et égalité des chances', mds: 31.3 },
    { nom: 'Sécurités', mds: 25.8 },
    { nom: 'Écologie, développement et mobilité durables', mds: 22.8 },
    { nom: 'Cohésion des territoires', mds: 22.6 },
    { nom: 'Travail et emploi', mds: 20.8 },
    { nom: 'Justice', mds: 13.0 },
    { nom: 'Gestion des finances publiques', mds: 11.0 },
    { nom: 'Administration générale et territoriale de l’État', mds: 5.1 },
    { nom: 'Investir pour la France de 2030', mds: 4.4 },
  ] as Poste[],
  autresDepenses: { nom: 'Autres missions (18)', mds: 43.5 } as Poste,

  /** Recettes du budget général, « nettes » : les recettes fiscales sont
   *  comptées après remboursements et dégrèvements d'impôts (145,6 Md€,
   *  comptés en dépenses ci-dessus). */
  recettesFiscales: [
    { nom: 'Impôt sur le revenu (produit net)', mds: 99.8 },
    { nom: 'TVA (produit net)', mds: 99.8 },
    { nom: 'Impôt sur les sociétés (produit net)', mds: 61.6 },
    { nom: 'Autres contributions fiscales (produit net)', mds: 77.0 },
    { nom: 'Accises sur les énergies — TICPE (montant brut)', mds: 25.3 },
  ] as Poste[],
  totalFiscalesMds: 363.6,
  recettesNonFiscalesMds: 28.9,
  /** A + B : avant transferts. */
  recettesAvantPrélèvementsMds: 392.5,
  prélèvements: [
    { nom: 'Au profit des collectivités territoriales', mds: 44.8 },
    { nom: 'Au profit de l’Union européenne', mds: 28.4 },
  ] as Poste[],
  fondsDeConcoursMds: 6.1,
  /** A + B − prélèvements + fonds de concours. */
  recettesNettesMds: 325.4,
  chargesNettesMds: 458.9,
  /** Budget général, budgets annexes et comptes spéciaux. */
  soldeMds: -134.6,
  emploisAutorises: 2016588,
};

/* ------------------------------------------------------------------ */
/* Les finances publiques complètes                                   */
/* ------------------------------------------------------------------ */

/** L'ensemble des administrations publiques : le budget de l'État n'en est
 *  qu'un tiers, les idées portent aussi sur la Sécurité sociale et les
 *  collectivités. */
export const FINANCES_PUBLIQUES = {
  année: 2025,
  dépensesMds: 1714.1,
  dépensesPib: 57.3,
  recettesMds: 1562.5,
  recettesPib: 52.2,
  /** Dépenses par sous-secteur, telles que publiées (non consolidées). */
  sousSecteurs: [
    { nom: 'Administrations de sécurité sociale', mds: 803.2 },
    { nom: 'État', mds: 607.7 },
    { nom: 'Administrations publiques locales (communes, départements, régions)', mds: 335.5 },
    { nom: 'Organismes divers d’administration centrale (ODAC)', mds: 142.3 },
  ] as Poste[],
  noteSousSecteurs:
    'Ces montants ne s’additionnent pas : ils incluent les transferts entre administrations ' +
    '(par exemple de l’État vers les collectivités ou la Sécurité sociale), comptés chez chacun. ' +
    'Le total consolidé des administrations publiques est de 1 714,1 Md€.',
  déficitMds: 151.6,
  déficitPib: 5.1,
  detteMds: 3595.5,
  dettePib: 119.0,
  detteDate: '30 juin 2026',
};

/* ------------------------------------------------------------------ */
/* Les sources                                                        */
/* ------------------------------------------------------------------ */

export const SOURCES_REPERES: Source[] = [
  {
    nom: 'Direction du budget — « Les chiffres clés du budget de l’État pour 2026 » (loi de finances initiale pour 2026)',
    url: 'https://www.budget.gouv.fr/reperes/loi_de_finances/articles/chiffres-cles-budget-etat-2026',
  },
  {
    nom: 'Insee — « Dépenses et recettes des administrations publiques en 2025 » (Insee Résultats, comptes nationaux base 2020, 28 août 2026)',
    url: 'https://www.insee.fr/fr/statistiques/8988845?sommaire=8988934',
  },
  {
    nom: 'Insee — « Dette et déficit publics au sens de Maastricht en 2025 » (Informations rapides, mars 2026)',
    url: 'https://www.insee.fr/fr/statistiques/8988843?sommaire=8988934',
  },
  {
    nom: 'Insee — « À la fin du deuxième trimestre 2026, le ratio de dette publique s’établit à 119,0 % du PIB » (Informations rapides n° 323, 29 septembre 2026)',
    url: 'https://www.insee.fr/fr/statistiques/9053525',
  },
];
