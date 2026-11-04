import * as monthUtils from '@actual-app/core/shared/months';

export type MonthNameStyle = 'long' | 'short';

/** A piece of a month label; the year is styled apart from the month. */
export type MonthLabelPart = { text: string; isYear: boolean };

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  language: string,
  monthStyle: MonthNameStyle,
  withYear: boolean,
) {
  const key = `${language}|${monthStyle}|${withYear}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, {
      month: monthStyle,
      year: withYear ? 'numeric' : undefined,
      timeZone: 'UTC',
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * A month's name, with its year if asked, in the order and wording the
 * language uses: "January 2027", "janvier 2027", "2027年1月".
 */
export function getMonthLabelParts(
  month: string,
  language: string,
  monthStyle: MonthNameStyle,
  withYear = false,
): MonthLabelPart[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return getFormatter(language, monthStyle, withYear)
    .formatToParts(date)
    .map(part => ({ text: part.value, isYear: part.type === 'year' }));
}

/** The plain text of `getMonthLabelParts`. */
export function formatMonthLabel(
  month: string,
  language: string,
  monthStyle: MonthNameStyle,
  withYear = false,
) {
  return getMonthLabelParts(month, language, monthStyle, withYear)
    .map(part => part.text)
    .join('');
}

/**
 * The years the displayed months span, as the language writes a range:
 * "2026", or "2026–2027" across New Year.
 */
export function formatYearRange(first: string, last: string, language: string) {
  const firstYear = monthUtils.getYear(first);
  const lastYear = monthUtils.getYear(last);
  if (firstYear === lastYear) {
    return firstYear;
  }
  const format = new Intl.DateTimeFormat(language, {
    year: 'numeric',
    timeZone: 'UTC',
  });
  return format.formatRange(
    new Date(Date.UTC(Number(firstYear), 0, 1)),
    new Date(Date.UTC(Number(lastYear), 0, 1)),
  );
}
