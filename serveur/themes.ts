// serveur/themes.ts — LA CARTE DES THÈMES ET NIVEAUX TERRITORIAUX.
//
// EXHAUSTIVE ET LISIBLE À LA FOIS (décision du 11/11/2026) : chaque mission
// du budget de l'État trouve un thème (le test des Repères le vérifie), mais
// la liste se présente en FAMILLES de quatre ou cinq thèmes, chacun avec une
// accroche d'exemples concrets — on reconnaît son sujet sans lire 26 lignes.
// Un « Autre » attrape ce qui manque.
//
// Les ids sont STOCKÉS avec les idées : ne jamais en renommer un. Un thème
// qui change de nom garde son id (`impots` s'affiche « Budget & impôts »).
// Les accroches énumèrent des sujets, jamais une position : « nucléaire,
// renouvelables », pas « sortir du nucléaire ».

export interface Theme {
  id: string;
  nom: string;
  /** Quelques sujets concrets, séparés par des virgules. */
  accroche: string;
  famille: string;
}

export interface Famille {
  id: string;
  nom: string;
}

export const FAMILLES: Famille[] = [
  { id: 'quotidien', nom: 'Au quotidien' },
  { id: 'travail', nom: 'Apprendre & travailler' },
  { id: 'ensemble', nom: 'Vivre ensemble' },
  { id: 'planete', nom: 'Planète & territoires' },
  { id: 'etat', nom: 'L’État & la démocratie' },
  { id: 'numerique', nom: 'Numérique' },
];

export const THEMES: Theme[] = [
  // Au quotidien
  { id: 'logement', nom: 'Logement', famille: 'quotidien', accroche: 'Loyers, construction, rénovation, logement social, sans-abrisme' },
  { id: 'sante', nom: 'Santé', famille: 'quotidien', accroche: 'Hôpital, déserts médicaux, prévention, médicaments, santé mentale' },
  { id: 'pouvoir-achat', nom: 'Pouvoir d’achat', famille: 'quotidien', accroche: 'Prix, factures, consommation, banques et assurances, surendettement' },
  { id: 'transports', nom: 'Transports & mobilités', famille: 'quotidien', accroche: 'Trains, transports en commun, routes, vélo, permis de conduire' },
  { id: 'securite', nom: 'Sécurité', famille: 'quotidien', accroche: 'Police, gendarmerie, délinquance, sécurité routière, secours' },
  // Apprendre & travailler
  { id: 'ecole', nom: 'École', famille: 'travail', accroche: 'De la crèche au lycée, enseignants, programmes, orientation' },
  { id: 'superieur', nom: 'Études supérieures & recherche', famille: 'travail', accroche: 'Université, grandes écoles, vie étudiante, laboratoires, innovation' },
  { id: 'travail', nom: 'Travail & emploi', famille: 'travail', accroche: 'Salaires, chômage, conditions de travail, formation, apprentissage' },
  { id: 'entreprises', nom: 'Entreprises & économie', famille: 'travail', accroche: 'Industrie, commerce, artisanat, indépendants, simplification' },
  { id: 'retraites', nom: 'Retraites', famille: 'travail', accroche: 'Âge de départ, pensions, régimes, cumul emploi-retraite' },
  // Vivre ensemble
  { id: 'solidarites', nom: 'Solidarités & famille', famille: 'ensemble', accroche: 'Minima sociaux, famille, handicap, grand âge, aidants' },
  { id: 'egalite', nom: 'Égalité & discriminations', famille: 'ensemble', accroche: 'Égalité femmes-hommes, discriminations, violences, laïcité' },
  { id: 'immigration', nom: 'Immigration & intégration', famille: 'ensemble', accroche: 'Asile, titres de séjour, langue, accès à l’emploi, naturalisation' },
  { id: 'culture', nom: 'Culture, médias & sport', famille: 'ensemble', accroche: 'Création, patrimoine, audiovisuel public, presse, sport, associations' },
  // Planète & territoires
  { id: 'environnement', nom: 'Climat & environnement', famille: 'planete', accroche: 'Climat, biodiversité, eau, pollution, déchets, adaptation' },
  { id: 'energie', nom: 'Énergie', famille: 'planete', accroche: 'Électricité, nucléaire, renouvelables, chauffage, carburants, sobriété' },
  { id: 'agriculture', nom: 'Agriculture & alimentation', famille: 'planete', accroche: 'Agriculteurs, prix agricoles, alimentation, pêche, forêt, bien-être animal' },
  { id: 'territoires', nom: 'Territoires', famille: 'planete', accroche: 'Communes, ruralité, quartiers, outre-mer, aménagement, montagne et littoral' },
  // L'État & la démocratie
  { id: 'impots', nom: 'Budget & impôts', famille: 'etat', accroche: 'Fiscalité, dette, déficit, dépense publique, fraude' },
  { id: 'services-publics', nom: 'Services publics', famille: 'etat', accroche: 'Guichets, démarches, fonctionnaires, La Poste, présence locale' },
  { id: 'institutions', nom: 'Institutions & démocratie', famille: 'etat', accroche: 'Élections, Parlement, référendum, décentralisation, transparence' },
  { id: 'justice', nom: 'Justice', famille: 'etat', accroche: 'Tribunaux, délais, prisons, accès au droit, mineurs' },
  { id: 'international', nom: 'Europe, défense & monde', famille: 'etat', accroche: 'Union européenne, armées, diplomatie, aide au développement, commerce' },
  // Numérique
  { id: 'numerique', nom: 'Numérique & données', famille: 'numerique', accroche: 'Internet, vie privée, cybersécurité, plateformes, fracture numérique' },
  { id: 'ia', nom: 'Intelligence artificielle', famille: 'numerique', accroche: 'Usages, emploi, régulation, IA dans les services publics, création' },
  // Hors famille : le filet.
  { id: 'autre', nom: 'Autre', famille: '', accroche: 'Ce qui n’entre dans aucun thème' },
];

/** Les thèmes d'une famille, dans l'ordre de la liste. */
export function themesDe(famille: string): Theme[] {
  return THEMES.filter((t) => t.famille === famille);
}

export interface Niveau {
  id: string;
  nom: string;
}

export const NIVEAUX: Niveau[] = [
  { id: 'commune', nom: 'Commune' },
  { id: 'departement', nom: 'Département' },
  { id: 'region', nom: 'Région' },
  { id: 'etat', nom: 'État' },
  { id: 'ue', nom: 'Union européenne' },
];

export function themeParId(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}

export function niveauParId(id: string): Niveau | undefined {
  return NIVEAUX.find((n) => n.id === id);
}
