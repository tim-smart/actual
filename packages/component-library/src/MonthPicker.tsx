import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import { Button } from '#Button';
import { Popover } from '#Popover';
import type { CSSProperties } from '#styles';
import { Text } from '#Text';
import { theme } from '#theme';
import { View } from '#View';

import { MonthGrid } from './date-range-picker/MonthGrid';
import { NavRow } from './date-range-picker/NavRow';
import {
  currentMonth,
  formatDate,
  getMonth,
  getYear,
} from './date-range-picker/util';

export type MonthPickerLabels = {
  previous: string;
  next: string;
};

type MonthPickerProps = {
  value: string;
  minDate?: string;
  maxDate?: string;
  locale: string;
  placeholder?: string;
  labels: MonthPickerLabels;
  id?: string;
  style?: CSSProperties;
  onChange: (month: string) => void;
};

// Far-past/far-future sentinels: sort before/after any real month string.
const NO_MIN = '0001-01';
const NO_MAX = '9999-12';

export function MonthPicker({
  value,
  minDate,
  maxDate,
  locale,
  placeholder,
  labels,
  id,
  style,
  onChange,
}: MonthPickerProps) {
  const month = value ? getMonth(value) : '';
  const min = minDate ? getMonth(minDate) : NO_MIN;
  const max = maxDate ? getMonth(maxDate) : NO_MAX;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() =>
    getYear(month || currentMonth()),
  );

  function openPopover() {
    setViewYear(getYear(month || currentMonth()));
    setIsOpen(true);
  }

  const label = month
    ? formatDate(month, locale, { month: 'short', year: 'numeric' })
    : (placeholder ?? '');

  return (
    <View>
      <Button
        id={id}
        ref={triggerRef}
        data-testid="month-picker-trigger"
        onPress={() => (isOpen ? setIsOpen(false) : openPopover())}
        style={{ justifyContent: 'flex-start', ...style }}
      >
        {label}
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <MonthPickerPanel
          year={viewYear}
          rangeStart={month}
          rangeEnd={month}
          minMonth={min}
          maxMonth={max}
          locale={locale}
          labels={labels}
          onYearChange={setViewYear}
          onSelect={next => {
            setIsOpen(false);
            if (next !== month) {
              onChange(next);
            }
          }}
        />
      </Popover>
    </View>
  );
}

type MonthPickerPanelProps = {
  /** The (first) year whose months are shown. */
  year: string;
  /**
   * How many years to show, one grid each, from `year` on. More than one
   * puts months on both sides of a new year a single click away.
   */
  yearCount?: number;
  /** First and last month of the highlighted range (equal for one month). */
  rangeStart: string;
  rangeEnd: string;
  minMonth?: string;
  maxMonth?: string;
  locale: string;
  labels: MonthPickerLabels;
  onYearChange: (year: string) => void;
  onSelect: (month: string) => void;
  /**
   * `span` selects every month from `rangeStart` to `rangeEnd`, as one
   * band; `endpoints` (the default) only its ends.
   */
  selection?: 'endpoints' | 'span';
  children?: ReactNode;
};

/**
 * The popover body of the month picker: a year row and a grid of its
 * months. Exported for callers that bring their own trigger.
 */
export function MonthPickerPanel({
  year,
  yearCount = 1,
  rangeStart,
  rangeEnd,
  minMonth = NO_MIN,
  maxMonth = NO_MAX,
  locale,
  labels,
  onYearChange,
  onSelect,
  selection = 'endpoints',
  children,
}: MonthPickerPanelProps) {
  const years = Array.from({ length: yearCount }, (_, i) =>
    String(Number(year) + i),
  );
  const lastYear = years[years.length - 1];
  const panelRef = useRef<HTMLDivElement>(null);

  // Arrow keys move between months as laid out, four to a row and on
  // into the next year's grid, passing over months outside the budget
  function onKeyDown(e: KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[
      e.key
    ];
    const cells = [
      ...(panelRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[aria-pressed]',
      ) ?? []),
    ];
    let index = cells.indexOf(e.target as HTMLButtonElement);
    if (!step || index === -1) {
      return;
    }
    e.preventDefault();
    for (index += step; cells[index]; index += step) {
      if (!cells[index].disabled) {
        cells[index].focus();
        return;
      }
    }
  }

  return (
    <View
      innerRef={panelRef}
      onKeyDown={onKeyDown}
      style={{ padding: 15, minWidth: 180 }}
    >
      <NavRow
        label={yearCount > 1 ? `${year} – ${lastYear}` : year}
        previousLabel={labels.previous}
        nextLabel={labels.next}
        canPrev={year > getYear(minMonth)}
        canNext={lastYear < getYear(maxMonth)}
        onPrev={() => onYearChange(String(Number(year) - 1))}
        onNext={() => onYearChange(String(Number(year) + 1))}
      />
      {years.map((gridYear, index) => (
        <View
          key={gridYear}
          role={yearCount > 1 ? 'group' : undefined}
          aria-label={yearCount > 1 ? gridYear : undefined}
          style={{ marginTop: index > 0 ? 10 : 0 }}
        >
          {yearCount > 1 && (
            <Text
              aria-hidden
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.tableHeaderText,
                margin: '0 0 4px 4px',
              }}
            >
              {gridYear}
            </Text>
          )}
          <MonthGrid
            year={gridYear}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            minMonth={minMonth}
            maxMonth={maxMonth}
            locale={locale}
            onSelect={onSelect}
            selection={selection}
          />
        </View>
      ))}
      {children}
    </View>
  );
}
