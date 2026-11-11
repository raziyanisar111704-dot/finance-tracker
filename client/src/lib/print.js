// Paper is white: switch dark mode off while the page prints (via the Print
// button or Ctrl+P), then put it back. The chart colours follow, because
// they're CSS variables tied to the "dark" class.
export function setUpPrinting() {
  let wasDark = false;
  window.addEventListener('beforeprint', () => {
    wasDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.remove('dark');
  });
  window.addEventListener('afterprint', () => {
    if (wasDark) document.documentElement.classList.add('dark');
  });
}
