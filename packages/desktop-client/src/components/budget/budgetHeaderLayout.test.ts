import {
  AMOUNT_TEXT_WIDTH,
  CELL_PADDING,
  CORNER_CONTROLS_HEIGHT,
  CORNER_ROW_GAP,
  FIGURE_SIZES,
  fitCategoryColumnWidth,
  getCellPadding,
  getDetailColumns,
  getDetailsHeight,
  getDetailsWidth,
  getInlineWidth,
  getNumPossibleMonths,
  getSummaryHeight,
  getSummaryLayout,
  getSummaryWidths,
  getWideFigureWidth,
  headingShowsYear,
  maxSummaryWidths,
  MIN_MONTH_COLUMN_WIDTH,
  pickHeadingFormat,
  SUMMARY_FIGURE_HEIGHT,
  TIGHT_CELL_PADDING,
} from './budgetHeaderLayout';
import type { SummaryWidths } from './budgetHeaderLayout';

describe('fitCategoryColumnWidth', () => {
  it('keeps the expanded width when the months still have room', () => {
    expect(
      fitCategoryColumnWidth({
        preferred: 400,
        tableWidth: 1200,
        numMonths: 2,
      }),
    ).toBe(400);
  });

  it('gives up expanded width before a month column gets unreadable', () => {
    // An 800px window: ~550px of table for one month
    expect(
      fitCategoryColumnWidth({ preferred: 400, tableWidth: 550, numMonths: 1 }),
    ).toBe(550 - MIN_MONTH_COLUMN_WIDTH);
  });

  it('never goes narrower than the collapsed column', () => {
    expect(
      fitCategoryColumnWidth({ preferred: 300, tableWidth: 400, numMonths: 1 }),
    ).toBe(200);
  });
});

describe('getNumPossibleMonths', () => {
  it('keeps two full-width months in a 1024px window', () => {
    // 1024px window: 746px of table beside the sidebar
    expect(getNumPossibleMonths(746)).toBe(2);
    expect((746 - 200) / 2).toBeGreaterThanOrEqual(MIN_MONTH_COLUMN_WIDTH);
  });

  it('drops a month before five-digit amounts would truncate', () => {
    expect(getNumPossibleMonths(200 + 2 * MIN_MONTH_COLUMN_WIDTH - 1)).toBe(1);
  });

  it('sizes the columns from the measured amount', () => {
    // A currency symbol makes every amount wider: fewer months fit
    expect(getNumPossibleMonths(746, AMOUNT_TEXT_WIDTH + 10)).toBe(1);
  });
});

describe('getCellPadding', () => {
  it('tightens the padding only where full padding would cut amounts', () => {
    expect(getCellPadding(400)).toBe(CELL_PADDING);
    expect(getCellPadding(MIN_MONTH_COLUMN_WIDTH)).toBe(TIGHT_CELL_PADDING);
  });
});

describe('summary layout', () => {
  // Half the font size per character: easy to add up by hand
  const measure = (text: string, font: { fontSize: number }) =>
    (text.length * font.fontSize) / 2;

  it('measures the figure and details the month actually shows', () => {
    const widths = getSummaryWidths(measure, {
      figure: '-1,234.56',
      figureLabel: 'overbudgeted',
      hasChevron: true,
      details: [{ label: 'Overspent in Oct', amount: '-12.00' }],
    });
    // amount 9 * 12; detail 16 * 6 + 6 + 6 * 6
    expect(widths.figure[0]).toBe(108);
    expect(widths.detailColumns).toEqual([96, 36]);
    expect(widths.details).toBe(138);
    // border 1 + padding 32 + figure + the 16px gap + details
    expect(getInlineWidth(widths, 0)).toBe(1 + 32 + 108 + 16 + 138);
  });

  it('sizes the figure by its chip when that is wider', () => {
    // The chip: 12 * 6 of label, 7 each side, gap 2 and chevron 11, wider
    // than 4 * 12
    const widths = getSummaryWidths(measure, {
      figure: '0.00',
      figureLabel: 'overbudgeted',
      hasChevron: true,
      details: [],
    });
    expect(widths.figure[0]).toBe(99);
    expect(getInlineWidth(widths, 0)).toBe(1 + 32 + 99);
  });

  it('counts the plan after a tracking amount, a word space apart', () => {
    // A plain label, no chip: the amount is the wider
    const widths = getSummaryWidths(measure, {
      figure: '0.00',
      figureLabel: 'saved',
      hasChevron: false,
      details: [{ label: 'Spent', amount: '10.00', planned: 'of 20.00' }],
    });
    // The value: 5 * 6 of amount, 4px, 8 * 6 of plan
    expect(widths.detailColumns).toEqual([30, 82]);
    expect(getInlineWidth(widths, 0)).toBe(1 + 32 + 48 + 16 + (30 + 6 + 82));
  });

  it('starts the values in one column after the widest label', () => {
    // Labels 5 * 6 and 9 * 6; values 5 * 6 + 4 + 8 * 6 and 8 * 6 alone:
    // the widest of each column, together
    const columns = getDetailColumns(measure, [
      { label: 'Spent', amount: '10.00', planned: 'of 20.00' },
      { label: 'Over plan', amount: '1,000.00' },
    ]);
    expect(columns).toEqual([54, 82]);
    expect(getDetailsWidth(columns)).toBe(54 + 6 + 82);
  });

  it('sets the amount smaller before it puts the notes under it', () => {
    const widths: SummaryWidths = {
      figure: [120, 110, 100],
      wideFigure: [230, 220, 210],
      detailColumns: [95, 66],
      details: 167,
    };
    // border 1 + padding 32 + figure + gap 16 + details: 336, 326, 316
    expect(
      getSummaryLayout({ columnWidth: 336, widths, detailLines: 2 }),
    ).toEqual({
      arrangement: 'inline',
      figure: 'tall',
      figureSize: 24,
      figureWidth: 120,
      detailLines: 2,
      detailColumns: [95, 66],
      columnWidth: 336,
    });
    expect(
      getSummaryLayout({ columnWidth: 326, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'inline',
      figureSize: 22,
      figureWidth: 110,
    });
    expect(
      getSummaryLayout({ columnWidth: 316, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'inline',
      figureSize: 20,
      figureWidth: 100,
    });
    // Nothing fits beside at any size: under it, as small as makes the
    // label fit beside the amount
    expect(
      getSummaryLayout({ columnWidth: 315, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'stacked',
      figure: 'wide',
      figureSize: 24,
      detailColumns: [95, 66],
    });
    expect(
      getSummaryLayout({ columnWidth: 225, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'stacked',
      figure: 'wide',
      figureSize: 22,
    });
    // Not even that: the amount at full size over its label
    expect(
      getSummaryLayout({ columnWidth: 205, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'stacked',
      figure: 'tall',
      figureSize: 24,
    });
  });

  it('puts a ledger under the figure at every width', () => {
    const widths: SummaryWidths = {
      figure: [120, 110, 100],
      wideFigure: [230, 220, 210],
      detailColumns: [95, 66],
      details: 167,
    };
    // Room beside the figure at full size, and far more: under it all
    // the same, the label beside the amount, the budget's shared columns
    for (const columnWidth of [337, 1000]) {
      expect(
        getSummaryLayout({
          columnWidth,
          widths,
          detailLines: 3,
          details: 'ledger',
        }),
      ).toEqual({
        arrangement: 'stacked',
        figure: 'wide',
        figureSize: 24,
        figureWidth: 120,
        detailLines: 3,
        detailColumns: [95, 66],
        columnWidth,
      });
    }
    // The notes would sit beside the figure here
    expect(
      getSummaryLayout({ columnWidth: 337, widths, detailLines: 3 }),
    ).toMatchObject({ arrangement: 'inline' });
  });

  it('keeps room for the most lines any month shows', () => {
    const widths: SummaryWidths = {
      figure: [120, 110, 100],
      wideFigure: [230, 220, 210],
      detailColumns: [95, 66],
      details: 167,
    };
    expect(
      getSummaryLayout({ columnWidth: 337, widths, detailLines: 3 }),
    ).toMatchObject({ arrangement: 'inline', detailLines: 3 });
    expect(
      getSummaryLayout({ columnWidth: 315, widths, detailLines: 3 }),
    ).toMatchObject({ arrangement: 'stacked', detailLines: 3 });
  });

  it('measures every arrangement at every figure size', () => {
    const widths = getSummaryWidths(measure, {
      figure: '-1,234.56',
      figureLabel: 'x',
      hasChevron: false,
      details: [],
    });
    // 9 characters at 24, 22 and 20px
    expect(widths.figure).toEqual([108, 99, 90]);
    expect(widths.wideFigure.map((w, i) => w - widths.figure[i])).toEqual(
      FIGURE_SIZES.map(() => 1 + 32 + 8 + 6),
    );
  });

  it('measures the chip beside the amount', () => {
    // border 1 + padding 32 + amount 9 * 12 + gap 8 + chip 99
    expect(
      getWideFigureWidth(measure, {
        figure: '-1,234.56',
        figureLabel: 'overbudgeted',
        hasChevron: true,
      }),
    ).toBe(1 + 32 + 108 + 8 + 99);
  });

  it('keeps the widest of every width across the budget', () => {
    expect(
      maxSummaryWidths([
        {
          figure: [100, 90, 80],
          wideFigure: [200, 190, 180],
          detailColumns: [90, 40],
          details: 192,
        },
        {
          figure: [120, 110, 100],
          wideFigure: [150, 140, 130],
          detailColumns: [80, 50],
          details: 182,
        },
      ]),
    ).toEqual({
      figure: [120, 110, 100],
      wideFigure: [200, 190, 180],
      detailColumns: [90, 50],
      // The widest month's table, not the widest columns together
      details: 192,
    });
  });

  it("shares the budget's columns across the months while they fit", () => {
    const widths: SummaryWidths = {
      figure: [120, 110, 100],
      wideFigure: [230, 220, 210],
      // One month has the widest labels, another the widest values: the
      // shared columns together (167) are wider than either month's own
      // table (160)
      detailColumns: [95, 66],
      details: 160,
    };
    // Beside the figure with the shared columns: 1 + 32 + 100 + 16 + 167
    expect(
      getSummaryLayout({ columnWidth: 316, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'inline',
      figureSize: 20,
      detailColumns: [95, 66],
    });
    // Only each month's own table fits beside the figure: 1 + 32 + 100 + 16 + 160
    expect(
      getSummaryLayout({ columnWidth: 315, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'inline',
      figureSize: 20,
      detailColumns: [0, 0],
    });
    // Under the figure, the shared columns again: 1 + 32 + 167
    expect(
      getSummaryLayout({ columnWidth: 308, widths, detailLines: 2 }),
    ).toMatchObject({
      arrangement: 'stacked',
      detailColumns: [95, 66],
    });
    expect(
      getSummaryLayout({ columnWidth: 199, widths, detailLines: 2 }),
    ).toMatchObject({ arrangement: 'stacked', detailColumns: [0, 0] });
  });

  it('runs the lines at one pitch from the top', () => {
    expect(getDetailsHeight(0)).toBe(0);
    expect(getDetailsHeight(1)).toBe(16);
    expect(getDetailsHeight(2)).toBe(34);
    // Three lines are as tall as the figure
    expect(getDetailsHeight(3)).toBe(SUMMARY_FIGURE_HEIGHT);
  });

  it('has a height set by the layout, not the month on screen', () => {
    const inline = {
      arrangement: 'inline',
      figure: 'tall',
      figureSize: 24,
      figureWidth: 100,
      detailLines: 2,
      detailColumns: [95, 66] as [number, number],
      columnWidth: 300,
    } as const;
    const stacked = {
      arrangement: 'stacked',
      figure: 'wide',
      figureSize: 24,
      figureWidth: 100,
      detailLines: 2,
      detailColumns: [95, 66] as [number, number],
      columnWidth: 300,
    } as const;
    // The figure (52px) 4px under the heading row, and 12px under it
    expect(getSummaryHeight(inline, false)).toBe(68);
    // Up to three lines beside the figure fit inside its height; a fourth
    // runs 18px under it
    expect(getSummaryHeight({ ...inline, detailLines: 3 }, false)).toBe(68);
    expect(getSummaryHeight({ ...inline, detailLines: 4 }, false)).toBe(86);
    // Under the one-line figure: 4 + 26 + 4 + the lines + 12
    expect(getSummaryHeight(stacked, false)).toBe(80);
    expect(getSummaryHeight({ ...stacked, detailLines: 3 }, false)).toBe(98);
    expect(getSummaryHeight({ ...stacked, figure: 'tall' }, false)).toBe(106);
    expect(getSummaryHeight(stacked, true)).toBe(110);
    // Only one line ever needed: no blank second line (26 + 4 + 16), but
    // the corner's controls (48: the month count on the amounts' line and
    // the caption line under it, 4px under the heading row) set the row
    expect(getSummaryHeight({ ...stacked, detailLines: 1 }, false)).toBe(64);
  });

  it('keeps room for taller corner controls', () => {
    const inline = {
      arrangement: 'inline',
      figure: 'tall',
      figureSize: 24,
      figureWidth: 100,
      detailLines: 2,
      detailColumns: [95, 66] as [number, number],
      columnWidth: 300,
    } as const;
    expect(getSummaryHeight(inline, false, 60)).toBe(76);
  });
});

describe('corner controls', () => {
  it('are never taller than the summary row beside them', () => {
    // A row of controls and the caption line under it fit beside a figure
    expect(CORNER_CONTROLS_HEIGHT).toBeLessThanOrEqual(SUMMARY_FIGURE_HEIGHT);
    const short = {
      arrangement: 'stacked',
      figure: 'wide',
      figureSize: 24,
      figureWidth: 100,
      detailLines: 0,
      detailColumns: [0, 0] as [number, number],
      columnWidth: 300,
    } as const;
    expect(getSummaryHeight(short, false)).toBe(
      CORNER_CONTROLS_HEIGHT + CORNER_ROW_GAP + 12,
    );
  });
});

describe('headingShowsYear', () => {
  it('names the year on the first heading', () => {
    expect(headingShowsYear('2026-11', 0)).toBe(true);
    expect(headingShowsYear('2027-01', 0)).toBe(true);
  });

  it('names the year on a January that follows another month', () => {
    expect(headingShowsYear('2027-01', 1)).toBe(true);
    expect(headingShowsYear('2027-02', 2)).toBe(false);
  });
});

describe('pickHeadingFormat', () => {
  const widths: Record<string, number> = { long: 90, short: 30 };
  const formats = ['long', 'short'] as const;

  it('uses the longest format that fits', () => {
    expect(pickHeadingFormat(formats, f => widths[f], 90)).toBe('long');
    expect(pickHeadingFormat(formats, f => widths[f], 89)).toBe('short');
  });

  it('falls back to the shortest format when nothing fits', () => {
    expect(pickHeadingFormat(formats, f => widths[f], 10)).toBe('short');
  });
});
