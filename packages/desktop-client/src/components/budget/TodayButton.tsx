import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowThinLeft,
  SvgArrowThinRight,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import * as monthUtils from '@actual-app/core/shared/months';
import { css, cx } from '@emotion/css';

import { useLanguage } from '#hooks/useLocale';

import { headerControlClass } from './headerStyles';
import { formatMonthLabel } from './monthLabel';

/** The arrow before "Today" when the current month is off screen. */
export const TODAY_MARK_WIDTH = 10;
const TODAY_MARK_GAP = 5;

type TodayButtonProps = {
  startMonth: string;
  numMonths: number;
  onPress: () => void;
  /** Frames the button as the middle segment of the corner's pager. */
  className?: string;
};

/**
 * Brings the current month into view: the middle of the pager, between
 * the step buttons. While the current month is on screen, its heading
 * says where it is (its name in the marker colour) and the button is
 * plain; otherwise an arrow in the same colour points to where it is.
 * The button is always the same width, so stepping never moves it.
 */
export function TodayButton({
  startMonth,
  numMonths,
  onPress,
  className,
}: TodayButtonProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const currentMonth = monthUtils.currentMonth();
  const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const direction =
    currentMonth < startMonth
      ? 'earlier'
      : currentMonth > endMonth
        ? 'later'
        : 'shown';
  const month = formatMonthLabel(currentMonth, language, 'long', true);
  const markStyle = {
    width: TODAY_MARK_WIDTH,
    height: TODAY_MARK_WIDTH,
    flexShrink: 0,
    color: theme.budgetCurrentMonthMarker,
  };

  return (
    <Button
      variant="bare"
      onPress={onPress}
      aria-keyshortcuts="0"
      aria-label={
        direction === 'earlier'
          ? t('Today: {{month}}, before the months shown', { month })
          : direction === 'later'
            ? t('Today: {{month}}, after the months shown', { month })
            : t('Today: {{month}}', { month })
      }
      className={cx(
        headerControlClass,
        direction === 'shown'
          ? // The arrow's room split either side, so the width holds
            css({
              paddingLeft: 8 + TODAY_MARK_GAP / 2 + TODAY_MARK_WIDTH / 2,
              paddingRight: 10 + TODAY_MARK_GAP / 2 + TODAY_MARK_WIDTH / 2,
            })
          : css({ gap: TODAY_MARK_GAP, paddingLeft: 8 }),
        className,
      )}
    >
      {direction === 'earlier' ? (
        <SvgArrowThinLeft style={markStyle} />
      ) : (
        direction === 'later' && <SvgArrowThinRight style={markStyle} />
      )}
      <Trans>Today</Trans>
    </Button>
  );
}
