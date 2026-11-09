import React, { useState } from 'react';
import type { ReactNode } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { TitlebarControls } from '#components/Titlebar';
import { useTitlebarLayout } from '#components/TitlebarLayout';
import { useResizeObserver } from '#hooks/useResizeObserver';

import { HEADER_CONTROL_GAP } from './budgetHeaderLayout';
import { useCategoryColumnWidth } from './CategoryColumnWidth';
import {
  MONTH_HEADER_PADDING_TOP,
  MONTH_HEADING_BAND,
  MONTH_HEADING_PADDING,
  MonthPicker,
} from './MonthPicker';
import type { MonthBounds } from './MonthsContext';

type BudgetPageHeaderProps = {
  startMonth: string;
  numMonths: number;
  monthBounds: MonthBounds;
  compactMonthHeader: boolean;
  /** The width of the table's scrollbar gutter, which the header leaves free. */
  scrollbarGutter: number;
  onMonthSelect: (month: string) => void;
  onJumpToToday: () => void;
  /** Under the pager, beside the summaries. */
  cornerControls: ReactNode;
  /** The summaries, under the month headings. */
  children: ReactNode;
};

/**
 * The month headings with the summaries under them. It keeps the same
 * inset as the table, scrollbar gutter included, so each month lines up
 * with its column and the header ends where the table does.
 *
 * The title bar gives up its row to this header, and the account menu
 * sits at the right end of the heading row instead: the avatar with its
 * menu chevron, a control of the header's own family, the header's own
 * inset from its corner, over the scrollbar gutter and the last
 * heading's padding. The heading keeps clear of it inside its own width,
 * so every heading stays exactly as wide as its column.
 *
 * The scrollbar gutter at the header's right end is the last column's:
 * it carries that column's tint to the header's edge, so a tinted last
 * month does not end a gutter short of the frame with a bare stripe of
 * the header's own background after it.
 */
export function BudgetPageHeader({
  startMonth,
  numMonths,
  monthBounds,
  compactMonthHeader,
  scrollbarGutter,
  onMonthSelect,
  onJumpToToday,
  cornerControls,
  children,
}: BudgetPageHeaderProps) {
  const categoryWidth = useCategoryColumnWidth();
  const { isCollapsed: hasAccountMenu } = useTitlebarLayout();
  const [accountMenuWidth, setAccountMenuWidth] = useState(0);
  const accountMenuRef = useResizeObserver<HTMLDivElement>(rect => {
    setAccountMenuWidth(rect.width);
  });
  // How far the account menu reaches into the last heading's own padding
  // and content, with a gap before it
  const lastHeadingReserve = hasAccountMenu
    ? Math.max(0, accountMenuWidth + HEADER_CONTROL_GAP - scrollbarGutter)
    : 0;
  const lastMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const gutterTint =
    lastMonth === monthUtils.currentMonth()
      ? theme.budgetCurrentMonth
      : theme.budgetOtherMonth;

  return (
    <View
      style={{
        flexShrink: 0,
        marginLeft: 5,
        marginRight: 5,
        paddingRight: scrollbarGutter,
        backgroundColor: theme.tableBackground,
        borderRadius: '6px 6px 0 0',
        borderBottom: `1px solid ${theme.tableBorder}`,
      }}
    >
      {scrollbarGutter > 0 && (
        <View
          aria-hidden
          data-testid="budget-header-gutter"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: scrollbarGutter,
            backgroundColor: gutterTint,
            borderTopRightRadius: 6,
          }}
        />
      )}
      <MonthPicker
        startMonth={startMonth}
        numDisplayed={numMonths}
        monthBounds={monthBounds}
        categoryWidth={categoryWidth}
        compact={compactMonthHeader}
        lastHeadingReserve={lastHeadingReserve}
        onSelect={onMonthSelect}
        onJumpToToday={onJumpToToday}
        cornerControls={cornerControls}
      >
        {children}
      </MonthPicker>
      {hasAccountMenu && (
        <View
          innerRef={accountMenuRef}
          style={{
            position: 'absolute',
            top: MONTH_HEADER_PADDING_TOP,
            right: MONTH_HEADING_PADDING,
            height: MONTH_HEADING_BAND,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TitlebarControls inHeader />
        </View>
      )}
    </View>
  );
}
