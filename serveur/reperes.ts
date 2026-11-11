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
 *  Même source et même millésime que FINANCES_PUBLIQUES. */
export const ÉVOLUTION = {
  /** Série en % du PIB, du plus ancien au plus récent. */
  années: [2021, 2022, 2023, 2024, 2025],
  dépensesPib: [59.5, 58.4, 56.8, 57.0, 57.3],
  recettesPib: [52.9, 53.7, 51.4, 51.2, 52.2],
  /** Série en Md€, pour lire les montants sans changer de source. */
  dépensesMds: [1491.4, 1550.3, 1608.3, 1672.7, 1714.1],
  recettesMds: [1326.2, 1424.4, 1456.4, 1503.5, 1562.5],
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
