// serveur/fiches.ts — LES FICHES « POUR AGIR » DE CHAQUE THÈME.
//
// Pour agir sur un sujet, il faut en connaître l'ampleur et savoir qui
// décide. Chaque thème porte donc une fiche : chiffres clés, compétences
// (qui décide quoi), sources pour aller plus loin. Un bloc commun
// « comment agir » liste les voies officielles (pétitions, élus…).
//
// Mêmes règles que les Repères (docs/decisions.md, 09/11/2026) : un chiffre
// = une source officielle nommée + une date ; aucun commentaire, aucun
// adjectif ; recopié tel que publié, jamais calculé. Chaque chiffre garde
// l'EXTRAIT de la page d'où il vient (non affiché) : c'est la preuve qu'on
// relit à la mise à jour. Le test « fiches » vérifie la forme (sources
// officielles en https, champs remplis, tous les thèmes couverts).
//
// Mise à jour : à la main, quand une source publie une nouvelle édition.

import donnees from './fiches.json';

export interface Chiffre {
  libelle: string;
  valeur: string;
  /** Périmètre et date de la donnée. */
  precision: string;
  /** Organisme — titre (date de publication). */
  source: string;
  url: string;
  /** Phrase de la page source contenant le chiffre (audit, non affichée). */
  extrait: string;
}

export interface Competence {
  /** Le niveau qui décide (« État », « Région »…) ou la voie d'action. */
  niveau: string;
  role: string;
  source: string;
  url: string;
}

export interface Ressource {
  nom: string;
  url: string;
}

export interface Fiche {
  theme: string;
  /** Date de la dernière vérification des sources (AAAA-MM-JJ). */
  verifieeLe: string;
  chiffres: Chiffre[];
  competences: Competence[];
  ressources: Ressource[];
}

export const FICHES = donnees as Fiche[];

export function ficheDe(theme: string): Fiche | undefined {
  return FICHES.find((f) => f.theme === theme);
}

/** Les voies d'action citoyenne, communes à tous les thèmes. */
export const COMMENT_AGIR = 'comment-agir';
