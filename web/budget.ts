// web/budget.ts — LE SIMULATEUR POSTE PAR POSTE (/budget), CÔTÉ NAVIGATEUR.
//
// De l'arithmétique sur des attributs rendus par le serveur : chaque curseur
// porte son montant de loi (data-mds) et son côté du solde (data-sens), le
// formulaire le solde de la loi (data-solde). Aucune valeur recopiée — le
// recalcul et les formatages viennent de serveur/budget.ts, le module pur
// que le serveur utilise aussi pour le rendu sans JavaScript : les deux
// calculateurs coïncident au caractère près, par construction.
//
// Sans ce script, la page reste complète : les curseurs natifs se posent,
// le bouton « Recalculer » soumet le formulaire en GET et le serveur rend
// les mêmes nombres. Une fois posé, le script masque le bouton (classe
// bud-live) : le recalcul devient continu.

import {
  calculeBudget,
  deltaTexte,
  mdsTexte,
  VARIATION_MAX,
  VARIATION_MIN,
  type Variations,
} from '../serveur/budget.ts';

export function poseBudget(): void {
  const formulaire = document.querySelector<HTMLFormElement>('form[data-budget]');
  if (!formulaire) return;
  const curseurs = [...formulaire.querySelectorAll<HTMLInputElement>('input[type="range"][data-mds]')];
  const soldeLoi = Number(formulaire.dataset.solde);
  if (curseurs.length === 0 || Number.isNaN(soldeLoi)) return;

  const ecrire = (selecteur: string, texte: string): void => {
    const el = formulaire.querySelector(selecteur);
    if (el) el.textContent = texte;
  };

  const maj = (): void => {
    const variations: Variations = {};
    for (const curseur of curseurs) {
      // Les inputs range natifs bornent déjà ; le resserrage ne protège
      // que du DOM trafiqué — et applique la même règle que le serveur.
      const pct = Math.min(VARIATION_MAX, Math.max(VARIATION_MIN, Math.round(Number(curseur.value) || 0)));
      variations[curseur.name] = pct;
      const sortie = curseur.closest('.bud-ligne')?.querySelector('output[data-bud-var]');
      if (sortie) sortie.textContent = deltaTexte((Number(curseur.dataset.mds) * pct) / 100);
    }
    const r = calculeBudget(variations);
    ecrire('[data-bud-dep]', deltaTexte(r.depensesMds));
    ecrire('[data-bud-rec]', deltaTexte(r.recettesMds));
    ecrire('[data-bud-solde]', mdsTexte(r.soldeMds));
    ecrire('[data-bud-ecart]', deltaTexte(r.ecartMds));
  };

  for (const curseur of curseurs) curseur.addEventListener('input', maj);
  maj();
  formulaire.classList.add('bud-live');
}
