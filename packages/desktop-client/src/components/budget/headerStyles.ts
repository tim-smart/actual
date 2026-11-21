import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import {
  HEADER_CONTROL_HEIGHT,
  HEADER_CONTROL_RADIUS,
  HEADER_FONTS,
} from './budgetHeaderLayout';

/** The keyboard focus ring for every control in the budget header. */
export const headerFocusRing = {
  '&[data-focus-visible]': {
    outline: `2px solid ${theme.budgetFocusRing}`,
    outlineOffset: 1,
  },
};

/**
 * The ink laid over a control to show the pointer on it: a translucent
 * wash of the page's text colour, so it tints a white control, a tinted
 * column and a dark theme's control alike, and always in the same
 * direction as the text. A pointer resting on a control lays a little;
 * pressing lays twice as much.
 */
function inkWash(amount: number, base = 'transparent') {
  return `color-mix(in srgb, ${theme.pageText} ${amount}%, ${base})`;
}
export const HEADER_HOVER_WASH = inkWash(6);
export const HEADER_PRESSED_WASH = inkWash(12);
/** The washes laid on a framed control's own background, as one colour. */
export const HEADER_CONTROL_HOVER_BACKGROUND = inkWash(
  6,
  theme.tableBackground,
);
const HEADER_CONTROL_PRESSED_BACKGROUND = inkWash(12, theme.tableBackground);

/**
 * The chevron after a framed control's words, which says it opens a menu:
 * in the header's secondary colour until the control is pointed at.
 */
export const headerChevronClass = css({
  flexShrink: 0,
  color: theme.tableHeaderText,
});

/**
 * The shared look of the small bordered controls in the header. Pointed
 * at, a control fills a shade and its text and icon darken to the page's
 * ink; its frame and shadow hold, so the hover reads as a lit surface,
 * not an outline. Pressed, it fills deeper and loses its shadow, so it
 * sits down under the pointer.
 */
export const headerControlClass = css({
  height: HEADER_CONTROL_HEIGHT,
  padding: '0 10px',
  borderRadius: HEADER_CONTROL_RADIUS,
  ...HEADER_FONTS.control,
  color: theme.pageText,
  backgroundColor: theme.tableBackground,
  border: `1px solid ${theme.tableBorder}`,
  boxShadow: `0 1px 2px ${theme.budgetSummaryShadow}`,
  '&[data-hovered]': {
    backgroundColor: HEADER_CONTROL_HOVER_BACKGROUND,
    // The menu chevron joins the words
    [`& .${headerChevronClass}`]: { color: theme.pageText },
  },
  '&[data-pressed]': {
    backgroundColor: HEADER_CONTROL_PRESSED_BACKGROUND,
    boxShadow: 'none',
  },
  ...headerFocusRing,
});

/**
 * A borderless icon button in the header (step arrows, notes, menu):
 * the same wash as the framed controls, laid straight on whatever it
 * sits over.
 */
export const headerIconButtonClass = css({
  padding: 0,
  borderRadius: HEADER_CONTROL_RADIUS,
  color: theme.tableHeaderText,
  '&[data-hovered]': {
    color: theme.pageText,
    backgroundColor: HEADER_HOVER_WASH,
  },
  '&[data-pressed]': {
    color: theme.pageText,
    backgroundColor: HEADER_PRESSED_WASH,
  },
  '&[aria-disabled="true"]': {
    color: theme.pageTextSubdued,
    backgroundColor: 'transparent',
    cursor: 'default',
  },
  ...headerFocusRing,
});
