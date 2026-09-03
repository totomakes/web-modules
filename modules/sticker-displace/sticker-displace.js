/*
 * Sticker Displace — warps the BACKGROUND behind a sticker with a living SVG
 * turbulence + displacement filter applied through `backdrop-filter`.
 *
 * Extracted from: https://agenius.framer.website/ (hero stickers)
 * Mechanism found in the source:
 *   <filter><feTurbulence type="fractalNoise" baseFrequency="0.066" numOctaves="2" seed="…" stitchTiles="stitch"/>
 *            <feDisplacementMap in="SourceGraphic" scale="~4 (jitters every frame)" xChannelSelector="R" yChannelSelector="G"/></filter>
 *   <div style="position:absolute; inset:0; pointer-events:none; backdrop-filter:url(#filter)"></div>
 * The original only jitters `scale`. This version also drifts the turbulence itself
 * (baseFrequency breathes on X and Y independently, optional re-seeding) so the noise
 * field flows instead of sitting still.
 *
 * Usage:
 *   <div class="sticker" data-displace='{"scale":4,"hover":16,"flow":0.35}'> …sticker art… </div>
 *   <script src="sticker-displace.js"></script>   (auto-inits on DOMContentLoaded)
 *
 * Options (all optional, via data-displace JSON):
 *   scale     resting displacement in px (default 4)         — the "heat haze"
 *   hover     displacement while hovered (default 14)         — equal to scale = no hover swell
 *   wobble    per-frame jitter amplitude of scale (default 0.35)
 *   freq      feTurbulence baseFrequency (default 0.066)     — higher = finer ripples
 *   flow      0..1 how much baseFrequency drifts over time (default 0.35) — 0 = static noise like the original
 *   speed     animation rate multiplier (default 1)
 *   octaves   feTurbulence numOctaves (default 2)            — more = more detail, more cost
 *   seedEvery re-seed the noise every N ms (default 0 = off) — gives a crackling, TV-static feel
 *   spread    how far past the sticker the warp reaches, px (default 40)
 *   feather   0..1 how soft the warp fades at the edge (default 0.55)
 *
 * API: StickerDisplace.init(selector) → instances; StickerDisplace.create(el);
 *      inst.set({scale: 8, flow: .6}) updates a live instance; StickerDisplace.setAll({...}) updates every instance.
 *
 * Browser notes: backdrop-filter:url() works in Chromium and Firefox 103+.
 * Safari ignores SVG references in backdrop-filter — the sticker still renders on an un-warped background.
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DEFAULTS = { scale: 4, hover: 14, wobble: 0.35, freq: 0.066, flow: 0.35, speed: 1, octaves: 2, seedEvery: 0, spread: 40, feather: 0.55 };
  let uid = 0;
  const instances = [];
  let raf = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function parseOptions(el) {
    let o = {};
    try { o = JSON.parse(el.getAttribute('data-displace') || '{}'); } catch (e) { o = {}; }
    return Object.assign({}, DEFAULTS, o);
  }

  function create(el) {
    if (el.__stickerDisplace) return el.__stickerDisplace;
    const opt = parseOptions(el);
    const id = 'sticker-displace-' + (++uid);

    // 1. The SVG filter (0×0, lives inside the sticker so it can be cloned/moved freely)
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', id);
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    // Let the filter region breathe, otherwise displaced pixels get clipped at the box.
    filter.setAttribute('x', '-20%'); filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%'); filter.setAttribute('height', '140%');
    const turb = document.createElementNS(SVG_NS, 'feTurbulence');
    turb.setAttribute('type', 'fractalNoise');
    turb.setAttribute('baseFrequency', String(opt.freq));
    turb.setAttribute('numOctaves', String(opt.octaves));
    turb.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
    turb.setAttribute('stitchTiles', 'stitch');
    const disp = document.createElementNS(SVG_NS, 'feDisplacementMap');
    disp.setAttribute('in', 'SourceGraphic');
    disp.setAttribute('scale', String(opt.scale));
    disp.setAttribute('xChannelSelector', 'R');
    disp.setAttribute('yChannelSelector', 'G');
    filter.appendChild(turb); filter.appendChild(disp); svg.appendChild(filter);

    // 2. The overlay that carries the backdrop-filter. It sits BEHIND the sticker art
    //    (z-index:0 while art gets z-index:1 from the CSS) and is larger than the sticker
    //    so the warp bleeds into the surroundings, faded out by a radial mask.
    const warp = document.createElement('div');
    warp.className = 'sticker-displace__warp';
    warp.style.cssText = 'position:absolute;pointer-events:none;z-index:0;border-radius:50%;' +
      '-webkit-backdrop-filter:url(#' + id + ');backdrop-filter:url(#' + id + ');';

    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('sticker-displace');
    el.insertBefore(warp, el.firstChild);
    el.insertBefore(svg, el.firstChild);

    const inst = {
      el, opt, turb, disp, warp,
      phase: Math.random() * Math.PI * 2,
      speedJitter: 0.9 + Math.random() * 0.6,
      target: opt.scale, current: opt.scale, hovered: false, lastSeed: 0,
      set(partial) {
        Object.assign(opt, partial || {});
        applyStatic(inst);
        inst.target = inst.hovered ? opt.hover : opt.scale;
        el.setAttribute('data-displace', JSON.stringify(diffFromDefaults(opt)));
        return inst;
      },
      destroy() {
        svg.remove(); warp.remove();
        el.classList.remove('sticker-displace');
        const i = instances.indexOf(inst); if (i > -1) instances.splice(i, 1);
        delete el.__stickerDisplace;
      }
    };
    applyStatic(inst);
    el.addEventListener('pointerenter', () => { inst.hovered = true; inst.target = opt.hover; });
    el.addEventListener('pointerleave', () => { inst.hovered = false; inst.target = opt.scale; });
    el.__stickerDisplace = inst;
    instances.push(inst);
    start();
    return inst;
  }

  // things that don't change every frame
  function applyStatic(inst) {
    const o = inst.opt;
    inst.turb.setAttribute('numOctaves', String(Math.max(1, Math.round(o.octaves))));
    const innerStop = Math.round((1 - o.feather) * 100);
    inst.warp.style.inset = (-o.spread) + 'px';
    const mask = 'radial-gradient(closest-side, #000 ' + innerStop + '%, transparent 100%)';
    inst.warp.style.webkitMaskImage = mask; inst.warp.style.maskImage = mask;
    if (o.flow === 0) inst.turb.setAttribute('baseFrequency', String(o.freq));
  }
  function diffFromDefaults(o) {
    const out = {};
    for (const k in DEFAULTS) if (o[k] !== DEFAULTS[k]) out[k] = o[k];
    return out;
  }

  function tick(now) {
    const still = reduceMotion.matches;
    for (const inst of instances) {
      const o = inst.opt, t = now / 1000 * o.speed * inst.speedJitter;
      // ease toward the hover/rest target (expo-style lerp), then add a soft two-sine wobble
      inst.current += (inst.target - inst.current) * 0.08;
      const wobble = still ? 0 :
        o.wobble * (Math.sin(t * 1.7 + inst.phase) + Math.sin(t * 2.9 + inst.phase * 1.3)) * 0.5 * (inst.current / (o.scale || 1));
      inst.disp.setAttribute('scale', (inst.current + wobble).toFixed(3));
      // the turbulence itself drifts: X and Y frequencies breathe out of phase → the noise field flows
      if (!still && o.flow > 0) {
        const fx = o.freq * (1 + o.flow * 0.5 * Math.sin(t * 0.55 + inst.phase));
        const fy = o.freq * (1 + o.flow * 0.5 * Math.sin(t * 0.8 + inst.phase * 2.1));
        inst.turb.setAttribute('baseFrequency', fx.toFixed(5) + ' ' + fy.toFixed(5));
      }
      if (!still && o.seedEvery > 0 && now - inst.lastSeed > o.seedEvery) {
        inst.lastSeed = now;
        inst.turb.setAttribute('seed', String(Math.floor(Math.random() * 1000)));
      }
    }
    raf = instances.length ? requestAnimationFrame(tick) : null;
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }

  function init(selector) {
    const nodes = document.querySelectorAll(selector || '[data-displace]');
    return Array.from(nodes, create);
  }
  function setAll(partial) { instances.forEach(i => i.set(partial)); }

  window.StickerDisplace = { init, create, setAll, instances, DEFAULTS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
