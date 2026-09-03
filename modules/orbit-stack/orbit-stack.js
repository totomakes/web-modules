/*
 * Orbit Stack — an integrations diagram: logo chips arranged on concentric rings around a
 * centre mark, wired to it with dotted connectors, each ring drifting at its own speed.
 *
 * Extracted from: https://oberon.framer.website/ (the "Allstack" scheme section)
 * In the source the chips are 70×70 pill containers (border-radius 240px) placed absolutely
 * around a centre mark, joined by SVG paths drawn as runs of tiny dots. This module keeps that
 * language but generates the placement, so you only list the logos.
 *
 * Markup — one <li> per integration, ring chosen with data-ring (1 = inner):
 *   <div class="orbit" data-orbit='{"speed":18,"rings":[150,250]}'>
 *     <div class="orbit__core"><img src="logo.svg" alt="Your product"></div>
 *     <ul class="orbit__chips">
 *       <li data-ring="1"><img src="slack.svg" alt="Slack"></li>
 *       <li data-ring="2"><span>Stripe</span></li>
 *     </ul>
 *   </div>
 *
 * Options (data-orbit JSON):
 *   rings     array of ring radii in px (default [150, 250]) — chips spread evenly per ring
 *   speed     seconds for a full inner-ring rotation (default 60; 0 = still)
 *   alternate true = every other ring turns the other way (default true)
 *   counter   true = keep the chips upright while the ring turns (default true)
 *   dots      true = dotted connectors (default true), false = hairlines
 *   size      chip diameter in px (default 70)
 *   start     degrees offset for the first chip of each ring (default -90 = 12 o'clock)
 *
 * Hovering a chip lights its connector and dims the rest; the ring pauses while hovered.
 * API: OrbitStack.init(sel) → instances; inst.set({...}); OrbitStack.setAll({...})
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const DEFAULTS = { rings: [150, 250], speed: 60, alternate: true, counter: true, dots: true, size: 70, start: -90 };
  const instances = [];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function create(el) {
    if (el.__orbit) return el.__orbit;
    let opt = {}; try { opt = JSON.parse(el.getAttribute('data-orbit') || '{}'); } catch (e) {}
    opt = Object.assign({}, DEFAULTS, JSON.parse(JSON.stringify(opt)));
    el.classList.add('orbit');

    const list = el.querySelector('.orbit__chips');
    const chips = list ? [...list.children] : [];
    let svg = el.querySelector('.orbit__links');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'orbit__links'); svg.setAttribute('aria-hidden', 'true');
      el.insertBefore(svg, el.firstChild);
    }
    // one rotating layer per ring, so rings can move independently
    const layers = [];

    function layout() {
      const rings = Array.isArray(opt.rings) && opt.rings.length ? opt.rings : DEFAULTS.rings;
      layers.forEach(l => l.remove()); layers.length = 0;
      svg.textContent = '';
      const byRing = rings.map(() => []);
      chips.forEach((c, i) => {
        const r = Math.min(rings.length, Math.max(1, parseInt(c.dataset.ring || (i % rings.length) + 1, 10))) - 1;
        byRing[r].push(c);
      });
      rings.forEach((radius, ri) => {
        const layer = document.createElement('div');
        layer.className = 'orbit__ring';
        layer.style.setProperty('--r', radius + 'px');
        const dir = opt.alternate && ri % 2 ? -1 : 1;
        const secs = opt.speed ? opt.speed * (1 + ri * .55) : 0;
        layer.style.setProperty('--dur', secs ? secs + 's' : '0s');
        layer.style.animationDirection = dir < 0 ? 'reverse' : 'normal';
        layer.classList.toggle('is-still', !secs || reduceMotion.matches);
        el.appendChild(layer); layers.push(layer);

        // the ring guide circle
        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('cx', '50%'); circle.setAttribute('cy', '50%');
        circle.setAttribute('r', radius);
        circle.setAttribute('class', 'orbit__guide');
        svg.appendChild(circle);

        const items = byRing[ri];
        items.forEach((chip, i) => {
          const ang = (opt.start + (360 / items.length) * i) * Math.PI / 180;
          const x = Math.cos(ang) * radius, y = Math.sin(ang) * radius;
          chip.style.setProperty('--x', x.toFixed(1) + 'px');
          chip.style.setProperty('--y', y.toFixed(1) + 'px');
          chip.style.setProperty('--i', i);
          chip.style.setProperty('--size', opt.size + 'px');
          chip.style.setProperty('--spin-dur', secs ? secs + 's' : '0s');
          chip.classList.toggle('orbit__chip--counter', !!opt.counter && !!secs && !reduceMotion.matches);
          chip.style.animationDirection = dir < 0 ? 'normal' : 'reverse';
          layer.appendChild(chip);

          const line = document.createElementNS(NS, 'line');
          line.setAttribute('x1', '50%'); line.setAttribute('y1', '50%');
          line.setAttribute('x2', 'calc(50% + ' + x.toFixed(1) + 'px)');
          line.setAttribute('y2', 'calc(50% + ' + y.toFixed(1) + 'px)');
          line.setAttribute('class', 'orbit__link');
          svg.appendChild(line);
          // the connector lives in the static svg, so rotate it with the ring via a group transform
          chip.__line = line;
          chip.addEventListener('pointerenter', () => { el.classList.add('is-focused'); line.classList.add('is-lit'); chip.classList.add('is-lit'); });
          chip.addEventListener('pointerleave', () => { el.classList.remove('is-focused'); line.classList.remove('is-lit'); chip.classList.remove('is-lit'); });
        });
        // rotate the connector fan with its ring
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'orbit__fan');
        g.style.setProperty('--dur', secs ? secs + 's' : '0s');
        g.style.animationDirection = dir < 0 ? 'reverse' : 'normal';
        if (!secs || reduceMotion.matches) g.classList.add('is-still');
        items.forEach(c => g.appendChild(c.__line));
        svg.appendChild(g);
      });
      el.style.setProperty('--orbit-size', opt.size + 'px');
      el.classList.toggle('orbit--hairline', !opt.dots);
      const max = Math.max(...rings) + opt.size;
      el.style.setProperty('--orbit-extent', (max * 2) + 'px');
    }

    layout();
    const inst = {
      el, opt, layout,
      set(partial) {
        if (partial && typeof partial.ring1 === 'number') { opt.rings = [partial.ring1, partial.ring2 || opt.rings[1]]; delete partial.ring1; delete partial.ring2; }
        Object.assign(opt, partial || {});
        layout();
        el.setAttribute('data-orbit', JSON.stringify(diff(opt)));
        return inst;
      }
    };
    el.__orbit = inst; instances.push(inst);
    return inst;
  }
  function diff(o) {
    const out = {};
    for (const k in DEFAULTS) {
      if (k === 'rings') { if (String(o.rings) !== String(DEFAULTS.rings)) out.rings = o.rings; continue; }
      if (o[k] !== DEFAULTS[k]) out[k] = o[k];
    }
    return out;
  }
  function init(sel) { return Array.from(document.querySelectorAll(sel || '[data-orbit]'), create); }
  function setAll(p) { instances.forEach(i => i.set(Object.assign({}, p))); }
  window.OrbitStack = { init, create, setAll, instances, DEFAULTS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
