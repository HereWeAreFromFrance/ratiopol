// web/budget.ts — LE SIMULATEUR POSTE PAR POSTE (/budget ET ACCUEIL), NAVIGATEUR.
//
// De l'arithmétique sur des attributs rendus par le serveur : chaque curseur
// porte son montant de loi (data-mds) et son côté du solde (data-sens), le
// formulaire le solde de la loi (data-solde), chaque segment du camembert
// double anneau son id et son montant (data-id, data-mds). Aucune valeur
// recopiée — recalcul et formatages viennent de serveur/budget.ts, le module
// pur que le serveur utilise aussi pour le rendu sans JavaScript : les deux
// calculateurs coïncident au caractère près, par construction.
//
// Sans ce script, la page reste complète : les curseurs natifs se posent, le
// bouton « Recalculer » soumet le formulaire en GET et le serveur rend les
// mêmes nombres (le formulaire de l'accueil mène aux vingt curseurs de
// /budget). Une fois posé, le script masque le bouton (classe bud-live) : le
// recalcul devient continu, le camembert se recompose à chaque curseur.

import {
  ANNEAU,
  calculeBudget,
  cheminsAnneau,
  deltaTexte,
  eurosDeltaTexte,
  mdsTexte,
  parHabitant,
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

  // Le camembert double anneau : les segments de chaque anneau, dans l'ordre
  // du premier tracé (le serveur rend les paths avec data-id/data-mds ; les
  // postes sans curseur sur cette page y restent, immobiles).
  const anneaux = [...formulaire.querySelectorAll<SVGGElement>('svg[data-donut] g[data-anneau]')].map((g) => ({
    g,
    segments: [...g.querySelectorAll<SVGPathElement>('path[data-mds]')],
    géométrie: g.dataset.anneau === 'dep' ? ANNEAU.dep : ANNEAU.rec,
  }));

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
    ecrire('[data-bud-hab]', eurosDeltaTexte(parHabitant(r.ecartMds)));
    // Le camembert se recompose : valeur de chaque poste = montant de la
    // loi × (1 + pct/100), les parts se rendent entre elles.
    for (const anneau of anneaux) {
      const valeurs = anneau.segments.map((p) => Number(p.dataset.mds) * (1 + (variations[p.dataset.id ?? ''] ?? 0) / 100));
      const chemins = cheminsAnneau(valeurs, anneau.géométrie);
      anneau.segments.forEach((p, i) => p.setAttribute('d', chemins[i] ?? ''));
    }
  };

  for (const curseur of curseurs) curseur.addEventListener('input', maj);
  maj();
  formulaire.classList.add('bud-live');
}
