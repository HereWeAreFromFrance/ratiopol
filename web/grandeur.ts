// web/grandeur.ts — LE TRADUCTEUR DE MONTANTS (/reperes), CÔTÉ NAVIGATEUR.
//
// Le visiteur tape un montant public en Md€ ; la page le traduit par des
// divisions pures : euros par habitant et par an, part des dépenses
// publiques, part de la dette. Les totaux officiels viennent des attributs
// data-* rendus par le serveur (population Insee, comptes publiés) et le
// calcul/formatage vient de serveur/budget.ts — le module pur que le
// serveur utilise aussi : sans JavaScript, le bouton « Traduire » soumet le
// formulaire en GET et le serveur rend exactement les mêmes nombres.

import { eurosTexte, mdsTexte, parHabitant, partTexteMds } from '../serveur/budget.ts';

export function poseGrandeurs(): void {
  const formulaire = document.querySelector<HTMLFormElement>('form[data-grandeur]');
  if (!formulaire) return;
  const champ = formulaire.querySelector<HTMLInputElement>('input[name="montant"]');
  const section = formulaire.closest('.section');
  const population = Number(formulaire.dataset.pop);
  const depenses = Number(formulaire.dataset.depenses);
  const dette = Number(formulaire.dataset.dette);
  if (!champ || !section || Number.isNaN(population) || Number.isNaN(depenses) || Number.isNaN(dette)) return;

  const ecrire = (selecteur: string, texte: string): void => {
    const el = section.querySelector(selecteur);
    if (el) el.textContent = texte;
  };

  const maj = (): void => {
    // Même bornage que le serveur : jamais de page divergente.
    const mds = Math.min(5000, Math.max(0, Number(champ.value) || 0));
    ecrire('[data-gr-montant]', mdsTexte(mds));
    ecrire('[data-gr-hab]', eurosTexte((mds * 1e9) / population));
    ecrire('[data-gr-dep]', partTexteMds(mds, depenses));
    ecrire('[data-gr-dette]', partTexteMds(mds, dette));
  };

  champ.addEventListener('input', maj);
  maj();
  formulaire.classList.add('grandeur-live');
}
