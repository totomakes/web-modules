/* Expanding Rows — behaviour. See expanding-rows.css for markup + options.
   Auto-inits every .xrows on the page. API: ExpandingRows.init(selector) → instances; inst.open(i) / close(i) / toggle(i) */
(function () {
  'use strict';
  function create(list) {
    if (list.__xrows) return list.__xrows;
    let opt = {}; try { opt = JSON.parse(list.getAttribute('data-xrows') || '{}'); } catch (e) {}
    opt = Object.assign({ trigger: 'click', single: true }, opt);
    const rows = Array.from(list.querySelectorAll(':scope > .xrow'));

    rows.forEach((row) => {
      const top = row.querySelector('.xrow__top');
      const details = row.querySelector('.xrow__details');
      if (!top || !details) return;
      if (!details.id) details.id = 'xrow-' + Math.random().toString(36).slice(2, 8);
      top.setAttribute('aria-controls', details.id);
      top.setAttribute('aria-expanded', row.classList.contains('is-open') ? 'true' : 'false');
      // stagger index for pills
      row.querySelectorAll('.xrow__pills li').forEach((li, i) => li.style.setProperty('--i', i));
    });

    function set(row, open) {
      row.classList.toggle('is-open', open);
      const top = row.querySelector('.xrow__top');
      if (top) top.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function openRow(row) {
      if (opt.single) rows.forEach(r => { if (r !== row) set(r, false); });
      set(row, true);
    }
    rows.forEach((row) => {
      const top = row.querySelector('.xrow__top');
      if (!top) return;
      if (opt.trigger === 'hover') {
        row.addEventListener('pointerenter', () => openRow(row));
        top.addEventListener('focus', () => openRow(row));
        top.addEventListener('click', () => set(row, !row.classList.contains('is-open')));
      } else {
        top.addEventListener('click', () => row.classList.contains('is-open') ? set(row, false) : openRow(row));
      }
    });

    const inst = {
      el: list, rows,
      open: (i) => openRow(rows[i]),
      close: (i) => set(rows[i], false),
      toggle: (i) => rows[i].classList.contains('is-open') ? set(rows[i], false) : openRow(rows[i]),
    };
    list.__xrows = inst;
    return inst;
  }
  function init(selector) { return Array.from(document.querySelectorAll(selector || '.xrows'), create); }
  window.ExpandingRows = { init, create };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
