import React, { useContext, useId, useState } from 'react';
import type { ComponentProps } from 'react';
import { VisuallyHidden } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css } from '@emotion/css';

import {
  getFigureFont,
  getSummaryWidths,
  HEADER_CONTROL_RADIUS,
  HEADER_FONTS,
  SUMMARY_ACTIONS_HEIGHT,
  SUMMARY_AMOUNT_HEIGHT,
  SUMMARY_FIGURE_HEIGHT,
  SUMMARY_GAP,
  SUMMARY_INLINE_GAP,
  SUMMARY_LABEL_GAP,
  SUMMARY_LABEL_HEIGHT,
  SUMMARY_PADDING_BOTTOM,
  SUMMARY_PADDING_TOP,
  SUMMARY_SIDE_PADDING,
  SUMMARY_WIDE_FIGURE_GAP,
  SUMMARY_WIDE_FIGURE_HEIGHT,
} from '#components/budget/budgetHeaderLayout';
import type { SummaryLayout } from '#components/budget/budgetHeaderLayout';
import { measureText } from '#components/budget/measureText';
import { formatMonthLabel } from '#components/budget/monthLabel';
import { MonthsContext } from '#components/budget/MonthsContext';
import {
  getPlanText,
  SummaryDetails,
} from '#components/budget/SummaryDetailLine';
import type {
  SummaryDetailLineProps,
  SummaryDetailPlan,
} from '#components/budget/SummaryDetailLine';
import { useTrackingSheetValue } from '#components/budget/tracking/TrackingBudgetComponents';
import { useTrackingBudget } from '#components/budget/tracking/TrackingBudgetContext';
import { useReportSummaryNeeds } from '#components/budget/useSummaryLayout';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { useLanguage } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';
import { trackingBudget } from '#spreadsheet/bindings';

import { MonthHeader } from './MonthHeader';
import { getNetSpending } from './netSpending';
import { SavedBreakdown } from './SavedBreakdown';

type BudgetSummaryProps = {
  month: string;
};
/** The month's savings figure and its income and spending against plan. */
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

/**
 * What a month's summary shows: what was (or will be) saved, and income
 * and spending against what was planned for the month.
 */
function useMonthSummary(month: string) {
  const { t } = useTranslation();
  const format = useFormat();
  const { currentMonth } = useTrackingBudget();
  const projected = month >= currentMonth;

  const budgetedSaved =
    useTrackingSheetValue(trackingBudget.totalBudgetedSaved) || 0;
  const totalSaved = useTrackingSheetValue(trackingBudget.totalSaved) || 0;
  const totalIncome = useTrackingSheetValue(trackingBudget.totalIncome) || 0;
  const budgetedIncome =
    useTrackingSheetValue(trackingBudget.totalBudgetedIncome) || 0;
  const totalSpent = useTrackingSheetValue(trackingBudget.totalSpent) || 0;
  const budgetedExpense =
    useTrackingSheetValue(trackingBudget.totalBudgetedExpense) || 0;

  const saved = projected ? budgetedSaved : totalSaved;
  const spending = getNetSpending(totalSpent, budgetedExpense);
  const hasIncomePlan = budgetedIncome !== 0;
  const hasSpendingPlan = budgetedExpense !== 0;
  // From this month on, the figure is the plan. A plan missing its income
  // or its spending has no savings to show yet, so the tile says what is
  // missing instead of showing a number that only looks like a result.
  const missingPlan: 'all' | 'income' | 'spending' | null = !projected
    ? null
    : !hasIncomePlan && !hasSpendingPlan
      ? 'all'
      : !hasIncomePlan
        ? 'income'
        : !hasSpendingPlan
          ? 'spending'
          : null;
  // Spending already past its plan, whether the month is settled or not
  const overPlan =
    spending.kind === 'spent' && hasSpendingPlan && spending.isOverPlan
      ? spending.amount - budgetedExpense
      : 0;
  // The headline is always the month's savings: what was saved once the
  // month is settled, what the plan would save until then, so every month
  // in the row answers the same question. Spending already past its plan
  // in a month still under way does not change that figure (it is a fact
  // about spending, not a savings result), but it puts the plan at risk,
  // and the figure says so the way the envelope figure says its state:
  // in its colour. The amount stays what the plan says, set in the
  // warning's amber, and the ledger's Over plan line under it, in the
  // same amber, says what is wrong and by how much.
  const label =
    missingPlan === 'all'
      ? t('Nothing planned')
      : missingPlan === 'income'
        ? t('No income plan')
        : missingPlan === 'spending'
          ? t('No spending plan')
          : projected
            ? saved < 0
              ? t('Planned deficit')
              : t('Planned savings')
            : saved < 0
              ? t('Overspent')
              : t('Saved');

  // The ledger under the figure is what has actually come in and gone
  // out, each "of" its plan: Income, then Spent, which is always the
  // total, so the ledger reads the same way in every month. Spending past
  // its plan is the ledger's exception, and gets a line of its own under
  // Spent, "Over plan 1,132.88", in its own colour: actual, plan and how
  // far over read as one block about spending, never as a savings
  // result. In a month still under way it is a warning, in amber, the
  // colour the figure takes; once the month is settled it is a result,
  // in red. A side of the plan that is missing is named by the figure's
  // label, so the line beside it shows the amount alone rather than a
  // plan of nothing; and a side with no plan and nothing in it yet has
  // no line at all, so a month with nothing planned and nothing in it
  // says just that, rather than two amounts of nothing. A plan of zero
  // keeps its line: "0.00 of 1,000.00" is a plan nothing has met yet,
  // not the absence of one.
  const plan = (amount: number): SummaryDetailPlan | undefined =>
    amount !== 0 ? { amount: format(amount, 'financial') } : undefined;
  const details: SummaryDetailLineProps[] = [];
  if (totalIncome !== 0 || hasIncomePlan) {
    details.push({
      label: t('Income'),
      amount: format(totalIncome, 'financial'),
      plan: plan(budgetedIncome),
    });
  }
  if (spending.kind === 'refunded') {
    details.push({
      label: t('Net refunds'),
      amount: format(spending.amount, 'financial'),
      // No plan beside it: refunds aren't progress towards a spending
      // plan, and setting one beside the other only invites a sum
      // that means nothing
    });
  } else if (spending.amount !== 0 || hasSpendingPlan) {
    details.push({
      label: t('Spent'),
      amount: format(spending.amount, 'financial'),
      plan: plan(budgetedExpense),
    });
  }
  if (overPlan > 0) {
    details.push({
      label: t('Over plan'),
      amount: format(overPlan, 'financial'),
      color: projected ? theme.budgetAtRiskText : theme.toBudgetNegativeText,
      isOverPlan: true,
    });
  }

  const hasFigure = !missingPlan;
  const figure = {
    figure: hasFigure ? format(saved, 'financial') : NO_FIGURE,
    figureLabel: label,
    // A plain label: the figure opens nothing
    hasChevron: false,
  };
  const content = {
    ...figure,
    details: details.map(({ plan, ...line }) => ({
      ...line,
      planned: plan && getPlanText(t, plan),
    })),
  };
  const needs = {
    widths: getSummaryWidths(measureText, content),
    detailLines: details.length,
  };
  return {
    breakdown: {
      projected,
      missingPlan,
      overPlan: projected ? overPlan : 0,
      totalIncome,
      totalSpent,
      totalSaved,
      budgetedIncome,
      budgetedExpense,
      budgetedSaved,
    },
    figure: figure.figure,
    label,
    hasFigure,
    overPlan: overPlan > 0 ? format(overPlan, 'financial') : null,
    isNegative: saved < 0,
    details,
    needs,
  };
}

/** Shown in place of a savings figure the plan can't give yet. */
const NO_FIGURE = '\u2014';

function MonthSummary({ month }: BudgetSummaryProps) {
  const { compactHeader, summaryLayout } = useContext(MonthsContext);
  const { breakdown, figure, label, hasFigure, overPlan, isNegative, details } =
    useMonthSummary(month);
  const { arrangement } = summaryLayout;
  const isBeside = arrangement !== 'stacked';

  return (
    <>
      <View
        style={{
          flexDirection: isBeside ? 'row' : 'column',
          // Beside the figure, the ledger starts level with its top
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
          <SavedSummary
            month={month}
            breakdown={breakdown}
            figure={figure}
            label={label}
            hasFigure={hasFigure}
            overPlan={overPlan}
            isNegative={isNegative}
            layout={summaryLayout}
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

type SavedSummaryProps = {
  month: string;
  breakdown: ComponentProps<typeof SavedBreakdown>;
  /** The headline amount, formatted. */
  figure: string;
  label: string;
  /** False when the plan is missing a side, so there is no figure yet. */
  hasFigure: boolean;
  /** How far spending is past its plan, formatted, for the figure's name. */
  overPlan: string | null;
  /** The figure is a deficit, so it shows in red. */
  isNegative: boolean;
  /**
   * The row's layout: whether the label sits beside the amount rather
   * than under it, and the amount's size.
   */
  layout: Pick<SummaryLayout, 'figure' | 'figureSize'>;
};

/**
 * The month's headline figure for a tracking budget: what was (or will be)
 * saved. It reports a result rather than opening anything, so it is type
 * on the month with a plain label, not a button: the same size as the
 * envelope figure, with no chip, chevron or hover state. Spending past
 * its plan does not change it: the ledger's Over plan line says by how
 * much, and the figure's name says so too; in a month still under way
 * the amount takes the overrun's amber, as the envelope's takes its
 * state's colour, so the plan reads as one at risk without its amount
 * changing. On hover or keyboard focus it explains itself with the same
 * kind of breakdown as the envelope figure: the sum behind the headline,
 * which the ledger under it does not spell out.
 */
function SavedSummary({
  month,
  breakdown,
  figure,
  label,
  hasFigure,
  overPlan,
  isNegative,
  layout,
}: SavedSummaryProps) {
  const isWide = layout.figure === 'wide';
  const { figureSize } = layout;
  const { t } = useTranslation();
  const language = useLanguage();
  const explanationId = useId();
  const [isFocused, setIsFocused] = useState(false);
  // Escape hides the explanation, however it was opened, until the tile is
  // focused or pointed at again
  const [isDismissed, setIsDismissed] = useState(false);

  // Spending past the plan in a month under way puts the plan at risk:
  // the figure says so in the ledger's warning colour
  const isAtRisk = breakdown.projected && !!overPlan;
  // The same figure as the envelope one, type on the month in its state's
  // colour, with a plain label under it rather than a chip: it reports a
  // result and opens nothing. A projection is a plan, not a result, so
  // its amount is set in the page's text colour whatever the plan says,
  // never in a settled month's green or red, unless spending has already
  // passed its plan, when the amount takes the warning's amber: the plan
  // is at risk, and the Over plan line under it says by how much; a plan
  // to spend more than the planned income shows its deficit in red.
  // Settled months take their result's colour.
  const color = breakdown.projected
    ? isNegative && hasFigure
      ? theme.toBudgetNegativeText
      : isAtRisk
        ? theme.budgetAtRiskText
        : theme.pageText
    : isNegative
      ? theme.toBudgetNegativeText
      : theme.toBudgetPositive;
  const formatted = figure;
  const name = [
    hasFigure
      ? t('{{month}}: {{amount}} {{label}}', {
          month: formatMonthLabel(month, language, 'long', true),
          amount: formatted,
          label,
        })
      : t('{{month}}: {{label}}', {
          month: formatMonthLabel(month, language, 'long', true),
          label,
        }),
    overPlan &&
      (breakdown.projected
        ? t('Spending is {{amount}} over plan', { amount: overPlan })
        : t('Spending was {{amount}} over plan', { amount: overPlan })),
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Tooltip
      content={<SavedBreakdown {...breakdown} />}
      placement="bottom start"
      offset={6}
      triggerProps={{
        delay: 500,
        // Keyboard focus shows the explanation too; pointer hover is
        // handled by the tooltip itself
        ...(isDismissed ? { isOpen: false } : isFocused && { isOpen: true }),
      }}
    >
      <View
        role="group"
        tabIndex={0}
        data-testid="summary-figure"
        aria-label={name}
        aria-describedby={explanationId}
        onFocus={() => {
          setIsFocused(true);
          setIsDismissed(false);
        }}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => setIsDismissed(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setIsDismissed(true);
          }
        }}
        className={css({
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          gap: isWide ? 0 : SUMMARY_LABEL_GAP,
          height: isWide ? SUMMARY_WIDE_FIGURE_HEIGHT : SUMMARY_FIGURE_HEIGHT,
          flexShrink: 0,
          minWidth: 0,
          maxWidth: '100%',
          borderRadius: HEADER_CONTROL_RADIUS,
          color,
          outline: 'none',
          '&:focus-visible': {
            outline: `2px solid ${theme.budgetFocusRing}`,
            outlineOffset: 4,
          },
        })}
      >
        {/* The amount's line: the amount alone, or with its label beside
            it when the figure is wide */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: SUMMARY_WIDE_FIGURE_GAP,
            minWidth: 0,
            maxWidth: '100%',
            height: SUMMARY_AMOUNT_HEIGHT,
          }}
        >
          {hasFigure ? (
            <FinancialText
              data-summary-figure="amount"
              data-summary-at-risk={isAtRisk || undefined}
              style={{
                ...getFigureFont(figureSize),
                lineHeight: `${SUMMARY_AMOUNT_HEIGHT}px`,
                whiteSpace: 'nowrap',
              }}
            >
              <PrivacyFilter>{formatted}</PrivacyFilter>
            </FinancialText>
          ) : (
            <Text
              aria-hidden
              data-summary-figure="amount"
              style={{
                ...getFigureFont(figureSize),
                lineHeight: `${SUMMARY_AMOUNT_HEIGHT}px`,
                color: theme.tableHeaderText,
              }}
            >
              {NO_FIGURE}
            </Text>
          )}
          {isWide && <FigureLabel label={label} />}
        </View>
        {/* Under the amount: the label, on the row the envelope's chip has */}
        {!isWide && (
          <View
            data-summary-label-row
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minWidth: 0,
              maxWidth: '100%',
              height: SUMMARY_LABEL_HEIGHT,
            }}
          >
            <FigureLabel label={label} />
          </View>
        )}
        <VisuallyHidden id={explanationId}>
          <SavedBreakdown {...breakdown} />
        </VisuallyHidden>
      </View>
    </Tooltip>
  );
}

/** The figure's plain label, "Planned savings": quiet text, no chip. */
function FigureLabel({ label }: { label: string }) {
  return (
    <Text
      data-summary-figure="label"
      style={{
        ...HEADER_FONTS.figureLabel,
        minWidth: 0,
        lineHeight: `${SUMMARY_LABEL_HEIGHT}px`,
        color: theme.tableHeaderText,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </Text>
  );
}
