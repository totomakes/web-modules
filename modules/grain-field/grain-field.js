/*
 * Grain Field — an animated film-grain layer that sits over any section.
 *
 * Extracted from: https://oberon.framer.website/ (pricing section background)
 * Mechanism found in the source: an oversized div covering 400% of its parent
 *   <div style="background:url(noise.png); opacity:.05; inset:-200%; width:400%; height:400%;
 *               position:absolute; will-change:transform; transform:translateX(9%) translateY(6%)">
 * whose translate is re-randomised every frame. Because the texture repeats and the layer is
 * far larger than the box, the shifting reads as the grain "boiling" — not as a moving image.
 * This version generates its own tileable noise on a canvas, so there is no image to ship.
 *
 * Usage:
 *   <section class="has-grain" data-grain='{"opacity":0.05,"fps":24}'> … </section>
 *   <link rel="stylesheet" href="grain-field.css"><script src="grain-field.js"></script>
 *
 * Options (data-grain JSON):
 *   opacity   layer opacity (default 0.05)         — 0.03–0.09 is the useful range
 *   fps       grain refresh rate (default 24)      — 0 = static grain, 60 = frantic
 *   size      noise tile size in px (default 128)  — bigger = coarser repeat
 *   density   0..1 how many pixels get grain (default 1)
 *   scale     texture zoom, 1 = 1 device px per grain px (default 1)
 *   mono      true = grey grain (default), false = RGB colour grain
 *   blend     CSS mix-blend-mode for the layer (default "normal"; "overlay" bites into colour)
 *   spread    how far past the box the layer reaches, as a % (default 200 → 400% wide)
 *
 * API: GrainField.init(selector) → instances; inst.set({opacity:.08}); GrainField.setAll({...})
 * Respects prefers-reduced-motion: the grain is drawn once and held still.
 */
(function () {
  'use strict';
  const DEFAULTS = { opacity: 0.05, fps: 24, size: 128, density: 1, scale: 1, mono: true, blend: 'normal', spread: 200 };
  const instances = [];
  let raf = null, last = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function makeNoise(opt) {
    const c = document.createElement('canvas');
    c.width = c.height = opt.size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(opt.size, opt.size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.random() > opt.density) { d[i + 3] = 0; continue; }
      if (opt.mono) { const v = (Math.random() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; }
      else { d[i] = (Math.random() * 255) | 0; d[i + 1] = (Math.random() * 255) | 0; d[i + 2] = (Math.random() * 255) | 0; }
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }

  function create(el) {
    if (el.__grainField) return el.__grainField;
    let opt = {}; try { opt = JSON.parse(el.getAttribute('data-grain') || '{}'); } catch (e) {}
    opt = Object.assign({}, DEFAULTS, opt);

    const layer = document.createElement('div');
    layer.className = 'grain-field__layer';
    layer.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('grain-field');
    el.appendChild(layer);

    const inst = {
      el, layer, opt, url: '',
      rebuild() { inst.url = makeNoise(inst.opt); layer.style.backgroundImage = 'url(' + inst.url + ')'; },
      apply() {
        const o = inst.opt;
        layer.style.opacity = o.opacity;
        layer.style.mixBlendMode = o.blend;
        layer.style.inset = (-o.spread) + '%';
        layer.style.width = layer.style.height = (o.spread * 2 + 100) + '%';
        layer.style.backgroundSize = (o.size * o.scale) + 'px ' + (o.size * o.scale) + 'px';
      },
      set(partial) {
        const needsNoise = ['size', 'density', 'mono'].some(k => partial && k in partial && partial[k] !== inst.opt[k]);
        Object.assign(inst.opt, partial || {});
        if (needsNoise) inst.rebuild();
        inst.apply();
        el.setAttribute('data-grain', JSON.stringify(diff(inst.opt)));
        return inst;
      },
      destroy() {
        layer.remove(); el.classList.remove('grain-field');
        const i = instances.indexOf(inst); if (i > -1) instances.splice(i, 1);
        delete el.__grainField;
      }
    };
    inst.rebuild(); inst.apply();
    el.__grainField = inst;
    instances.push(inst);
    start();
    return inst;
  }
  function diff(o) { const out = {}; for (const k in DEFAULTS) if (o[k] !== DEFAULTS[k]) out[k] = o[k]; return out; }

  function tick(now) {
    for (const inst of instances) {
      const fps = reduceMotion.matches ? 0 : inst.opt.fps;
      if (fps <= 0) continue;
      if (now - (inst.last || 0) < 1000 / fps) continue;
      inst.last = now;
      // jump the oversized layer to a random offset — the repeat makes it read as boiling grain
      inst.layer.style.transform = 'translate3d(' + (Math.random() * 20 - 10).toFixed(2) + '%,' +
        (Math.random() * 20 - 10).toFixed(2) + '%,0)';
    }
    raf = instances.length ? requestAnimationFrame(tick) : null;
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }

  function init(selector) { return Array.from(document.querySelectorAll(selector || '[data-grain]'), create); }
  function setAll(p) { instances.forEach(i => i.set(p)); }
  window.GrainField = { init, create, setAll, instances, DEFAULTS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
