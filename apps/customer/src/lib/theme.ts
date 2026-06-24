/**
 * Dynamic HSL theme generator.
 * Takes a brand hex color and generates a full 50–950 shade scale
 * as CSS custom properties on the document root.
 */
export function applyDynamicTheme(hex: string): void {
  let r = parseInt(hex.slice(1, 3), 16) || 249;
  let g = parseInt(hex.slice(3, 5), 16) || 115;
  let b = parseInt(hex.slice(5, 7), 16) || 22;

  // Convert RGB to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  const H = Math.round(h * 360);
  const S = Math.round(s * 100);
  const L = Math.round(l * 100);

  const root = document.documentElement;
  root.style.setProperty('--brand-50', `hsl(${H}, ${S}%, 97%)`);
  root.style.setProperty('--brand-100', `hsl(${H}, ${S}%, 93%)`);
  root.style.setProperty('--brand-200', `hsl(${H}, ${S}%, 84%)`);
  root.style.setProperty('--brand-300', `hsl(${H}, ${S}%, 73%)`);
  root.style.setProperty('--brand-400', `hsl(${H}, ${S}%, 61%)`);
  root.style.setProperty('--brand-500', `hsl(${H}, ${S}%, ${L}%)`);
  root.style.setProperty(
    '--brand-600',
    `hsl(${H}, ${S}%, ${Math.max(5, L - 8)}%)`
  );
  root.style.setProperty(
    '--brand-700',
    `hsl(${H}, ${S}%, ${Math.max(5, L - 16)}%)`
  );
  root.style.setProperty(
    '--brand-800',
    `hsl(${H}, ${S}%, ${Math.max(5, L - 24)}%)`
  );
  root.style.setProperty(
    '--brand-900',
    `hsl(${H}, ${S}%, ${Math.max(5, L - 32)}%)`
  );
  root.style.setProperty(
    '--brand-950',
    `hsl(${H}, ${S}%, ${Math.max(2, L - 40)}%)`
  );
}
