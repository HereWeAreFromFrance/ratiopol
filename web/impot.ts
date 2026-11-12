// web/impot.ts — LE SIMULATEUR D'IMPÔT SUR LE REVENU (/reperes), NAVIGATEUR.
//
// Le visiteur tape son revenu net imposable et son foyer ; la page
// recalcule l'impôt selon le barème 2026 et la décote — l'arithmétique
// officielle de serveur/impot.ts, le module pur que le serveur utilise
// aussi pour le rendu sans JavaScript : les deux calculateurs coïncident
// par construction. Sans ce script, le bouton « Calculer » soumet le
// formulaire en GET et le serveur rend les mêmes nombres.

import { calculeIr, type Foyer } from '../serveur/impot.ts';
import { eurosTexte, partTexteMds } from '../serveur/budget.ts';

export function poseImpot(): void {
  const formulaire = document.querySelector<HTMLFormElement>('form[data-impot]');
  if (!formulaire) return;
  const revenu = formulaire.querySelector<HTMLInputElement>('input[name="revenu"]');
  const foyer = formulaire.querySelector<HTMLSelectElement>('select[name="foyer"]');
  const section = formulaire.closest('.section');
  if (!revenu || !foyer || !section) return;

  const ecrire = (selecteur: string, texte: string): void => {
    const el = section.querySelector(selecteur);
    if (el) el.textContent = texte;
  };

  const maj = (): void => {
    // Même bornage que le serveur : jamais de page divergente.
    const r = calculeIr(Math.min(10_000_000, Math.max(0, Math.round(Number(revenu.value) || 0))), (foyer.value === 'couple' ? 'couple' : 'celibataire') as Foyer);
    ecrire('[data-ir-brut]', eurosTexte(r.brut));
    ecrire('[data-ir-decote]', r.decote > 0 ? `−${eurosTexte(r.decote)}` : 'aucune');
    ecrire('[data-ir-payer]', eurosTexte(r.apresDecote));
    ecrire('[data-ir-moyen]', partTexteMds(r.tauxMoyen * 100, 100));
    ecrire('[data-ir-marginal]', `${Math.round(r.tauxMarginal * 100)} %`);
  };

  revenu.addEventListener('input', maj);
  foyer.addEventListener('change', maj);
  maj();
  formulaire.classList.add('impot-live');
}
