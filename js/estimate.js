/* =========================================================================
   Faîte · estimateur
   Construit une estimation présentée comme un devis, ligne par ligne.
   Fourchettes de prix HT, fictives mais réalistes pour 2026.
   ========================================================================= */
(function () {
  'use strict';

  const line = (label, qty, unit, price, tva) => ({ label, qty, unit, price, tva });
  const scaffold = (s, tva) => line('Installation de chantier et échafaudage', 1, 'forfait', [1400 + 9 * s, 2200 + 13 * s], tva);

  const TYPES = [
    {
      id: 'toiture',
      tab: 'Toiture',
      object: 'Réfection de toiture',
      tva: 10,
      surface: { label: 'Surface de toiture', min: 40, max: 300, step: 5, value: 120 },
      choice: {
        label: 'Matériau',
        value: 'ardoise',
        options: [
          { id: 'ardoise', label: 'Ardoise naturelle', hint: 'Le classique au nord de la Loire', price: [150, 205] },
          { id: 'tuile', label: 'Tuile terre cuite', hint: 'Plate, romane ou tige de botte', price: [92, 138] },
          { id: 'zinc', label: 'Zinc à joint debout', hint: 'Pour les pentes faibles', price: [118, 172] },
          { id: 'bac', label: 'Bac acier', hint: 'Garages et annexes', price: [56, 84] },
        ],
      },
      options: [
        { id: 'gouttieres', label: 'Remplacer gouttières et descentes', value: true },
        { id: 'sarking', label: 'Isoler par l\'extérieur (sarking)', value: false },
        { id: 'fenetres', label: 'Fenêtres de toit', type: 'count', max: 4, value: 0 },
      ],
      note: 'Le devis définitif, gratuit, tient compte de l\'accès, de la pente et de l\'état de la charpente.',
      lines(s, c, o) {
        const out = [
          scaffold(s),
          line('Dépose de la couverture existante, tri et évacuation', s, 'm²', [17, 26]),
          line('Écran sous-toiture HPV et liteaunage', s, 'm²', [21, 31]),
          line('Fourniture et pose, ' + c.label.toLowerCase(), s, 'm²', c.price),
          line('Faîtage, rives et solins', Math.round(Math.sqrt(s) * 2.4), 'ml', [48, 72]),
        ];
        if (o.gouttieres) out.push(line('Gouttières et descentes en zinc', Math.round(Math.sqrt(s) * 2.6), 'ml', [62, 88]));
        if (o.sarking) out.push(line('Isolation sarking, R = 6 m².K/W', s, 'm²', [68, 98], 5.5));
        if (o.fenetres > 0) out.push(line('Fenêtre de toit 78 × 98, pose et raccords', o.fenetres, 'u', [980, 1450]));
        return out;
      },
    },
    {
      id: 'isolation',
      tab: 'Isolation',
      object: 'Isolation de toiture',
      tva: 5.5,
      surface: { label: 'Surface à isoler', min: 20, max: 200, step: 5, value: 70 },
      choice: {
        label: 'Technique',
        value: 'combles',
        options: [
          { id: 'combles', label: 'Combles perdus', hint: 'Laine soufflée sur le plancher du grenier', price: [24, 38] },
          { id: 'rampants', label: 'Rampants', hint: 'Combles aménagés, sous les chevrons', price: [58, 88] },
          { id: 'sarking', label: 'Sarking', hint: 'Par-dessus la charpente, toit déposé', price: [150, 215] },
        ],
      },
      options: [
        { id: 'parevapeur', label: 'Pare-vapeur et étanchéité à l\'air', value: true },
        { id: 'trappe', label: 'Trappe d\'accès isolée', value: false },
      ],
      note: 'Aides non déduites : MaPrimeRénov\' et les primes CEE dépendent de vos revenus, nous les calculons avec vous.',
      lines(s, c, o) {
        const out = [];
        if (c.id === 'sarking') out.push(scaffold(s));
        out.push(line('Préparation : protection des spots, gaines et conduits', 1, 'forfait', [280, 520]));
        const what = {
          combles: 'Laine minérale soufflée, R = 7',
          rampants: 'Laine minérale entre et sous chevrons, R = 6',
          sarking: 'Panneaux rigides sur chevrons, R = 6',
        }[c.id];
        out.push(line(what, s, 'm²', c.price));
        if (o.parevapeur) {
          out.push(c.id === 'combles'
            ? line('Pare-vapeur sous isolant', s, 'm²', [8, 13])
            : line('Membrane pare-vapeur, adhésifs et manchons', s, 'm²', [9, 15]));
        }
        if (c.id === 'rampants') out.push(line('Plaques de plâtre sur ossature', s, 'm²', [26, 38]));
        if (c.id === 'sarking') out.push(line('Dépose et repose de la couverture', s, 'm²', [42, 64]));
        if (o.trappe) out.push(line('Trappe d\'accès isolée', 1, 'u', [320, 560]));
        return out;
      },
    },
    {
      id: 'facade',
      tab: 'Façade',
      object: 'Rénovation de façade',
      tva: 10,
      surface: { label: 'Surface de façade', min: 40, max: 400, step: 10, value: 140 },
      choice: {
        label: 'Finition',
        value: 'enduit',
        options: [
          { id: 'peinture', label: 'Nettoyage et peinture', hint: 'Façade saine, à rafraîchir', price: [28, 42] },
          { id: 'enduit', label: 'Enduit à la chaux', hint: 'Trois couches, finition grattée', price: [58, 86] },
          { id: 'ite', label: 'Isolation par l\'extérieur', hint: 'Isolant et enduit, R = 3,7', price: [135, 185], tva: 5.5 },
        ],
      },
      options: [
        { id: 'fissures', label: 'Traitement des fissures', value: false },
        { id: 'appuis', label: 'Reprise des appuis de fenêtres', value: false },
      ],
      note: 'Le devis définitif tient compte de la hauteur, de l\'accès et de l\'état des supports.',
      lines(s, c, o) {
        const out = [
          line('Échafaudage de façade et protections', s, 'm²', [11, 17]),
          line('Nettoyage et traitement anti-mousse', s, 'm²', [7, 12]),
          line({
            peinture: 'Peinture minérale, deux couches',
            enduit: 'Enduit à la chaux en trois couches',
            ite: 'Isolant et enduit mince armé, R = 3,7',
          }[c.id], s, 'm²', c.price),
        ];
        if (o.fissures) out.push(line('Traitement des fissures', 1, 'forfait', [650, 1500]));
        if (o.appuis) out.push(line('Reprise des appuis de fenêtres', 1, 'forfait', [480, 1100]));
        return out;
      },
    },
    {
      id: 'extension',
      tab: 'Extension',
      object: 'Extension de maison',
      tva: 20,
      surface: { label: 'Surface créée', min: 10, max: 60, step: 1, value: 25 },
      choice: {
        label: 'Type d\'extension',
        value: 'pente',
        options: [
          { id: 'plat', label: 'Plain-pied, toit plat', hint: 'Toiture-terrasse, végétalisable', k: 1 },
          { id: 'pente', label: 'Plain-pied, toit en pente', hint: 'Dans le prolongement de la maison', k: 1.08 },
          { id: 'etage', label: 'Surélévation', hint: 'Un niveau de plus, sur l\'existant', k: 1.3 },
        ],
      },
      options: [
        { id: 'ouverture', label: 'Ouverture vers l\'existant (mur ou trémie)', value: true },
        { id: 'baie', label: 'Grande baie vitrée coulissante', value: false },
      ],
      note: 'TVA à 20 % : un agrandissement compte comme une construction neuve. Hors cuisine et revêtements de sol.',
      lines(s, c, o) {
        const k = c.k;
        const m = (p) => [Math.round(p[0] * k), Math.round(p[1] * k)];
        const out = [line('Plans, dossier d\'urbanisme et étude de sol', 1, 'forfait', [2400, 4200])];
        out.push(c.id === 'etage'
          ? line('Renforcement de la structure existante', s, 'm²', [160, 240])
          : line('Terrassement et fondations', s, 'm²', [190, 270]));
        out.push(line(c.id === 'etage' ? 'Plancher, murs et enduit' : 'Dalle, murs en maçonnerie et enduit', s, 'm²', m([620, 820])));
        out.push(line(c.id === 'plat' ? 'Toiture-terrasse et étanchéité' : 'Charpente et couverture', s, 'm²', m([240, 360])));
        out.push(line('Menuiseries extérieures', s, 'm²', [180, 280]));
        out.push(line('Isolation, plâtrerie et électricité', s, 'm²', [210, 320]));
        if (o.ouverture) out.push(line('Ouverture vers l\'existant, avec IPN', 1, 'forfait', [2600, 4800]));
        if (o.baie) out.push(line('Baie vitrée coulissante de 3 m', 1, 'u', [3200, 5600]));
        return out;
      },
    },
  ];

  // ---------- Calcul ----------
  const r10 = (v) => Math.round(v / 10) * 10;
  const r100 = (v) => Math.round(v / 100) * 100;

  function compute(type, st) {
    const choice = type.choice.options.find((o) => o.id === st.choice) || type.choice.options[0];
    const lines = type.lines(st.surface, choice, st.options).map((l) => {
      const tva = l.tva != null ? l.tva : (choice.tva != null ? choice.tva : type.tva);
      return Object.assign({}, l, { tva, min: r10(l.qty * l.price[0]), max: r10(l.qty * l.price[1]) });
    });
    const ht = [0, 0];
    const vats = {};
    lines.forEach((l) => {
      ht[0] += l.min; ht[1] += l.max;
      vats[l.tva] = vats[l.tva] || [0, 0];
      vats[l.tva][0] += l.min * l.tva / 100;
      vats[l.tva][1] += l.max * l.tva / 100;
    });
    const vatTotal = Object.values(vats).reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
    const ttc = [r100(ht[0] + vatTotal[0]), r100(ht[1] + vatTotal[1])];
    return { choice, lines, ht, vats, ttc, perM2: [Math.round(ttc[0] / st.surface), Math.round(ttc[1] / st.surface)] };
  }

  // ---------- Mise en forme ----------
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const n = (v) => nf.format(Math.round(v));
  const range = (a, b) => `${n(a)} – ${n(b)} €`;
  const rate = (t) => String(t).replace('.', ',') + ' %';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qtyText = (l) => (l.unit === 'forfait' ? 'forfait' : `${n(l.qty)} ${l.unit}`);

  // ---------- Interface ----------
  let api = null;

  function init(opts = {}) {
    const typesEl = document.querySelector('[data-est-types]');
    const fieldsEl = document.querySelector('[data-est-fields]');
    const devis = document.querySelector('[data-devis]');
    if (!typesEl || !fieldsEl || !devis) return null;

    const ui = {
      num: devis.querySelector('[data-devis-num]'),
      date: devis.querySelector('[data-devis-date]'),
      object: devis.querySelector('[data-devis-object]'),
      lines: devis.querySelector('[data-devis-lines]'),
      totals: devis.querySelector('[data-devis-totals]'),
      note: devis.querySelector('[data-devis-note]'),
      live: devis.querySelector('[data-devis-live]'),
      request: devis.querySelector('[data-devis-request]'),
    };

    const states = {};
    TYPES.forEach((t) => {
      const o = {};
      t.options.forEach((op) => { o[op.id] = op.value; });
      states[t.id] = { surface: t.surface.value, choice: t.choice.value, options: o };
    });

    let current = TYPES[0];
    let prevRows = null;
    let prevTtc = null;
    let liveTimer = 0;
    let tween = null;

    typesEl.innerHTML = TYPES.map((t, i) => `
      <label><input type="radio" name="est-type" value="${t.id}"${i === 0 ? ' checked' : ''}><span>${esc(t.tab)}</span></label>`).join('');

    const today = new Date();
    const pad = (v) => String(v).padStart(2, '0');
    const stamp = `${String(today.getFullYear()).slice(2)}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
    ui.date.textContent = 'Établie le ' + new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(today);

    function renderFields() {
      const t = current, st = states[t.id], s = t.surface;
      fieldsEl.innerHTML = `
        <div class="est-field">
          <label class="est-label" for="est-surface">${esc(s.label)}</label>
          <div class="est-range">
            <input class="slider" id="est-surface" type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${st.surface}">
            <span class="est-num"><input id="est-surface-num" type="number" inputmode="numeric" min="${s.min}" max="${s.max}" step="1" value="${st.surface}" aria-label="${esc(s.label)}, en mètres carrés"><span>m²</span></span>
          </div>
        </div>
        <fieldset class="est-group">
          <legend class="est-label">${esc(t.choice.label)}</legend>
          <div class="est-choices">
            ${t.choice.options.map((o) => `
              <label class="est-choice">
                <input type="radio" name="est-choice" value="${o.id}"${o.id === st.choice ? ' checked' : ''}>
                <span class="est-choice__body"><span class="est-choice__name">${esc(o.label)}</span><span class="est-choice__hint">${esc(o.hint)}</span></span>
              </label>`).join('')}
          </div>
        </fieldset>
        <fieldset class="est-group">
          <legend class="est-label">Options</legend>
          <div class="est-options">
            ${t.options.map((o) => (o.type === 'count'
              ? `<div class="est-count">
                   <span id="est-${o.id}-label">${esc(o.label)}</span>
                   <span class="est-stepper" role="group" aria-labelledby="est-${o.id}-label">
                     <button type="button" data-step="-1" data-opt="${o.id}" aria-label="Une de moins">−</button>
                     <output data-count="${o.id}" aria-live="polite">${st.options[o.id]}</output>
                     <button type="button" data-step="1" data-opt="${o.id}" aria-label="Une de plus">+</button>
                   </span>
                 </div>`
              : `<label class="est-check"><input type="checkbox" name="${o.id}"${st.options[o.id] ? ' checked' : ''}><span>${esc(o.label)}</span></label>`)).join('')}
          </div>
        </fieldset>`;
      syncSlider();
    }

    function syncSlider() {
      const t = current, st = states[t.id];
      const slider = fieldsEl.querySelector('#est-surface');
      const num = fieldsEl.querySelector('#est-surface-num');
      if (!slider) return;
      slider.value = st.surface;
      if (document.activeElement !== num) num.value = st.surface;
      const p = (st.surface - t.surface.min) / (t.surface.max - t.surface.min) * 100;
      slider.style.setProperty('--fill', p.toFixed(2) + '%');
    }

    function animateTtc(to) {
      const minEl = ui.totals.querySelector('[data-ttc-min]');
      const maxEl = ui.totals.querySelector('[data-ttc-max]');
      const write = (a, b) => { minEl.textContent = n(r100(a)); maxEl.textContent = n(r100(b)); };
      const from = prevTtc || to;
      if (tween) tween.kill();
      if (window.gsap && !opts.reduced && prevTtc) {
        const o = { a: from[0], b: from[1] };
        tween = window.gsap.to(o, { a: to[0], b: to[1], duration: 0.6, ease: 'power3.out', onUpdate: () => write(o.a, o.b) });
      } else {
        write(to[0], to[1]);
      }
      prevTtc = to.slice();
    }

    function update(flash = true) {
      const t = current, st = states[t.id];
      const res = compute(t, st);
      ui.num.textContent = `N° E-${stamp}-${t.id.slice(0, 3).toUpperCase()}${st.surface}`;
      ui.object.textContent = `${t.object}, ${st.surface} m², ${res.choice.label.toLowerCase()}`;

      const rows = {};
      ui.lines.innerHTML = res.lines.map((l) => {
        const key = l.label;
        const val = `${l.min}-${l.max}`;
        rows[key] = val;
        let cls = '';
        if (flash && prevRows) {
          if (!(key in prevRows)) cls = 'is-new';
          else if (prevRows[key] !== val) cls = 'is-changed';
        }
        const unitPrice = l.unit === 'forfait' ? '' : `${n(l.price[0])} à ${n(l.price[1])} € HT / ${l.unit}`;
        const vat = l.tva !== t.tva ? `<b>TVA ${rate(l.tva)}</b>` : '';
        const qty = `<span class="devis__q">${qtyText(l)}${unitPrice ? ', ' : ''}</span>`;
        const small = qty + unitPrice + vat;
        return `<tr class="${cls}"><td>${esc(l.label)}<small>${small}</small></td><td>${qtyText(l)}</td><td>${range(l.min, l.max)}</td></tr>`;
      }).join('');
      prevRows = rows;

      const vatRows = Object.keys(res.vats).sort((a, b) => b - a).map((k) =>
        `<div><dt>TVA ${rate(k)}</dt><dd>${range(res.vats[k][0], res.vats[k][1])}</dd></div>`).join('');
      ui.totals.innerHTML = `
        <div><dt>Total HT</dt><dd>${range(res.ht[0], res.ht[1])}</dd></div>
        ${vatRows}
        <div class="devis__ttc"><dt>Total TTC</dt><dd><span data-ttc-min></span> – <span data-ttc-max></span> €</dd></div>`;
      animateTtc(res.ttc);

      ui.note.textContent = `Soit ${n(res.perM2[0])} à ${n(res.perM2[1])} € TTC par m². Fourchette indicative, établie sans visite. ${t.note}`;

      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => {
        ui.live.textContent = `Estimation mise à jour : entre ${n(res.ttc[0])} et ${n(res.ttc[1])} euros TTC.`;
      }, 700);
      api.last = { type: t, state: st, res };
    }

    function setType(id, focus) {
      const t = TYPES.find((x) => x.id === id);
      if (!t) return;
      current = t;
      const radio = typesEl.querySelector(`input[value="${id}"]`);
      if (radio) radio.checked = true;
      prevRows = null;
      renderFields();
      update(false);
      if (focus && radio) radio.focus({ preventScroll: true });
    }

    // ---------- Événements ----------
    typesEl.addEventListener('change', (e) => {
      if (e.target.name === 'est-type') setType(e.target.value);
    });

    fieldsEl.addEventListener('input', (e) => {
      const t = current, st = states[t.id], tgt = e.target;
      if (tgt.id === 'est-surface') {
        st.surface = Number(tgt.value);
        syncSlider();
        update();
      } else if (tgt.id === 'est-surface-num') {
        const v = Number(tgt.value);
        if (Number.isFinite(v) && v >= t.surface.min && v <= t.surface.max) {
          st.surface = Math.round(v);
          syncSlider();
          update();
        }
      }
    });

    fieldsEl.addEventListener('change', (e) => {
      const t = current, st = states[t.id], tgt = e.target;
      if (tgt.id === 'est-surface-num') {
        const v = Math.round(Number(tgt.value));
        st.surface = Math.min(t.surface.max, Math.max(t.surface.min, Number.isFinite(v) ? v : t.surface.value));
        tgt.value = st.surface;
        syncSlider();
        update();
      } else if (tgt.name === 'est-choice') {
        st.choice = tgt.value;
        update();
      } else if (tgt.type === 'checkbox') {
        st.options[tgt.name] = tgt.checked;
        update();
      }
    });

    fieldsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      const t = current, st = states[t.id];
      const def = t.options.find((o) => o.id === b.dataset.opt);
      const v = Math.min(def.max, Math.max(0, st.options[def.id] + Number(b.dataset.step)));
      if (v === st.options[def.id]) return;
      st.options[def.id] = v;
      fieldsEl.querySelector(`[data-count="${def.id}"]`).textContent = v;
      update();
    });

    ui.request.addEventListener('click', () => {
      const { type, state, res } = api.last;
      const extras = type.options
        .filter((o) => (o.type === 'count' ? state.options[o.id] > 0 : state.options[o.id]))
        .map((o) => (o.type === 'count' ? `${o.label.toLowerCase()} (${state.options[o.id]})` : o.label.toLowerCase()));
      const message = `Estimation en ligne : ${type.object.toLowerCase()}, ${state.surface} m², ${res.choice.label.toLowerCase()}`
        + (extras.length ? `. Options : ${extras.join(', ')}` : '')
        + `. Fourchette indicative : ${n(res.ttc[0])} à ${n(res.ttc[1])} € TTC.`;
      if (opts.onRequest) opts.onRequest({ project: type.id, message });
    });

    api = { setType, last: null };
    renderFields();
    update(false);
    return api;
  }

  window.FaiteEstimate = {
    init(opts) { return init(opts); },
    setType(id) { if (api) api.setType(id); },
    compute,
    TYPES,
  };
})();
