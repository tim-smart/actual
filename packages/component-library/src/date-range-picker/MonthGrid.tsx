import { useMemo } from 'react';

import { View } from '#View';

import { GridButton } from './GridButton';
import type { BandJoin } from './GridButton';
import {
  currentMonth,
  formatDate,
  monthFromIndex,
  rangePosition,
} from './util';

type MonthGridProps = {
  year: string;
  rangeStart: string;
  rangeEnd: string;
  minMonth: string;
  maxMonth: string;
  /** BCP 47 language tag driving the month labels. */
  locale: string;
  onSelect: (month: string) => void;
  /** Called on pointer-enter of a cell to preview the range band. */
  onHover?: (month: string) => void;
  /**
   * `endpoints` (the default) selects the range's first and last months,
   * with a band between them, as when picking a range. `span` selects
   * every month in it, drawn as one band, as when showing a range.
   */
  selection?: 'endpoints' | 'span';
};

const COLUMNS = 4;

/** Where a band of months from `start` to `end` meets the cell's row
 * neighbours, or undefined if the cell is outside it. */
function joinFor(
  index: number,
  month: string,
  months: { month: string }[],
  start: string | undefined,
  end: string | undefined,
): BandJoin | undefined {
  const isIn = (m: string | undefined) =>
    m != null && start != null && end != null && m >= start && m <= end;
  if (!isIn(month)) {
    return undefined;
  }
  const column = index % COLUMNS;
  return {
    before: column > 0 && isIn(months[index - 1]?.month),
    after: column < COLUMNS - 1 && isIn(months[index + 1]?.month),
  };
}

export function MonthGrid({
  year,
  rangeStart,
  rangeEnd,
  minMonth,
  maxMonth,
  locale,
  onSelect,
  onHover,
  selection = 'endpoints',
}: MonthGridProps) {
  const isSpan = selection === 'span';
  const thisMonth = currentMonth();
  // Manual memo: React Compiler doesn't cover this package, and this body
  // re-renders on every hover while a range is being picked.
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const month = monthFromIndex(year, i);
        return {
          month,
          label: formatDate(month, locale, { month: 'short' }),
          fullLabel: formatDate(month, locale, {
            month: 'long',
            year: 'numeric',
          }),
        };
      }),
    [year, locale],
  );
  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        // A span is one band along the row, so its cells touch
        gap: isSpan ? '4px 0' : 4,
      }}
    >
      {months.map(({ month, label, fullLabel }, index) => (
        <GridButton
          key={month}
          selected={
            isSpan
              ? month >= rangeStart && month <= rangeEnd
              : month === rangeStart || month === rangeEnd
          }
          disabled={month < minMonth || month > maxMonth}
          isToday={month === thisMonth}
          position={rangePosition(month, rangeStart, rangeEnd)}
          {...(isSpan && {
            band: joinFor(index, month, months, rangeStart, rangeEnd) ?? null,
          })}
          label={fullLabel}
          onSelect={() => onSelect(month)}
          onHover={onHover ? () => onHover(month) : undefined}
        >
          {label}
        </GridButton>
      ))}
    </View>
  );
}
