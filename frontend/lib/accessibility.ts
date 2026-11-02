/**
 * Accessibility audit and compliance helpers (Week 60)
 * WCAG 2.2 AA compliance for Re-Hardwire frontend.
 */

/** Check contrast ratio between two hex colors. */
export function contrastRatio(hex1: string, hex2: string): number {
  const parseHex = (h: string) => {
    const clean = h.replace('#', '');
    const int = parseInt(clean, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    const luminance = [r, g, b].map((c) => {
      const cNorm = c / 255;
      return cNorm <= 0.03928 ? cNorm / 12.92 : Math.pow((cNorm + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * luminance[0] + 0.7152 * luminance[1] + 0.0722 * luminance[2];
  };
  const L1 = parseHex(hex1);
  const L2 = parseHex(hex2);
  const light = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (light + 0.05) / (dark + 0.05);
}

/** Check if a contrast ratio meets WCAG AA criteria. */
export function meetsWcagAA(ratio: number, isLargeText: boolean = false): boolean {
  const aaNormal = 4.5;
  const aaLarge = 3.0;
  return isLargeText ? ratio >= aaLarge : ratio >= aaNormal;
}

/** Generate an accessibility notice for a given element and role. */
export function accessibilityNotice(element: string, role: string, props: Record<string, unknown>): string {
  const checks: string[] = [];
  if (element === 'img' && !props.alt) checks.push('Missing alt text');
  if (['button', 'link', 'menuitem'].includes(role) && !props['aria-label'] && !props.title) checks.push('Missing aria-label or title');
  if (element === 'skip-nav' && !props.href) checks.push('Skip navigation link missing href');
  return checks.length > 0 ? `Accessibility concern: ${checks.join(', ')}` : 'OK';
}

