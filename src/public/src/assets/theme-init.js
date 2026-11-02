(function () {
  try {
    var m = localStorage.getItem('ecm.theme') || 'system';
    if (m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
