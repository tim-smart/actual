import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TFunction } from 'i18next';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';

import {
  getDetailsHeight,
  HEADER_FONTS,
  OWN_DETAIL_COLUMNS,
  SUMMARY_DETAIL_GAP,
  SUMMARY_DETAIL_LINE_HEIGHT,
  SUMMARY_DETAIL_PLAN_GAP,
  SUMMARY_DETAIL_ROW_GAP,
  SUMMARY_FIGURE_HEIGHT,
} from './budgetHeaderLayout';
import type { SummaryDetail, SummaryLayout } from './budgetHeaderLayout';

/** The plan shown after an amount: "of 1,200.00". */
export type SummaryDetailPlan = { amount: string };

export type SummaryDetailLineProps = Omit<SummaryDetail, 'planned'> & {
  /** Colour for the whole line; secondary text by default. */
  color?: string;
  plan?: SummaryDetailPlan;
  /** Marks the line as the month's overrun, for the checks. */
  isOverPlan?: boolean;
};

/** The plan's text as displayed, for measuring. */
export function getPlanText(t: TFunction, plan: SummaryDetailPlan) {
  return t('of <planned />').replace(/<planned\s*\/>/, plan.amount);
}

/**
 * The notes beside or under a month's figure: a small table of two
 * columns, the labels in one and the values in the next, each value an
 * amount with its plan after it ("of 1,200.00") where the line has one.
 * The values start together, one gap after the widest label, and run on
 * from there, so a label meets its value after that one gap whatever
 * the line: a long label beside a short amount is no further from it
 * than any other, and a line reads as one phrase, "For next month
 * 200.00", "Spent 1,634.21 of 450.00". The lines run from the top of the
 * block at one pitch, so the block reads as one list however many lines
 * this month has, and it keeps `layout.detailLines` of room, the
 * budget's most, so the row's height never depends on the month on
 * screen. Beside the figure the block starts level with the amount's
 * top, after the figure's column and a gap of air: the figure's column
 * ends, and its notes begin, at one place in every month.
 */
export function SummaryDetails({
  lines,
  layout,
}: {
  lines: SummaryDetailLineProps[];
  layout: Pick<SummaryLayout, 'arrangement' | 'detailLines' | 'detailColumns'>;
}) {
  const isStacked = layout.arrangement === 'stacked';
  const reservedLines = layout.detailLines;
  if (reservedLines === 0) {
    return null;
  }
  // The table's columns are the budget's, each at least as wide as the
  // widest it holds in any month, so the values start at the same place
  // in every month; where that table would not fit, each month's
  // columns are its own (both 0). A month with one line has no column
  // to keep: its value sits one gap after its own label, so the line
  // reads as one phrase rather than a label and a figure held apart by
  // the room another month's label needs.
  const [labels, values] =
    lines.length > 1 ? layout.detailColumns : OWN_DETAIL_COLUMNS;
  const height = getDetailsHeight(reservedLines);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        maxWidth: '100%',
        height: isStacked ? height : Math.max(height, SUMMARY_FIGURE_HEIGHT),
      }}
    >
      <View
        style={{
          display: 'grid',
          minWidth: 0,
          // The label gives way first; the values never do
          gridTemplateColumns: `minmax(min(${labels}px, 100%), auto) minmax(${values}px, auto)`,
          gridTemplateRows: `repeat(${reservedLines}, ${SUMMARY_DETAIL_LINE_HEIGHT}px)`,
          alignContent: 'start',
          justifyContent: 'start',
          alignItems: 'center',
          columnGap: SUMMARY_DETAIL_GAP,
          rowGap: SUMMARY_DETAIL_ROW_GAP,
          ...HEADER_FONTS.detail,
          lineHeight: `${SUMMARY_DETAIL_LINE_HEIGHT}px`,
          whiteSpace: 'nowrap',
        }}
      >
        {lines.map(line => (
          <DetailLine key={line.label} {...line} />
        ))}
      </View>
    </View>
  );
}

/**
 * One row of the details table: a label that truncates only if it must,
 * then its value, the amount with its plan after it where there is one.
 * A line in a colour of its own, last month's overspending or spending
 * over plan, is the exception in the table: the colour alone says so,
 * the same colour the figure over it takes when the line puts it in
 * question.
 */
function DetailLine({
  label,
  amount,
  color,
  plan,
  isOverPlan,
}: SummaryDetailLineProps) {
  return (
    // The row is a box only for assistive tech and the checks; its cells
    // sit in the table's own columns
    <View
      data-summary-row={label}
      data-summary-detail={isOverPlan ? 'over-plan' : undefined}
      style={{ display: 'contents' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
          height: SUMMARY_DETAIL_LINE_HEIGHT,
          color: color ?? theme.tableHeaderText,
          fontWeight: color ? 500 : undefined,
        }}
      >
        <Text
          title={label}
          style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {label}
        </Text>
      </View>
      <View
        data-summary-value
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: SUMMARY_DETAIL_PLAN_GAP,
          height: SUMMARY_DETAIL_LINE_HEIGHT,
        }}
      >
        <FinancialText
          data-summary-amount
          style={{
            ...HEADER_FONTS.detailAmount,
            color: color ?? theme.pageText,
          }}
        >
          <PrivacyFilter>{amount}</PrivacyFilter>
        </FinancialText>
        {plan && (
          <Text style={{ color: color ?? theme.tableHeaderText }}>
            <Trans
              i18nKey="of <planned />"
              components={{
                // The plan is a figure in its own right, not placeholder
                // text
                planned: (
                  <FinancialText
                    data-summary-plan
                    style={{ color: color ?? theme.pageText }}
                  >
                    <PrivacyFilter>{plan.amount}</PrivacyFilter>
                  </FinancialText>
                ),
              }}
            />
          </Text>
        )}
      </View>
    </View>
  );
}
