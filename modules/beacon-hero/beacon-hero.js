/*
 * Beacon Hero — a blueprint-grid hero where a centre mark deploys satellite nodes along
 * dotted connectors, while the headline resolves character by character.
 *
 * Extracted from: https://oberon.framer.website/ (hero)
 * What the source actually does:
 *   · the headline is split per character into <span style="display:inline-block;opacity:.001">
 *     and each span is flipped to opacity 1 on a stagger (~30ms apart, starting ~400ms after load)
 *   · a column grid of hairlines ("-gap+line1..4", 229px columns) rules the whole hero
 *   · a "Gradient top" veil, linear-gradient(paper 39%, transparent), fades the grid into the page
 *   · the centre mark scales in, then four satellite chips travel outward to N/E/S/W on connectors
 * This module rebuilds all four, driven by one timeline so the beats stay in order.
 *
 * Markup:
 *   <section class="beacon" data-beacon='{"columns":6,"stagger":26}'>
 *     <div class="beacon__grid"></div>            (hairline columns, generated if empty)
 *     <div class="beacon__veil"></div>            (optional gradient fade)
 *     <div class="beacon__content"> … your copy, with <h1 data-split> … </div>
 *     <div class="beacon__stage">                 (the diagram)
 *       <div class="beacon__core">◼</div>
 *       <div class="beacon__node" data-angle="-90" data-dist="150">01</div>
 *       …
 *     </div>
 *   </section>
 *
 * Options (data-beacon JSON):
 *   columns   hairline columns across the hero (default 6)
 *   stagger   ms between characters (default 26)
 *   charDelay ms before the headline starts (default 380)
 *   charDur   ms each character takes (default 520)
 *   rise      px each character rises from (default 14; 0 = pure fade like the source)
 *   nodeDelay ms before the satellites deploy (default 700)
 *   nodeGap   ms between satellites (default 110)
 *   spin      degrees/sec the whole diagram drifts (default 0)
 *
 * API: BeaconHero.init(sel) → instances; inst.replay() re-runs the entrance; inst.set({...})
 * Fails open by design: the pre-entrance state is applied only after JS arms the hero, a timer
 * plays it even if the observer never fires, and inside an iframe it renders the finished state.
 * To avoid a flash of the assembled hero before this script loads, add this one line to <head>:
 *   <script>document.documentElement.classList.add('js')</script>
 * With it, the hidden state applies from the first paint; a CSS-only timeout still reveals
 * everything after 2.5s if the script never arrives.
 * Everything degrades to visible-and-still under prefers-reduced-motion.
 */
(function () {
  'use strict';
  const DEFAULTS = { columns: 6, stagger: 26, charDelay: 380, charDur: 520, rise: 14, nodeDelay: 700, nodeGap: 110, spin: 0 };
  const instances = [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Split a heading into per-character spans, keeping words unbreakable (like the source does).
  function split(el) {
    if (el.__split) return el.__split;
    const chars = [];
    const walk = (node, into) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(word => {
            if (!word) return;
            if (/^\s+$/.test(word)) { into.appendChild(document.createTextNode(word)); return; }
            const w = document.createElement('span');
            w.className = 'beacon__word';
            [...word].forEach(ch => {
              const s = document.createElement('span');
              s.className = 'beacon__char'; s.textContent = ch;
              w.appendChild(s); chars.push(s);
            });
            into.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          const clone = n.cloneNode(false);
          into.appendChild(clone); walk(n, clone);
        }
      });
    };
    const frag = document.createDocumentFragment();
    walk(el, frag);
    el.textContent = ''; el.appendChild(frag);
    el.__split = chars;
    return chars;
  }

  function create(el) {
    if (el.__beacon) return el.__beacon;
    let opt = {}; try { opt = JSON.parse(el.getAttribute('data-beacon') || '{}'); } catch (e) {}
    opt = Object.assign({}, DEFAULTS, opt);
    el.classList.add('beacon');

    // hairline column grid
    const grid = el.querySelector('.beacon__grid');
    const buildGrid = () => {
      if (!grid) return;
      grid.textContent = '';
      for (let i = 0; i <= opt.columns; i++) {
        const l = document.createElement('i');
        l.style.left = (i / opt.columns * 100) + '%';
        l.style.setProperty('--i', i);
        grid.appendChild(l);
      }
    };
    buildGrid();

    // satellites: place from data-angle / data-dist
    const stage = el.querySelector('.beacon__stage');
    const nodes = stage ? [...stage.querySelectorAll('.beacon__node')] : [];
    const links = [];
    if (stage) {
      let svg = stage.querySelector('.beacon__links');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'beacon__links');
        svg.setAttribute('aria-hidden', 'true');
        stage.insertBefore(svg, stage.firstChild);
      }
      svg.textContent = '';
      nodes.forEach((n, i) => {
        const ang = (parseFloat(n.dataset.angle) || 0) * Math.PI / 180;
        const dist = parseFloat(n.dataset.dist) || 140;
        const x = Math.cos(ang) * dist, y = Math.sin(ang) * dist;
        n.style.setProperty('--x', x.toFixed(1) + 'px');
        n.style.setProperty('--y', y.toFixed(1) + 'px');
        n.style.setProperty('--i', i);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '50%'); line.setAttribute('y1', '50%');
        line.setAttribute('x2', 'calc(50% + ' + x.toFixed(1) + 'px)');
        line.setAttribute('y2', 'calc(50% + ' + y.toFixed(1) + 'px)');
        line.style.setProperty('--i', i);
        svg.appendChild(line); links.push(line);
      });
    }

    const heads = [...el.querySelectorAll('[data-split]')];
    const chars = heads.flatMap(h => split(h));

    const inst = {
      el, opt, chars, nodes, links,
      apply() {
        el.style.setProperty('--beacon-stagger', opt.stagger + 'ms');
        el.style.setProperty('--beacon-char-dur', opt.charDur + 'ms');
        el.style.setProperty('--beacon-char-delay', opt.charDelay + 'ms');
        el.style.setProperty('--beacon-rise', opt.rise + 'px');
        el.style.setProperty('--beacon-node-delay', opt.nodeDelay + 'ms');
        el.style.setProperty('--beacon-node-gap', opt.nodeGap + 'ms');
        el.style.setProperty('--beacon-spin', opt.spin ? (360 / Math.abs(opt.spin)) + 's' : '0s');
        el.classList.toggle('beacon--spin', !!opt.spin && !reduceMotion.matches);
        if (opt.spin < 0) el.style.setProperty('--beacon-spin-dir', 'reverse');
        chars.forEach((c, i) => c.style.setProperty('--i', i));
      },
      arm() {
        // snap to the pre-entrance state with transitions suppressed, so nothing fades OUT
        el.classList.add('is-arming', 'is-armed');
        el.classList.remove('is-in');
        void el.offsetWidth;                 // commit the hidden state
        el.classList.remove('is-arming');
      },
      replay() {
        inst.arm();
        void el.offsetWidth;                 // force reflow so the transitions restart
        const play = () => el.classList.add('is-in');
        requestAnimationFrame(play);
        // rAF is suspended in offscreen or heavily clipped iframes (a gallery preview, for one),
        // which would leave the hero armed and therefore blank. A timer always lands.
        setTimeout(play, 60);
      },
      set(partial) {
        const rebuild = partial && 'columns' in partial && partial.columns !== opt.columns;
        Object.assign(opt, partial || {});
        if (rebuild) buildGrid();
        inst.apply();
        el.setAttribute('data-beacon', JSON.stringify(diff(opt)));
        return inst;
      }
    };
    inst.apply();
    el.__beacon = inst;
    instances.push(inst);

    // Run the entrance when the hero comes on screen — but never let that be the only path to
    // visible content. The pre-entrance state only exists while `is-armed` is set, and a fallback
    // timer plays it regardless, so a missed observer can't leave the hero blank.
    // Inside an iframe the browser may suspend rAF and CSS transitions when the frame is clipped
    // or scaled (a thumbnail preview, say), which would strand the entrance mid-flight. There we
    // skip arming entirely and render the finished hero.
    if (window.self !== window.top) return inst;
    inst.arm();
    let played = false;
    const go = () => { if (played) return; played = true; inst.replay(); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach(e => { if (e.isIntersecting) { go(); io.disconnect(); } });
      }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });
      io.observe(el);
      setTimeout(go, 1500);            // fail open if the observer never fires
    } else go();
    return inst;
  }
  function diff(o) { const out = {}; for (const k in DEFAULTS) if (o[k] !== DEFAULTS[k]) out[k] = o[k]; return out; }

  function init(sel) { return Array.from(document.querySelectorAll(sel || '[data-beacon]'), create); }
  function setAll(p) { instances.forEach(i => i.set(p)); }
  window.BeaconHero = { init, create, setAll, instances, DEFAULTS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
