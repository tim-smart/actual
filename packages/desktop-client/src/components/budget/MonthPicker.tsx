import React, { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { VisuallyHidden } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { animated } from 'react-spring';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View, viewStyles } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css, cx } from '@emotion/css';

import { useLanguage } from '#hooks/useLocale';
import { useResizeObserver } from '#hooks/useResizeObserver';

import {
  CORNER_CAPTION_GAP,
  CORNER_CAPTION_HEIGHT,
  CORNER_CONTROLS_MAX_WIDTH,
  CORNER_PADDING_LEFT,
  HEADER_CONTROL_GAP,
  HEADER_CONTROL_HEIGHT,
  HEADER_CONTROL_RADIUS,
  HEADER_FONTS,
  headingShowsYear,
  pickHeadingFormat,
  SUMMARY_SIDE_PADDING,
} from './budgetHeaderLayout';
import { headerIconButtonClass } from './headerStyles';
import { JumpToMonthButton } from './JumpToMonthButton';
import { measureText as measure, useFontsVersion } from './measureText';
import { formatMonthLabel, getMonthLabelParts } from './monthLabel';
import type { MonthNameStyle } from './monthLabel';
import type { MonthBounds } from './MonthsContext';
import { TodayButton } from './TodayButton';
import { useMonthSlide } from './useMonthSlide';

import { useBudgetComponents } from '.';

/**
 * The heading row: the month names, with the pager beside them. Its
 * controls are centred in it with 5px either side, and the name with it,
 * so the name sits 8.5px over the figure's line, a little more than the
 * figure's chip has under the amount.
 */
export const MONTH_HEADING_BAND = 36;
/**
 * The header's top padding, over the heading row: the header's unit, so
 * the pager, centred in the row with 5px either side, sits 9px under
 * the header's top edge and 9px over the month count under it, the
 * corner's rows evenly spaced. The name's capitals then sit about as far
 * from the top edge as from the column's edge, with the figure under
 * them a unit closer still, so the heading and the figure read as one
 * band inside the header's frame.
 */
export const MONTH_HEADER_PADDING_TOP = 4;
export const MONTH_HEADER_HEIGHT =
  MONTH_HEADER_PADDING_TOP + MONTH_HEADING_BAND;
/**
 * Horizontal padding inside a month heading: the summary's, so every
 * name starts where its figure does.
 */
export const MONTH_HEADING_PADDING = SUMMARY_SIDE_PADDING;
/** Room for the notes and menu buttons beside a heading. */
const HEADING_ACTIONS = 56;
/** Each step button of the pager, hairline included. */
const STEP_BUTTON = 27;
const GAP = HEADER_CONTROL_GAP;
/** Slack for the difference between measured and rendered text. */
const FIT_MARGIN = 4;
const HEADING_FORMATS = ['long', 'short'] as const;

/**
 * The pager: one framed control, like the others in the header, with a
 * step button at each end and Today between them, as a calendar's, and
 * the jump button after it. Moving through time is one row: the arrows a
 * month at a time, the middle back to today, the calendar anywhere.
 */
const pagerClass = css({
  flex: 1,
  minWidth: 0,
  flexDirection: 'row',
  alignItems: 'stretch',
  height: HEADER_CONTROL_HEIGHT,
  borderRadius: HEADER_CONTROL_RADIUS,
  backgroundColor: theme.tableBackground,
  border: `1px solid ${theme.tableBorder}`,
  boxShadow: `0 1px 2px ${theme.budgetSummaryShadow}`,
  overflow: 'hidden',
});

const stepButtonClass = cx(
  headerIconButtonClass,
  css({
    width: STEP_BUTTON - 1,
    height: HEADER_CONTROL_HEIGHT - 2,
    borderRadius: 0,
    flexShrink: 0,
    '&[data-focus-visible]': { outlineOffset: -2 },
  }),
);

/** The middle of the pager: its own hairlines, no frame of its own. */
const todaySegmentClass = css({
  flex: 1,
  minWidth: 0,
  height: HEADER_CONTROL_HEIGHT - 2,
  justifyContent: 'center',
  border: 'none',
  borderLeft: `1px solid ${theme.tableBorder}`,
  borderRight: `1px solid ${theme.tableBorder}`,
  borderRadius: 0,
  boxShadow: 'none',
  // Pointed at, it fills as the step buttons either side of it do, the
  // same wash on the same white; its hairlines are the pager's, and stay
  '&[data-focus-visible]': { outlineOffset: -2 },
});

/**
 * The dot before the current month's name, in the marker colour, as a
 * calendar marks today's date. It is part of the name: the first thing
 * in the heading's text, on the name's line and centred on its capitals,
 * a word space (the heading's own gap) before the name, so the heading
 * reads "• November" and the mark starts where the figure under it does.
 */
const CURRENT_MARK = 6;
const CURRENT_MARK_GAP = GAP;
const currentMarkClass = css({
  // Centred on the capitals, a touch under the line's middle
  position: 'relative',
  top: 1,
  flexShrink: 0,
  width: CURRENT_MARK,
  height: CURRENT_MARK,
  borderRadius: CURRENT_MARK / 2,
  backgroundColor: theme.budgetCurrentMonthMarker,
});

const headingNameClass = css({
  ...HEADER_FONTS.heading,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: theme.pageText,
});

const headingYearClass = css({
  ...HEADER_FONTS.headingYear,
  color: theme.tableHeaderText,
});

/**
 * A budget boundary is a fact about the range, not a control: a quiet
 * caption under the corner's controls, in words, on the line the corner
 * keeps for it.
 */
const captionClass = css({
  ...HEADER_FONTS.caption,
  height: CORNER_CAPTION_HEIGHT,
  lineHeight: `${CORNER_CAPTION_HEIGHT}px`,
  color: theme.tableHeaderText,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

type MonthPickerProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  /** Width of the category column, which the corner's controls sit above. */
  categoryWidth: number;
  /** Leave the notes and menu buttons to the summary; the columns are tight. */
  compact: boolean;
  /**
   * Room the last heading keeps clear at its end, inside its own width,
   * for the account menu over it.
   */
  lastHeadingReserve?: number;
  onSelect: (month: string) => void;
  onJumpToToday: () => void;
  /** Under the pager, beside the summaries: the month count. */
  cornerControls: ReactNode;
  /** Under the month headings: the summaries. */
  children: ReactNode;
};

/**
 * The month header. Each displayed month is a heading directly above its
 * column, with its summary under it, the two as one band: the heading
 * names the figure, so no rule parts them. The first heading names its
 * year, and so does a January after it. The current month's name begins
 * with a dot in the marker colour, as a calendar marks today's date, so
 * every heading sits on the same band. Above the
 * category column, the pager steps the months and brings today back, and
 * the jump button beside it opens the grid of every month;
 * `cornerControls` sit under them, so the keyboard reaches every way of
 * moving through time before the months themselves; where the budget's
 * first or last month is on screen, a caption under them says so.
 */
export function MonthPicker({
  startMonth,
  numDisplayed,
  monthBounds,
  categoryWidth,
  compact,
  lastHeadingReserve = 0,
  onSelect,
  onJumpToToday,
  cornerControls,
  children,
}: MonthPickerProps) {
  const language = useLanguage();
  const { t } = useTranslation();
  const { MonthHeaderComponent } = useBudgetComponents();
  const currentMonth = monthUtils.currentMonth();
  const startCaptionId = useId();
  const endCaptionId = useId();

  const [monthAreaWidth, setMonthAreaWidth] = useState(0);
  // The heading format is measured: again once the web font is in
  useFontsVersion();

  const monthAreaRef = useResizeObserver<HTMLDivElement>(
    rect => {
      setMonthAreaWidth(rect.width);
    },
    { measureOnAttach: true },
  );

  const displayed = useMemo(
    () =>
      monthUtils.rangeInclusive(
        startMonth,
        monthUtils.addMonths(startMonth, numDisplayed - 1),
      ),
    [startMonth, numDisplayed],
  );
  // The names slide with the figures under them when the months step
  const { allMonths, monthWidth, transform, isOffscreen } = useMonthSlide(
    displayed,
    monthAreaWidth,
  );
  const latestStart = monthUtils.subMonths(monthBounds.end, numDisplayed - 1);
  const isFirst = startMonth <= monthBounds.start;
  const isLast = startMonth >= latestStart;

  // Every heading shares a format, chosen so the widest one fits beside
  // its actions; the last one must also fit before the account menu.
  const columnWidth = monthAreaWidth / numDisplayed;
  const headingReserve =
    MONTH_HEADING_PADDING * 2 + (compact ? 0 : HEADING_ACTIONS) + FIT_MARGIN;
  const headingText = (month: string, format: MonthNameStyle, index: number) =>
    formatMonthLabel(month, language, format, headingShowsYear(month, index));
  const widestHeading = (format: MonthNameStyle) =>
    Math.max(
      ...displayed.map(
        (month, index) =>
          measure(headingText(month, format, index), HEADER_FONTS.heading) +
          (month === currentMonth ? CURRENT_MARK + CURRENT_MARK_GAP : 0) +
          (index === displayed.length - 1 ? lastHeadingReserve : 0),
      ),
    );
  const headingFormat = pickHeadingFormat(
    HEADING_FORMATS,
    widestHeading,
    columnWidth - headingReserve,
  );

  // Where the budget's first or last month is on screen, a caption under
  // the corner's controls says so. The step buttons describe themselves
  // to assistive tech either way.
  const boundaries = [
    isFirst && { id: startCaptionId, text: t('Start of budget') },
    isLast && { id: endCaptionId, text: t('End of budget') },
  ].filter(boundary => !!boundary);

  return (
    <View
      role="group"
      aria-label={t('Months')}
      style={{ flexDirection: 'row', alignItems: 'stretch' }}
    >
      <View style={{ width: categoryWidth, flexShrink: 0 }}>
        <View
          style={{
            height: MONTH_HEADER_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            gap: GAP,
            maxWidth: CORNER_CONTROLS_MAX_WIDTH,
            padding: `${MONTH_HEADER_PADDING_TOP}px ${GAP}px 0 ${CORNER_PADDING_LEFT}px`,
          }}
        >
          <View
            className={pagerClass}
            role="group"
            aria-label={t('Move through months')}
          >
            <Button
              variant="bare"
              className={stepButtonClass}
              aria-label={t('Previous month')}
              aria-disabled={isFirst || undefined}
              aria-describedby={isFirst ? startCaptionId : undefined}
              onPress={() => {
                if (!isFirst) {
                  onSelect(monthUtils.prevMonth(startMonth));
                }
              }}
            >
              <SvgCheveronLeft style={{ width: 16, height: 16 }} />
            </Button>
            <TodayButton
              startMonth={startMonth}
              numMonths={numDisplayed}
              onPress={onJumpToToday}
              className={todaySegmentClass}
            />
            <Button
              variant="bare"
              className={stepButtonClass}
              aria-label={t('Next month')}
              aria-disabled={isLast || undefined}
              aria-describedby={isLast ? endCaptionId : undefined}
              onPress={() => {
                if (!isLast) {
                  onSelect(monthUtils.nextMonth(startMonth));
                }
              }}
            >
              <SvgCheveronRight style={{ width: 16, height: 16 }} />
            </Button>
          </View>
          <JumpToMonthButton
            startMonth={startMonth}
            numDisplayed={numDisplayed}
            monthBounds={monthBounds}
            onSelect={onSelect}
          />
        </View>
        {cornerControls}
        {boundaries.map(boundary => (
          <VisuallyHidden key={boundary.id} id={boundary.id}>
            {boundary.text}
          </VisuallyHidden>
        ))}
        {boundaries.length > 0 && (
          <View
            aria-hidden
            data-testid="budget-boundary"
            style={{
              flexDirection: 'row',
              gap: GAP,
              paddingTop: CORNER_CAPTION_GAP,
              paddingLeft: CORNER_PADDING_LEFT,
              paddingRight: GAP,
            }}
          >
            {boundaries.map(boundary => (
              <span key={boundary.id} className={captionClass}>
                {boundary.text}
              </span>
            ))}
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          innerRef={monthAreaRef}
          style={{
            height: MONTH_HEADER_HEIGHT,
            flexDirection: 'row',
            overflow: 'hidden',
          }}
        >
          {/* The columns' tints and lines, laid out as the table's
              columns are and holding still; the names slide over them
              in a strip, as the figures do under them */}
          <View
            aria-hidden
            style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}
          >
            {displayed.map(month => (
              <View
                key={month}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderLeft: `1px solid ${theme.tableBorder}`,
                  backgroundColor:
                    month === currentMonth
                      ? theme.budgetCurrentMonth
                      : theme.budgetOtherMonth,
                }}
              />
            ))}
          </View>
          <animated.div
            className={viewStyles}
            style={{
              flexDirection: 'row',
              width: monthAreaWidth,
              height: '100%',
              willChange: 'transform',
              transform,
            }}
          >
            {allMonths.map((month, index) => {
              const isCurrent = month === currentMonth;
              // The first and last only exist to slide in: no controls
              // for the keyboard or a screen reader, and not a month
              // shown. Where the strip's months sit among the months
              // shown decides the year: the one before shows its year,
              // as it will when it arrives first.
              const offscreen = isOffscreen(index);
              const shownIndex = Math.max(0, index - 1);
              const isLast = index - 1 === displayed.length - 1;
              return (
                <View
                  key={month}
                  inert={offscreen}
                  data-testid={offscreen ? undefined : 'selected-budget-month'}
                  data-month={month}
                  aria-current={isCurrent && !offscreen ? 'date' : undefined}
                  style={{
                    flex: `0 0 ${monthWidth}px`,
                    minWidth: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: GAP,
                    padding: `${MONTH_HEADER_PADDING_TOP}px ${MONTH_HEADING_PADDING}px 0`,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: GAP,
                      minWidth: 0,
                      // Inside the heading's width, so the headings stay as
                      // wide as their columns whatever sits over this one
                      maxWidth: '100%',
                      paddingRight: isLast ? lastHeadingReserve : 0,
                    }}
                  >
                    {/* The current month's name starts with the dot, as a
                        calendar marks today's date: the mark is part of
                        the name, and sits where the figure starts */}
                    {isCurrent && (
                      <span
                        aria-hidden
                        data-testid={
                          offscreen ? undefined : 'current-month-mark'
                        }
                        className={currentMarkClass}
                      />
                    )}
                    <span className={headingNameClass}>
                      {getMonthLabelParts(
                        month,
                        language,
                        headingFormat,
                        headingShowsYear(month, shownIndex),
                      ).map((part, partIndex) =>
                        part.isYear ? (
                          <span key={partIndex} className={headingYearClass}>
                            {part.text}
                          </span>
                        ) : (
                          part.text
                        ),
                      )}
                    </span>
                    {!compact && <MonthHeaderComponent month={month} />}
                  </View>
                </View>
              );
            })}
          </animated.div>
        </View>
        {children}
      </View>
    </View>
  );
}
