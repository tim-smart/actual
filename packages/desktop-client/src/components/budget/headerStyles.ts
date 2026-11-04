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

/** The shared look of the small bordered controls in the header. */
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
    backgroundColor: theme.tableRowBackgroundHover,
    borderColor: theme.pageTextSubdued,
  },
  '&[data-pressed]': {
    backgroundColor: theme.buttonBareBackgroundHover,
    boxShadow: 'none',
  },
  ...headerFocusRing,
});

/** A borderless icon button in the header (step arrows, notes, menu). */
export const headerIconButtonClass = css({
  padding: 0,
  borderRadius: HEADER_CONTROL_RADIUS,
  color: theme.tableHeaderText,
  '&[data-hovered]': {
    color: theme.pageText,
    backgroundColor: theme.buttonBareBackgroundHover,
  },
  '&[aria-disabled="true"]': {
    color: theme.pageTextSubdued,
    backgroundColor: 'transparent',
    cursor: 'default',
  },
  ...headerFocusRing,
});
