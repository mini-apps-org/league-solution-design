(function () {
  var site = window.SITE;
  var body = document.body;
  var root = body.dataset.root || '';
  var pages = site.pages;
  var index = -1;
  for (var i = 0; i < pages.length; i++) if (pages[i].out === body.dataset.page) index = i;
  var page = pages[index] || { out: body.dataset.page, label: document.title, group: '' };
  var main = document.getElementById('main');
  var article = main.querySelector('article');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function link(p, extra) {
    return '<a href="' + root + p.out + '"' + (extra || '') + '>' + esc(p.label) + '</a>';
  }

  var headings = Array.prototype.map.call(article.querySelectorAll('h2[id], h3[id]'), function (h) {
    return { level: h.tagName === 'H2' ? 2 : 3, id: h.id, text: h.textContent.replace(/\s+/g, ' ').trim() };
  });

  var githubMark =
    '<svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>';

  var header =
    '<a class="skip" href="#main">Skip to content</a>' +
    '<header class="topbar">' +
    '<button class="menu-btn" type="button" aria-controls="sidebar" aria-expanded="false">Menu</button>' +
    '<a class="brand" href="' + root + 'index.html"><span class="brand-name">League Solution Design</span><span class="brand-ver">' + esc(site.version) + '</span></a>' +
    '<div class="search" role="search">' +
    '<input id="search" type="search" placeholder="Search docs: rules, features, endpoints" autocomplete="off" aria-label="Search the documentation" aria-controls="search-results">' +
    '<kbd>/</kbd><div id="search-results" class="search-results" role="listbox" hidden></div></div>' +
    '<nav class="top-links">' +
    '<details class="gh"><summary aria-label="GitHub repositories" title="GitHub repositories">' + githubMark + '</summary>' +
    '<div class="gh-menu">' + site.repos.map(function (r) {
      return '<a href="' + r.url + '" target="_blank" rel="noopener"><strong>' + esc(r.name) + '</strong><span>' + esc(r.desc) + '</span></a>';
    }).join('') + '</div></details>' +
    '<button class="theme-btn" type="button">Dark</button>' +
    '</nav></header>';

  var sections = headings.filter(function (h) { return h.level === 2; });
  var sidebar = site.groups.map(function (group) {
    var items = pages.filter(function (p) { return p.group === group; }).map(function (p) {
      if (p !== page) return link(p);
      var sub = sections.length
        ? '<div class="nav-sections">' + sections.map(function (h) { return '<a href="#' + h.id + '">' + esc(h.text) + '</a>'; }).join('') + '</div>'
        : '';
      return link(p, ' aria-current="page"') + sub;
    }).join('');
    return '<div class="nav-group"><div class="nav-title">' + esc(group) + '</div>' + items + '</div>';
  }).join('');

  var toc = headings.length > 2
    ? '<aside class="toc" aria-label="On this page"><div class="toc-title">On this page</div>' + headings.map(function (h) {
      return '<a class="toc-' + h.level + '" href="#' + h.id + '">' + esc(h.text) + '</a>';
    }).join('') + '</aside>'
    : '';

  var crumbs = '';
  if (page.out !== 'index.html') {
    var trail = ['<a href="' + root + 'index.html">Home</a>'];
    if (page.group === 'Feature Specs' && page.out !== 'features/index.html') trail.push('<a href="' + root + 'features/index.html">Feature Specs</a>');
    else if (page.group !== page.label) trail.push('<span>' + esc(page.group) + '</span>');
    trail.push('<span aria-current="page">' + esc(page.label) + '</span>');
    crumbs = '<nav class="crumbs" aria-label="Breadcrumb">' + trail.join('<span class="sep">/</span>') + '</nav>';
  }

  var prev = pages[index - 1], next = pages[index + 1];
  var pager = '<nav class="pager" aria-label="Previous and next">' +
    (prev ? '<a class="prev" href="' + root + prev.out + '"><span>Previous</span>' + esc(prev.label) + '</a>' : '<span></span>') +
    (next ? '<a class="next" href="' + root + next.out + '"><span>Next</span>' + esc(next.label) + '</a>' : '<span></span>') +
    '</nav>';

  var footer = '<footer class="footer">' +
    '<div><strong>MViP Billiard League</strong> · Solution design ' + esc(site.version) + ' · aligned with ' + esc(site.aligned) +
    ' · <a href="' + root + 'changelog.html">Change log</a></div>' +
    '<div>Generated from <code>docs/solution-design</code>. Edit the Markdown, then rebuild.</div></footer>';

  body.insertAdjacentHTML('afterbegin', header);
  var shell = document.createElement('div');
  shell.className = 'shell';
  main.parentNode.insertBefore(shell, main);
  shell.insertAdjacentHTML('beforeend',
    '<nav id="sidebar" class="sidebar" aria-label="Documentation">' + sidebar + '</nav>' +
    '<div class="sidebar-resizer" role="separator" aria-orientation="vertical" aria-label="Resize menu" tabindex="0" title="Drag to resize the menu. Double-click to reset."></div>' +
    '<div class="scrim" hidden></div>');
  shell.appendChild(main);
  shell.insertAdjacentHTML('beforeend', toc);
  main.insertAdjacentHTML('afterbegin', crumbs);
  main.insertAdjacentHTML('beforeend', pager);
  shell.insertAdjacentHTML('afterend', footer);

  var gh = document.querySelector('.gh');
  document.addEventListener('click', function (e) { if (gh.open && !gh.contains(e.target)) gh.open = false; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && gh.open) { gh.open = false; gh.querySelector('summary').focus(); } });

  var resizer = shell.querySelector('.sidebar-resizer');
  var docEl = document.documentElement;
  var MIN = 200, MAX = 520;
  function currentWidth() { return document.getElementById('sidebar').getBoundingClientRect().width; }
  function setWidth(w, save) {
    w = Math.round(Math.max(MIN, Math.min(MAX, w)));
    docEl.style.setProperty('--sidebar-w', w + 'px');
    resizer.setAttribute('aria-valuenow', String(w));
    if (save) { try { localStorage.setItem('mvip-sidebar-w', String(w)); } catch (e) {} }
  }
  resizer.setAttribute('aria-valuemin', String(MIN));
  resizer.setAttribute('aria-valuemax', String(MAX));
  resizer.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    resizer.setPointerCapture(e.pointerId);
    body.classList.add('resizing');
  });
  resizer.addEventListener('pointermove', function (e) {
    if (!resizer.hasPointerCapture(e.pointerId)) return;
    setWidth(e.clientX - shell.getBoundingClientRect().left, false);
  });
  resizer.addEventListener('pointerup', function (e) {
    resizer.releasePointerCapture(e.pointerId);
    body.classList.remove('resizing');
    setWidth(currentWidth(), true);
  });
  resizer.addEventListener('dblclick', function () {
    docEl.style.removeProperty('--sidebar-w');
    try { localStorage.removeItem('mvip-sidebar-w'); } catch (e) {}
  });
  resizer.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); setWidth(currentWidth() - 16, true); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setWidth(currentWidth() + 16, true); }
  });
})();
