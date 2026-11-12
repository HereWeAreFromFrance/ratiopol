// web/main.ts — LE PEU DE JAVASCRIPT, ET ENCORE.
//
// Le site marche sans lui : formulaires natifs, redirections, pages rendues
// côté serveur. Il n'ajoute que du confort :
//  · compteurs de caractères sur les champs du formulaire guidé (borne
//    visible = gabarit compris avant l'erreur) ;
//  · avis (d'accord / pas d'accord, jugement de l'arbitrage) sans recharger
//    la page — le formulaire natif reste le secours ;
//  · les annonces de visite /_vu (visites.ts, le contrat maison) ;
//  · le simulateur d'hypothèse sur /reperes (simulateur.ts) : deux
//    poignées sur la courbe d'évolution, solde recalculé — arithmétique
//    pure sur des données rendues en attributs par le serveur ;
//  · le simulateur poste par poste sur /budget (budget.ts) : un curseur
//    par mission et par grande recette, solde recalculé en direct — même
//    règle, le module pur de l'arithmétique est partagé avec le serveur.
// Zéro framework, zéro dépendance, un seul fichier bundlé par build.mjs.

import { annoncerVisites } from './visites.ts';
import { poseSimulateur } from './simulateur.ts';
import { poseBudget } from './budget.ts';

const BORNES: Record<string, [number, number]> = {
  titre: [12, 140],
  probleme: [60, 2000],
  proposition: [60, 2000],
  beneficiaires: [20, 600],
  arbitrage: [20, 1000],
  indicateur: [10, 400],
  pseudo: [3, 40],
};

function poseCompteurs(): void {
  for (const champ of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-compteur]')) {
    const nom = champ.name;
    const bornes = BORNES[nom];
    const compteur = champ.parentElement?.querySelector<HTMLElement>('.compteur-caracteres');
    if (!bornes || !compteur) continue;

    const maj = (): void => {
      const n = champ.value.trim().length;
      compteur.textContent = `${n} / ${bornes[1]}`;
      // La couleur d'alerte n'apparaît que SOUS le minimum : on encourage,
      // on ne gronde pas avant qu'il y ait quelque chose à dire.
      compteur.dataset.proche = n > 0 && n < bornes[0] ? 'vrai' : 'faux';
    };
    champ.addEventListener('input', maj);
    maj();
  }
}

function poseAvis(): void {
  for (const form of document.querySelectorAll<HTMLFormElement>('.js-avis')) {
    form.addEventListener('submit', async (evenement) => {
      const bouton = evenement.submitter;
      if (!(bouton instanceof HTMLButtonElement)) return; // secours natif
      evenement.preventDefault();
      try {
        const reponse = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams({ [bouton.name]: bouton.value }),
        });
        if (!reponse.ok) throw new Error(String(reponse.status));
        const donnees = (await reponse.json()) as {
          decompte: Record<string, number>;
          avis: { position: string | null; arbitrage: string | null } | null;
        };
        for (const compte of document.querySelectorAll<HTMLElement>('.idee-avis-compte[data-cle]')) {
          const n = donnees.decompte[compte.dataset.cle ?? ''];
          if (typeof n === 'number') compte.textContent = String(n);
        }
        for (const b of document.querySelectorAll<HTMLButtonElement>('.js-avis button[name]')) {
          const actuel = donnees.avis?.[b.name as 'position' | 'arbitrage'] ?? null;
          b.setAttribute('aria-pressed', String(actuel === b.value));
        }
      } catch {
        // Le secours natif : le POST plein, avec la valeur du bouton cliqué
        // (form.submit() seul la perdrait).
        const cache = document.createElement('input');
        cache.type = 'hidden';
        cache.name = bouton.name;
        cache.value = bouton.value;
        form.append(cache);
        form.submit();
      }
    });
  }
}

poseCompteurs();
poseAvis();
poseSimulateur();
poseBudget();
annoncerVisites();
