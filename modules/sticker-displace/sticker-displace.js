/*
 * Sticker Displace — warps the BACKGROUND behind a sticker with an animated
 * SVG turbulence + displacement filter applied through `backdrop-filter`.
 *
 * Extracted from: https://agenius.framer.website/ (hero stickers)
 * Mechanism found in the source:
 *   <filter><feTurbulence type="fractalNoise" baseFrequency="0.066" numOctaves="2" seed="…" stitchTiles="stitch"/>
 *            <feDisplacementMap in="SourceGraphic" scale="~4 (jitters every frame)" xChannelSelector="R" yChannelSelector="G"/></filter>
 *   <div style="position:absolute; inset:0; pointer-events:none; backdrop-filter:url(#filter)"></div>
 *
 * Usage:
 *   <div class="sticker" data-displace='{"scale":4,"hover":16,"spread":48}'> …sticker art… </div>
 *   <script src="sticker-displace.js"></script>   (auto-inits on DOMContentLoaded)
 *
 * Options (all optional, via data-displace JSON):
 *   scale   base displacement in px (default 4)        — the resting "heat haze"
 *   hover   displacement while hovered (default 14)    — set equal to scale to disable
 *   wobble  amplitude of the per-frame jitter (default 0.35)
 *   freq    feTurbulence baseFrequency (default 0.066)
 *   octaves feTurbulence numOctaves (default 2)
 *   spread  how far past the sticker the warp reaches, px (default 40)
 *   feather 0..1 how soft the warp fades at the edge (default 0.55)
 *
 * Browser notes: backdrop-filter:url() works in Chromium and Firefox 103+.
 * Safari ignores SVG references in backdrop-filter — the sticker still renders,
 * it just sits on an un-warped background (graceful degradation).
 */
(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let uid = 0;
  const instances = [];
  let raf = null;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function parseOptions(el) {
    let o = {};
    try { o = JSON.parse(el.getAttribute('data-displace') || '{}'); } catch (e) { o = {}; }
    return Object.assign({
      scale: 4, hover: 14, wobble: 0.35, freq: 0.066, octaves: 2, spread: 40, feather: 0.55
    }, o);
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
    const inner = Math.round((1 - opt.feather) * 100);
    warp.style.cssText =
      'position:absolute;inset:' + (-opt.spread) + 'px;pointer-events:none;z-index:0;border-radius:50%;' +
      '-webkit-backdrop-filter:url(#' + id + ');backdrop-filter:url(#' + id + ');' +
      '-webkit-mask-image:radial-gradient(closest-side, #000 ' + inner + '%, transparent 100%);' +
      'mask-image:radial-gradient(closest-side, #000 ' + inner + '%, transparent 100%);';

    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('sticker-displace');
    el.insertBefore(warp, el.firstChild);
    el.insertBefore(svg, el.firstChild);

    const inst = {
      el, opt, disp,
      phase: Math.random() * Math.PI * 2,
      speed: 0.9 + Math.random() * 0.6,
      target: opt.scale,
      current: opt.scale,
      destroy() {
        svg.remove(); warp.remove();
        el.classList.remove('sticker-displace');
        const i = instances.indexOf(inst); if (i > -1) instances.splice(i, 1);
        delete el.__stickerDisplace;
      }
    };
    el.addEventListener('pointerenter', () => { inst.target = opt.hover; });
    el.addEventListener('pointerleave', () => { inst.target = opt.scale; });
    el.__stickerDisplace = inst;
    instances.push(inst);
    start();
    return inst;
  }

  function tick(now) {
    const t = now / 1000;
    for (const inst of instances) {
      // ease toward the hover/rest target (expo-style lerp), then add a soft two-sine wobble
      inst.current += (inst.target - inst.current) * 0.08;
      const wobble = reduceMotion.matches ? 0 :
        inst.opt.wobble * (Math.sin(t * 1.7 * inst.speed + inst.phase) + Math.sin(t * 2.9 * inst.speed + inst.phase * 1.3)) * 0.5
        * (inst.current / inst.opt.scale);
      inst.disp.setAttribute('scale', (inst.current + wobble).toFixed(3));
    }
    raf = instances.length ? requestAnimationFrame(tick) : null;
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }

  function init(selector) {
    const nodes = document.querySelectorAll(selector || '[data-displace]');
    return Array.from(nodes, create);
  }

  window.StickerDisplace = { init, create, instances };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
})();
