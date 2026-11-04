// @ts-strict-ignore
import type { ComponentProps } from 'react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useHotkeys } from 'react-hotkeys-hook';

import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { CellPaddingContext } from '#components/table';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLanguage } from '#hooks/useLocale';

import {
  fitCategoryColumnWidth,
  getCellPadding,
  getNumPossibleMonths,
  HEADER_FONTS,
  WIDEST_AMOUNT,
} from './budgetHeaderLayout';
import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { BudgetTable } from './BudgetTable';
import { CategoryColumnWidthContext } from './CategoryColumnWidth';
import { measureText, useFontsVersion } from './measureText';
import { clampMonth } from './MonthsContext';
import type { MonthBounds } from './MonthsContext';
import { SummaryNeedsProvider, useSummaryLayout } from './useSummaryLayout';
import { getCategoryColumnWidth, getScrollbarWidth } from './util';

import { useBudgetComponents } from '.';

/**
 * Below this column width the month heading hands its notes and menu
 * buttons to the summary beneath it, so the heading and the step button
 * never fight for the same pixels.
 */
const COMPACT_MONTH_COLUMN_WIDTH = 200;

type DynamicBudgetTableProps = {
  width: number;
  height: number;
} & AutoSizingBudgetTableProps;

const DynamicBudgetTable = ({
  type,
  width,
  height,
  prewarmStartMonth,
  startMonth,
  maxMonths = 3,
  monthBounds,
  onMonthSelect,
  onBudgetAction,
  ...props
}: DynamicBudgetTableProps) => {
  const { setDisplayMax } = useBudgetMonthCount();
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;

  const preferredCategoryWidth = getCategoryColumnWidth(categoryExpandedState);
  // The table keeps a 5px margin on each side; see BudgetTable.
  const tableChrome = 10 + getScrollbarWidth();
  // An expanded category column narrows to make room (see
  // fitCategoryColumnWidth), so it never costs a month on its own.
  // The widest amount as this budget formats it, so the columns are sized
  // from what they display rather than from a guess.
  const format = useFormat();
  useFontsVersion();
  const amountWidth = measureText(
    format(WIDEST_AMOUNT, 'financial'),
    HEADER_FONTS.tableTotal,
  );
  const numPossible = getNumPossibleMonths(width - tableChrome, amountWidth);
  const numMonths = Math.min(numPossible, maxMonths);
  const maxWidth = preferredCategoryWidth + 500 * numMonths;
  const tableWidth = Math.min(width, maxWidth) - tableChrome;
  const categoryWidth = fitCategoryColumnWidth({
    preferred: preferredCategoryWidth,
    tableWidth,
    numMonths,
    amountWidth,
  });
  const monthColumnWidth = (tableWidth - categoryWidth) / numMonths;
  const cellPadding = getCellPadding(monthColumnWidth, amountWidth);
  const compactMonthHeader = monthColumnWidth < COMPACT_MONTH_COLUMN_WIDTH;
  const language = useLanguage();
  // The envelope figure's notes sit beside it where they fit; the
  // tracking figure's ledger sits under it at every width
  const { summaryLayout, reportSummaryNeeds } = useSummaryLayout(
    monthColumnWidth,
    `${language}:${type}`,
    type === 'tracking' ? 'ledger' : 'notes',
  );

  // Every displayed column must stay inside the bounds, so the first
  // column can go no later than `numMonths - 1` months before the end.
  const latestStartMonth = monthUtils.subMonths(monthBounds.end, numMonths - 1);

  function getValidMonth(month: string) {
    return clampMonth(month, {
      start: monthBounds.start,
      end: latestStartMonth,
    });
  }

  // Keep the last column in range when the bounds change (e.g. switching
  // budget type) or more columns fit on screen.
  useEffect(() => {
    const validMonth = clampMonth(startMonth, {
      start: monthBounds.start,
      end: latestStartMonth,
    });
    if (validMonth !== startMonth) {
      onMonthSelect(validMonth, numMonths);
    }
  }, [
    monthBounds.start,
    latestStartMonth,
    numMonths,
    onMonthSelect,
    startMonth,
  ]);

  useEffect(() => {
    setDisplayMax(numPossible);
  }, [setDisplayMax, numPossible]);

  // When the window narrows and drops months off the end, bring the
  // current month back if it was on screen, as Today would show it.
  const prevNumMonths = useRef(numMonths);
  useEffect(() => {
    const prev = prevNumMonths.current;
    prevNumMonths.current = numMonths;
    if (numMonths >= prev) {
      return;
    }
    const current = monthUtils.currentMonth();
    const isShown = (count: number) =>
      current >= startMonth &&
      current <= monthUtils.addMonths(startMonth, count - 1);
    if (isShown(prev) && !isShown(numMonths)) {
      onJumpToToday();
    }
  });

  function _onMonthSelect(month) {
    onMonthSelect(getValidMonth(month), numMonths);
  }

  // The arrow keys move the months shown, unless a popup (the month grid,
  // a menu) has them: there they move within it, and the table behind it
  // must hold still
  const stepKeyOptions = {
    preventDefault: true,
    scopes: ['app'],
    ignoreEventWhen: (e: KeyboardEvent) =>
      e.target instanceof Element &&
      !!e.target.closest('[role="dialog"], [role="menu"], [role="listbox"]'),
  };
  useHotkeys(
    'left',
    () => {
      _onMonthSelect(monthUtils.prevMonth(startMonth));
    },
    stepKeyOptions,
    [_onMonthSelect, startMonth],
  );
  useHotkeys(
    'right',
    () => {
      _onMonthSelect(monthUtils.nextMonth(startMonth));
    },
    stepKeyOptions,
    [_onMonthSelect, startMonth],
  );
  // A year at a time with Shift, so a distant month is a few keys away
  useHotkeys(
    'shift+left',
    () => {
      _onMonthSelect(monthUtils.subMonths(startMonth, 12));
    },
    stepKeyOptions,
    [_onMonthSelect, startMonth],
  );
  useHotkeys(
    'shift+right',
    () => {
      _onMonthSelect(monthUtils.addMonths(startMonth, 12));
    },
    stepKeyOptions,
    [_onMonthSelect, startMonth],
  );
  // Today puts the current month in the first column, the months after
  // it beside it: the place to budget from is the month under way
  function onJumpToToday() {
    _onMonthSelect(monthUtils.currentMonth());
  }

  useHotkeys(
    '0',
    onJumpToToday,
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [_onMonthSelect, startMonth, numMonths],
  );
  useHotkeys(
    'shift+t',
    () => {
      onBudgetAction(startMonth, 'overwrite-goal-template', null);
    },
    {
      preventDefault: true,
      scopes: ['app'],
      enabled: isGoalTemplatesEnabled,
    },
    [onBudgetAction, startMonth, isGoalTemplatesEnabled],
  );

  return (
    <View
      style={{
        width,
        height,
        alignItems: 'center',
        opacity: width <= 0 || height <= 0 ? 0 : 1,
      }}
    >
      <View style={{ width: '100%', maxWidth }}>
        <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
          <CategoryColumnWidthContext.Provider value={categoryWidth}>
            <CellPaddingContext.Provider value={cellPadding}>
              <SummaryNeedsProvider value={reportSummaryNeeds}>
                <SummaryNeedsCollector monthBounds={monthBounds} />
                <BudgetTable
                  type={type}
                  prewarmStartMonth={prewarmStartMonth}
                  startMonth={startMonth}
                  numMonths={numMonths}
                  monthBounds={monthBounds}
                  onBudgetAction={onBudgetAction}
                  onJumpToToday={onJumpToToday}
                  onSelectMonth={_onMonthSelect}
                  compactMonthHeader={compactMonthHeader}
                  summaryLayout={summaryLayout}
                  {...props}
                />
              </SummaryNeedsProvider>
            </CellPaddingContext.Provider>
          </CategoryColumnWidthContext.Provider>
        </ErrorBoundary>
      </View>
    </View>
  );
};

DynamicBudgetTable.displayName = 'DynamicBudgetTable';

/**
 * Has every month in the budget report what its summary shows, so the
 * summary layout suits them all before any is stepped to.
 */
function SummaryNeedsCollector({ monthBounds }: { monthBounds: MonthBounds }) {
  const { SummaryNeedsComponent } = useBudgetComponents();
  return monthUtils
    .rangeInclusive(monthBounds.start, monthBounds.end)
    .map(month => <SummaryNeedsComponent key={month} month={month} />);
}

type AutoSizingBudgetTableProps = Omit<
  ComponentProps<typeof BudgetTable>,
  | 'numMonths'
  | 'onJumpToToday'
  | 'onSelectMonth'
  | 'compactMonthHeader'
  | 'summaryLayout'
> & {
  maxMonths: number;
  onMonthSelect: (month: string, numMonths: number) => void;
};

export const AutoSizingBudgetTable = (props: AutoSizingBudgetTableProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Measure before the first paint (AutoSizer measures after it)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) {
      return;
    }

    function measure() {
      const { width, height } = parent.getBoundingClientRect();
      setSize(prev =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    // Zero-size wrapper so the table doesn't affect the measured parent
    <div ref={ref} style={{ width: 0, height: 0, overflow: 'visible' }}>
      {size.width > 0 && size.height > 0 && (
        <DynamicBudgetTable
          width={size.width}
          height={size.height}
          {...props}
        />
      )}
    </div>
  );
};

AutoSizingBudgetTable.displayName = 'AutoSizingBudgetTable';
