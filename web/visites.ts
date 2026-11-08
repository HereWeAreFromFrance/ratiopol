// Annonces de visite vers /_vu (le contrat maison : nginx répond 204 et les
// journalise en JSON dans /var/log/nginx/ratiopol.visites.log, que VpsBoard
// importe dans PostgreSQL). Rien ne sort du site : aucun cookie, aucun script
// externe, le journal ne quitte pas le VPS. N'est actif que sur un site servi
// en http(s), jamais en file:// ni en localhost.
//   `?visites=0` le coupe ; `?test=1` marque la session comme essai.
//   arrivee   au chargement (écran, langue, tactile)
//   presence  toutes les minutes (pour avoir une durée même si l'onglet est tué)
//   depart    à la fermeture, avec la durée
export function annoncerVisites(): void {
  try {
    const parametres = new URLSearchParams(location.search);
    if (!/^https?:$/.test(location.protocol) || /^(localhost|127\.|\[::1\])/.test(location.hostname)
      || parametres.get('visites') === '0') return;
    const sid = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).replace(/-/g, '').slice(0, 20);
    const essai = parametres.get('test') === '1' ? '1' : '';
    const t0 = performance.now();
    const duree = () => String(Math.round((performance.now() - t0) / 1000));
    const url = (ev: string, extra: Record<string, string>) =>
      '/_vu?' + new URLSearchParams({ ev, sid, ...(essai ? { tst: essai } : {}), ...extra }).toString();
    const envoyer = (ev: string, extra: Record<string, string> = {}) => {
      try { fetch(url(ev, extra), { keepalive: true, cache: 'no-store' }).catch(() => {}); } catch { /* sans importance */ }
    };
    envoyer('arrivee', {
      ecr: `${innerWidth}x${innerHeight}`,
      dpr: String(Math.round((devicePixelRatio || 1) * 10) / 10),
      lang: (navigator.language || '').slice(0, 12),
      tact: matchMedia('(pointer:coarse)').matches ? '1' : '0',
    });
    setInterval(() => { if (!document.hidden) envoyer('presence', { dur: duree() }); }, 60000);
    let parti = false;
    const depart = () => { if (parti) return; parti = true; envoyer('depart', { dur: duree() }); };
    addEventListener('pagehide', depart);
  } catch { /* le compte de visites ne doit jamais casser la page */ }
}
