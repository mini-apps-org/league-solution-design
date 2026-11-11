try {
  if (localStorage.getItem('mvip-theme') === 'dark') document.documentElement.dataset.theme = 'dark';
  var savedWidth = parseInt(localStorage.getItem('mvip-sidebar-w'), 10);
  if (savedWidth >= 200 && savedWidth <= 520) document.documentElement.style.setProperty('--sidebar-w', savedWidth + 'px');
} catch (e) {}
