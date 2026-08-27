(function () {
  try {
    var html = document.documentElement;
    var t = localStorage.getItem('mp_theme');
    if (!t) t = (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    html.setAttribute('data-theme', t);
    html.setAttribute('data-theme-source', t === 'system' ? 'system' : 'manual');
    var accent = localStorage.getItem('mp_accent');
    if (accent) html.style.setProperty('--accent', accent);
  } catch (e) {}
})();
