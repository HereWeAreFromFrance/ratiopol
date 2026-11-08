// serveur/depot-memoire.ts — LE DÉPÔT EN MÉMOIRE.
//
// Pour les tests : les routes s'exécutent pour de vrai (vraies sockets, vrai
// HTTP) sans qu'aucune base ne soit nécessaire. Les règles métier — un
// soutien par empreinte, le tri, le statut — y vivent comme en production :
// une divergence entre les deux implantations est un bug, pas une nuance.

import type { Depot, Idee, OptionsListe, Signalement, VoirAdmin } from './depot';

export class DepotMemoire implements Depot {
  private idees: Idee[] = [];
  private idSuivant = 1;
  private soutiens = new Map<string, Set<string>>(); // slug → empreintes
  private signalements: Signalement[] = [];
  private idSignalementSuivant = 1;

  liste(opts: OptionsListe): Promise<Idee[]> {
    let jeu = this.idees.filter((i) => i.statut === 'publiee');
    if (opts.theme) jeu = jeu.filter((i) => i.theme === opts.theme);
    if (opts.recherche) {
      const mots = opts.recherche.toLowerCase().split(/\s+/).filter(Boolean);
      jeu = jeu.filter((i) => {
        const plat = (i.titre + ' ' + i.proposition + ' ' + i.probleme).toLowerCase();
        return mots.every((m) => plat.includes(m));
      });
    }
    const tri = opts.tri ?? 'recent';
    jeu = [...jeu].sort((a, b) => {
      if (tri === 'soutenus') {
        if (b.soutiens !== a.soutiens) return b.soutiens - a.soutiens;
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
      soutiens: 0,
      ...entree,
    };
    this.idees.push(idee);
    return idee;
  }

  soutien(slug: string, empreinte: string): Promise<number> {
    const idee = this.idees.find((i) => i.slug === slug && i.statut === 'publiee');
    if (!idee) return Promise.reject(new Error('idée inconnue'));
    let ens = this.soutiens.get(slug);
    if (!ens) {
      ens = new Set();
      this.soutiens.set(slug, ens);
    }
    ens.add(empreinte);
    idee.soutiens = ens.size;
    return Promise.resolve(ens.size);
  }

  async signale(slug: string, motif: string, message: string): Promise<void> {
    const idee = this.idees.find((i) => i.slug === slug);
    if (!idee) throw new Error('idée inconnue');
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
    this.soutiens.delete(idee.slug);
    this.signalements = this.signalements.filter((s) => s.ideeId !== id);
  }
}
