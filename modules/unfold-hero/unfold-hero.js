/*
 * Unfold Hero — a dashboard shown in 3D perspective with UI cards scattered around it,
 * flattening and snapping into place as you scroll.
 *
 * Extracted from: https://makro.framer.website/home-alt (hero)
 * Measured in the source: the panel carries matrix3d ≈ rotateX(10deg) at scrollY 0, eases to
 * rotateX(0) by ~scrollY 700, and the loose cards carry their own matrix3d (rotate + skew +
 * scale ≈ 1.07) that resolves to identity over the same range. So one scroll progress drives
 * both the plate and every card, which is what this module does.
 *
 * Markup — cards are positioned with data-* and settle to their CSS position at progress 1:
 *   <section class="unfold" data-unfold='{"tilt":12,"lift":80}'>
 *     <div class="unfold__copy"> …headline, buttons… </div>
 *     <div class="unfold__stage">
 *       <div class="unfold__plate"><img src="dashboard.png" alt="Dashboard"></div>
 *       <div class="unfold__card" style="--top:8%;--left:-6%"
 *            data-dx="-120" data-dy="60" data-rot="-14" data-scale="1.1"> … </div>
 *     </div>
 *   </section>
 *
 * Options (data-unfold JSON):
 *   tilt      degrees of rotateX on the plate at rest (default 12)
 *   perspect  px of perspective (default 1600)
 *   lift      px the plate rises as it flattens (default 60)
 *   travel    fraction of a viewport the unfold takes (default 0.8)
 *   spread    multiplier on every card's scatter (default 1)
 *   float     px of idle drift on the cards once settled (default 6; 0 = still)
 *   shadow    true = drop shadow under the plate (default true)
 *
 * API: UnfoldHero.init(sel) → instances; inst.set({...}); UnfoldHero.setAll({...})
 * Under prefers-reduced-motion the hero renders flat and settled with no scroll coupling.
 */
(function () {
  'use strict';
  const DEFAULTS = { tilt: 12, perspect: 1600, lift: 60, travel: .8, spread: 1, float: 6, shadow: true };
  const instances = [];
  let bound = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ease-out-cubic: fast settle, soft landing — matches the source's feel
  const ease = t => 1 - Math.pow(1 - t, 3);

  function create(el) {
    if (el.__unfold) return el.__unfold;
    let opt = {}; try { opt = JSON.parse(el.getAttribute('data-unfold') || '{}'); } catch (e) {}
    opt = Object.assign({}, DEFAULTS, opt);
    el.classList.add('unfold');

    const stage = el.querySelector('.unfold__stage');
    const plate = el.querySelector('.unfold__plate');
    const cards = [...el.querySelectorAll('.unfold__card')];
    cards.forEach((c, i) => {
      c.style.setProperty('--i', i);
      if (opt.float) c.style.setProperty('--float-delay', (-i * 1.3).toFixed(2) + 's');
    });

    function render(p) {                       // p: 0 = folded, 1 = flat
      const e = ease(p);
      const inv = 1 - e;
      el.style.setProperty('--unfold-p', e.toFixed(4));
      if (plate) {
        plate.style.transform =
          'rotateX(' + (opt.tilt * inv).toFixed(2) + 'deg) ' +
          'translateY(' + (-opt.lift * e).toFixed(1) + 'px) ' +
          'scale(' + (1 - .04 * inv).toFixed(4) + ')';
      }
      cards.forEach(c => {
        const dx = (parseFloat(c.dataset.dx) || 0) * opt.spread * inv;
        const dy = (parseFloat(c.dataset.dy) || 0) * opt.spread * inv;
        const rot = (parseFloat(c.dataset.rot) || 0) * inv;
        const sc = 1 + ((parseFloat(c.dataset.scale) || 1) - 1) * inv;
        c.style.transform =
          'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) ' +
          'rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
        c.style.opacity = (0.25 + 0.75 * e).toFixed(3);
      });
    }

    function apply() {
      el.style.setProperty('--unfold-perspective', opt.perspect + 'px');
      el.style.setProperty('--unfold-float', opt.float + 'px');
      el.classList.toggle('unfold--shadow', !!opt.shadow);
      el.classList.toggle('unfold--float', !!opt.float && !reduceMotion.matches);
      onScroll();
    }

    function onScroll() {
      if (reduceMotion.matches) { render(1); return; }
      const r = el.getBoundingClientRect();
      const span = Math.max(1, window.innerHeight * opt.travel);
      // progress runs as the hero's top passes up out of the viewport
      const p = clamp((-r.top) / span, 0, 1);
      render(p);
    }

    apply();
    const inst = {
      el, opt, render,
      set(partial) { Object.assign(opt, partial || {}); apply(); el.setAttribute('data-unfold', JSON.stringify(diff(opt))); return inst; },
      _onScroll: onScroll
    };
    el.__unfold = inst; instances.push(inst);
    if (!bound) {
      bound = true;
      addEventListener('scroll', () => instances.forEach(i => i._onScroll()), { passive: true });
      addEventListener('resize', () => instances.forEach(i => i._onScroll()));
    }
    return inst;
  }
  function diff(o) { const out = {}; for (const k in DEFAULTS) if (o[k] !== DEFAULTS[k]) out[k] = o[k]; return out; }
  function init(sel) { return Array.from(document.querySelectorAll(sel || '[data-unfold]'), create); }
  function setAll(p) { instances.forEach(i => i.set(p)); }
  window.UnfoldHero = { init, create, setAll, instances, DEFAULTS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
