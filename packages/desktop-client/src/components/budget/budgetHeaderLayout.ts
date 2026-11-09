import { styles } from '@actual-app/components/styles';
import * as monthUtils from '@actual-app/core/shared/months';

import { getCategoryColumnWidth } from './util';

/** The notes button beside each Budgeted amount, and the gap after it. */
export const BUDGETED_NOTES_WIDTH = 26;
/** A month column's left border and right margin. */
const MONTH_COLUMN_CHROME = 6;
/** The space either side of an amount in the table, and the least it
 * gives up to before an amount is cut short. */
export const CELL_PADDING = 5;
export const TIGHT_CELL_PADDING = 2;
/**
 * The widest amount a month column must show in full: a negative
 * five-digit amount in bold, as in the totals. The table measures it in
 * the budget's own number format; this is its width in the default one.
 */
export const AMOUNT_TEXT_WIDTH = 75;
export const MAX_MONTHS = 6;

/** The amount the table measures for `AMOUNT_TEXT_WIDTH`, in cents. */
export const WIDEST_AMOUNT = -1234567;

/** How wide a month column must be to show three such amounts in full. */
function getMonthColumnWidthFor(amountWidth: number, cellPadding: number) {
  return (
    MONTH_COLUMN_CHROME +
    BUDGETED_NOTES_WIDTH +
    3 * (amountWidth + cellPadding * 2)
  );
}

/**
 * The narrowest a month column may get: Budgeted, Spent and Balance each
 * still show `amountWidth` in full, with the cell padding tightened. Fewer
 * months are shown, and an expanded category column gives up its extra
 * width, before a column gets any narrower.
 */
export function getMinMonthColumnWidth(amountWidth = AMOUNT_TEXT_WIDTH) {
  return getMonthColumnWidthFor(amountWidth, TIGHT_CELL_PADDING);
}

export const MIN_MONTH_COLUMN_WIDTH = getMinMonthColumnWidth();

/** The cell padding a month column of `columnWidth` can afford. */
export function getCellPadding(
  columnWidth: number,
  amountWidth = AMOUNT_TEXT_WIDTH,
) {
  return columnWidth >= getMonthColumnWidthFor(amountWidth, CELL_PADDING)
    ? CELL_PADDING
    : TIGHT_CELL_PADDING;
}

/**
 * Budgeted starts this much wider than Spent and Balance, which split the
 * rest evenly with it, so its notes button doesn't cost it amount room.
 * Every row's Budgeted cell uses it, so the columns stay lined up.
 */
export const budgetedColumnFlex = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: BUDGETED_NOTES_WIDTH,
};

/**
 * How many months fit side by side in `tableWidth`, beside a collapsed
 * category column.
 */
export function getNumPossibleMonths(
  tableWidth: number,
  amountWidth = AMOUNT_TEXT_WIDTH,
) {
  const room = tableWidth - getCategoryColumnWidth(0);
  return Math.min(
    MAX_MONTHS,
    Math.max(1, Math.floor(room / getMinMonthColumnWidth(amountWidth))),
  );
}

/**
 * The category column width to use: the preferred (expanded) width, cut
 * back so every month column keeps its minimum width, but never narrower
 * than the collapsed column.
 */
export function fitCategoryColumnWidth({
  preferred,
  tableWidth,
  numMonths,
  amountWidth = AMOUNT_TEXT_WIDTH,
}: {
  preferred: number;
  tableWidth: number;
  numMonths: number;
  amountWidth?: number;
}) {
  const collapsed = getCategoryColumnWidth(0);
  const room = tableWidth - numMonths * getMinMonthColumnWidth(amountWidth);
  return Math.max(collapsed, Math.min(preferred, Math.floor(room)));
}

/**
 * The type used in the header, shared by the styles and by the text
 * measuring that decides what fits, so the two can't drift apart.
 */
export type HeaderFont = {
  fontSize: number;
  fontWeight: number;
  letterSpacing?: number;
  /** Set for amounts, which render with tabular numerals. */
  fontFeatureSettings?: string;
};

const { fontFeatureSettings: tabular } = styles.tnum;

export const HEADER_FONTS = {
  heading: { fontSize: 15, fontWeight: 600 },
  headingYear: { fontSize: 15, fontWeight: 500 },
  control: { fontSize: 13, fontWeight: 500 },
  caption: { fontSize: 12, fontWeight: 400 },
  figure: {
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: -0.3,
    fontFeatureSettings: tabular,
  },
  /** The figure's label: on the chip under the amount, or beside it. */
  figureLabel: { fontSize: 12, fontWeight: 500 },
  detail: { fontSize: 12, fontWeight: 400 },
  detailAmount: { fontSize: 12, fontWeight: 600, fontFeatureSettings: tabular },
  /** A plan such as "of 1,200.00": detail text around a tabular amount. */
  detailPlanned: {
    fontSize: 12,
    fontWeight: 400,
    fontFeatureSettings: tabular,
  },
  /** The table's totals, its widest amounts. */
  tableTotal: { fontSize: 13, fontWeight: 600, fontFeatureSettings: tabular },
} satisfies Record<string, HeaderFont>;

/** Measures rendered text; `measureText` in the app, a stub in tests. */
export type MeasureText = (text: string, font: HeaderFont) => number;

/**
 * The sizes a figure's amount may be set at, largest first. The row tries
 * each in turn before it puts details under the figure: two points of
 * type are hard to see, a line under the figure is not. The amount's line
 * height is the same at every size, so the row's height never depends on
 * which is chosen.
 */
export const FIGURE_SIZES = [24, 22, 20] as const;
export type FigureSize = (typeof FIGURE_SIZES)[number];

/** The figure's type at `size`. */
export function getFigureFont(size: FigureSize): HeaderFont {
  return { ...HEADER_FONTS.figure, fontSize: size };
}

/**
 * How each month's summary is laid out. Every column shares a width, so
 * every summary in the row shares a layout.
 */
export type SummaryLayout = {
  /**
   * `inline` puts the details beside the figure, as a small table.
   * `stacked` puts the same table under it.
   */
  arrangement: 'inline' | 'stacked';
  /**
   * `tall` puts the figure's label under its amount; `wide`, beside it.
   * Stacked summaries use the shorter `wide` figure when it fits.
   */
  figure: 'tall' | 'wide';
  /** The size of every figure's amount: the largest at which they fit. */
  figureSize: FigureSize;
  /**
   * Beside the details, the figure's column: the budget's widest tall
   * figure at `figureSize`. The details start at the same place in every
   * month, whatever that month's own figure is wide, so the row has one
   * dividing line and the notes are one table across it, as the table's
   * columns are under them.
   */
  figureWidth: number;
  /**
   * The detail lines the summary keeps room for: the most that any month
   * in the budget shows. The lines are set from the top, so a month with
   * fewer leaves its room empty under them, and the row's height never
   * depends on the month on screen.
   */
  detailLines: number;
  /**
   * The details table's columns, labels and values, each as wide as the
   * budget's widest: the same table in every month, so the values start
   * at one place across the row. Both 0 where that table would not fit
   * the column: then each month's table is as wide as its own lines.
   */
  detailColumns: DetailColumns;
  /** The month column's width, which each month's own details fit in. */
  columnWidth: number;
};

/**
 * The widths a summary needs: one entry per figure size in `FIGURE_SIZES`
 * where the figure's amount is part of the width.
 */
export type SummaryWidths = {
  /** The tall figure: its amount over its label row. */
  figure: number[];
  /** The whole summary with the label beside the amount, no details. */
  wideFigure: number[];
  /** The details table's columns. */
  detailColumns: DetailColumns;
  /**
   * The details table as wide as its own lines make it: across a budget,
   * the widest month's, which can be narrower than the columns' widest
   * together when no month has the widest of every column.
   */
  details: number;
};

/** The details table's columns where each month's table is its own. */
export const OWN_DETAIL_COLUMNS: DetailColumns = [0, 0];

/**
 * The widths of the details table's two columns: the labels, and the
 * values after them, each an amount with its plan ("of 1,200.00") after
 * it where the line has one. The values start together and run on from
 * there, so every label meets its value after one gap, however long the
 * label or short the value: a line is a label and its value, not a cell
 * at each end of a column. A column no line uses is 0.
 */
export type DetailColumns = [number, number];

/**
 * The summary's padding. The heading names the figure under it, so the
 * figure sits close under the heading row, with the header's unit of air
 * between them: enough that the account menu on the heading row, a
 * framed control taller than the names, stands clear of the figure under
 * it. The room under the chip, before the table, is three units. The
 * side padding is shared with the headings, so every name starts where
 * its figure does, and is wide enough to hold the current month's dot
 * with air either side.
 */
export const SUMMARY_PADDING_TOP = 4;
export const SUMMARY_PADDING_BOTTOM = 12;
export const SUMMARY_SIDE_PADDING = 16;
/**
 * Space between the figure's column and the details beside it: twice
 * the header's unit (its top padding, the corner's row gap), and
 * nothing else. The notes start level with the amount's top, at one
 * place in every month, and the air alone parts them from the figure:
 * a rule there drew a line through the row.
 */
export const SUMMARY_INLINE_GAP = 16;
/** The figure's amount: one line of type, the same at every size. */
export const SUMMARY_AMOUNT_HEIGHT = 26;
/**
 * The figure's label row: the chip that opens the month's actions, or a
 * plain label where there is nothing to open.
 */
export const SUMMARY_LABEL_HEIGHT = 20;
/** Space between the amount and the label row under it. */
export const SUMMARY_LABEL_GAP = 6;
/** The figure: its amount over its label. Not a box: type on the month. */
export const SUMMARY_FIGURE_HEIGHT =
  SUMMARY_AMOUNT_HEIGHT + SUMMARY_LABEL_GAP + SUMMARY_LABEL_HEIGHT;
/** The figure with its label beside the amount: one line. */
export const SUMMARY_WIDE_FIGURE_HEIGHT = SUMMARY_AMOUNT_HEIGHT;
/** Space between the amount and the label beside it. */
export const SUMMARY_WIDE_FIGURE_GAP = 8;
/**
 * The chip's padding either side of its label, the jump button's at its
 * chevron's end, and its 1px border.
 */
export const SUMMARY_CHIP_PADDING = 6;
export const SUMMARY_CHIP_BORDER = 1;
/** The chevron after the chip's label, and the gap before it. */
export const SUMMARY_FIGURE_CHEVRON = 11;
export const SUMMARY_FIGURE_CHEVRON_GAP = 2;
/**
 * A detail line, and the gap between one and the next: the lines run at
 * one pitch from the top of the block, beside the figure and under it,
 * three of them as tall as the figure (16 + 2 + 16 + 2 + 16 = 52).
 */
export const SUMMARY_DETAIL_LINE_HEIGHT = 16;
export const SUMMARY_DETAIL_ROW_GAP = 2;
/** The height of `lines` detail lines at their pitch. */
export function getDetailsHeight(lines: number) {
  return (
    lines * SUMMARY_DETAIL_LINE_HEIGHT +
    Math.max(0, lines - 1) * SUMMARY_DETAIL_ROW_GAP
  );
}
/** Space between a detail's label and its value. */
export const SUMMARY_DETAIL_GAP = 6;
/** Space between a detail's amount and the plan after it, a word space. */
export const SUMMARY_DETAIL_PLAN_GAP = 4;
export const SUMMARY_GAP = 4;
export const SUMMARY_ACTIONS_HEIGHT = 26;

/** The height of the small controls in the header. */
export const HEADER_CONTROL_HEIGHT = 26;
/**
 * The corner radius of everything framed in the header: the small
 * controls, the chip under a figure, a boundary tag, a hover fill.
 */
export const HEADER_CONTROL_RADIUS = 6;
/** Space between controls in the header. */
export const HEADER_CONTROL_GAP = 6;
/** Left padding of the header's category corner, shared by both rows. */
export const CORNER_PADDING_LEFT = 8;
/**
 * Space between the corner's heading row and the month count under it:
 * the summary's top padding, so the count's frame is the amounts' line
 * beside it, as tall as that line. With the heading row's own 5px of air
 * it sits 9px under the pager, as far as the pager sits under the
 * header's top edge: the corner's two rows are evenly spaced, and read
 * as one group.
 */
export const CORNER_ROW_GAP = SUMMARY_PADDING_TOP;
/**
 * The corner's controls fill the corner up to this width, so an expanded
 * category column does not stretch them into a bar.
 */
export const CORNER_CONTROLS_MAX_WIDTH = 240;
/**
 * A budget-boundary caption under the corner's second row ("Start of
 * budget"), and the gap before it, the chip's under the amount, so the
 * caption's line is the chips' line, inside the row's height.
 */
export const CORNER_CAPTION_HEIGHT = 16;
export const CORNER_CAPTION_GAP = SUMMARY_LABEL_GAP;
/**
 * The corner's second row, beside the summaries: the month count, with a
 * line of room under it for the boundary caption. It is the least height
 * the summary row has, whether or not a boundary is on screen, so
 * reaching one never moves the table.
 */
export const CORNER_CONTROLS_HEIGHT =
  HEADER_CONTROL_HEIGHT + CORNER_CAPTION_GAP + CORNER_CAPTION_HEIGHT;

/** One detail line as displayed: label, amount and, optionally, the plan. */
export type SummaryDetail = {
  label: string;
  amount: string;
  /** The plan as displayed after the amount, e.g. "of 1,200.00". */
  planned?: string;
};

/** What a month's summary displays, as text. */
type SummaryContent = {
  figure: string;
  figureLabel: string;
  /** The label is a chip with a chevron: the button for the month's actions. */
  hasChevron: boolean;
  details: SummaryDetail[];
};

/** The width of the figure's label row: the chip, or the plain label. */
function getFigureLabelWidth(
  measure: MeasureText,
  { figureLabel, hasChevron }: Omit<SummaryContent, 'details'>,
) {
  return (
    measure(figureLabel, HEADER_FONTS.figureLabel) +
    (hasChevron
      ? (SUMMARY_CHIP_PADDING + SUMMARY_CHIP_BORDER) * 2 +
        SUMMARY_FIGURE_CHEVRON_GAP +
        SUMMARY_FIGURE_CHEVRON
      : 0)
  );
}

/** The width of a tall figure: its amount over its label. */
function getTallFigureWidth(
  measure: MeasureText,
  content: Omit<SummaryContent, 'details'>,
  size: FigureSize,
) {
  return Math.max(
    measure(content.figure, getFigureFont(size)),
    getFigureLabelWidth(measure, content),
  );
}

/** The width of a detail's value: its amount, and its plan after it. */
export function getDetailValueWidth(
  measure: MeasureText,
  detail: SummaryDetail,
) {
  return (
    measure(detail.amount, HEADER_FONTS.detailAmount) +
    (detail.planned
      ? SUMMARY_DETAIL_PLAN_GAP +
        measure(detail.planned, HEADER_FONTS.detailPlanned)
      : 0)
  );
}

/**
 * The columns of the details table: labels in one, values in the next,
 * each as wide as its widest.
 */
export function getDetailColumns(
  measure: MeasureText,
  details: SummaryDetail[],
): DetailColumns {
  const column = (widths: number[]) => Math.max(0, ...widths);
  return [
    column(details.map(detail => measure(detail.label, HEADER_FONTS.detail))),
    column(details.map(detail => getDetailValueWidth(measure, detail))),
  ];
}

/** The width of the details table: its columns and the gap between them. */
export function getDetailsWidth(columns: DetailColumns) {
  const used = columns.filter(width => width > 0);
  return (
    used.reduce((sum, width) => sum + width, 0) +
    Math.max(0, used.length - 1) * SUMMARY_DETAIL_GAP
  );
}

/**
 * The width of the details table: with the budget's columns shared by
 * every month, or each month's own.
 */
function getTableWidth(widths: SummaryWidths, sharedColumns: boolean) {
  return sharedColumns ? getDetailsWidth(widths.detailColumns) : widths.details;
}

/**
 * The width a summary needs to put its details beside its figure at the
 * figure size `sizeIndex` of `FIGURE_SIZES`: the figure's column, the
 * gap, then the details. The month column's left border is included.
 */
export function getInlineWidth(
  widths: SummaryWidths,
  sizeIndex: number,
  { sharedColumns = true } = {},
) {
  const details = getTableWidth(widths, sharedColumns);
  return (
    1 +
    SUMMARY_SIDE_PADDING * 2 +
    widths.figure[sizeIndex] +
    (details > 0 ? SUMMARY_INLINE_GAP + details : 0)
  );
}

/** The width the details need under the figure, the column to themselves. */
function getStackedDetailsWidth(widths: SummaryWidths, sharedColumns: boolean) {
  return 1 + SUMMARY_SIDE_PADDING * 2 + getTableWidth(widths, sharedColumns);
}

/**
 * The width a month's summary needs to show its figure's label beside the
 * amount rather than under it. The month column's left border is included.
 */
export function getWideFigureWidth(
  measure: MeasureText,
  content: Omit<SummaryContent, 'details'>,
  size: FigureSize = FIGURE_SIZES[0],
) {
  return (
    1 +
    SUMMARY_SIDE_PADDING * 2 +
    measure(content.figure, getFigureFont(size)) +
    SUMMARY_WIDE_FIGURE_GAP +
    getFigureLabelWidth(measure, content)
  );
}

/** Every width a month's summary needs, measured from what it displays. */
export function getSummaryWidths(
  measure: MeasureText,
  content: SummaryContent,
): SummaryWidths {
  const detailColumns = getDetailColumns(measure, content.details);
  return {
    figure: FIGURE_SIZES.map(size =>
      getTallFigureWidth(measure, content, size),
    ),
    wideFigure: FIGURE_SIZES.map(size =>
      getWideFigureWidth(measure, content, size),
    ),
    detailColumns,
    details: getDetailsWidth(detailColumns),
  };
}

/** The widest of each width in `all`, entry by entry. */
export function maxSummaryWidths(all: SummaryWidths[]): SummaryWidths {
  const max = (pick: (w: SummaryWidths) => number[], count: number) =>
    Array.from({ length: count }, (_, i) =>
      Math.max(0, ...all.map(w => pick(w)[i] ?? 0)),
    );
  const [labels, values] = max(w => w.detailColumns, 2);
  return {
    figure: max(w => w.figure, FIGURE_SIZES.length),
    wideFigure: max(w => w.wideFigure, FIGURE_SIZES.length),
    detailColumns: [labels, values],
    details: Math.max(0, ...all.map(w => w.details)),
  };
}

export const NO_SUMMARY_WIDTHS: SummaryWidths = maxSummaryWidths([]);

/**
 * What the details are to the figure, which decides where they go.
 * `notes` are the figure's exceptions (last month's overspending, money
 * held for next month): most months have none, so they sit beside the
 * figure, where they fit, and the row stays as short as the figure. A
 * `ledger` is the figure's substance (income and spending, each of its
 * plan): every month has one, it is three lines of two or three figures
 * each, and it is read after the headline, so it sits under the figure
 * at every width, the same block in the same place however many months
 * are on screen, rather than beside the figure where it fits and under
 * it where it does not, or beside it without its plans.
 */
export type SummaryDetailsKind = 'notes' | 'ledger';

/**
 * Notes sit beside the figure when every summary in the budget fits that
 * way, in the budget's widest figure's column; failing that, the figure's
 * amount is set a size smaller, and smaller again, while that keeps them
 * beside it: two points of type are easier to give up than the table's
 * own lines. Only when some month in the budget fits none of these do
 * the notes go under the figure, the same table with the whole column to
 * itself. A ledger always goes under the figure. Under the figure, the
 * figure's label moves beside its amount if every summary fits that way
 * at some size, so the row stays short. The details table's columns are
 * the budget's, shared by every month so the values start at one place
 * across the row, unless that table fits nowhere and each month's own
 * does. The details read the same way at every width: label, amount,
 * plan, a line each from the top.
 *
 * `widths` are the budget's widest, whether or not the month is on
 * screen, so the arrangement, the row's height and the amount's size hold
 * while stepping.
 */
export function getSummaryLayout({
  columnWidth,
  widths,
  detailLines,
  details = 'notes',
}: {
  columnWidth: number;
  widths: SummaryWidths;
  /** The most detail lines any month shows. */
  detailLines: number;
  details?: SummaryDetailsKind;
}): SummaryLayout {
  const layout = (
    arrangement: SummaryLayout['arrangement'],
    figure: SummaryLayout['figure'],
    sizeIndex: number,
    sharedColumns: boolean,
  ): SummaryLayout => ({
    arrangement,
    figure,
    figureSize: FIGURE_SIZES[sizeIndex],
    figureWidth: widths.figure[sizeIndex],
    detailLines,
    detailColumns: sharedColumns ? widths.detailColumns : OWN_DETAIL_COLUMNS,
    columnWidth,
  });
  if (details === 'notes') {
    // Beside the figure, the budget's shared columns before each month's
    // own
    for (const sharedColumns of [true, false]) {
      const inlineAt = FIGURE_SIZES.findIndex(
        (_, i) => getInlineWidth(widths, i, { sharedColumns }) <= columnWidth,
      );
      if (inlineAt >= 0) {
        return layout('inline', 'tall', inlineAt, sharedColumns);
      }
    }
  }
  // Under the figure, the label beside the amount if that fits at some
  // size; otherwise the amount at full size over its label
  const wideAt = FIGURE_SIZES.findIndex(
    (_, i) => widths.wideFigure[i] <= columnWidth,
  );
  const sharedColumns = getStackedDetailsWidth(widths, true) <= columnWidth;
  return layout(
    'stacked',
    wideAt >= 0 ? 'wide' : 'tall',
    Math.max(0, wideAt),
    sharedColumns,
  );
}

/**
 * The summary row's height. It depends on the layout, never on the month
 * on screen, so stepping between months never moves the table below.
 * The details keep room for as many lines as some month in the budget
 * shows: beside the figure they run from its top at their own pitch,
 * three of them inside its height; under it they follow the figure.
 */
export function getSummaryHeight(
  layout: SummaryLayout,
  compact: boolean,
  cornerHeight: number = CORNER_CONTROLS_HEIGHT,
) {
  let height =
    layout.figure === 'wide'
      ? SUMMARY_WIDE_FIGURE_HEIGHT
      : SUMMARY_FIGURE_HEIGHT;
  if (layout.arrangement === 'stacked' && layout.detailLines > 0) {
    height += SUMMARY_GAP + getDetailsHeight(layout.detailLines);
  } else if (layout.arrangement === 'inline') {
    height = Math.max(height, getDetailsHeight(layout.detailLines));
  }
  if (compact) {
    height += SUMMARY_GAP + SUMMARY_ACTIONS_HEIGHT;
  }
  // Never shorter than the corner's controls beside the summaries, which
  // sit under the gap after the corner's heading row
  return (
    Math.max(height + SUMMARY_PADDING_TOP, cornerHeight + CORNER_ROW_GAP) +
    SUMMARY_PADDING_BOTTOM
  );
}

/**
 * Whether a month heading names its year: the first heading does, and so
 * does a January after it, which is exactly where the year turns. The
 * years are said where the months are, so the corner holds only controls.
 */
export function headingShowsYear(month: string, index: number) {
  return index === 0 || monthUtils.getMonthIndex(month) === 0;
}

/**
 * The longest month-name format whose widest heading still fits, falling
 * back to the shortest one, which the heading truncates if it must.
 */
export function pickHeadingFormat<Format extends string>(
  formats: readonly Format[],
  widestHeading: (format: Format) => number,
  available: number,
): Format {
  return (
    formats.find(format => widestHeading(format) <= available) ??
    formats[formats.length - 1]
  );
}
