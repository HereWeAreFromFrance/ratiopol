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
  /** Identifiant STABLE, stocké avec les idées qui visent ce poste
   *  (gabarit : « poste budgétaire touché »). Ne jamais le renommer à la
   *  mise à jour annuelle : un poste qui disparaît s'enlève, un nouveau
   *  prend un nouvel id. Absent sur les lignes de méthode. */
  id?: string;
  nom: string;
  /** Milliards d'euros, tel que publié. */
  mds: number;
  /** Thème RatioPol vers lequel la ligne mène (id de themes.ts) —
   *  « d'où partent les idées sur ce poste ». Absent sur les lignes de
   *  méthode (calcul des recettes), qui ne sont pas des postes. */
  theme?: string;
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
    { id: 'etat-remboursements', nom: 'Remboursements et dégrèvements', mds: 145.6, theme: 'impots' },
    { id: 'etat-enseignement-scolaire', nom: 'Enseignement scolaire', mds: 89.6, theme: 'ecole' },
    { id: 'etat-defense', nom: 'Défense', mds: 66.5, theme: 'international' },
    { id: 'etat-engagements-financiers', nom: 'Engagements financiers de l’État', mds: 60.3, theme: 'impots' },
    { id: 'etat-recherche-sup', nom: 'Recherche et enseignement supérieur', mds: 31.6, theme: 'superieur' },
    { id: 'etat-solidarite', nom: 'Solidarité, insertion et égalité des chances', mds: 31.3, theme: 'solidarites' },
    { id: 'etat-securites', nom: 'Sécurités', mds: 25.8, theme: 'securite' },
    { id: 'etat-ecologie', nom: 'Écologie, développement et mobilité durables', mds: 22.8, theme: 'environnement' },
    { id: 'etat-cohesion-territoires', nom: 'Cohésion des territoires', mds: 22.6, theme: 'logement' },
    { id: 'etat-travail-emploi', nom: 'Travail et emploi', mds: 20.8, theme: 'travail' },
    { id: 'etat-justice', nom: 'Justice', mds: 13.0, theme: 'justice' },
    { id: 'etat-gestion-finances', nom: 'Gestion des finances publiques', mds: 11.0, theme: 'impots' },
    { id: 'etat-administration', nom: 'Administration générale et territoriale de l’État', mds: 5.1, theme: 'services-publics' },
    { id: 'etat-france-2030', nom: 'Investir pour la France de 2030', mds: 4.4, theme: 'entreprises' },
  ] as Poste[],
  autresDepenses: { id: 'etat-autres-missions', nom: 'Autres missions (18)', mds: 43.5, theme: 'autre' } as Poste,

  /** Recettes du budget général, « nettes » : les recettes fiscales sont
   *  comptées après remboursements et dégrèvements d'impôts (145,6 Md€,
   *  comptés en dépenses ci-dessus). */
  recettesFiscales: [
    { id: 'recette-ir', nom: 'Impôt sur le revenu (produit net)', mds: 99.8, theme: 'impots' },
    { id: 'recette-tva', nom: 'TVA (produit net)', mds: 99.8, theme: 'impots' },
    { id: 'recette-is', nom: 'Impôt sur les sociétés (produit net)', mds: 61.6, theme: 'impots' },
    { id: 'recette-autres-fiscales', nom: 'Autres contributions fiscales (produit net)', mds: 77.0, theme: 'impots' },
    { id: 'recette-ticpe', nom: 'Accises sur les énergies — TICPE (montant brut)', mds: 25.3, theme: 'impots' },
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
    { id: 'apu-securite-sociale', nom: 'Administrations de sécurité sociale', mds: 803.2, theme: 'sante' },
    { id: 'apu-etat', nom: 'État', mds: 607.7, theme: 'impots' },
    { id: 'apu-locales', nom: 'Administrations publiques locales (communes, départements, régions)', mds: 335.5, theme: 'territoires' },
    { id: 'apu-odac', nom: 'Organismes divers d’administration centrale (ODAC)', mds: 142.3, theme: 'autre' },
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
/* L'évolution (la série tracée en courbe)                            */
/* ------------------------------------------------------------------ */

/** Cinq dernières années des comptes nationaux, en % du PIB : c'est la
 *  seule vraie série temporelle de la page (les missions d'une même année
 *  ne se tracent pas en courbe). La courbe trace ces montants, elle ne les
 *  remplace pas : les chiffres de 2025 restent ceux du bloc « L'essentiel ».
 *  Même source et même millésime que FINANCES_PUBLIQUES.
 *  La dette suit la même règle — ATTENTION à ses millésimes : la série
 *  annuelle s'arrête à fin 2025 (115,7 % du PIB, tableau 3.101), tandis
 *  que « L'essentiel » affiche le point trimestriel au 30/06/2026
 *  (119,0 %) : deux dates officielles différentes, la note de la page le
 *  dit. */
export const ÉVOLUTION = {
  /** Série en % du PIB, du plus ancien au plus récent. */
  années: [2021, 2022, 2023, 2024, 2025],
  dépensesPib: [59.5, 58.4, 56.8, 57.0, 57.3],
  recettesPib: [52.9, 53.7, 51.4, 51.2, 52.2],
  /** Série en Md€, pour lire les montants sans changer de source. */
  dépensesMds: [1491.4, 1550.3, 1608.3, 1672.7, 1714.1],
  recettesMds: [1326.2, 1424.4, 1456.4, 1503.5, 1562.5],
  /** Dette publique au sens de Maastricht, tableau 3.101 (Insee, comptes
   *  nationaux annuels, base 2020) — valeurs au 31/12 de chaque année. */
  dettePib: [112.8, 111.4, 109.5, 112.6, 115.7],
  detteMds: [2828.8, 2955.6, 3103.2, 3306.1, 3460.1],
};

/* ------------------------------------------------------------------ */
/* Les recettes de TOUTES les administrations publiques               */
/* ------------------------------------------------------------------ */

/** D'où vient l'argent public : les recettes consolidées des APU (État,
 *  Sécurité sociale, collectivités, ODAC), tableau 3.201 des comptes
 *  nationaux — le complément des sous-secteurs « qui dépense ». La ligne
 *  « autres » est exacte : recettes de production + revenus de la
 *  propriété + autres transferts − impôts non recouvrables (188,5 − 6,7).
 *  Les montants s'additionnent au total publié (1 562,5 Md€). */
export const RECETTES_APU = {
  année: 2025,
  totalMds: 1562.5,
  recettes: [
    { id: 'apu-cotisations', nom: 'Cotisations sociales nettes', mds: 498.7, theme: 'sante' },
    { id: 'apu-impots-production', nom: 'Impôts sur la production et les importations (dont TVA)', mds: 470.4, theme: 'impots' },
    { id: 'apu-impots-revenu', nom: 'Impôts courants sur le revenu et le patrimoine (dont impôt sur le revenu)', mds: 389.9, theme: 'impots' },
    { id: 'apu-impots-capital', nom: 'Impôts en capital', mds: 21.7, theme: 'impots' },
    { id: 'apu-autres-recettes', nom: 'Autres recettes (production, revenus, transferts, nets des impôts non recouvrables)', mds: 181.8, theme: 'autre' },
  ] as Poste[],
  note:
    'Recettes consolidées de l’ensemble des administrations publiques : ' +
    'cotisations et impôts de tous les niveaux (État, Sécurité sociale, collectivités), ' +
    'transferts internes exclus. Une cotisation ou un impôt apparaît une seule fois.',
};

/* ------------------------------------------------------------------ */
/* La longue durée                                                    */
/* ------------------------------------------------------------------ */

/** Un demi-siècle de dette publique, en pourcent du PIB (tableau 3.101,
 *  mêmes comptes nationaux que ÉVOLUTION.dettePib — dont ces séries sont
 *  le prolongement vers le passé). Quatre courbes : la dette totale et sa
 *  répartition par sous-secteur (État, collectivités, Sécurité sociale).
 *  Le sous-secteur « administration centrale » n'est pas répété : l'État
 *  en est l'essentiel (les ODAC pèsent 2,3 points en 2025). */
export const DETTE_LONGUE = {
  années: [1978, 1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  /** Dette des administrations publiques, pourcent du PIB. */
  totale: [21.6, 21.6, 21.3, 22.6, 26.2, 27.7, 30.2, 31.9, 32.4, 34.8, 34.7, 35.5, 36.8, 37.8, 41.7, 48.2, 51.6, 57.8, 60.6, 62, 62.1, 61.4, 59.7, 59.3, 61.3, 65.4, 66.9, 68.2, 65.4, 65.5, 69.8, 84.1, 86.3, 88.7, 91.7, 94.6, 96.2, 97, 98.2, 98.8, 98.5, 98.2, 114.9, 112.8, 111.4, 109.5, 112.6, 115.7],
  etat: [12.8, 12.6, 12.3, 13.4, 16.4, 17.3, 19.1, 20.3, 21.1, 22.7, 23.2, 24.2, 25.3, 25.8, 28.8, 33.7, 37.4, 40.3, 42.7, 44.1, 45.6, 45.7, 44.8, 45, 47.4, 50.1, 50.3, 51.1, 48.8, 48.4, 52.6, 60.7, 62.8, 65.2, 69.3, 72.1, 74.5, 75.2, 76.4, 77.1, 78.2, 78.6, 90.1, 89.1, 89.2, 88.8, 91.5, 94.4],
  locales: [6.9, 6.9, 6.9, 7.1, 7.3, 7.6, 8, 8.5, 8.5, 9.2, 8.9, 8.6, 8.6, 8.8, 8.9, 9.2, 9.2, 9.1, 9, 8.2, 7.9, 7.6, 7.2, 6.9, 6.7, 6.7, 6.6, 6.8, 6.9, 7.1, 7.4, 8.1, 8.2, 8.2, 8.4, 8.6, 8.7, 8.9, 8.9, 8.7, 8.7, 8.6, 9.8, 9.7, 9.2, 8.8, 8.9, 9.2],
  securite: [1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.4, 1.3, 0.8, 0.8, 0.9, 0.8, 0.8, 1, 1.6, 2.3, 1.8, 2.8, 3.3, 4.3, 3.5, 3.2, 3.1, 2.9, 3, 3.9, 5.6, 6.3, 6.3, 6.3, 6.1, 7.9, 8.8, 10, 10.1, 10, 10.1, 10, 10.1, 9.9, 8.7, 8, 11.8, 11, 10.2, 9.4, 9.8, 9.8],
};

/** Les dépenses et recettes publiques en milliards d'euros courants
 *  depuis 1959 (tableau 3.201) — l'échelle de l'État-providence. Montants
 *  NOMINAUX : aucune correction de l'inflation, la note de la page le
 *  dit ; les comparer au PIB d'aujourd'hui n'a pas de sens. */
export const COMPTES_LONGS = {
  années: [1959, 1960, 1961, 1962, 1963, 1964, 1965, 1966, 1967, 1968, 1969, 1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979, 1980, 1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  dépenses: [15.4, 16.7, 18.8, 21.7, 24.9, 27.9, 30.7, 33.4, 36.7, 42.1, 47.1, 51.8, 57.2, 63.6, 72.8, 85.7, 107.9, 126, 139.4, 161.5, 185.6, 215, 255.7, 301.4, 338, 374.7, 406.1, 431.3, 448.1, 477.6, 503.2, 538.8, 570.9, 605.7, 641.6, 655.4, 680.4, 698.5, 716.6, 726.7, 748.6, 775.3, 808.2, 851.1, 881.8, 915.9, 956.1, 992.2, 1039.3, 1080.2, 1122.6, 1152, 1175.7, 1209, 1242.4, 1257.6, 1268, 1280.6, 1321.4, 1327.6, 1346.2, 1430.4, 1491.4, 1550.3, 1608.3, 1672.6, 1714.1],
  recettes: [16, 17.2, 19.4, 21.8, 25.1, 28.5, 31.1, 33.6, 36.2, 40.7, 46.9, 51.7, 56.8, 64, 72.6, 85.9, 101, 121.6, 135.9, 155.2, 183.7, 213, 243.4, 284.8, 321.5, 355.4, 383.6, 405.3, 430.9, 453.9, 485.4, 513.2, 539.6, 553.6, 569, 591.5, 618.3, 649.9, 668.8, 694.5, 727, 756, 786.5, 801, 815.5, 855.6, 894.3, 943.2, 981.4, 1010.5, 979.8, 1009.2, 1066.3, 1101, 1137.6, 1159.1, 1182.3, 1196.6, 1244.4, 1273, 1287.9, 1223.3, 1326.3, 1424.4, 1456.4, 1503.5, 1562.5],
};

/* ------------------------------------------------------------------ */
/* Les postes qu'une idée peut viser                                  */
/* ------------------------------------------------------------------ */

/** Un poste qu'une idée peut déclarer toucher (champ optionnel du
 *  gabarit). Le rendu rapporte alors le montant estimé par l'auteur au
 *  montant officiel du poste — une division, rien de plus, avec la source
 *  et le millésime du dénominateur. */
export interface PosteCible {
  id: string;
  nom: string;
  mds: number;
  /** Groupe du menu déroulant et rappel de la source dans la phrase. */
  groupe: string;
}

function cibles(postes: Poste[], groupe: string): PosteCible[] {
  return postes
    .filter((p): p is Poste & { id: string } => p.id !== undefined)
    .map((p) => ({ id: p.id, nom: p.nom, mds: p.mds, groupe }));
}

export const POSTES_CIBLES: PosteCible[] = [
  ...cibles([...BUDGET_ETAT.depenses, BUDGET_ETAT.autresDepenses], `Dépenses de l’État — LFI ${BUDGET_ETAT.année}`),
  ...cibles(BUDGET_ETAT.recettesFiscales, `Recettes de l’État — LFI ${BUDGET_ETAT.année}`),
  ...cibles(FINANCES_PUBLIQUES.sousSecteurs, `Dépenses publiques par sous-secteur — Insee ${FINANCES_PUBLIQUES.année}`),
];

/** Le thème d'un poste (pour les chiffres d'une page de thème). */
export function posteThemeParId(id: string): string | undefined {
  return [...BUDGET_ETAT.depenses, BUDGET_ETAT.autresDepenses, ...BUDGET_ETAT.recettesFiscales, ...FINANCES_PUBLIQUES.sousSecteurs]
    .find((p) => p.id === id)?.theme;
}

export function posteCibleParId(id: string): PosteCible | undefined {
  return POSTES_CIBLES.find((p) => p.id === id);
}

/* ------------------------------------------------------------------ */
/* La population (pour les rapports par habitant)                     */
/* ------------------------------------------------------------------ */

/** La population résidant en France au 1er janvier 2026. Elle ne sert qu'à
 *  des DIVISIONS (un montant publié ÷ la population) : « dette par
 *  habitant », « écart par habitant » — une traduction, jamais un modèle.
 *  Recopiée du bilan démographique : « Au 1er janvier 2026, la population
 *  résidant en France est estimée à 69,1 millions d'habitants » (le
 *  chiffre fin vient de la figure 1 : 69 082 milliers). */
export const POPULATION = {
  date: '1er janvier 2026',
  /** 69 082 milliers d'habitants, figure 1 du bilan démographique. */
  habitants: 69_082_000,
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
    nom: 'Insee — « Bilan démographique 2025 » (Insee Première n° 2087, 13 janvier 2026 — population au 1er janvier 2026)',
    url: 'https://www.insee.fr/fr/statistiques/8719824',
  },
  {
    nom: 'Insee — « Dépenses et recettes des administrations publiques en 2025 » (Insee Résultats, comptes nationaux base 2020, 28 août 2026)',
    url: 'https://www.insee.fr/fr/statistiques/8988845?sommaire=8988934',
  },
  {
    nom: 'Insee — « Dette et déficit publics au sens de Maastricht en 2025 » (Insee Résultats, comptes nationaux base 2020, 28 août 2026)',
    url: 'https://www.insee.fr/fr/statistiques/8988843?sommaire=8988934',
  },
  {
    nom: 'Insee — « À la fin du deuxième trimestre 2026, le ratio de dette publique s’établit à 119,0 % du PIB » (Informations rapides n° 239, 29 septembre 2026)',
    url: 'https://www.insee.fr/fr/statistiques/9053525',
  },
  {
    nom: 'Service-Public — « Quel est le barème de l’impôt sur le revenu ? » (barème 2026, revenus 2025)',
    url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1419',
  },
  {
    nom: 'Impots.gouv.fr — Brochure pratique IR 2026, « Calcul de l’impôt » (barème, formule et décote 2026)',
    url: 'https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/21-calcul_impot_369a382.pdf',
  },
];
