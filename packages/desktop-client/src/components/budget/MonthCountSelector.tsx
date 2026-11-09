import React, { useRef, useState } from 'react';
import { Menu, MenuItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { SvgCheck } from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { MAX_MONTHS, SUMMARY_FIGURE_CHEVRON } from './budgetHeaderLayout';
import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { headerChevronClass, headerControlClass } from './headerStyles';

type MonthCountSelectorProps = {
  maxMonths: number;
  onChange: (value: number) => void;
};

/**
 * How many months are shown side by side: a button that says so in words,
 * "3 months", and opens a list of the counts to choose from. It is one of
 * the header's framed controls, the family the pager and the jump button
 * belong to (the same frame, depth, height and type, with the menu
 * chevron the jump button carries), so it reads as a way of setting the
 * view, not as the state of a month: the chips under the figures are the
 * budget's, and this is the window's. It sits under the pager, on the
 * row of the months' figures, only as wide as its words, so the corner
 * is one block of controls: the pager over the count, the jump button
 * beside the pager. Counts the window has no room for are listed but
 * unavailable, with the reason under them, so it is clear where the
 * larger counts went.
 */
export function MonthCountSelector({
  maxMonths,
  onChange,
}: MonthCountSelectorProps) {
  const { t } = useTranslation();
  const { displayMax } = useBudgetMonthCount();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedCount = Math.min(maxMonths, displayMax);
  const countLabel = (count: number) =>
    count === 1 ? t('1 month') : t('{{count}} months', { count });
  const counts = Array.from({ length: MAX_MONTHS }, (_, i) => i + 1);
  const hasUnavailable = displayMax < MAX_MONTHS;

  return (
    <>
      {/* Only as wide as its words, through the tooltip's own wrapper;
          its frame is the amounts' line beside it, so its words sit
          level with them */}
      <View
        className={css({
          flexDirection: 'row',
          alignItems: 'flex-start',
          '& > *': { minWidth: 0, maxWidth: '100%' },
        })}
      >
        <Tooltip
          content={t('Choose how many months are shown side by side')}
          placement="bottom start"
          triggerProps={{ isDisabled: isOpen }}
        >
          <Button
            ref={triggerRef}
            variant="bare"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label={t('{{count}} months shown side by side', {
              count: selectedCount,
            })}
            onPress={() => setIsOpen(true)}
            className={countClass}
          >
            {countLabel(selectedCount)}
            <SvgCheveronDown
              aria-hidden
              className={headerChevronClass}
              style={{
                width: SUMMARY_FIGURE_CHEVRON,
                height: SUMMARY_FIGURE_CHEVRON,
              }}
            />
          </Button>
        </Tooltip>
      </View>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        offset={4}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        // As wide as the count items need and no wider: the note under
        // them wraps to two lines rather than stretching the menu
        style={{ width: 184 }}
      >
        <Menu
          aria-label={t('Months shown side by side')}
          selectionMode="single"
          selectedKeys={[String(selectedCount)]}
          disabledKeys={counts.filter(count => count > displayMax).map(String)}
          autoFocus="first"
          onSelectionChange={keys => {
            const [key] = [...keys];
            if (key !== undefined) {
              onChange(Number(key));
            }
            setIsOpen(false);
          }}
          className={css({ outline: 'none', padding: '3px 0' })}
        >
          {counts.map(count => (
            <MenuItem
              key={count}
              id={String(count)}
              textValue={countLabel(count)}
              className={menuItemClass}
            >
              {({ isSelected }) => (
                <>
                  <Text>{countLabel(count)}</Text>
                  <View style={{ flex: 1 }} />
                  {isSelected && (
                    <SvgCheck
                      aria-hidden
                      style={{ width: 11, height: 11, flexShrink: 0 }}
                    />
                  )}
                </>
              )}
            </MenuItem>
          ))}
        </Menu>
        {hasUnavailable && (
          <Text
            style={{
              display: 'block',
              padding: '6px 12px 8px',
              borderTop: `1px solid ${theme.menuBorder}`,
              fontSize: 12,
              lineHeight: '16px',
              whiteSpace: 'normal',
              color: theme.pageTextLight,
            }}
          >
            <Trans>Widen the window to show more months side by side.</Trans>
          </Text>
        )}
      </Popover>
    </>
  );
}

// The header's framed control, as the jump button beside the pager has
// it, with the same chevron after its words and a little less padding
// before the chevron than before the words
const countClass = cx(
  headerControlClass,
  css({ gap: 4, padding: '0 6px 0 10px', flexShrink: 0 }),
);

// The same look as the app's menus: hover and keyboard focus share the
// highlight, only keyboard focus gets the ring
const menuItemClass = css({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px 8px 14px',
  cursor: 'default',
  outline: 'none',
  userSelect: 'none',
  color: theme.menuItemText,
  ...styles.smallText,
  '&[data-selected]': { fontWeight: 600 },
  '&[data-hovered], &[data-focus-visible]': {
    backgroundColor: theme.menuItemBackgroundHover,
    color: theme.menuItemTextHover,
  },
  '&[data-focus-visible]': {
    boxShadow: `inset 0 0 0 2px ${theme.menuItemFocusRing}`,
  },
  '&[data-disabled]': {
    color: theme.buttonBareDisabledText,
    backgroundColor: 'transparent',
  },
});
