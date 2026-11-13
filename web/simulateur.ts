// web/simulateur.ts — L'HYPOTHÈSE 2026 SUR LA COURBE D'ÉVOLUTION (/reperes).
//
// De la pure arithmétique : prolonger le tracé d'une année, poser deux
// poignées (dépenses, recettes) et recalculer le solde qu'elles donnent.
// Toutes les valeurs viennent des attributs data-* rendus par le serveur
// (serveur/rendu.ts, courbeÉvolution en mode sim) — aucune n'est recopiée
// ici, le PIB déduit compris. Aucun adjectif, aucune couleur de jugement :
// des nombres et un signe, la mise en forme vient du serveur.
// Sans ce script, la page reste exactement celle du serveur : graphe
// 640×340, ligne de résultats au statu quo déjà rendue en HTML.

const PRÉCISION = 10; // un dixième de point : la précision des séries publiées

/** Les résultats recalculés, écrits dans les spans rendus par le serveur.
 *  Mêmes formats que serveur/rendu.ts (ecartTexte compris) : unités
 *  collées au nombre par une espace insécable, écart signé sans adjectif —
 *  la ligne recalculée coïncide caractère pour caractère avec la ligne
 *  rendue par le serveur au statu quo. */
function écrireResultats(section: Element | null, valeurs: { dep: number; rec: number; depRéf: number; recRéf: number; pib: number }): void {
  const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const ecart = valeurs.rec - valeurs.dep - (valeurs.recRéf - valeurs.depRéf);
  const écrire = (sélecteur: string, texte: string): void => {
    const el = section?.querySelector(sélecteur);
    if (el) el.textContent = texte;
  };
  écrire('[data-sim-dep]', `${fmt.format(valeurs.dep)} %`);
  écrire('[data-sim-rec]', `${fmt.format(valeurs.rec)} %`);
  écrire('[data-sim-solde-pib]', `${fmt.format(valeurs.rec - valeurs.dep)} % du PIB`);
  écrire('[data-sim-solde-mds]', `${fmt.format(((valeurs.rec - valeurs.dep) / 100) * valeurs.pib)} Md€`);
  écrire(
    '[data-sim-ecart]',
    `${ecart > 0 ? '+' : ''}${fmt.format(ecart)} ${Math.abs(Math.round(ecart * PRÉCISION)) < 2 * PRÉCISION ? 'point' : 'points'}`,
  );
}

export function poseSimulateur(): void {
  const NS = 'http://www.w3.org/2000/svg';
  for (const svg of document.querySelectorAll<SVGSVGElement>('svg[data-sim]')) {
    const d = svg.dataset;
    const min = Number(d.min);
    const max = Number(d.max);
    const haut = Number(d.yHaut);
    const bas = Number(d.yBas);
    const xDernier = Number(d.xDernier);
    const xPas = Number(d.xPas);
    const pib = Number(d.pibMds);
    const depSérie = (d.dep ?? '').split(',').map(Number);
    const recSérie = (d.rec ?? '').split(',').map(Number);
    const depRéf = depSérie.at(-1)!;
    const recRéf = recSérie.at(-1)!;
    const annéeHypothèse = Number((d.annees ?? '').split(',').pop()) + 1;
    if (Number.isNaN(min) || Number.isNaN(pib) || Number.isNaN(depRéf) || Number.isNaN(recRéf) || Number.isNaN(annéeHypothèse)) continue;

    const section = svg.closest('section');
    const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const largeur = svg.viewBox.baseVal.width;
    const hauteur = svg.viewBox.baseVal.height;
    const xHypothèse = xDernier + xPas;
    const yDe = (v: number): number => haut + ((max - v) * (bas - haut)) / (max - min);

    // Le groupe des poignées déjà posées : le recalcul relit les DEUX, on
    // ne le branche qu'une fois la seconde posée.
    const poignées: { valeur: () => number }[] = [];
    const maj = (): void => {
      if (poignées.length < 2) return;
      écrireResultats(section, {
        dep: poignées[0]!.valeur(),
        rec: poignées[1]!.valeur(),
        depRéf,
        recRéf,
        pib,
      });
    };

    // La zone d'hypothèse : une année de plus sur la même échelle, séparée
    // du tracé officiel par un filet. role=img deviendrait un trou noir
    // pour les lecteurs d'écran dès qu'il contient des sliders : il devient
    // group, le aria-label décrit toujours les séries officielles.
    svg.setAttribute('viewBox', `0 0 ${largeur + xPas} ${hauteur}`);
    svg.setAttribute('role', 'group');
    const cree = (balise: string, attrs: Record<string, string | number>, texte?: string): SVGElement => {
      const el = document.createElementNS(NS, balise);
      for (const [attr, valeur] of Object.entries(attrs)) el.setAttribute(attr, String(valeur));
      if (texte !== undefined) el.textContent = texte;
      return el;
    };
    for (const l of svg.querySelectorAll('.reperes-courbe-grille')) l.setAttribute('x2', String(xHypothèse));
    svg.append(
      cree('line', { x1: (xDernier + xHypothèse) / 2, y1: haut, x2: (xDernier + xHypothèse) / 2, y2: bas, class: 'reperes-sim-separateur' }),
      cree('text', { x: xHypothèse, y: 14, class: 'reperes-courbe-axe', 'text-anchor': 'middle' }, 'votre hypothèse'),
      cree('text', { x: xHypothèse, y: 328, class: 'reperes-courbe-axe', 'text-anchor': 'middle' }, String(annéeHypothèse)),
    );

    const versValeur = (clientY: number): number => {
      const rect = svg.getBoundingClientRect();
      const ySvg = ((clientY - rect.top) / rect.height) * hauteur;
      const v = max - ((ySvg - haut) / (bas - haut)) * (max - min);
      return Math.min(max, Math.max(min, Math.round(v * PRÉCISION) / PRÉCISION));
    };

    // Une poignée : le trait pointillé depuis la dernière année publiée,
    // puis le groupe slider — zone de saisie généreuse invisible, anneau
    // de focus caché, point visible, étiquette vivante. Positions =
    // attributs cx/cy, jamais de style inline : la CSP l'interdit.
    // auDessus : l'étiquette vivante se met au-dessus du trait (dépenses)
    // ou en dessous (recettes), comme les étiquettes officielles du graphe.
    const poignée = (étiquette: string, départ: number, classeTrait: string, classePoint: string, auDessus: boolean): { valeur: () => number } => {
      const yDépart = yDe(départ);
      const trait = cree('line', { x1: xDernier, y1: yDépart, x2: xHypothèse, y2: yDépart, class: `reperes-sim-trait ${classeTrait}` });
      const g = cree('g', {
        class: 'reperes-sim-poignee',
        role: 'slider',
        tabindex: 0,
        'aria-orientation': 'vertical',
        'aria-label': étiquette,
        'aria-valuemin': String(min),
        'aria-valuemax': String(max),
        'aria-valuenow': départ.toFixed(1),
        'aria-valuetext': `${fmt.format(départ)} % du PIB`,
      });
      const touche = cree('circle', { cx: xHypothèse, cy: yDépart, r: 36, class: 'reperes-sim-poignee-touche' });
      const anneau = cree('circle', { cx: xHypothèse, cy: yDépart, r: 15, class: 'reperes-sim-poignee-anneau' });
      const point = cree('circle', { cx: xHypothèse, cy: yDépart, r: 8, class: classePoint });
      // L'étiquette vivante : le chiffre suit la main, à gauche de la
      // poignée. Sur mobile, la bande de résultats peut être hors écran
      // pendant le glissement. Le chiffre et l'unité, rien d'autre ; déjà
      // annoncé par aria-valuetext, donc masqué aux lecteurs d'écran.
      // Côté : au-dessus du trait ou en dessous (comme les étiquettes
      // officielles), mais on bascule de l'autre côté aux extrêmes pour ne
      // pas mordre sur le haut du graphe ni sur l'étiquette de l'année.
      const côtéÉtiquette = (y: number): number => {
        let ye = auDessus ? y - 12 : y + 20;
        if (auDessus && ye < haut - 2) ye = y + 20;
        if (!auDessus && ye > bas + 8) ye = y - 12;
        return ye;
      };
      const vivante = cree('text', {
        class: `reperes-sim-etiquette ${classePoint}`,
        x: xHypothèse - 14,
        y: côtéÉtiquette(yDépart),
        'text-anchor': 'end',
        'aria-hidden': 'true',
      }, `${fmt.format(départ)} %`);
      g.append(touche, anneau, point, vivante);
      svg.append(trait, g);
      let valeur = départ;
      const place = (v: number): void => {
        valeur = v;
        const y = yDe(v);
        trait.setAttribute('y2', String(y));
        for (const c of [touche, anneau, point]) c.setAttribute('cy', String(y));
        vivante.setAttribute('y', String(côtéÉtiquette(y)));
        vivante.textContent = `${fmt.format(v)} %`;
        g.setAttribute('aria-valuenow', v.toFixed(1));
        g.setAttribute('aria-valuetext', `${fmt.format(v)} % du PIB`);
        maj();
      };
      g.addEventListener('pointerdown', (ev: PointerEvent) => {
        g.setPointerCapture(ev.pointerId);
        g.focus();
        place(versValeur(ev.clientY));
        ev.preventDefault();
      });
      g.addEventListener('pointermove', (ev: PointerEvent) => {
        if (g.hasPointerCapture(ev.pointerId)) place(versValeur(ev.clientY));
      });
      // Clavier : un dixième de point par cran, Home/End aux bornes.
      g.addEventListener('keydown', (ev: KeyboardEvent) => {
        const crans: Record<string, number> = { ArrowUp: 1 / PRÉCISION, ArrowRight: 1 / PRÉCISION, ArrowDown: -1 / PRÉCISION, ArrowLeft: -1 / PRÉCISION };
        if (ev.key in crans) {
          place(Math.min(max, Math.max(min, Math.round((valeur + crans[ev.key]!) * PRÉCISION) / PRÉCISION)));
          ev.preventDefault();
        } else if (ev.key === 'Home') {
          place(min);
          ev.preventDefault();
        } else if (ev.key === 'End') {
          place(max);
          ev.preventDefault();
        }
      });
      const retour = { valeur: () => valeur };
      poignées.push(retour);
      return retour;
    };

    poignée(`Hypothèse ${annéeHypothèse} — dépenses publiques, en % du PIB`, depRéf!, 'rcv-d-trait', 'rcv-d', true);
    poignée(`Hypothèse ${annéeHypothèse} — recettes publiques, en % du PIB`, recRéf!, 'rcv-r-trait', 'rcv-r', false);
  }
}
