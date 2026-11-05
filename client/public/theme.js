// Applies the saved theme before the first paint, so dark mode never flashes
// white. A separate file (not an inline <script>) so the Content Security
// Policy can allow only this site's own scripts (see vercel.json).
try {
  var theme = localStorage.getItem('theme');
  var dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
} catch (e) {}
