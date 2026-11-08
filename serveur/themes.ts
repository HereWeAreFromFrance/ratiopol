// serveur/themes.ts — LA CARTE DES THÈMES ET NIVEAUX TERRITORIAUX.
//
// Liste fixe en v1 (doc 04) : elle filtre les dépôts côté serveur et anime
// la navigation. Un « autre » attrape ce qui manque. Tout ajout ici doit
// rester un VOCABLE COURT et compréhensible par tous.

export interface Theme {
  id: string;
  nom: string;
}

export const THEMES: Theme[] = [
  { id: 'logement', nom: 'Logement' },
  { id: 'sante', nom: 'Santé' },
  { id: 'ecole', nom: 'École & éducation' },
  { id: 'travail', nom: 'Travail & salaires' },
  { id: 'environnement', nom: 'Environnement & énergie' },
  { id: 'securite', nom: 'Sécurité & justice' },
  { id: 'impots', nom: 'Impôts & budget' },
  { id: 'institutions', nom: 'Institutions & démocratie' },
  { id: 'numerique', nom: 'Numérique' },
  { id: 'territoires', nom: 'Agriculture & territoires' },
  { id: 'transports', nom: 'Transports' },
  { id: 'autre', nom: 'Autre' },
];

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
