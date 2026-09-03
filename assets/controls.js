/* WMControls — a tiny slider panel for module demo pages.
   Builds range inputs from a schema, calls onChange(values) live, keeps the values in the URL hash
   (so a tuned preset is shareable) and renders a copy-able markup snippet that always matches the sliders.

   WMControls.create({
     title: 'Sticker Displace',
     schema: [{ key:'scale', label:'Rest scale', min:0, max:40, step:.5, hint:'px of displacement at rest' }, …],
     defaults: { scale: 4, … },
     onChange: (values) => …,            // called on every input
     snippet: (values) => '<div …>'      // returns the markup to show
   }) → { el, values, set(values) }
*/
(function () {
  'use strict';
  function fmt(v) { return Number.isInteger(v) ? String(v) : String(+v.toFixed(3)); }
  function readHash(schema) {
    const out = {}; const q = new URLSearchParams(location.hash.slice(1));
    schema.forEach(s => { if (q.has(s.key)) { const n = parseFloat(q.get(s.key)); if (!isNaN(n)) out[s.key] = n; } });
    return out;
  }
  function writeHash(values, defaults) {
    const q = new URLSearchParams();
    Object.keys(values).forEach(k => { if (values[k] !== defaults[k]) q.set(k, fmt(values[k])); });
    const h = q.toString();
    history.replaceState(null, '', location.pathname + location.search + (h ? '#' + h : ''));
  }
  function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function create(cfg) {
    const defaults = Object.assign({}, cfg.defaults);
    const preset = readHash(cfg.schema);          // values carried in the URL, if any
    const values = Object.assign({}, defaults, preset);

    const panel = document.createElement('aside');
    panel.className = 'wm-panel';
    panel.innerHTML =
      '<div class="wm-panel__head"><strong>' + cfg.title + '</strong><span class="wm-panel__sub">tune it · the code updates</span>' +
      '<button type="button" class="wm-panel__toggle" aria-label="Collapse">–</button></div>' +
      '<div class="wm-panel__body"></div>' +
      '<div class="wm-panel__foot"><button type="button" class="wm-panel__btn" data-act="reset">Reset</button><button type="button" class="wm-panel__btn" data-act="copy">Copy markup</button><button type="button" class="wm-panel__btn" data-act="link">Copy link</button></div>' +
      '<pre class="wm-panel__code"><code></code></pre>';
    const body = panel.querySelector('.wm-panel__body');
    const code = panel.querySelector('.wm-panel__code code');
    const inputs = {};

    cfg.schema.forEach(s => {
      const row = document.createElement('label');
      row.className = 'wm-panel__row';
      row.innerHTML = '<span class="wm-panel__label">' + s.label + (s.hint ? '<small>' + s.hint + '</small>' : '') + '</span>' +
        '<input type="range" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '"><output></output>';
      const input = row.querySelector('input'), out = row.querySelector('output');
      input.value = values[s.key]; out.value = fmt(values[s.key]) + (s.unit || '');
      input.addEventListener('input', () => {
        values[s.key] = parseFloat(input.value);
        out.value = fmt(values[s.key]) + (s.unit || '');
        emit();
      });
      inputs[s.key] = { input, out, s };
      body.appendChild(row);
    });

    function render() {
      cfg.schema.forEach(s => { inputs[s.key].input.value = values[s.key]; inputs[s.key].out.value = fmt(values[s.key]) + (s.unit || ''); });
      code.innerHTML = escapeHtml(cfg.snippet(values));
    }
    function emit() { cfg.onChange(values); writeHash(values, defaults); code.innerHTML = escapeHtml(cfg.snippet(values)); }

    panel.querySelector('[data-act="reset"]').addEventListener('click', () => { Object.assign(values, defaults); render(); emit(); });
    panel.querySelector('[data-act="copy"]').addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(cfg.snippet(values)); flash(e.target, 'Copied');
    });
    panel.querySelector('[data-act="link"]').addEventListener('click', async (e) => {
      await navigator.clipboard.writeText(location.href); flash(e.target, 'Link copied');
    });
    panel.querySelector('.wm-panel__toggle').addEventListener('click', (e) => {
      const c = panel.classList.toggle('is-collapsed'); e.target.textContent = c ? '+' : '–';
      document.documentElement.classList.toggle('wm-panel-collapsed', c);
    });
    function flash(btn, txt) { const o = btn.textContent; btn.textContent = txt; setTimeout(() => btn.textContent = o, 1400); }

    document.body.appendChild(panel);
    document.documentElement.classList.add('wm-has-panel');
    render();
    // Only push values on load when the URL carried a preset. Otherwise each element keeps the
    // settings written in its own data-* attribute until a slider is actually moved.
    if (Object.keys(preset).length) cfg.onChange(values);
    return { el: panel, values, set(v) { Object.assign(values, v); render(); emit(); } };
  }
  window.WMControls = { create };
})();
