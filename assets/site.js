(function () {
  var root = document.body.dataset.root || '';
  var html = document.documentElement;

  var themeBtn = document.querySelector('.theme-btn');
  function currentTheme() { return html.dataset.theme === 'dark' ? 'dark' : 'light'; }
  function syncThemeLabel() { themeBtn.textContent = currentTheme() === 'dark' ? 'Light' : 'Dark'; }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    html.dataset.theme = next;
    try { localStorage.setItem('mvip-theme', next); } catch (e) {}
    syncThemeLabel();
  });
  syncThemeLabel();

  var menuBtn = document.querySelector('.menu-btn');
  var scrim = document.querySelector('.scrim');
  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    scrim.hidden = !open;
  }
  menuBtn.addEventListener('click', function () { setNav(!document.body.classList.contains('nav-open')); });
  scrim.addEventListener('click', function () { setNav(false); });

  var current = document.querySelector('.sidebar [aria-current="page"]');
  var sidebarEl = document.getElementById('sidebar');
  if (current) sidebarEl.scrollTop = current.offsetTop - sidebarEl.clientHeight / 2;

  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.parentElement.querySelector('code').innerText;
      var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a, .nav-sections a'));
  document.querySelectorAll('.nav-sections a').forEach(function (a) {
    a.addEventListener('click', function () { setNav(false); });
  });
  if (navLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    navLinks.forEach(function (a) {
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      (byId[id] = byId[id] || []).push(a);
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var links = byId[e.target.id];
        if (!links) return;
        var isH2 = e.target.tagName === 'H2';
        navLinks.forEach(function (a) {
          var inSidebar = a.closest('.nav-sections');
          if (!inSidebar || isH2) a.classList.remove('active');
        });
        links.forEach(function (a) { a.classList.add('active'); });
      });
    }, { rootMargin: '-70px 0px -70% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  var viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', 'Diagram viewer');
  viewer.innerHTML =
    '<div class="viewer-bar"><span class="viewer-title"></span>' +
    '<button type="button" data-act="out" aria-label="Zoom out">−</button>' +
    '<span class="viewer-zoom">100%</span>' +
    '<button type="button" data-act="in" aria-label="Zoom in">+</button>' +
    '<button type="button" data-act="fit">Fit</button>' +
    '<button type="button" data-act="actual" class="viewer-hide-sm">100%</button>' +
    '<a class="viewer-svg viewer-hide-sm" target="_blank" rel="noopener">Open SVG</a>' +
    '<button type="button" data-act="close">Close</button></div>' +
    '<div class="viewer-stage"><img alt=""></div>';
  document.body.appendChild(viewer);
  var stage = viewer.querySelector('.viewer-stage');
  var vImg = stage.querySelector('img');
  var zoomLabel = viewer.querySelector('.viewer-zoom');
  var view = { w: 0, h: 0, scale: 1, x: 0, y: 0 };
  var opener = null;

  function apply() {
    vImg.style.width = view.w + 'px';
    vImg.style.height = view.h + 'px';
    vImg.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.scale + ')';
    zoomLabel.textContent = Math.round(view.scale * 100) + '%';
  }
  function center(scale) {
    var r = stage.getBoundingClientRect();
    view.scale = scale;
    view.x = (r.width - view.w * scale) / 2;
    view.y = (r.height - view.h * scale) / 2;
    apply();
  }
  function fit() {
    var r = stage.getBoundingClientRect();
    center(Math.min((r.width - 48) / view.w, (r.height - 48) / view.h, 3));
  }
  function zoomAt(factor, cx, cy) {
    var next = Math.max(0.1, Math.min(8, view.scale * factor));
    var k = next / view.scale;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.scale = next;
    apply();
  }
  function zoomCenter(factor) {
    var r = stage.getBoundingClientRect();
    zoomAt(factor, r.width / 2, r.height / 2);
  }
  function openViewer(img, trigger) {
    opener = trigger;
    view.w = +img.getAttribute('width') || img.naturalWidth || 1200;
    view.h = +img.getAttribute('height') || img.naturalHeight || 800;
    vImg.src = img.currentSrc || img.src;
    var fig = img.closest('figure');
    var heading = null;
    for (var el = fig; el && !heading; el = el.previousElementSibling || (el.parentElement && el.parentElement.previousElementSibling)) {
      if (/^H[2-4]$/.test(el.tagName)) heading = el;
    }
    viewer.querySelector('.viewer-title').textContent = heading ? heading.textContent : document.title;
    viewer.querySelector('.viewer-svg').href = img.src;
    viewer.hidden = false;
    document.body.classList.add('viewer-open');
    fit();
    viewer.querySelector('[data-act="close"]').focus();
  }
  function closeViewer() {
    viewer.hidden = true;
    document.body.classList.remove('viewer-open');
    if (opener) opener.focus();
  }
  viewer.querySelector('.viewer-bar').addEventListener('click', function (e) {
    var act = e.target.getAttribute('data-act');
    if (act === 'close') closeViewer();
    else if (act === 'fit') fit();
    else if (act === 'actual') center(1);
    else if (act === 'in') zoomCenter(1.25);
    else if (act === 'out') zoomCenter(0.8);
  });
  document.addEventListener('keydown', function (e) {
    if (viewer.hidden) return;
    if (e.key === 'Escape') closeViewer();
    else if (e.key === '+' || e.key === '=') zoomCenter(1.25);
    else if (e.key === '-') zoomCenter(0.8);
    else if (e.key === '0') fit();
  });
  window.addEventListener('resize', function () { if (!viewer.hidden) fit(); });
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = stage.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  var pointers = {};
  var pinch = null;
  stage.addEventListener('pointerdown', function (e) {
    stage.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', function (e) {
    var prev = pointers[e.pointerId];
    if (!prev) return;
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var a = pointers[ids[0]], b = pointers[ids[1]];
      var dist = Math.hypot(a.x - b.x, a.y - b.y);
      var r = stage.getBoundingClientRect();
      if (pinch) zoomAt(dist / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch = dist;
      return;
    }
    view.x += e.clientX - prev.x;
    view.y += e.clientY - prev.y;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    apply();
  });
  function endPointer(e) {
    delete pointers[e.pointerId];
    pinch = null;
    if (!Object.keys(pointers).length) stage.classList.remove('dragging');
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  document.querySelectorAll('figure.diagram').forEach(function (fig) {
    var img = fig.querySelector('img');
    fig.querySelectorAll('a.diagram-img, a.full').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        openViewer(img, a);
      });
    });
  });

  var input = document.getElementById('search');
  var box = document.getElementById('search-results');
  var index = (window.SEARCH_INDEX || []).map(function (e) {
    return { e: e, t: e.t.toLowerCase(), p: e.p.toLowerCase(), x: e.x.toLowerCase() };
  });
  var selected = -1;

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlight(text, terms) {
    var safe = escapeHtml(text);
    var re = new RegExp('(' + terms.map(function (t) { return escapeRe(escapeHtml(t)); }).join('|') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }
  function snippet(text, terms) {
    var lower = text.toLowerCase();
    var at = -1;
    for (var i = 0; i < terms.length && at < 0; i++) at = lower.indexOf(terms[i]);
    if (at < 0) return text.slice(0, 140);
    var start = Math.max(0, at - 50);
    return (start ? '…' : '') + text.slice(start, start + 160) + (start + 160 < text.length ? '…' : '');
  }
  function wordHit(hay, term) {
    var i = hay.indexOf(term);
    if (i < 0) return 0;
    var before = i === 0 || /[^a-z0-9]/.test(hay[i - 1]);
    var after = i + term.length >= hay.length || /[^a-z0-9]/.test(hay[i + term.length]);
    return before && after ? 2 : 1;
  }
  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var phrase = q.toLowerCase().trim();
    var out = [];
    index.forEach(function (r) {
      var score = 0;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var ht = wordHit(r.t, t), hp = wordHit(r.p, t), hx = wordHit(r.x, t);
        if (!ht && !hp && !hx) return;
        score += ht * 12 + hp * 4 + hx * 2;
      }
      if (terms.length > 1 && (r.t + ' ' + r.x).indexOf(phrase) >= 0) score += 20;
      if (r.t === phrase || r.t.indexOf(phrase + ' ') === 0) score += 30;
      out.push({ r: r, score: score });
    });
    out.sort(function (a, b) { return b.score - a.score || a.r.x.length - b.r.x.length; });
    return out.slice(0, 12).map(function (o) { return o.r.e; });
  }
  function render(results, terms) {
    selected = -1;
    if (!input.value.trim()) { box.hidden = true; return; }
    if (!results.length) {
      box.innerHTML = '<div class="sr-empty">No matches for "' + escapeHtml(input.value) + '"</div>';
    } else {
      box.innerHTML = results.map(function (e, i) {
        return '<a role="option" id="sr-' + i + '" href="' + root + e.u + '"><span class="sr-title">' + highlight(e.t, terms) +
          '</span><span class="sr-page">' + escapeHtml(e.p) + '</span><span class="sr-snip">' +
          highlight(snippet(e.x, terms), terms) + '</span></a>';
      }).join('');
    }
    box.hidden = false;
  }
  function move(delta) {
    var items = box.querySelectorAll('a');
    if (!items.length) return;
    if (selected >= 0) items[selected].removeAttribute('aria-selected');
    selected = (selected + delta + items.length) % items.length;
    items[selected].setAttribute('aria-selected', 'true');
    items[selected].scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('input', function () {
    var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    render(search(input.value), terms);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      var items = box.querySelectorAll('a');
      var target = items[selected >= 0 ? selected : 0];
      if (target) window.location.href = target.href;
    } else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
  });
  input.addEventListener('focus', function () { if (input.value.trim()) box.hidden = false; });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) box.hidden = true; });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault(); input.focus();
    }
  });
})();
