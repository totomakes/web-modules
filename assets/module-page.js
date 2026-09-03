/* Shared chrome for every module demo page: a floating dock with
   "← Gallery", "Code" (drawer that fetches the module's files) and "Share". */
(function () {
  const meta = document.querySelector('meta[name="wm-module"]');
  if (!meta) return;
  // embedded as a gallery preview → no chrome
  if (window.self !== window.top || /[?&]embed/.test(location.search)) { document.documentElement.classList.add('wm-embed'); return; }
  const slug = meta.content;
  const files = (document.querySelector('meta[name="wm-files"]') || {}).content || '';
  const source = (document.querySelector('meta[name="wm-source"]') || {}).content || '';
  const title = document.title.replace(/ · .*$/, '');

  const dock = document.createElement('div');
  dock.className = 'wm-dock';
  dock.innerHTML =
    '<a class="wm-dock__btn" href="../../">← Gallery</a>' +
    '<span class="wm-dock__name">' + title + '</span>' +
    '<button class="wm-dock__btn" type="button" data-wm="code">Code</button>' +
    '<button class="wm-dock__btn" type="button" data-wm="share">Share</button>';
  document.body.appendChild(dock);

  const drawer = document.createElement('aside');
  drawer.className = 'wm-drawer';
  drawer.hidden = true;
  drawer.innerHTML =
    '<div class="wm-drawer__head"><strong>' + title + '</strong>' +
    (source ? ' <a href="' + source + '" target="_blank" rel="noopener">source site ↗</a>' : '') +
    '<button class="wm-drawer__close" type="button" aria-label="Close">×</button></div>' +
    '<div class="wm-drawer__body"><p class="wm-drawer__hint">Drop these files next to your page and include them. Each file has a header comment with the options.</p></div>';
  document.body.appendChild(drawer);

  let loaded = false;
  async function loadFiles() {
    if (loaded) return; loaded = true;
    const body = drawer.querySelector('.wm-drawer__body');
    for (const f of files.split(',').map(s => s.trim()).filter(Boolean)) {
      const box = document.createElement('section');
      box.className = 'wm-file';
      box.innerHTML = '<div class="wm-file__head"><code>' + f + '</code><button type="button" class="wm-file__copy">Copy</button></div><pre><code></code></pre>';
      body.appendChild(box);
      try {
        const txt = await (await fetch(f)).text();
        box.querySelector('pre code').textContent = txt;
        box.querySelector('.wm-file__copy').addEventListener('click', async (e) => {
          await navigator.clipboard.writeText(txt);
          e.target.textContent = 'Copied'; setTimeout(() => e.target.textContent = 'Copy', 1400);
        });
      } catch (err) { box.querySelector('pre code').textContent = 'Could not load ' + f; }
    }
  }
  function toggle(open) {
    drawer.hidden = !open;
    document.documentElement.classList.toggle('wm-drawer-open', open);
    if (open) loadFiles();
  }
  dock.querySelector('[data-wm="code"]').addEventListener('click', () => toggle(drawer.hidden));
  drawer.querySelector('.wm-drawer__close').addEventListener('click', () => toggle(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });

  dock.querySelector('[data-wm="share"]').addEventListener('click', async (e) => {
    const data = { title: title + ' · Web Modules', text: 'A web effect extracted and rebuilt in plain HTML/CSS/JS', url: location.href };
    if (navigator.share) { try { await navigator.share(data); } catch (_) {} }
    else { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; setTimeout(() => e.target.textContent = 'Share', 1400); }
  });
})();
