import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

type BreakdownRow = {
  amount: number;
  label: string;
  /** Show a + or - sign: the row adds to or takes from the result. */
  isSigned?: boolean;
  /** The sum the rows above it make, set off by a rule. */
  isResult?: boolean;
  /** Starts a new group, a little apart from the rows above. */
  isGroupStart?: boolean;
  color?: string;
};

type SavedBreakdownProps = {
  /** The month is the current one or later: show the plan, not results. */
  projected: boolean;
  /** The side of the plan that is still missing, if any. */
  missingPlan: 'all' | 'income' | 'spending' | null;
  /** How far actual spending is already past its plan. */
  overPlan: number;
  totalIncome: number;
  /** As the sheet stores it: negative for spending, positive for refunds. */
  totalSpent: number;
  totalSaved: number;
  budgetedIncome: number;
  budgetedExpense: number;
  budgetedSaved: number;
};

/**
 * How a tracking month's figure is made, as a sum laid out like the
 * envelope budget's breakdown: amounts in one column, each followed by its
 * label, the result under a rule. A settled month adds up what came in and
 * went out, then compares it with the plan. A projected month adds up the
 * plan itself, and says so when part of the plan is missing, since there
 * is then no savings figure yet. Spending already past its plan follows
 * the plan as its own sum, the one behind the Spent line's overrun.
 */
export function SavedBreakdown({
  projected,
  missingPlan,
  overPlan,
  totalIncome,
  totalSpent,
  totalSaved,
  budgetedIncome,
  budgetedExpense,
  budgetedSaved,
}: SavedBreakdownProps) {
  const { t } = useTranslation();
  const format = useFormat();

  // A projected month adds up its plan. Spending already past that plan
  // follows as its own sum, since the headline keeps the plan's figure
  // and the Spent line under it carries the overrun.
  const overPlanRows: BreakdownRow[] =
    projected && overPlan > 0
      ? [
          // Unsigned: the amount the sum starts from
          { amount: -totalSpent, label: t('Spent'), isGroupStart: true },
          {
            amount: -budgetedExpense,
            label: t('Planned spending'),
            isSigned: true,
          },
          {
            amount: overPlan,
            label: t('Over spending plan'),
            isResult: true,
            color: theme.toBudgetNegativeText,
          },
        ]
      : [];
  const rows: BreakdownRow[] = projected
    ? [
        {
          amount: budgetedIncome,
          label: t('Planned income'),
          isSigned: true,
        },
        {
          amount: -budgetedExpense,
          label: t('Planned spending'),
          isSigned: true,
        },
        // With part of the plan missing there is nothing to sum yet
        ...(missingPlan
          ? []
          : [
              {
                amount: budgetedSaved,
                label:
                  budgetedSaved < 0
                    ? t('Planned deficit')
                    : t('Planned savings'),
                isResult: true,
                color:
                  budgetedSaved < 0 ? theme.toBudgetNegativeText : undefined,
              },
            ]),
        ...overPlanRows,
      ]
    : [
        { amount: totalIncome, label: t('Income'), isSigned: true },
        {
          amount: totalSpent,
          label: totalSpent > 0 ? t('Net refunds') : t('Spent'),
          isSigned: true,
        },
        {
          amount: totalSaved,
          label: totalSaved < 0 ? t('Overspent') : t('Saved'),
          isResult: true,
          color: totalSaved < 0 ? theme.toBudgetNegativeText : undefined,
        },
        // Then the plan it is measured against, side by side with the
        // result, and how far the result is from it: the ledger under
        // the figure says each actual of its plan, the breakdown adds
        // the plan's own sum and the difference
        {
          amount: budgetedIncome,
          label: t('Planned income'),
          isSigned: true,
          isGroupStart: true,
        },
        {
          amount: -budgetedExpense,
          label: t('Planned spending'),
          isSigned: true,
        },
        {
          amount: budgetedSaved,
          label: t('Planned savings'),
          isResult: true,
        },
        {
          amount: totalSaved - budgetedSaved,
          label: t('Difference from plan'),
          isSigned: true,
          isGroupStart: true,
        },
      ];

  const signed = (amount: number) => {
    const formatted = format(Math.abs(amount), 'financial');
    return amount === 0 ? formatted : (amount > 0 ? '+' : '-') + formatted;
  };

  return (
    <View style={{ padding: 7, gap: 8, maxWidth: 260 }}>
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(50px, auto) auto',
          columnGap: 10,
          lineHeight: 1.5,
          ...styles.smallText,
        }}
      >
        {rows.map((row, index) => {
          const rule = row.isResult
            ? {
                marginTop: 3,
                paddingTop: 3,
                borderTop: `1px solid ${theme.menuBorder}`,
              }
            : row.isGroupStart
              ? { marginTop: 8 }
              : {};
          return (
            // The same label can appear in both groups
            // oxlint-disable-next-line react/no-array-index-key
            <Fragment key={index}>
              <FinancialText
                style={{
                  fontWeight: 600,
                  textAlign: 'right',
                  color: row.color,
                  ...rule,
                }}
              >
                <PrivacyFilter>
                  {row.isSigned
                    ? signed(row.amount)
                    : format(row.amount, 'financial')}
                </PrivacyFilter>
              </FinancialText>
              <Block style={rule}>{row.label}</Block>
            </Fragment>
          );
        })}
      </View>
      {projected && missingPlan && (
        <Block
          style={{
            paddingTop: 6,
            borderTop: `1px solid ${theme.menuBorder}`,
            fontSize: 12,
          }}
        >
          {missingPlan === 'all'
            ? t('Nothing is planned for this month yet.')
            : missingPlan === 'income'
              ? t(
                  'No income is planned for this month, so there are no planned savings yet.',
                )
              : t(
                  'No spending is planned for this month, so there are no planned savings yet.',
                )}
        </Block>
      )}
    </View>
  );
}
