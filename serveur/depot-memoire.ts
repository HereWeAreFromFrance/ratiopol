// serveur/depot-memoire.ts — LE DÉPÔT EN MÉMOIRE.
//
// Pour les tests : les routes s'exécutent pour de vrai (vraies sockets, vrai
// HTTP) sans qu'aucune base ne soit nécessaire. Les règles métier — un
// avis par empreinte, le tri, le statut — y vivent comme en production :
// une divergence entre les deux implantations est un bug, pas une nuance.

import type { Avis, Decompte, Depot, Idee, OptionsListe, Signalement, VoirAdmin } from './depot';
import { DECOMPTE_VIDE } from './depot';

function decompte(avis: Iterable<Avis>): Decompte {
  const d = { ...DECOMPTE_VIDE };
  for (const a of avis) {
    if (a.position === 'pour') d.pour++;
    else if (a.position === 'contre') d.contre++;
    else if (a.position === 'sans-avis') d.sansAvis++;
    if (a.arbitrage === 'complet') d.arbComplet++;
    else if (a.arbitrage === 'partiel') d.arbPartiel++;
    else if (a.arbitrage === 'incomplet') d.arbIncomplet++;
  }
  return d;
}

export class DepotMemoire implements Depot {
  private idees: Idee[] = [];
  private idSuivant = 1;
  private avis = new Map<string, Map<string, Avis>>(); // slug → empreinte → avis
  private signalements: Signalement[] = [];
  private idSignalementSuivant = 1;

  liste(opts: OptionsListe): Promise<Idee[]> {
    let jeu = this.idees.filter((i) => i.statut === 'publiee');
    if (opts.theme) jeu = jeu.filter((i) => i.theme === opts.theme);
    if (opts.recherche) {
      const mots = opts.recherche.toLowerCase().split(/\s+/).filter(Boolean);
      jeu = jeu.filter((i) => {
        const plat = [i.titre, i.probleme, i.proposition, i.beneficiaires, i.arbitrage, i.indicateur].join(' ').toLowerCase();
        return mots.every((m) => plat.includes(m));
      });
    }
    const tri = opts.tri ?? 'recent';
    jeu = [...jeu].sort((a, b) => {
      if (tri === 'soutenus') {
        if (b.avis.pour !== a.avis.pour) return b.avis.pour - a.avis.pour;
      }
      return b.creeeLe.getTime() - a.creeeLe.getTime();
    });
    return Promise.resolve(jeu.slice(0, opts.limite ?? 50));
  }

  ideeParSlug(slug: string): Promise<Idee | null> {
    const idee = this.idees.find((i) => i.slug === slug);
    return Promise.resolve(idee && idee.statut === 'publiee' ? idee : null);
  }

  async cree(entree: Parameters<Depot['cree']>[0], _empreinte: string): Promise<Idee> {
    const idee: Idee = {
      id: this.idSuivant++,
      creeeLe: new Date(),
      statut: 'publiee',
      avis: { ...DECOMPTE_VIDE },
      ...entree,
    };
    this.idees.push(idee);
    return idee;
  }

  async donneAvis(slug: string, empreinte: string, avis: Avis): Promise<Decompte> {
    const idee = this.idees.find((i) => i.slug === slug && i.statut === 'publiee');
    if (!idee) throw new Error('idée inconnue');
    let parEmpreinte = this.avis.get(slug);
    if (!parEmpreinte) {
      parEmpreinte = new Map();
      this.avis.set(slug, parEmpreinte);
    }
    const avant = parEmpreinte.get(empreinte);
    parEmpreinte.set(empreinte, {
      position: avis.position ?? avant?.position ?? null,
      arbitrage: avis.arbitrage ?? avant?.arbitrage ?? null,
    });
    idee.avis = decompte(parEmpreinte.values());
    return { ...idee.avis };
  }

  async avisDe(slug: string, empreinte: string): Promise<Avis | null> {
    return this.avis.get(slug)?.get(empreinte) ?? null;
  }

  async signale(slug: string, motif: string, message: string): Promise<void> {
    const idee = this.idees.find((i) => i.slug === slug && i.statut === 'publiee');
    if (!idee) throw new Error('idée inconnue ou masquée');
    this.signalements.push({
      id: this.idSignalementSuivant++,
      ideeId: idee.id,
      slug,
      motif,
      message,
      le: new Date(),
    });
  }

  pourAdmin(): Promise<VoirAdmin> {
    const idees = [...this.idees].sort((a, b) => b.creeeLe.getTime() - a.creeeLe.getTime());
    const signalements = [...this.signalements].reverse();
    return Promise.resolve({ idees, signalements });
  }

  async changeStatut(id: number, statut: 'publiee' | 'masquee'): Promise<void> {
    const idee = this.idees.find((i) => i.id === id);
    if (!idee) throw new Error('idée inconnue');
    idee.statut = statut;
  }

  async supprime(id: number): Promise<void> {
    const idx = this.idees.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error('idée inconnue');
    const idee = this.idees[idx]!;
    this.idees.splice(idx, 1);
    this.avis.delete(idee.slug);
    this.signalements = this.signalements.filter((s) => s.ideeId !== id);
  }
}
