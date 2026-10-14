/* =========================================================================
   Faîte · interactions de la page
   ========================================================================= */
(function () {
  'use strict';

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const hasGsap = !!(gsap && window.ScrollTrigger);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  if (hasGsap) {
    gsap.registerPlugin(window.ScrollTrigger);
    if (window.Flip) gsap.registerPlugin(window.Flip);
  }

  // =======================================================================
  // Défilement doux (désactivé si l'utilisateur réduit les animations)
  // =======================================================================
  let lenis = null;
  if (!reduced && hasGsap && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const header = qs('[data-header]');
  const headerH = () => (header ? header.offsetHeight : 0);

  function scrollToEl(target, focus = true) {
    if (!target) return;
    const offset = -headerH();
    if (lenis) {
      lenis.start();
      lenis.scrollTo(target, { offset, duration: 1.25 });
    } else {
      const y = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
    if (focus) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }

  function scrollToTop() {
    if (lenis) lenis.scrollTo(0, { duration: 1.25 });
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  // =======================================================================
  // En-tête, menu mobile, liens d'ancre
  // =======================================================================
  const menu = qs('[data-menu]');
  const burger = qs('[data-burger]');

  function closeMenu() {
    if (menu && menu.open) menu.close();
    if (lenis) lenis.start();
  }

  if (menu && burger) {
    burger.addEventListener('click', () => {
      menu.showModal();
      burger.setAttribute('aria-expanded', 'true');
      if (lenis) lenis.stop();
      if (hasGsap && !reduced) {
        gsap.from(qsa('.menu__list li', menu), { y: 40, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05, delay: 0.1 });
      }
    });
    qs('[data-menu-close]', menu).addEventListener('click', closeMenu);
    menu.addEventListener('close', () => {
      burger.setAttribute('aria-expanded', 'false');
      if (lenis) lenis.start();
    });
  }

  const workDialog = qs('[data-work-dialog]');

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = id === '#top' ? document.body : qs(id);
    if (!target) return;
    e.preventDefault();
    if (a.dataset.estimate && window.FaiteEstimate) window.FaiteEstimate.setType(a.dataset.estimate);
    if (a.dataset.project) setProject(a.dataset.project);
    if (workDialog && workDialog.open && a.closest('[data-work-dialog]')) workDialog.close();
    closeMenu();
    if (id === '#top') scrollToTop();
    else scrollToEl(target);
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  const onScrollHeader = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  // Lien actif dans la navigation
  function initScrollSpy() {
    const links = qsa('[data-nav]');
    const targets = links.map((l) => {
      const id = l.dataset.nav;
      if (id === 'metiers') return { id, start: qs('#metiers'), end: qs('[data-outro]') };
      const sec = qs('#' + id);
      return { id, start: sec, end: sec };
    }).filter((t) => t.start);
    const update = () => {
      const line = window.innerHeight * 0.42;
      let current = null;
      targets.forEach((t) => {
        const a = t.start.getBoundingClientRect().top;
        const b = t.end.getBoundingClientRect().bottom;
        if (a <= line && b > line) current = t.id;
      });
      links.forEach((l) => {
        if (l.dataset.nav === current) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // =======================================================================
  // Accueil + métiers : la maison qui se décompose
  // =======================================================================
  const PLANCHES = {
    couverture: '2/6 Couverture',
    isolation: '3/6 Isolation',
    charpente: '4/6 Charpente',
    murs: '5/6 Murs et façades',
    fondations: '6/6 Gros œuvre',
  };

  function initStrata() {
    const svg = qs('[data-axo]');
    if (!svg || !window.FaiteAxo) {
      root.classList.add('is-ready');
      return;
    }
    const trades = qsa('.trade');
    const planche = qs('[data-planche]');
    const scalebar = qs('[data-scalebar]');
    const hero = qs('.hero');
    const intro = qs('.strata__intro');
    const outro = qs('[data-outro]');

    const house = window.FaiteAxo.create(svg, {
      onSelect: (id) => {
        const t = trades.find((x) => x.dataset.layer === id);
        if (t) scrollToEl(t, false);
      },
      onRender: (st) => {
        if (scalebar) scalebar.style.setProperty('--sb', (st.s * 5).toFixed(1) + 'px');
      },
      insets: () => {
        const c = qs('.cartouche');
        const visible = c && c.offsetParent !== null;
        return { bottom: visible ? c.offsetHeight + 34 : 0 };
      },
    });

    // Couche active : celle dont le bloc de texte croise le milieu de l'écran
    let current = null;
    function activate(id) {
      if (current === id) return;
      current = id;
      house.setActive(id);
      trades.forEach((t) => t.classList.toggle('is-active', t.dataset.layer === id));
      if (planche) planche.textContent = id ? PLANCHES[id] : '1/6 Vue d\'ensemble';
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) activate(en.target.dataset.layer || null);
      });
    }, { rootMargin: '-49% 0px -49% 0px' });
    [hero, intro, outro].concat(trades).forEach((el) => el && io.observe(el));

    // Progression de l'éclatement en fonction du défilement
    let a0 = 0, a1 = 1, b0 = Infinity, b1 = Infinity;
    const top = (el) => el.getBoundingClientRect().top + window.scrollY;
    function measure() {
      const vh = window.innerHeight;
      a0 = vh * 0.04;
      a1 = Math.max(a0 + 1, top(intro) + intro.offsetHeight * 0.5 - vh * 0.5);
      b0 = top(outro) - vh * 0.7;
      b1 = Math.max(b0 + 1, top(outro) + outro.offsetHeight * 0.45 - vh * 0.5);
    }
    const target = (y) => (y < b0
      ? clamp01((y - a0) / (a1 - a0))
      : 1 - clamp01((y - b0) / (b1 - b0)));

    let cur = 0;
    function tick() {
      let t = target(window.scrollY);
      if (reduced) t = t > 0.5 ? 1 : 0;
      cur += (t - cur) * (reduced ? 1 : 0.22);
      if (Math.abs(t - cur) < 0.0005) cur = t;
      house.setExplode(cur);
    }

    measure();
    if (hasGsap) gsap.ticker.add(tick);
    else (function loop() { tick(); requestAnimationFrame(loop); })();

    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => { house.resize(); measure(); });
    };
    new ResizeObserver(onResize).observe(svg);
    window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    window.addEventListener('load', onResize);

    // Arrivée : le titre monte, la maison se construit couche par couche,
    // et le toit vient se poser sur le î de « faîte ».
    if (hasGsap && !reduced) {
      house.prepareIntro();
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from('.hero__title .line > span', { yPercent: 118, duration: 1.1, ease: 'power4.out', stagger: 0.1 }, 0);
      house.layers.forEach((l, i) => {
        tl.to(l, { drop: 0, alpha: 1, duration: 0.8, ease: 'power3.out', onUpdate: house.render }, 0.3 + i * 0.17);
      });
      const roof = qs('.hero__title .roof-i__roof');
      if (roof) {
        tl.from(roof, {
          y: () => -roof.getBoundingClientRect().height * 2.6,
          opacity: 0,
          duration: 0.55,
          ease: 'back.out(2.4)',
        }, 0.3 + 4 * 0.17 + 0.22);
      }
      tl.from(['.hero__lead', '.hero__actions', '.hero__proof', '.hero__hint'], {
        y: 18, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.08,
      }, 0.5);
    }
    root.classList.add('is-ready');

    return { measure };
  }

  // =======================================================================
  // Réalisations : comparaison, filtres, fiche en modale
  // =======================================================================
  const UNSPLASH = (id, w, h) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=75`;

  const WORKS = {
    longere: {
      cat: 'Couverture',
      title: 'Longère en granit, couverture en ardoise',
      img: 'photo-1694171738257-76d1260d491d',
      project: 'toiture',
      fiche: [['Lieu', 'Saint-Mars-du-Désert'], ['Nature des travaux', 'Réfection complète en ardoise naturelle, lucarnes reprises à l\'identique'], ['Surface', '180 m²'], ['Durée du chantier', '5 semaines'], ['Livraison', 'Septembre 2025']],
      text: 'Les ardoises d\'origine glissaient côté nord et les lucarnes prenaient l\'eau. Nous avons tout déposé, remplacé une dizaine de chevrons, posé un écran respirant puis une ardoise naturelle au crochet inox, en gardant les lucarnes à l\'identique.',
    },
    clisson: {
      cat: 'Couverture',
      title: 'Maison de bourg, tuiles terre cuite',
      img: 'photo-1563993356056-b23a9cd265ad',
      project: 'toiture',
      fiche: [['Lieu', 'Clisson'], ['Nature des travaux', 'Couverture neuve en tuile romane, faîtage scellé à la chaux'], ['Surface', '95 m²'], ['Durée du chantier', '3 semaines'], ['Livraison', 'Juin 2025']],
      text: 'Au sud de la Loire, la tuile est la règle, et l\'architecte des Bâtiments de France y veillait. Nous avons choisi une tuile romane rouge vieilli, repris le solin de la souche de cheminée et scellé le faîtage à la chaux.',
    },
    grange: {
      cat: 'Charpente',
      title: 'Grange transformée, charpente en chêne',
      img: 'photo-1778996369898-af5547e18414',
      project: 'charpente',
      fiche: [['Lieu', 'Carquefou'], ['Nature des travaux', 'Charpente traditionnelle neuve, taillée en atelier'], ['Portée', '8,40 m'], ['Durée du chantier', '6 semaines, dont 3 en atelier'], ['Livraison', 'Novembre 2024']],
      text: 'Attaquée par les capricornes, la charpente d\'origine ne pouvait pas être sauvée. Nous avons taillé en atelier trois fermes en chêne, assemblées à tenons et mortaises, puis levées en deux jours.',
    },
    graslin: {
      cat: 'Murs et façades',
      title: 'Immeuble de rapport, ravalement complet',
      img: 'photo-1785234598179-24bf745a33ad',
      project: 'facade',
      fiche: [['Lieu', 'Nantes, quartier Graslin'], ['Nature des travaux', 'Ravalement, reprise des modénatures, peinture minérale'], ['Surface', '420 m² de façade'], ['Durée du chantier', '9 semaines'], ['Livraison', 'Avril 2025']],
      text: 'Une façade du XIXe siècle encrassée et fissurée. Après un nettoyage à basse pression, nous avons repris les corniches et les encadrements de fenêtres au mortier de chaux, puis appliqué une peinture minérale qui laisse respirer la pierre.',
    },
    combles: {
      cat: 'Isolation',
      title: 'Combles aménagés, isolation des rampants',
      img: 'photo-1752852381113-7d93abc9d7ea',
      project: 'isolation',
      fiche: [['Lieu', 'Sainte-Luce-sur-Loire'], ['Nature des travaux', 'Isolation des rampants, pare-vapeur, trois fenêtres de toit'], ['Surface', '64 m²'], ['Durée du chantier', '2 semaines'], ['Livraison', 'Février 2026']],
      text: 'Deux chambres sous les toits, glaciales l\'hiver et étouffantes l\'été. Laine de bois entre et sous chevrons, membrane pare-vapeur continue, puis trois fenêtres de toit pour la lumière. Le dossier MaPrimeRénov\' a été monté avec les propriétaires.',
    },
    lucarnes: {
      cat: 'Couverture et charpente',
      title: 'Cinq lucarnes créées dans un toit en ardoise',
      img: 'photo-1778235765575-163a9eced952',
      crop: 'bottom',
      project: 'toiture',
      fiche: [['Lieu', 'Nantes, Procé'], ['Nature des travaux', 'Création de cinq lucarnes, réfection de la couverture'], ['Surface', '140 m²'], ['Durée du chantier', '7 semaines'], ['Livraison', 'Octobre 2024']],
      text: 'Pour rendre habitable un grand comble, nous avons ouvert la charpente et créé cinq lucarnes, habillées d\'ardoise et de zinc, dans le respect du règlement de la zone.',
    },
    zinc: {
      cat: 'Couverture',
      title: 'Lucarne habillée de zinc',
      img: 'photo-1764112105049-bf2a430cf2aa',
      project: 'toiture',
      fiche: [['Lieu', 'Vertou'], ['Nature des travaux', 'Habillage zinc d\'une lucarne ancienne, reprise des noues'], ['Durée du chantier', '4 jours'], ['Livraison', 'Mai 2025']],
      text: 'La lucarne laissait passer l\'eau par ses joues. Nous l\'avons habillée de zinc prépatiné et repris les noues de part et d\'autre, sans toucher au reste de la couverture en tuile plate.',
    },
    pavillon: {
      cat: 'Murs et charpente',
      title: 'Pavillon en pierre, murs et charpente restaurés',
      img: 'photo-1766675714082-c90943c69040',
      project: 'autre',
      fiche: [['Lieu', 'Le Loroux-Bottereau'], ['Nature des travaux', 'Rejointoiement à la chaux, charpente et couverture neuves'], ['Surface', '24 m² au sol'], ['Durée du chantier', '5 semaines'], ['Livraison', 'Mars 2026']],
      text: 'Un ancien pavillon de vigne en pierre, dont le toit s\'était effondré. Murs rejointoyés à la chaux, linteaux remplacés, charpente neuve en douglas et couverture en tuiles de réemploi.',
    },
  };

  function initCompare() {
    const fig = qs('[data-compare]');
    const range = qs('[data-compare-range]');
    if (!fig || !range) return;
    const set = (v) => fig.style.setProperty('--pos', v + '%');
    let hint = null;
    range.addEventListener('input', () => {
      if (hint) { hint.kill(); hint = null; }
      set(range.value);
    });
    range.addEventListener('pointerdown', () => { if (hint) { hint.kill(); hint = null; } });
    if (hasGsap && !reduced) {
      const o = { v: 50 };
      window.ScrollTrigger.create({
        trigger: fig,
        start: 'top 65%',
        once: true,
        onEnter: () => {
          hint = gsap.timeline({ onComplete: () => { hint = null; } })
            .to(o, { v: 30, duration: 0.8, ease: 'power2.inOut', onUpdate: () => set(o.v) })
            .to(o, { v: 66, duration: 1, ease: 'power2.inOut', onUpdate: () => set(o.v) })
            .to(o, { v: 50, duration: 0.7, ease: 'power2.out', onUpdate: () => { set(o.v); range.value = Math.round(o.v); } });
        },
      });
    }
  }

  function initFilters() {
    const bar = qs('[data-filters]');
    const grid = qs('[data-works]');
    if (!bar || !grid) return;
    const items = qsa('.work', grid);
    const status = qs('[data-filter-status]');
    const matches = (it, f) => f === 'all' || it.dataset.cat.split(' ').includes(f);
    qsa('button[data-filter]', bar).forEach((b) => {
      const span = qs('span', b);
      if (span) span.textContent = items.filter((it) => matches(it, b.dataset.filter)).length;
    });
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-filter]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      const f = b.dataset.filter;
      qsa('button[data-filter]', bar).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const useFlip = hasGsap && window.Flip && !reduced;
      const state = useFlip ? window.Flip.getState(items) : null;
      const h0 = grid.offsetHeight;
      let count = 0;
      items.forEach((it) => {
        const show = matches(it, f);
        it.hidden = !show;
        if (show) count += 1;
      });
      const h1 = grid.offsetHeight;
      if (status) status.textContent = count + (count > 1 ? ' chantiers affichés' : ' chantier affiché');
      if (state) {
        gsap.fromTo(grid, { height: h0 }, { height: h1, duration: 0.65, ease: 'power3.inOut', clearProps: 'height' });
        window.Flip.from(state, {
          duration: 0.65,
          ease: 'power3.inOut',
          absolute: true,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: 0.1 }),
          onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.25 }),
          onComplete: () => window.ScrollTrigger && window.ScrollTrigger.refresh(),
        });
      } else if (window.ScrollTrigger) {
        window.ScrollTrigger.refresh();
      }
    });
  }

  function initWorkDialog() {
    const dlg = workDialog;
    const grid = qs('[data-works]');
    if (!dlg || !grid) return;
    const img = qs('[data-wd-img]', dlg);
    const cat = qs('[data-wd-cat]', dlg);
    const title = qs('[data-wd-title]', dlg);
    const fiche = qs('[data-wd-fiche]', dlg);
    const text = qs('[data-wd-text]', dlg);
    const cta = qs('[data-wd-cta]', dlg);
    const canVT = typeof document.startViewTransition === 'function' && !reduced;
    let lastImg = null;

    function fill(w, cardImg) {
      cat.textContent = w.cat;
      title.textContent = w.title;
      text.textContent = w.text;
      fiche.replaceChildren(...w.fiche.map(([dt, dd]) => {
        const row = document.createElement('div');
        const t = document.createElement('dt');
        const d = document.createElement('dd');
        t.textContent = dt;
        d.textContent = dd;
        row.append(t, d);
        return row;
      }));
      cta.dataset.project = w.project;
      img.removeAttribute('srcset');
      img.src = cardImg.currentSrc || cardImg.src;
      img.alt = cardImg.alt;
    }

    function upgrade(w) {
      const crop = w.crop ? `&crop=${w.crop}` : '';
      img.srcset = `${UNSPLASH(w.img, 900, 675)}${crop} 900w, ${UNSPLASH(w.img, 1500, 1125)}${crop} 1500w`;
      img.sizes = '(min-width: 860px) 60vw, 100vw';
    }

    function open(btn) {
      const w = WORKS[btn.dataset.work];
      if (!w) return;
      const cardImg = qs('img', btn);
      lastImg = cardImg;
      fill(w, cardImg);
      const show = () => {
        dlg.showModal();
        if (lenis) lenis.stop();
      };
      if (canVT) {
        cardImg.style.viewTransitionName = 'work-media';
        const vt = document.startViewTransition(() => {
          cardImg.style.viewTransitionName = '';
          img.style.viewTransitionName = 'work-media';
          show();
        });
        vt.finished.finally(() => { img.style.viewTransitionName = ''; upgrade(w); });
      } else {
        show();
        upgrade(w);
      }
    }

    function close() {
      if (!dlg.open) return;
      const hide = () => {
        dlg.close();
        if (lenis) lenis.start();
      };
      const r = lastImg ? lastImg.getBoundingClientRect() : null;
      const visible = r && r.bottom > 0 && r.top < window.innerHeight;
      if (canVT && visible) {
        img.style.viewTransitionName = 'work-media';
        const vt = document.startViewTransition(() => {
          img.style.viewTransitionName = '';
          lastImg.style.viewTransitionName = 'work-media';
          hide();
        });
        vt.finished.finally(() => { lastImg.style.viewTransitionName = ''; });
      } else {
        hide();
      }
    }

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-work]');
      if (btn) open(btn);
    });
    qs('[data-wd-close]', dlg).addEventListener('click', close);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    dlg.addEventListener('close', () => { if (lenis) lenis.start(); });
  }

  // =======================================================================
  // Estimateur → formulaire de contact
  // =======================================================================
  function setProject(value) {
    const radio = qs(`[data-contact-form] input[name="projet"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  function initEstimate() {
    if (!window.FaiteEstimate) return;
    window.FaiteEstimate.init({
      reduced,
      onRequest: ({ project, message }) => {
        setProject(project);
        const msg = qs('#cf-message');
        if (msg) msg.value = message;
        scrollToEl(qs('#contact'));
      },
    });
  }

  // =======================================================================
  // Planning : les barres se tracent une fois, à l'arrivée
  // =======================================================================
  function initGantt() {
    if (!hasGsap || reduced) return;
    const g = qs('[data-gantt]');
    if (!g) return;
    const st = { trigger: g, start: 'top 72%', once: true };
    gsap.from(qsa('.gantt__bar', g), { scaleX: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, scrollTrigger: st });
    gsap.from(qsa('.gantt__ms, .gantt__dot', g), { scale: 0, duration: 0.5, ease: 'back.out(2.4)', stagger: 0.07, delay: 0.25, scrollTrigger: Object.assign({}, st) });
  }

  // =======================================================================
  // Carte de la zone d'intervention
  // =======================================================================
  function initMap() {
    const svg = qs('[data-map]');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const lon0 = -1.5536, lat0 = 47.2184;          // Nantes
    const kx = Math.cos(lat0 * Math.PI / 180) * 111.32;
    const ky = 110.57;
    const k = 3.3;                                   // px par km
    const cx = 300, cy = 205;
    const pt = (lon, lat) => [cx + (lon - lon0) * kx * k, cy - (lat - lat0) * ky * k];
    const add = (name, attrs, parent = svg) => {
      const n = document.createElementNS(NS, name);
      Object.entries(attrs).forEach(([a, v]) => n.setAttribute(a, v));
      parent.appendChild(n);
      return n;
    };
    const smooth = (coords) => {
      const p = coords.map(([lo, la]) => pt(lo, la));
      let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
      for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d;
    };

    const text = (x, y, str, cls, anchor = 'start') => {
      const t = add('text', { x, y, class: cls || '', 'text-anchor': anchor });
      t.textContent = str;
      return t;
    };

    text(332, 96, 'Ardoise', 'side', 'middle');
    text(262, 352, 'Tuile', 'side', 'middle');

    add('circle', { cx, cy, r: 50 * k, class: 'radius' });
    const ang = -32 * Math.PI / 180;
    text(cx + Math.cos(ang) * 50 * k + 8, cy + Math.sin(ang) * 50 * k - 4, '50 km', 'radius-label');

    const loire = [[-2.6, 47.24], [-2.45, 47.25], [-2.32, 47.255], [-2.21, 47.265], [-2.13, 47.282], [-2.03, 47.288], [-1.95, 47.272],
      [-1.87, 47.243], [-1.79, 47.21], [-1.71, 47.199], [-1.63, 47.203], [-1.57, 47.206], [-1.52, 47.21], [-1.47, 47.226],
      [-1.42, 47.25], [-1.37, 47.272], [-1.31, 47.31], [-1.25, 47.35], [-1.18, 47.362], [-1.1, 47.366], [-1, 47.36],
      [-0.9, 47.37], [-0.75, 47.38], [-0.6, 47.39]];
    const erdre = [[-1.556, 47.215], [-1.553, 47.24], [-1.545, 47.27], [-1.535, 47.3], [-1.53, 47.33], [-1.52, 47.37], [-1.5, 47.41], [-1.47, 47.45]];
    const sevre = [[-1.535, 47.205], [-1.5, 47.185], [-1.465, 47.16], [-1.42, 47.135], [-1.37, 47.115], [-1.32, 47.1], [-1.285, 47.087], [-1.24, 47.06], [-1.19, 47.02]];
    add('path', { d: smooth(erdre), class: 'trib' });
    add('path', { d: smooth(sevre), class: 'trib' });
    add('path', { d: smooth(loire), class: 'loire' });
    add('path', { d: smooth(loire), class: 'loire-in' });
    const [lx, ly] = pt(-1.86, 47.236);
    text(lx, ly + 22, 'la Loire', 'river-name', 'middle');
    const [ex, ey] = pt(-1.53, 47.39);
    text(ex + 8, ey, 'l\'Erdre', 'river-name');
    const [sx, sy] = pt(-1.43, 47.14);
    text(sx + 9, sy + 3, 'la Sèvre', 'river-name');

    const towns = [
      ['Saint-Nazaire', -2.2139, 47.2735, 8, -10, 'start'],
      ['Savenay', -1.9419, 47.3608, 0, -12, 'middle'],
      ['Blain', -1.7622, 47.4764, -10, 4, 'end'],
      ['Ancenis', -1.1775, 47.3656, 0, -12, 'middle'],
      ['Clisson', -1.2822, 47.0869, 10, 4, 'start'],
      ['Machecoul', -1.8214, 46.9936, 10, 4, 'start'],
      ['Pornic', -2.1022, 47.1158, -10, 4, 'end'],
      ['Carquefou', -1.4925, 47.2975, 10, -2, 'start'],
      ['Rezé', -1.5663, 47.1923, -10, 14, 'end'],
    ];
    towns.forEach(([name, lo, la, dx, dy, anchor]) => {
      const g = add('g', { class: 'town' });
      const [x, y] = pt(lo, la);
      add('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 4.5 }, g);
      const t = add('text', { x: (x + dx).toFixed(1), y: (y + dy).toFixed(1), 'text-anchor': anchor }, g);
      t.textContent = name;
    });
    const hq = add('g', { class: 'town town--hq' });
    add('circle', { cx, cy, r: 7.5 }, hq);
    const t = add('text', { x: cx + 14, y: cy - 10 }, hq);
    t.textContent = 'Nantes';
  }

  // =======================================================================
  // Formulaire de contact : validation, puis renvoi vers le contact du développeur
  // =======================================================================
  function initContact() {
    const form = qs('[data-contact-form]');
    if (!form) return;
    const status = qs('[data-form-status]', form);
    const telRe = /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

    function validate(input) {
      const v = (input.value || '').trim();
      let msg = '';
      switch (input.name) {
        case 'commune':
          if (!v) msg = 'Indiquez la commune du chantier, par exemple Rezé.';
          break;
        case 'name':
          if (!v) msg = 'Indiquez votre nom, pour savoir qui rappeler.';
          break;
        case 'tel':
          if (!v) msg = 'Indiquez un numéro pour que nous puissions vous rappeler.';
          else if (!telRe.test(v)) msg = 'Ce numéro semble incomplet : il faut 10 chiffres, par exemple 06 12 34 56 78.';
          break;
        case 'email':
          if (v && !input.validity.valid) msg = 'Cette adresse e-mail semble incomplète, par exemple prenom@exemple.fr.';
          break;
        case 'consent':
          if (!input.checked) msg = 'Cochez cette case pour que nous puissions utiliser vos coordonnées.';
          break;
        default:
          return true;
      }
      const errId = input.getAttribute('aria-describedby');
      const err = errId ? qs('#' + errId) : null;
      if (err) err.textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }

    const watched = ['commune', 'name', 'tel', 'email', 'consent'];
    form.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') validate(e.target);
    });
    form.addEventListener('change', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') validate(e.target);
    });
    form.addEventListener('focusout', (e) => {
      const t = e.target;
      if (watched.includes(t.name) && t.type !== 'checkbox' && (t.value || t.getAttribute('aria-invalid') === 'true')) validate(t);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputs = watched.map((n) => form.elements[n]);
      const ok = inputs.map(validate);
      const firstBad = inputs.find((_, i) => !ok[i]);
      if (firstBad) {
        status.textContent = 'Certains champs sont à compléter.';
        firstBad.focus();
        return;
      }
      // L'entreprise est fictive : une demande valide mène au contact du développeur du site.
      // Rien n'est transmis, et aucune saisie ne passe dans l'adresse.
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      status.textContent = '';
      window.location.assign(contactUrl());
    });

    // Retour arrière depuis le portfolio : le bouton redevient utilisable
    window.addEventListener('pageshow', () => {
      const btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = false;
    });
  }

  function contactUrl() {
    const author = qs('link[rel="author"]');
    return (author ? author.href : 'https://freelance-lm.fr/').replace(/#.*$/, '') + '#contact';
  }

  // =======================================================================
  // Repère de niveau et barre d'actions mobile
  // =======================================================================
  function initLevelMeter() {
    const meter = qs('[data-levelmeter]');
    const val = qs('[data-level-val]');
    if (!meter || !val || !window.FaiteAxo) return;
    const top = window.FaiteAxo.TOP;
    const bottom = -0.8;
    let last = '';
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp01(window.scrollY / max) : 0;
      meter.style.setProperty('--p', p.toFixed(4));
      const txt = window.FaiteAxo.fmtLevel(top + (bottom - top) * p);
      if (txt !== last) { val.textContent = txt; last = txt; }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initMobileBar() {
    const bar = qs('[data-mobilebar]');
    const actions = qs('.hero__actions');
    if (!bar || !actions) return;
    let pastHero = false;
    let nearEnd = false;
    const update = () => bar.classList.toggle('is-visible', pastHero && !nearEnd);
    new IntersectionObserver(([en]) => {
      pastHero = !en.isIntersecting && en.boundingClientRect.top < 0;
      update();
    }).observe(actions);
    const ends = qsa('#contact, .site-footer');
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => (en.isIntersecting ? seen.add(en.target) : seen.delete(en.target)));
      nearEnd = seen.size > 0;
      update();
    });
    ends.forEach((el) => io.observe(el));
  }

  // =======================================================================
  // Démarrage
  // =======================================================================
  initStrata();
  initScrollSpy();
  initCompare();
  initFilters();
  initWorkDialog();
  initEstimate();
  initGantt();
  initMap();
  initContact();
  initLevelMeter();
  initMobileBar();

  if (hasGsap) {
    const refresh = () => window.ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);
  }
})();
