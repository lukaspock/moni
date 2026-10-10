/**
 * Adds an alpha to a hex color for Skia / gradients (they take concrete
 * strings). Non-hex inputs are returned unchanged.
 */
export function withAlpha(color: string, alpha: number): string {
  'worklet';
  const a = Math.min(Math.max(alpha, 0), 1);
  const m = /^#([0-9a-f]{3,8})$/i.exec(color.trim());
  if (!m) return color;
  let h = m[1];
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6 && h.length !== 8) return color;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const baseA = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${Math.round(a * baseA * 1000) / 1000})`;
}
