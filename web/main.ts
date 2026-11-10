// web/main.ts — LE PEU DE JAVASCRIPT, ET ENCORE.
//
// Le site marche sans lui : formulaires natifs, redirections, pages rendues
// côté serveur. Il n'ajoute que du confort :
//  · compteurs de caractères sur les champs du formulaire guidé (borne
//    visible = gabarit compris avant l'erreur) ;
//  · soutien sans recharger la page (le formulaire natif reste le secours) ;
//  · les annonces de visite /_vu (visites.ts, le contrat maison) ;
//  · le simulateur d'hypothèse sur /reperes (simulateur.ts) : deux
//    poignées sur la courbe d'évolution, solde recalculé — arithmétique
//    pure sur des données rendues en attributs par le serveur.
// Zéro framework, zéro dépendance, un seul fichier bundlé par build.mjs.

import { annoncerVisites } from './visites.ts';
import { poseSimulateur } from './simulateur.ts';

const BORNES: Record<string, [number, number]> = {
  titre: [12, 140],
  probleme: [60, 2000],
  proposition: [60, 2000],
  beneficiaires: [20, 600],
  arbitrage: [20, 1000],
  indicateur: [10, 400],
  pseudo: [3, 40],
  email: [3, 254],
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

function poseSoutien(): void {
  for (const form of document.querySelectorAll<HTMLFormElement>('.js-soutien')) {
    form.addEventListener('submit', async (evenement) => {
      evenement.preventDefault();
      const bouton = form.querySelector<HTMLButtonElement>('button');
      if (!bouton) return;
      try {
        const reponse = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new URLSearchParams(),
        });
        if (!reponse.ok) throw new Error(String(reponse.status));
        const donnees = (await reponse.json()) as { soutiens: number };
        const total = document.querySelector('.js-total');
        if (total) {
          total.textContent = String(donnees.soutiens);
          bouton.textContent = 'Soutenu — merci';
        }
        bouton.disabled = true;
      } catch {
        // Le secours natif : on laisse le formulaire faire son POST plein.
        form.submit();
      }
    });
  }
}

poseCompteurs();
poseSoutien();
poseSimulateur();
annoncerVisites();
