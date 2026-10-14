/* =========================================================================
   Faîte · moteur d'axonométrie
   Dessine une maison en cinq couches (une par métier), en projection
   isométrique, et la décompose verticalement. Géométrie en mètres.
   ========================================================================= */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const C30 = Math.cos(Math.PI / 6);

  // Projection isométrique : x part vers la droite, y vers la gauche, z monte.
  const iso = (x, y, z) => [(x - y) * C30, (x + y) / 2 - z];

  // ---- Dimensions de la maison ----
  const L = 10;          // façade principale (axe x)
  const D = 7;           // profondeur, côté pignon (axe y)
  const H = 2.8;         // hauteur des murs
  const T = 0.3;         // épaisseur des murs
  const PITCH = 47 * Math.PI / 180;
  const TAN = Math.tan(PITCH);
  const OE = 0.45;       // débord à l'égout
  const OG = 0.3;        // débord en rive
  const PLATE = 0.15;    // hauteur de la sablière
  const R0 = H + PLATE;                   // dessus des chevrons au droit des murs
  const RIDGE = R0 + (D / 2) * TAN;       // dessus des chevrons au faîtage
  const ISO_T = 0.16 / Math.cos(PITCH);   // épaisseur verticale de l'isolant
  const COV_T = 0.09 / Math.cos(PITCH);   // épaisseur verticale de la couverture
  const SM = 0.15;       // débord de la dalle
  const SLAB = 0.25;     // épaisseur de la dalle
  const FOOT = 0.8;      // profondeur des fondations

  const YE = D + OE;     // égout avant
  const YB = -OE;        // égout arrière
  const XA = -OG;        // rive du fond
  const XB = L + OG;     // rive côté pignon visible

  // Hauteur du plan des chevrons en fonction de y (lift : couches posées dessus)
  const roofZ = (y, lift = 0) => R0 + (D / 2 - Math.abs(y - D / 2)) * TAN + lift;
  const TOP = roofZ(D / 2, ISO_T + COV_T);

  const fmtLevel = (z) => {
    const v = Math.round(z * 100) / 100;
    if (Math.abs(v) < 0.005) return '±0,00';
    return (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',');
  };

  // ---- Aides de dessin ----
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const P = (p) => { const s = iso(p[0], p[1], p[2]); return r3(s[0]) + ' ' + r3(s[1]); };
  const poly = (pts) => 'M' + pts.map(P).join('L') + 'Z';
  const polyline = (pts) => 'M' + pts.map(P).join('L');
  const seg = (a, b) => 'M' + P(a) + 'L' + P(b);

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const face = (g, pts, cls) => el('path', { d: poly(pts), class: 'face ' + cls }, g);
  const stroke = (g, d, cls) => (d ? el('path', { d, class: cls }, g) : null);

  // Pseudo-aléatoire déterministe : le pointillé du béton reste identique à chaque visite
  function rand(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  // Points répartis sur une face (origine o, vecteurs u et v)
  function stipple(o, u, v, n, seed) {
    const r = rand(seed);
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = r(), b = r();
      d += 'M' + P([o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b, o[2] + u[2] * a + v[2] * b]) + 'h0';
    }
    return d;
  }

  // =======================================================================
  // Couche 1 : gros œuvre (fondations, dalle)
  // =======================================================================
  function buildFondations(g) {
    const x0 = -SM, x1 = L + SM, y0 = -SM, y1 = D + SM;
    face(g, [[x0, y1, -FOOT], [x1, y1, -FOOT], [x1, y1, 0], [x0, y1, 0]], 'f-y');
    face(g, [[x1, y0, -FOOT], [x1, y1, -FOOT], [x1, y1, 0], [x1, y0, 0]], 'f-x');
    face(g, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], 'f-top');
    // Limite entre dalle et semelles
    stroke(g, seg([x0, y1, -SLAB], [x1, y1, -SLAB]) + seg([x1, y0, -SLAB], [x1, y1, -SLAB]), 'ln-fine');
    // Béton : pointillé
    stroke(g,
      stipple([x0, y1, -FOOT], [x1 - x0, 0, 0], [0, 0, FOOT], 110, 7) +
      stipple([x1, y0, -FOOT], [0, y1 - y0, 0], [0, 0, FOOT], 76, 13), 'dots');
    // Implantation des murs, en tirets
    stroke(g,
      poly([[0, 0, 0], [L, 0, 0], [L, D, 0], [0, D, 0]]) +
      poly([[T, T, 0], [L - T, T, 0], [L - T, D - T, 0], [T, D - T, 0]]), 'ln-dash');
  }

  // =======================================================================
  // Couche 2 : murs et façades
  // =======================================================================
  function windowY(g, a, b, c, d) {
    const y = D, r = 0.2, w = b - a, h = d - c;
    face(g, [[a, y - r, c], [b, y - r, c], [b, y - r, d], [a, y - r, d]], 'f-glass');
    stroke(g,
      seg([a + w * .16, y - r, c + h * .3], [a + w * .36, y - r, c + h * .74]) +
      seg([a + w * .28, y - r, c + h * .28], [a + w * .44, y - r, c + h * .56]), 'ln-fine');
    stroke(g, seg([(a + b) / 2, y - r, c], [(a + b) / 2, y - r, d]), 'ln');
    face(g, [[a, y - r, c], [a, y, c], [a, y, d], [a, y - r, d]], 'f-x');
    face(g, [[a, y - r, c], [b, y - r, c], [b, y, c], [a, y, c]], 'f-top');
  }

  function doorY(g, a, b, d) {
    const y = D, r = 0.14;
    face(g, [[a, y - r, 0], [b, y - r, 0], [b, y - r, d], [a, y - r, d]], 'f-door');
    face(g, [[a + .32, y - r, .95], [b - .32, y - r, .95], [b - .32, y - r, d - .25], [a + .32, y - r, d - .25]], 'f-glass');
    face(g, [[a, y - r, 0], [a, y, 0], [a, y, d], [a, y - r, d]], 'f-x');
  }

  function baieX(g, a, b, d, panes) {
    const x = L, r = 0.2;
    face(g, [[x - r, a, 0], [x - r, b, 0], [x - r, b, d], [x - r, a, d]], 'f-glass');
    let m = '';
    for (let i = 1; i < panes; i++) {
      const yy = a + (b - a) * i / panes;
      m += seg([x - r, yy, 0], [x - r, yy, d]);
    }
    stroke(g, m, 'ln');
    const w = b - a;
    stroke(g,
      seg([x - r, a + w * .12, d * .32], [x - r, a + w * .3, d * .78]) +
      seg([x - r, a + w * .24, d * .3], [x - r, a + w * .36, d * .55]), 'ln-fine');
    face(g, [[x - r, a, 0], [x, a, 0], [x, a, d], [x - r, a, d]], 'f-y');
  }

  // Écorché à l'angle : l'enduit s'arrête en escalier et laisse voir les parpaings
  function blocksCutaway(g) {
    const y = D, bh = 0.2, bw = 0.5;
    const n = Math.round(H / bh);
    const edge = (i) => 1.3 - i * 0.068;
    const pts = [[0, y, 0]];
    for (let i = 0; i < n; i++) {
      const w = edge(i);
      pts.push([w, y, i * bh], [w, y, (i + 1) * bh]);
    }
    pts.push([0, y, H]);
    face(g, pts, 'f-block');
    let d = '';
    for (let i = 1; i < n; i++) d += seg([0, y, i * bh], [Math.min(edge(i - 1), edge(i)), y, i * bh]);
    for (let i = 0; i < n; i++) {
      const off = (i % 2) * bw / 2;
      for (let x = bw - off; x < edge(i) - 0.05; x += bw) d += seg([x, y, i * bh], [x, y, (i + 1) * bh]);
    }
    stroke(g, d, 'ln-fine');
  }

  function buildMurs(g) {
    // Faces intérieures des murs du fond, visibles quand la maison est ouverte
    face(g, [[T, T, 0], [L - T, T, 0], [L - T, T, H], [T, T, H]], 'f-y');
    face(g, [[T, T, 0], [T, D - T, 0], [T, D - T, H], [T, T, H]], 'f-x');
    // Arase
    el('path', {
      d: poly([[0, 0, H], [L, 0, H], [L, D, H], [0, D, H]]) + poly([[T, T, H], [L - T, T, H], [L - T, D - T, H], [T, D - T, H]]),
      class: 'face f-top',
      'fill-rule': 'evenodd',
    }, g);
    // Façade principale et pignon
    face(g, [[0, D, 0], [L, D, 0], [L, D, H], [0, D, H]], 'f-y');
    face(g, [[L, 0, 0], [L, D, 0], [L, D, H], [L, 0, H]], 'f-x');
    blocksCutaway(g);
    windowY(g, 1.7, 3.0, 0.95, 2.15);
    windowY(g, 3.9, 5.2, 0.95, 2.15);
    doorY(g, 6.3, 7.3, 2.15);
    windowY(g, 8.3, 9.2, 1.45, 2.15);
    baieX(g, 1.4, 4.8, 2.2, 3);
    // Seuil de la baie
    stroke(g, seg([L + 0.001, 1.4, 0], [L + 0.001, 4.8, 0]), 'ln-beam');
  }

  // =======================================================================
  // Couche 3 : charpente
  // =======================================================================
  function buildCharpente(g) {
    const zb = H + 0.1;
    const pz = (y) => roofZ(y) - 0.08;
    // Pignon du fond, vu de l'intérieur
    face(g, [[0, 0, H], [0, D, H], [0, D, R0], [0, D / 2, RIDGE], [0, 0, R0]], 'f-x');
    // Chevrons du versant arrière, vus par transparence
    let back = '';
    for (let x = XA; x <= XB + 1e-6; x += 0.6) back += seg([x, YB, roofZ(YB)], [x, D / 2, RIDGE]);
    stroke(g, back, 'ln-back');
    // Sablière et panne arrière
    stroke(g, seg([0, T / 2, R0], [L, T / 2, R0]) + seg([XA, D / 4, pz(D / 4)], [XB, D / 4, pz(D / 4)]), 'ln-beam');
    // Fermes intermédiaires
    let t = '';
    for (const x of [L / 3, 2 * L / 3]) {
      const top = [x, D / 2, RIDGE - 0.08];
      t += seg([x, 0.15, zb], [x, D - 0.15, zb]);
      t += seg([x, 0.15, zb], top) + seg([x, D - 0.15, zb], top);
      t += seg([x, D / 2, zb], top);
      t += seg([x, D / 2, zb + 0.9], [x, D / 4, pz(D / 4) - 0.04]);
      t += seg([x, D / 2, zb + 0.9], [x, 3 * D / 4, pz(3 * D / 4) - 0.04]);
    }
    stroke(g, t, 'ln-beam');
    // Faîtière, panne et sablière avant
    stroke(g,
      seg([XA, D / 2, RIDGE - 0.08], [XB, D / 2, RIDGE - 0.08]) +
      seg([XA, 3 * D / 4, pz(3 * D / 4)], [XB, 3 * D / 4, pz(3 * D / 4)]) +
      seg([0, D - T / 2, R0], [L, D - T / 2, R0]), 'ln-beam');
    // Chevrons du versant avant
    let front = '';
    for (let x = XA; x < L; x += 0.6) front += seg([x, YE, roofZ(YE)], [x, D / 2, RIDGE]);
    stroke(g, front, 'ln');
    // Pignon avant, bardé de planches verticales
    face(g, [[L, 0, H], [L, D, H], [L, D, R0], [L, D / 2, RIDGE], [L, 0, R0]], 'f-wood');
    let boards = '';
    for (let y = 0.22; y < D - 0.05; y += 0.22) boards += seg([L, y, H + 0.02], [L, y, roofZ(y) - 0.04]);
    stroke(g, boards, 'ln-fine');
    // Planche de rive
    stroke(g, polyline([[XB, YE, roofZ(YE)], [XB, D / 2, RIDGE], [XB, YB, roofZ(YB)]]), 'ln-beam');
  }

  // =======================================================================
  // Couche 4 : isolation (panneaux posés sur les chevrons)
  // =======================================================================
  function zigzag(x, y0, y1, lo, th) {
    const n = Math.max(6, Math.round(Math.abs(y1 - y0) / 0.12));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const y = y0 + (y1 - y0) * i / n;
      pts.push([x, y, lo(y) + (i % 2 ? th * 0.86 : th * 0.14)]);
    }
    return polyline(pts);
  }

  function buildIsolation(g) {
    const lo = (y) => roofZ(y);
    const hi = (y) => roofZ(y, ISO_T);
    face(g, [[XB, YE, lo(YE)], [XB, D / 2, lo(D / 2)], [XB, YB, lo(YB)], [XB, YB, hi(YB)], [XB, D / 2, hi(D / 2)], [XB, YE, hi(YE)]], 'f-x');
    stroke(g, zigzag(XB, YE, D / 2, lo, ISO_T) + zigzag(XB, YB, D / 2, lo, ISO_T), 'ln');
    face(g, [[XA, YE, hi(YE)], [XB, YE, hi(YE)], [XB, D / 2, hi(D / 2)], [XA, D / 2, hi(D / 2)]], 'f-slope');
    let j = '';
    for (let x = XA + 1.2; x < XB - 0.1; x += 1.2) j += seg([x, YE, hi(YE)], [x, D / 2, hi(D / 2)]);
    const ym = (YE + D / 2) / 2;
    j += seg([XA, ym, hi(ym)], [XB, ym, hi(ym)]);
    stroke(g, j, 'ln-fine');
    face(g, [[XA, YE, lo(YE)], [XB, YE, lo(YE)], [XB, YE, hi(YE)], [XA, YE, hi(YE)]], 'f-y');
  }

  // =======================================================================
  // Couche 5 : couverture (ardoise, fenêtres de toit, gouttière, faîtage)
  // =======================================================================
  function roofWindow(g, a, b, hi) {
    const y1 = D - 0.5, y2 = D - 1.85, lift = 0.03;
    const at = (x, y) => [x, y, hi(y) + lift];
    face(g, [at(a, y1), at(b, y1), at(b, y2), at(a, y2)], 'f-glass');
    const k = 0.09;
    stroke(g, poly([at(a + k, y1 - k), at(b - k, y1 - k), at(b - k, y2 + k), at(a + k, y2 + k)]), 'ln-fine');
    stroke(g, seg(at(a + 0.2, y1 - 0.3), at(a + 0.42, y2 + 0.4)), 'ln-fine');
  }

  function buildCouverture(g) {
    const lo = (y) => roofZ(y, ISO_T);
    const hi = (y) => roofZ(y, ISO_T + COV_T);
    face(g, [[XB, YE, lo(YE)], [XB, D / 2, lo(D / 2)], [XB, YB, lo(YB)], [XB, YB, hi(YB)], [XB, D / 2, hi(D / 2)], [XB, YE, hi(YE)]], 'f-x');
    face(g, [[XA, YE, hi(YE)], [XB, YE, hi(YE)], [XB, D / 2, hi(D / 2)], [XA, D / 2, hi(D / 2)]], 'f-slope');
    // Rangs d'ardoises et joints décalés
    const step = 0.3 * Math.cos(PITCH);
    const rows = [];
    for (let y = YE - step; y > D / 2 + 0.06; y -= step) rows.push(y);
    let d = '';
    rows.forEach((y) => { d += seg([XA, y, hi(y)], [XB, y, hi(y)]); });
    [YE].concat(rows).forEach((y, i) => {
      const y2 = Math.max(y - step, D / 2);
      const off = (i % 2) * 0.17;
      for (let x = XA + 0.34 - off; x < XB - 0.05; x += 0.34) d += seg([x, y, hi(y)], [x, y2, hi(y2)]);
    });
    stroke(g, d, 'ln-fine');
    roofWindow(g, 2.2, 3.1, hi);
    roofWindow(g, 6.9, 7.8, hi);
    // Tranche à l'égout et gouttière
    face(g, [[XA, YE, lo(YE)], [XB, YE, lo(YE)], [XB, YE, hi(YE)], [XA, YE, hi(YE)]], 'f-y');
    const gz = lo(YE) - 0.05;
    stroke(g, seg([XA, YE + 0.08, gz], [XB, YE + 0.08, gz]) + seg([XA, YE + 0.24, gz - 0.03], [XB, YE + 0.24, gz - 0.03]) +
      seg([XB, YE + 0.08, gz], [XB, YE + 0.24, gz - 0.03]), 'ln');
    // Faîtage
    const rz = hi(D / 2) + 0.06;
    let ticks = '';
    for (let x = XA + 0.36; x < XB; x += 0.36) ticks += seg([x, D / 2 - 0.12, rz - 0.06], [x, D / 2 + 0.12, rz - 0.06]);
    stroke(g, ticks, 'ln-fine');
    stroke(g, seg([XA, D / 2, rz], [XB, D / 2, rz]), 'ridge');
  }

  // =======================================================================
  // Les couches, de bas en haut (ordre de dessin)
  // =======================================================================
  const LAYERS = [
    { id: 'fondations', name: 'Gros œuvre', sub: 'fondations, dalle', offset: 0, build: buildFondations, anchor: [-SM, D + SM, -FOOT / 2] },
    { id: 'murs', name: 'Murs et façades', sub: 'maçonnerie, enduit', offset: 1.6, build: buildMurs, anchor: [0, D, H * 0.55] },
    { id: 'charpente', name: 'Charpente', sub: 'fermes, pannes, chevrons', offset: 3.3, build: buildCharpente, anchor: [XA, YE, roofZ(YE)] },
    { id: 'isolation', name: 'Isolation', sub: 'panneaux sarking', offset: 4.8, build: buildIsolation, anchor: [XA, YE, roofZ(YE, ISO_T / 2)] },
    { id: 'couverture', name: 'Couverture', sub: 'ardoise, zinguerie', offset: 6.3, build: buildCouverture, anchor: [XA, YE, roofZ(YE, ISO_T + COV_T / 2)] },
  ];

  // Repères de niveau affichés quand la maison est assemblée
  const LEVELS = [
    { label: 'faîtage', z: TOP, at: [XA, D / 2, TOP + 0.06] },
    { label: 'égout', z: roofZ(YE, ISO_T + COV_T), at: [XA, YE, roofZ(YE, ISO_T + COV_T)] },
    { label: 'sol fini', z: 0, at: [-SM, D + SM, 0] },
  ];

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // =======================================================================
  // Création du dessin dans un <svg>
  // =======================================================================
  function create(svg, opts = {}) {
    const world = el('g', { class: 'axo-world' }, svg);
    const layers = LAYERS.map((def) => {
      const g = el('g', { class: 'axo-layer', 'data-layer': def.id }, world);
      const inner = el('g', { class: 'axo-layer__in' }, g);
      def.build(inner);
      g.addEventListener('click', () => opts.onSelect && opts.onSelect(def.id));
      return Object.assign({}, def, { g, inner, drop: 0, alpha: 1, box: null });
    });
    const annot = el('g', { class: 'axo-annot' }, svg);
    const callLayer = el('g', { class: 'axo-callouts' }, svg);

    // Repères de niveau
    const levelEls = LEVELS.map((lv) => {
      const gr = el('g', { class: 'level' }, annot);
      return {
        lv,
        line: el('path', { class: 'co-line', 'stroke-dasharray': '2 3' }, gr),
        tri: el('path', { class: 'lv-tri' }, gr),
        text: Object.assign(el('text', {}, gr), { textContent: fmtLevel(lv.z) + '\u2002' + lv.label }),
      };
    });

    // Cotes : longueur de façade et profondeur
    const dims = [
      { a: [0, D + 1.7, -FOOT], b: [L, D + 1.7, -FOOT], e0: [0, D + SM + 0.2, -FOOT], e1: [L, D + SM + 0.2, -FOOT], text: '10,00' },
      { a: [L + 1.7, 0, -FOOT], b: [L + 1.7, D, -FOOT], e0: [L + SM + 0.2, 0, -FOOT], e1: [L + SM + 0.2, D, -FOOT], text: '7,00' },
    ].map((dm) => {
      const gr = el('g', { class: 'dim' }, annot);
      return {
        dm,
        lines: el('path', { class: 'co-line' }, gr),
        ticks: el('path', { class: 'co-line', 'stroke-width': '1.6' }, gr),
        text: Object.assign(el('text', { 'text-anchor': 'middle' }, gr), { textContent: dm.text }),
      };
    });

    // Légendes des couches, visibles quand la maison est éclatée
    const callouts = layers.map((l) => {
      const gr = el('g', { class: 'callout', 'data-for': l.id }, callLayer);
      gr.style.cursor = 'pointer';
      gr.addEventListener('click', () => opts.onSelect && opts.onSelect(l.id));
      return {
        l,
        g: gr,
        line: el('path', { class: 'co-line' }, gr),
        dot: el('circle', { class: 'co-dot', r: 3.2 }, gr),
        mark: el('rect', { class: 'co-mark', width: 10, height: 10 }, gr),
        label: Object.assign(el('text', { class: 'co-label', 'text-anchor': 'end' }, gr), { textContent: l.name }),
        sub: Object.assign(el('text', { class: 'co-sub', 'text-anchor': 'end' }, gr), { textContent: l.sub }),
      };
    });

    const state = { p: 0, active: null, w: 0, h: 0, compact: false, s: 1 };

    function measure() {
      layers.forEach((l) => { l.box = l.inner.getBBox(); });
    }

    function resize() {
      const r = svg.getBoundingClientRect();
      state.w = Math.max(1, r.width);
      state.h = Math.max(1, r.height);
      state.compact = state.w < 440;
      svg.setAttribute('viewBox', `0 0 ${state.w} ${state.h}`);
      annot.style.display = state.compact ? 'none' : '';
      callLayer.style.display = state.compact ? 'none' : '';
      if (!layers[0].box) measure();
      render();
    }

    // Mise à l'échelle : la maison remplit la planche, assemblée comme éclatée
    function fit(e) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      layers.forEach((l) => {
        const dz = l.offset * e;
        x0 = Math.min(x0, l.box.x);
        x1 = Math.max(x1, l.box.x + l.box.width);
        y0 = Math.min(y0, l.box.y - dz);
        y1 = Math.max(y1, l.box.y + l.box.height - dz);
      });
      const a = 1 - e;
      if (!state.compact) {
        // place pour les cotes, en dessous, quand la maison est assemblée
        x0 -= 0.7 * a; x1 += 1.1 * a; y1 += 1.5 * a;
      }
      const inset = opts.insets ? opts.insets() : { bottom: 0 };
      const pad = state.compact
        ? { l: 14, r: 14, t: 14, b: 34 }
        : { l: lerp(Math.min(116, state.w * 0.2), Math.min(178, state.w * 0.33), e), r: 30, t: lerp(48, 36, e), b: lerp(56, 44, e) };
      pad.b = Math.max(pad.b, inset.bottom || 0);
      const aw = Math.max(10, state.w - pad.l - pad.r);
      const ah = Math.max(10, state.h - pad.t - pad.b);
      const s = Math.min(aw / (x1 - x0), ah / (y1 - y0));
      const tx = pad.l + (aw - (x1 - x0) * s) / 2 - x0 * s;
      const ty = pad.t + (ah - (y1 - y0) * s) / 2 - y0 * s;
      return { s, tx, ty };
    }

    function render() {
      if (!layers[0].box || !state.w) return;
      const e = easeInOut(clamp01(state.p));
      const { s, tx, ty } = fit(e);
      state.s = s;
      world.setAttribute('transform', `translate(${r3(tx)} ${r3(ty)}) scale(${r3(s)})`);
      layers.forEach((l) => {
        const dz = l.offset * e + l.drop;
        l.g.setAttribute('transform', `translate(0 ${r3(-dz)})`);
        l.inner.style.opacity = l.alpha;
      });
      const toScreen = (p, dz = 0) => {
        const q = iso(p[0], p[1], p[2] + dz);
        return [tx + q[0] * s, ty + q[1] * s];
      };

      if (!state.compact) {
        // --- Annotations de l'état assemblé ---
        const aOp = clamp01(1 - e * 2.6) * Math.min(1, ...layers.map((l) => l.alpha));
        annot.style.opacity = aOp;
        annot.style.visibility = aOp < 0.01 ? 'hidden' : '';
        if (aOp > 0.01) {
          const pts = levelEls.map((it) => toScreen(it.lv.at));
          const xl = Math.min(...pts.map((p) => p[0])) - 104;
          levelEls.forEach((it, i) => {
            const [px, py] = pts[i];
            it.line.setAttribute('d', `M${r3(xl)} ${r3(py)}H${r3(px - 4)}`);
            it.tri.setAttribute('d', `M${r3(xl)} ${r3(py - 9)}h11l-5.5 9z`);
            it.text.setAttribute('x', r3(xl + 15));
            it.text.setAttribute('y', r3(py - 4));
          });
          dims.forEach((it) => {
            const A = toScreen(it.dm.a), B = toScreen(it.dm.b);
            const E0 = toScreen(it.dm.e0), E1 = toScreen(it.dm.e1);
            const ext = (E, X) => {
              const dx = X[0] - E[0], dy = X[1] - E[1], n = Math.hypot(dx, dy) || 1;
              return `M${r3(E[0])} ${r3(E[1])}L${r3(X[0] + dx / n * 8)} ${r3(X[1] + dy / n * 8)}`;
            };
            it.lines.setAttribute('d', `M${r3(A[0])} ${r3(A[1])}L${r3(B[0])} ${r3(B[1])}` + ext(E0, A) + ext(E1, B));
            const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
            const tick = (X) => {
              const c = Math.cos(ang + Math.PI / 4) * 6, sn = Math.sin(ang + Math.PI / 4) * 6;
              return `M${r3(X[0] - c)} ${r3(X[1] - sn)}L${r3(X[0] + c)} ${r3(X[1] + sn)}`;
            };
            it.ticks.setAttribute('d', tick(A) + tick(B));
            let deg = ang * 180 / Math.PI;
            if (deg > 90) deg -= 180;
            if (deg < -90) deg += 180;
            const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
            const nx = Math.sin(ang), ny = -Math.cos(ang);
            const side = ny < 0 ? 1 : -1;
            it.text.setAttribute('transform', `translate(${r3(mx + nx * 9 * side)} ${r3(my + ny * 9 * side)}) rotate(${r3(deg)})`);
          });
        }

        // --- Légendes de l'état éclaté ---
        const cOp = clamp01((e - 0.55) / 0.35);
        callLayer.style.opacity = cOp;
        callLayer.style.visibility = cOp < 0.01 ? 'hidden' : '';
        if (cOp > 0.01) {
          const anchors = callouts.map((c) => toScreen(c.l.anchor, c.l.offset * e));
          const cx = Math.min(...anchors.map((p) => p[0])) - 26;
          callouts.forEach((c, i) => {
            const [ax, ay] = anchors[i];
            c.line.setAttribute('d', `M${r3(cx)} ${r3(ay)}H${r3(ax)}`);
            c.dot.setAttribute('cx', r3(ax));
            c.dot.setAttribute('cy', r3(ay));
            c.mark.setAttribute('x', r3(cx - 6));
            c.mark.setAttribute('y', r3(ay - 5));
            c.label.setAttribute('x', r3(cx - 12));
            c.label.setAttribute('y', r3(ay - 1));
            c.sub.setAttribute('x', r3(cx - 12));
            c.sub.setAttribute('y', r3(ay + 14));
          });
        }
      }
      if (opts.onRender) opts.onRender(state);
    }

    function setExplode(p) {
      if (Math.abs(p - state.p) < 1e-4) return;
      state.p = p;
      render();
    }

    function setActive(id) {
      if (state.active === id) return;
      state.active = id;
      if (id) svg.setAttribute('data-active', id);
      else svg.removeAttribute('data-active');
      const idx = layers.findIndex((l) => l.id === id);
      layers.forEach((l, i) => {
        l.g.classList.toggle('is-active', i === idx);
        l.g.classList.toggle('is-above', idx >= 0 && i > idx);
        l.g.classList.toggle('is-below', idx >= 0 && i < idx);
      });
      callouts.forEach((c) => c.g.classList.toggle('is-active', c.l.id === id));
    }

    // Prépare l'animation d'arrivée : chaque couche tombe à sa place, de bas en haut
    function prepareIntro() {
      layers.forEach((l, i) => { l.drop = 2.2 + i * 0.9; l.alpha = 0; });
      render();
    }

    resize();

    return {
      layers,
      state,
      render,
      resize,
      setExplode,
      setActive,
      prepareIntro,
    };
  }

  window.FaiteAxo = { create, fmtLevel, TOP };
})();
