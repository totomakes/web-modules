/*
 * Circle Text — text set on a circle that spins continuously, speeds up with scroll
 * velocity and eases back (no linear robotic feel), with a slot in the middle.
 * Inspired by the rotating badge on https://kaix.framer.website/
 *
 * Usage:
 *   <div class="circle-text" data-circle-text='{"text":"AVAILABLE FOR WORK • ","speed":12,"scroll":0.35}'>
 *     <span class="circle-text__center">↗</span>       (optional centre content)
 *   </div>
 *   <script src="circle-text.js"></script>            (auto-inits)
 *
 * Options (data-circle-text JSON):
 *   text      the string; it is repeated until it fills the circle (default "WEB MODULES • ")
 *   speed     degrees per second at rest (default 12). Negative = counter-clockwise
 *   scroll    how much scroll velocity feeds the spin (default 0.35, 0 = ignore scroll)
 *   hover     multiplier while hovered (default 0.15 → slows down under the cursor)
 *   inset     0..0.5 radius padding inside the box (default 0.14)
 *   fontSize  in viewBox units of 200 (default 12)
 *   letterSpacing in viewBox units (default 1.2)
 * CSS: size it with width/height on .circle-text; colours via currentColor.
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const instances = [];
  let raf = null, lastY = window.scrollY, velocity = 0, lastT = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function create(el) {
    if (el.__circleText) return el.__circleText;
    let opt = {}; try { opt = JSON.parse(el.getAttribute('data-circle-text') || '{}'); } catch (e) {}
    opt = Object.assign({ text: 'WEB MODULES • ', speed: 12, scroll: 0.35, hover: 0.15, inset: 0.14, fontSize: 12, letterSpacing: 1.2 }, opt);

    const id = 'circle-text-path-' + Math.random().toString(36).slice(2, 8);
    const r = 100 - opt.inset * 200;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('class', 'circle-text__ring');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(NS, 'defs');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('id', id);
    // start at 12 o'clock, clockwise
    path.setAttribute('d', 'M100,' + (100 - r) + ' a' + r + ',' + r + ' 0 1,1 -0.01,0 z');
    defs.appendChild(path); svg.appendChild(defs);
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('font-size', String(opt.fontSize));
    text.setAttribute('letter-spacing', String(opt.letterSpacing));
    text.setAttribute('fill', 'currentColor');
    const tp = document.createElementNS(NS, 'textPath');
    tp.setAttribute('href', '#' + id);
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + id);
    tp.setAttribute('lengthAdjust', 'spacing');
    text.appendChild(tp); svg.appendChild(text);
    el.classList.add('circle-text');
    el.insertBefore(svg, el.firstChild);

    // Fill the circumference with the nearest whole number of repetitions, then nudge
    // letter-spacing so the loop closes exactly (textLength on textPath is unreliable in Safari).
    const circumference = path.getTotalLength();
    tp.textContent = opt.text;
    const oneLen = tp.getComputedTextLength() || 1;
    const reps = Math.max(1, Math.round(circumference / oneLen));
    const full = opt.text.repeat(reps);
    tp.textContent = full;
    const chars = Array.from(full).length;
    const extra = (circumference - oneLen * reps) / chars;
    text.setAttribute('letter-spacing', (opt.letterSpacing + extra).toFixed(3));

    const inst = { el, svg, opt, angle: Math.random() * 360, hover: 1, boost: 0 };
    el.addEventListener('pointerenter', () => { inst.hoverTarget = opt.hover; });
    el.addEventListener('pointerleave', () => { inst.hoverTarget = 1; });
    inst.hoverTarget = 1;
    el.__circleText = inst;
    instances.push(inst);
    start();
    return inst;
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    // scroll velocity (px/s), decays smoothly
    const y = window.scrollY; const v = (y - lastY) / dt; lastY = y;
    velocity += (v - velocity) * 0.25;
    velocity *= 0.92;
    for (const inst of instances) {
      inst.hover += (inst.hoverTarget - inst.hover) * 0.08;
      const rest = reduceMotion.matches ? 0 : inst.opt.speed;
      const boost = reduceMotion.matches ? 0 : velocity * inst.opt.scroll * Math.sign(inst.opt.speed || 1);
      inst.angle = (inst.angle + (rest * inst.hover + boost) * dt) % 360;
      inst.svg.style.transform = 'rotate(' + inst.angle.toFixed(2) + 'deg)';
    }
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function init(selector) { return Array.from(document.querySelectorAll(selector || '[data-circle-text]'), create); }
  window.CircleText = { init, create, instances };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
