import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import {
  getSummaryWidths,
  SUMMARY_ACTIONS_HEIGHT,
  SUMMARY_GAP,
  SUMMARY_INLINE_GAP,
  SUMMARY_PADDING_BOTTOM,
  SUMMARY_PADDING_TOP,
  SUMMARY_SIDE_PADDING,
} from '#components/budget/budgetHeaderLayout';
import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { useEnvelopeBudget } from '#components/budget/envelope/EnvelopeBudgetContext';
import { measureText } from '#components/budget/measureText';
import { MonthsContext } from '#components/budget/MonthsContext';
import { SummaryDetails } from '#components/budget/SummaryDetailLine';
import type { SummaryDetailLineProps } from '#components/budget/SummaryDetailLine';
import { useReportSummaryNeeds } from '#components/budget/useSummaryLayout';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';
import { envelopeBudget } from '#spreadsheet/bindings';

import { getToBudgetLabel } from './getToBudgetLabel';
import { MonthHeader } from './MonthHeader';
import { ToBudget } from './ToBudget';

type BudgetSummaryProps = {
  month: string;
};

/** The month's "to budget" figure and the amounts that explain it. */
export function BudgetSummary({ month }: BudgetSummaryProps) {
  return (
    <View
      data-testid="budget-summary"
      data-month={month}
      style={{
        flex: 1,
        minWidth: 0,
        padding: `${SUMMARY_PADDING_TOP}px ${SUMMARY_SIDE_PADDING}px ${SUMMARY_PADDING_BOTTOM}px`,
        cursor: 'default',
      }}
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <MonthSummary month={month} />
      </SheetNameProvider>
    </View>
  );
}

BudgetSummary.displayName = 'EnvelopeBudgetSummary';

/**
 * What a month's summary shows: the "to budget" figure and the amounts
 * that change its meaning, last month's overspending and money held for
 * next month.
 */
function useMonthSummary(month: string) {
  const { t } = useTranslation();
  const locale = useLocale();
  const format = useFormat();

  const toBudget = Number(useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0);
  const overspent = Number(
    useEnvelopeSheetValue(envelopeBudget.lastMonthOverspent) ?? 0,
  );
  const held = Number(useEnvelopeSheetValue(envelopeBudget.forNextMonth) ?? 0);

  const prevMonthName = monthUtils.format(
    monthUtils.prevMonth(month),
    'LLL',
    locale,
  );

  // The notes about the figure, in the order they explain it: last
  // month's overspending, which the amount already allows for, then the
  // money held for next month, which the chip's menu sets
  const details: SummaryDetailLineProps[] = [];
  if (overspent !== 0) {
    details.push({
      label: t('Overspent in {{prevMonthName}}', { prevMonthName }),
      amount: format(-Math.abs(overspent), 'financial'),
      color: theme.toBudgetNegativeText,
    });
  }
  if (held !== 0) {
    details.push({
      label: t('For next month'),
      amount: format(held, 'financial'),
    });
  }

  const figure = {
    figure: format(toBudget, 'financial'),
    figureLabel: getToBudgetLabel(toBudget, t),
    hasChevron: true,
  };
  const needs = {
    widths: getSummaryWidths(measureText, { ...figure, details }),
    detailLines: details.length,
  };
  return { toBudget, prevMonthName, details, needs };
}

function MonthSummary({ month }: BudgetSummaryProps) {
  const { onBudgetAction } = useEnvelopeBudget();
  const { compactHeader, summaryLayout } = useContext(MonthsContext);
  const { toBudget, prevMonthName, details } = useMonthSummary(month);
  const { arrangement } = summaryLayout;
  const isBeside = arrangement !== 'stacked';

  return (
    <>
      <View
        style={{
          flexDirection: isBeside ? 'row' : 'column',
          // Beside the figure, the details start level with its top
          alignItems: 'flex-start',
          gap: isBeside ? SUMMARY_INLINE_GAP : SUMMARY_GAP,
        }}
      >
        {/* Beside the details, the figure keeps the budget's widest
            figure's column, so the details start at one place in every
            month */}
        <View
          data-summary-figure-column
          style={{
            flexShrink: 0,
            maxWidth: '100%',
            minWidth: isBeside ? summaryLayout.figureWidth : 0,
          }}
        >
          <ToBudget
            month={month}
            amount={toBudget}
            isWide={summaryLayout.figure === 'wide'}
            figureSize={summaryLayout.figureSize}
            prevMonthName={prevMonthName}
            onBudgetAction={onBudgetAction}
          />
        </View>
        <SummaryDetails lines={details} layout={summaryLayout} />
      </View>
      {compactHeader && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: SUMMARY_ACTIONS_HEIGHT,
            marginTop: SUMMARY_GAP,
            marginLeft: -4,
          }}
        >
          <MonthHeader month={month} />
        </View>
      )}
    </>
  );
}

/**
 * Renders nothing; tells the budget table what this month's summary would
 * show, so one layout can suit every month in the budget.
 */
export function SummaryNeeds({ month }: BudgetSummaryProps) {
  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
      <ReportNeeds month={month} />
    </SheetNameProvider>
  );
}

function ReportNeeds({ month }: BudgetSummaryProps) {
  useReportSummaryNeeds(month, useMonthSummary(month).needs);
  return null;
}
