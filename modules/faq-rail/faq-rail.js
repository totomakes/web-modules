/*
 * FAQ Rail — a category rail beside an accordion, where the category advances as you scroll.
 *
 * Extracted from: https://makro.framer.website/ (FAQ section)
 * The source is a static tabbed accordion: a left rail of categories in a tinted tray, a right
 * panel of question cards, and the notched corner radii (16px 4px 4px / 0 24px 24px) that make
 * the active tab read as a folder tab welded to the panel.
 * The scroll behaviour is the addition asked for: the section pins itself and each further
 * screenful of scrolling steps to the next category, so the FAQ keeps going instead of ending.
 *
 * Markup:
 *   <section class="faqr" data-faq-rail='{"mode":"scroll","perStep":0.9}'>
 *     <div class="faqr__sticky">
 *       <ul class="faqr__rail">
 *         <li><button type="button">General</button></li> …
 *       </ul>
 *       <div class="faqr__panel">
 *         <div class="faqr__group">                       (one per category, same order)
 *           <details class="faqr__q" open><summary>Question</summary><div class="faqr__a">Answer</div></details>
 *           …
 *         </div>
 *       </div>
 *     </div>
 *   </section>
 *
 * Options (data-faq-rail JSON):
 *   mode      "scroll" (pin and step, default) or "click" (a plain tabbed accordion)
 *   perStep   viewport heights of scroll per category (default 0.9)
 *   loop      true = wrap back to the first category past the end (default false)
 *   autoOpen  true = open the first question of each category on arrival (default true)
 *   single    true = one open question at a time (default true)
 *
 * Clicking a category always works, in either mode; in scroll mode a click also jumps the page
 * to that category's scroll position, so the rail and the scrollbar never disagree.
 * API: FaqRail.init(sel) → instances; inst.go(i); inst.set({...})
 */
(function () {
  'use strict';
  const DEFAULTS = { mode: 'scroll', perStep: 0.9, loop: false, autoOpen: true, single: true };
  const instances = [];
  let bound = false;

  function create(el) {
    if (el.__faqRail) return el.__faqRail;
    let opt = {}; try { opt = JSON.parse(el.getAttribute('data-faq-rail') || '{}'); } catch (e) {}
    opt = Object.assign({}, DEFAULTS, opt);
    el.classList.add('faqr');

    const tabs = [...el.querySelectorAll('.faqr__rail button')];
    const groups = [...el.querySelectorAll('.faqr__group')];
    const n = Math.min(tabs.length, groups.length);
    let index = -1;

    // progress meter on the rail
    let meter = el.querySelector('.faqr__meter');
    if (!meter && tabs.length) {
      meter = document.createElement('div');
      meter.className = 'faqr__meter'; meter.innerHTML = '<i></i>';
      el.querySelector('.faqr__rail').appendChild(meter);
    }

    function go(i, fromScroll) {
      i = Math.max(0, Math.min(n - 1, i));
      if (i === index) return;
      const back = i < index;
      index = i;
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
        t.parentElement.classList.toggle('is-active', k === i);
      });
      groups.forEach((g, k) => {
        g.classList.toggle('is-active', k === i);
        g.classList.toggle('is-back', k !== i && back);
        g.hidden = k !== i;
      });
      if (opt.autoOpen) {
        const qs = [...groups[i].querySelectorAll('.faqr__q')];
        qs.forEach((q, k) => { q.open = k === 0; });
      }
      el.style.setProperty('--faqr-progress', n > 1 ? (i / (n - 1)) : 0);
      el.dispatchEvent(new CustomEvent('faqrail:change', { detail: { index: i, fromScroll: !!fromScroll } }));
    }

    function sizeTrack() {
      // the section is tall enough to hold one screenful of scroll per category
      const per = Math.max(.2, opt.perStep);
      el.style.setProperty('--faqr-steps', n);
      el.style.height = opt.mode === 'scroll' ? 'calc(100vh + ' + ((n - 1) * per * 100) + 'vh)' : '';
      el.classList.toggle('faqr--scroll', opt.mode === 'scroll');
    }

    function onScroll() {
      if (opt.mode !== 'scroll' || n < 2) return;
      const r = el.getBoundingClientRect();
      const travel = el.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      let t = (-r.top) / travel;                       // 0 at the top of the section, 1 at the end
      t = Math.max(0, Math.min(1, t));
      let i = Math.round(t * (n - 1));
      if (opt.loop && t >= 1) i = 0;
      go(i, true);
      el.style.setProperty('--faqr-scroll', t.toFixed(4));
    }

    tabs.forEach((t, i) => {
      t.setAttribute('role', 'tab');
      t.addEventListener('click', () => {
        if (opt.mode === 'scroll' && n > 1) {
          const travel = el.offsetHeight - window.innerHeight;
          const top = el.getBoundingClientRect().top + window.scrollY + travel * (i / (n - 1));
          window.scrollTo({ top, behavior: 'smooth' });
        }
        go(i);
      });
    });

    // Native <details> snaps open and shut, which jolts the panel height and everything under it.
    // Animate the height ourselves: open → grow from the summary to the full height, close → the
    // reverse, then let the native state catch up when the animation ends.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    function animateQ(q, open) {
      if (q.__anim) q.__anim.cancel();
      const answer = q.querySelector('.faqr__a');
      const from = q.offsetHeight;
      q.style.overflow = 'hidden';
      if (open) q.open = true;
      // measure the destination for real instead of adding paddings up by hand
      q.style.height = 'auto';
      if (!open) answer.style.display = 'none';
      const to = q.offsetHeight;
      if (!open) answer.style.display = '';
      q.style.height = from + 'px';
      const dur = reduce.matches ? 0 : 480;
      q.__anim = q.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: dur, easing: 'cubic-bezier(.2,1,.3,1)' });
      q.__anim.onfinish = q.__anim.oncancel = () => {
        q.__anim = null; q.style.height = ''; q.style.overflow = '';
        if (!open) q.open = false;
      };
    }
    el.addEventListener('click', (e) => {
      const summary = e.target.closest('.faqr__q > summary');
      if (!summary) return;
      e.preventDefault();
      const q = summary.parentElement;
      const willOpen = !q.open;
      if (willOpen && opt.single) {
        q.closest('.faqr__group').querySelectorAll('.faqr__q[open]').forEach(o => { if (o !== q) animateQ(o, false); });
      }
      animateQ(q, willOpen);
    });

    sizeTrack(); go(0);

    const inst = {
      el, opt, go,
      set(partial) {
        Object.assign(opt, partial || {});
        sizeTrack(); onScroll();
        el.setAttribute('data-faq-rail', JSON.stringify(diff(opt)));
        return inst;
      },
      _onScroll: onScroll, _size: sizeTrack
    };
    el.__faqRail = inst; instances.push(inst);

    if (!bound) {
      bound = true;
      addEventListener('scroll', () => instances.forEach(i => i._onScroll()), { passive: true });
      addEventListener('resize', () => instances.forEach(i => { i._size(); i._onScroll(); }));
    }
    onScroll();
    return inst;
  }
  function diff(o) { const out = {}; for (const k in DEFAULTS) if (o[k] !== DEFAULTS[k]) out[k] = o[k]; return out; }
  function init(sel) { return Array.from(document.querySelectorAll(sel || '[data-faq-rail]'), create); }
  function setAll(p) { instances.forEach(i => i.set(p)); }
  window.FaqRail = { init, create, setAll, instances, DEFAULTS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
