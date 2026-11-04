import { useSyncExternalStore } from 'react';

import type { HeaderFont } from './budgetHeaderLayout';

let probe: HTMLSpanElement | undefined;
const cache = new Map<string, number>();

// The web font is fetched the first time something is set in it, which
// may be the probe itself, so text can be measured in the fallback font
// with nothing yet marked as loading. Each time a batch of fonts finishes
// loading, the widths measured so far are dropped and whatever laid itself
// out from them is told to measure again.
let fontsVersion = 0;
const fontsListeners = new Set<() => void>();
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.addEventListener('loadingdone', () => {
    cache.clear();
    fontsVersion += 1;
    fontsListeners.forEach(listener => listener());
  });
}

/**
 * A number that changes whenever fonts finish loading. A component that
 * lays itself out from `measureText` reads it, so it renders, and
 * measures, again once the real font is in.
 */
export function useFontsVersion() {
  return useSyncExternalStore(
    listener => {
      fontsListeners.add(listener);
      return () => {
        fontsListeners.delete(listener);
      };
    },
    () => fontsVersion,
    () => 0,
  );
}

/**
 * The rendered width of `text` at one of `HEADER_FONTS`. It is measured in
 * the page itself rather than on a canvas, so OpenType features such as the
 * tabular numerals used for amounts are applied exactly as they render.
 */
export function measureText(text: string, font: HeaderFont) {
  const key = `${font.fontWeight}/${font.fontSize}/${font.letterSpacing ?? 0}/${font.fontFeatureSettings ?? ''}/${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  if (!probe) {
    probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    Object.assign(probe.style, {
      position: 'absolute',
      top: '0',
      left: '-10000px',
      visibility: 'hidden',
      whiteSpace: 'pre',
      pointerEvents: 'none',
    });
    document.body.appendChild(probe);
  }
  Object.assign(probe.style, {
    fontSize: `${font.fontSize}px`,
    fontWeight: String(font.fontWeight),
    letterSpacing: `${font.letterSpacing ?? 0}px`,
    fontFeatureSettings: font.fontFeatureSettings ?? 'normal',
  });
  probe.textContent = text;
  const width = Math.ceil(probe.getBoundingClientRect().width);

  // Until the web font has loaded the fallback font is measured; don't
  // keep those widths.
  if (document.fonts?.status !== 'loading') {
    cache.set(key, width);
  }
  return width;
}
