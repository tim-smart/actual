import {
  formatMonthLabel,
  formatYearRange,
  getMonthLabelParts,
} from './monthLabel';

describe('month labels', () => {
  it('names the month in the language', () => {
    expect(formatMonthLabel('2027-01', 'en-US', 'long')).toBe('January');
    expect(formatMonthLabel('2027-01', 'en-US', 'short')).toBe('Jan');
    expect(formatMonthLabel('2026-12', 'de', 'long')).toBe('Dezember');
  });

  it('puts the year where the language puts it', () => {
    expect(formatMonthLabel('2027-01', 'en-US', 'long', true)).toBe(
      'January 2027',
    );
    expect(formatMonthLabel('2027-01', 'ja', 'long', true)).toBe('2027年1月');
  });

  it('marks the year so it can be styled apart', () => {
    const parts = getMonthLabelParts('2027-01', 'ja', 'long', true);
    // The year comes first in Japanese
    expect(parts[0]).toEqual({ text: '2027', isYear: true });
    expect(parts.filter(part => part.isYear)).toHaveLength(1);
    expect(getMonthLabelParts('2027-01', 'en-US', 'long', true).at(-1)).toEqual(
      { text: '2027', isYear: true },
    );
  });

  it('names both years when the months span New Year', () => {
    expect(formatYearRange('2026-03', '2026-05', 'en-US')).toBe('2026');
    expect(formatYearRange('2026-12', '2027-02', 'en-US')).toMatch(
      /^2026\s*–\s*2027$/,
    );
  });
});
