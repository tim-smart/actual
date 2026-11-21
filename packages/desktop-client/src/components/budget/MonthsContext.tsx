// @ts-strict-ignore
import React, { createContext } from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';

import type { SummaryLayout } from './budgetHeaderLayout';

export type MonthBounds = {
  start: string;
  end: string;
};

export function getValidMonthBounds(
  bounds: MonthBounds,
  startMonth: undefined | string,
  endMonth: string,
) {
  return {
    start: startMonth < bounds.start ? bounds.start : startMonth,
    end: endMonth > bounds.end ? bounds.end : endMonth,
  };
}

export function clampMonth(month: string, bounds: MonthBounds) {
  if (month < bounds.start) {
    return bounds.start;
  }
  if (month > bounds.end) {
    return bounds.end;
  }
  return month;
}

type MonthsContextProps = {
  months: string[];
  type: string;
  /** The month headings are too tight for their notes and menu buttons. */
  compactHeader: boolean;
  /** Whether the summaries put their details beside or under the figure. */
  summaryLayout: SummaryLayout;
};

export const MonthsContext = createContext<MonthsContextProps>(null);

type MonthsProviderProps = {
  startMonth: string | undefined;
  numMonths: number;
  monthBounds: MonthBounds;
  type: string;
  compactHeader?: boolean;
  summaryLayout?: SummaryLayout;
  children: ReactNode;
};

export function MonthsProvider({
  startMonth,
  numMonths,
  monthBounds,
  type,
  compactHeader = false,
  summaryLayout = {
    arrangement: 'inline',
    figure: 'tall',
    figureSize: 24,
    figureWidth: 0,
    detailLines: 0,
    detailColumns: [0, 0],
    columnWidth: Infinity,
  },
  children,
}: MonthsProviderProps) {
  const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const bounds = getValidMonthBounds(monthBounds, startMonth, endMonth);
  const months = monthUtils.rangeInclusive(bounds.start, bounds.end);

  return (
    <MonthsContext.Provider
      value={{ months, type, compactHeader, summaryLayout }}
    >
      {children}
    </MonthsContext.Provider>
  );
}
