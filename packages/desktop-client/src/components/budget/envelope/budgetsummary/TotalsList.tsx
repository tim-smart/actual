import React from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import {
  EnvelopeCellValue,
  useEnvelopeSheetValue,
} from '#components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { envelopeBudget } from '#spreadsheet/bindings';

import { getToBudgetLabel } from './getToBudgetLabel';

/**
 * Creates a formatter that displays values with explicit +/- signs. Zero
 * (including -0) is shown without a sign, since nothing was added or taken.
 * Uses Math.abs to avoid double-negative display (e.g., "--$0.00").
 *
 * @param format - The format function from useFormat hook
 * @param invert - If true, shows '-' for positive and '+' for negative
 */
function makeSignedFormatter(
  format: ReturnType<typeof useFormat>,
  invert = false,
) {
  return (value: number, type?: FormatType) => {
    const v = format(Math.abs(value), type);
    if (value === 0) {
      return v;
    }
    const isPositive = value > 0;
    return invert
      ? isPositive
        ? '-' + v
        : '+' + v
      : isPositive
        ? '+' + v
        : '-' + v;
  };
}

type TotalsListProps = {
  prevMonthName: string;
  /** End with the sum: what is left to budget, or overbudgeted. */
  showResult?: boolean;
  style?: CSSProperties;
};

/**
 * Where the month's "to budget" comes from, as a sum: available funds, less
 * last month's overspending, what's budgeted and what's held for next
 * month. Overspending and holds only appear when there are any.
 */
export function TotalsList({
  prevMonthName,
  showResult = false,
  style,
}: TotalsListProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const overspent = Number(
    useEnvelopeSheetValue(envelopeBudget.lastMonthOverspent) ?? 0,
  );
  const held = Number(useEnvelopeSheetValue(envelopeBudget.forNextMonth) ?? 0);
  const toBudget = Number(useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0);
  const signedFormatter = makeSignedFormatter(format);
  const invertedSignedFormatter = makeSignedFormatter(format, true);
  const amountStyle = { fontWeight: 600, textAlign: 'right' } as const;
  const resultStyle = {
    marginTop: 3,
    paddingTop: 3,
    borderTop: `1px solid ${theme.menuBorder}`,
  };
  // Each amount is followed by its label in the DOM, so assistive tech
  // reads them as pairs; the grid lines the amounts up in one column.
  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(50px, auto) auto',
        columnGap: 10,
        justifyContent: 'center',
        lineHeight: 1.5,
        ...styles.smallText,
        ...style,
      }}
    >
      <Tooltip
        style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
        content={
          <>
            <AlignedText
              left={t('Income:')}
              right={
                <EnvelopeCellValue
                  binding={envelopeBudget.totalIncome}
                  type="financial"
                />
              }
            />
            <AlignedText
              left={t('From last month:')}
              right={
                <EnvelopeCellValue
                  binding={envelopeBudget.fromLastMonth}
                  type="financial"
                />
              }
            />
          </>
        }
        placement="bottom end"
      >
        <EnvelopeCellValue
          binding={envelopeBudget.incomeAvailable}
          type="financial"
        >
          {props => <CellValueText {...props} style={amountStyle} />}
        </EnvelopeCellValue>
      </Tooltip>
      <Block>
        <Trans>Available funds</Trans>
      </Block>

      {overspent !== 0 && (
        <>
          <EnvelopeCellValue
            binding={envelopeBudget.lastMonthOverspent}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={amountStyle}
                formatter={signedFormatter}
              />
            )}
          </EnvelopeCellValue>
          <Block>
            <Trans>Overspent in {{ prevMonthName }}</Trans>
          </Block>
        </>
      )}

      <EnvelopeCellValue
        binding={envelopeBudget.totalBudgeted}
        type="financial"
      >
        {props => (
          <CellValueText
            {...props}
            style={amountStyle}
            formatter={signedFormatter}
          />
        )}
      </EnvelopeCellValue>
      <Block>
        <Trans>Budgeted</Trans>
      </Block>

      {held !== 0 && (
        <>
          <EnvelopeCellValue
            binding={envelopeBudget.forNextMonth}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={amountStyle}
                formatter={invertedSignedFormatter}
              />
            )}
          </EnvelopeCellValue>
          <Block>
            <Trans>For next month</Trans>
          </Block>
        </>
      )}

      {showResult && (
        <>
          <EnvelopeCellValue binding={envelopeBudget.toBudget} type="financial">
            {props => (
              <CellValueText
                {...props}
                value={props.value ?? 0}
                style={{
                  ...amountStyle,
                  ...resultStyle,
                  color:
                    toBudget < 0 ? theme.toBudgetNegativeText : theme.pageText,
                }}
              />
            )}
          </EnvelopeCellValue>
          <Block style={resultStyle}>{getToBudgetLabel(toBudget, t)}</Block>
        </>
      )}
    </View>
  );
}
