import React, { useEffect, useRef, useState } from 'react';
import { Dialog } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { SvgCalendar } from '@actual-app/components/icons/v2';
import { MonthPickerPanel } from '@actual-app/components/month-picker';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css, cx } from '@emotion/css';

import { useLanguage } from '#hooks/useLocale';

import { headerChevronClass, headerControlClass } from './headerStyles';
import { formatMonthLabel } from './monthLabel';
import type { MonthBounds } from './MonthsContext';

/** The years the jump popover shows at once. */
const JUMP_YEARS = 2;
/** The calendar glyph, the chevron after it and the gap between them. */
const GLYPH = 14;
const CHEVRON = 11;
const GLYPH_GAP = 3;

type JumpToMonthButtonProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  onSelect: (month: string) => void;
};

/**
 * Opens a grid of every month, two years at a time, to jump straight to
 * one: the way to reach a month far from the ones shown. The button is a
 * calendar glyph with the chevron the header's other menu buttons carry,
 * beside the pager: the sign of a date picker, read before any hover or
 * tooltip, and not a year to choose (the headings name the years). Its
 * name and its tooltip say what it does and which months are shown. The
 * grid opens on the years around the months shown, with every month
 * shown selected as one band, and keyboard focus on the first of them.
 */
export function JumpToMonthButton({
  startMonth,
  numDisplayed,
  monthBounds,
  onSelect,
}: JumpToMonthButtonProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const year = monthUtils.getYear(startMonth);
  const [jumpYear, setJumpYear] = useState(year);
  const lastMonth = monthUtils.addMonths(startMonth, numDisplayed - 1);

  // Opening the grid puts keyboard focus on the first month shown, so the
  // months around it are a few keys away rather than a tab past every
  // month of the year
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const frame = requestAnimationFrame(() =>
      dialogRef.current
        ?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
        ?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const rangeLabel =
    numDisplayed === 1
      ? formatMonthLabel(startMonth, language, 'long', true)
      : t('{{first}} to {{last}}', {
          first: formatMonthLabel(startMonth, language, 'long', true),
          last: formatMonthLabel(lastMonth, language, 'long', true),
        });

  return (
    <>
      <Tooltip
        content={t('Jump to a month. Showing {{range}}', { range: rangeLabel })}
        placement="bottom start"
        triggerProps={{ isDisabled: isOpen }}
      >
        <Button
          ref={buttonRef}
          variant="bare"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={t('Jump to month. Showing {{range}}', {
            range: rangeLabel,
          })}
          onPress={() => {
            // Two years, this one and the next, so the months on both
            // sides of a new year are one click away; the year before
            // instead when the budget ends this year.
            const lastYear = monthUtils.getYear(monthBounds.end);
            const firstYear = monthUtils.getYear(monthBounds.start);
            setJumpYear(
              year < lastYear || year <= firstYear
                ? year
                : String(Number(year) - 1),
            );
            setIsOpen(true);
          }}
          className={cx(
            headerControlClass,
            css({ gap: GLYPH_GAP, padding: '0 6px 0 8px', flexShrink: 0 }),
          )}
        >
          <SvgCalendar
            aria-hidden
            style={{ width: GLYPH, height: GLYPH, flexShrink: 0 }}
          />
          <SvgCheveronDown
            aria-hidden
            className={headerChevronClass}
            style={{ width: CHEVRON, height: CHEVRON }}
          />
        </Button>
      </Tooltip>

      <Popover
        triggerRef={buttonRef}
        placement="bottom start"
        offset={4}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <Dialog
          ref={dialogRef}
          aria-label={t('Jump to month')}
          className={css({ outline: 'none' })}
        >
          <MonthPickerPanel
            year={jumpYear}
            yearCount={JUMP_YEARS}
            rangeStart={startMonth}
            rangeEnd={lastMonth}
            minMonth={monthBounds.start}
            maxMonth={monthBounds.end}
            locale={language}
            labels={{ previous: t('Previous year'), next: t('Next year') }}
            // Every month shown is selected, as one band
            selection="span"
            onYearChange={setJumpYear}
            onSelect={month => {
              setIsOpen(false);
              onSelect(month);
            }}
          >
            <View
              style={{
                marginTop: 10,
                maxWidth: 220,
                fontSize: 12,
                color: theme.tableHeaderText,
              }}
            >
              {t('Your budget runs from {{start}} to {{end}}.', {
                start: formatMonthLabel(
                  monthBounds.start,
                  language,
                  'short',
                  true,
                ),
                end: formatMonthLabel(monthBounds.end, language, 'short', true),
              })}
            </View>
          </MonthPickerPanel>
        </Dialog>
      </Popover>
    </>
  );
}
