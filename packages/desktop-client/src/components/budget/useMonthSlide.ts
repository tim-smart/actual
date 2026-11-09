import { useLayoutEffect, useMemo, useRef } from 'react';
import { useSpring } from 'react-spring';

import { addMonths, subMonths } from '@actual-app/core/shared/months';

/**
 * The slide when the months step. The months shown sit in a strip with
 * the month before them and the month after, each cell one column wide,
 * and the strip rests one column to the left, so the first month shown
 * fills the first column. When the first month changes by one, the
 * strip starts from where that month already was, one column over, and
 * slides to rest; a jump of more than one month shows the new months
 * in place. The heading row and the summary row each run this, with the
 * same spring, so the names and the figures move as one.
 *
 * `width` is the row's, which each caller measures; cells are
 * `width / months.length` wide.
 */
export function useMonthSlide(months: string[], width: number) {
  const [firstMonth] = months;
  const [styles, spring] = useSpring(
    () => ({
      from: { x: 0 },
      config: { mass: 3, tension: 600, friction: 80 },
    }),
    [],
  );

  const prevMonth0 = useRef(firstMonth);
  const allMonths = useMemo(
    () => [
      subMonths(firstMonth, 1),
      ...months,
      addMonths(months[months.length - 1], 1),
    ],
    [months, firstMonth],
  );
  const monthWidth = width / months.length;

  useLayoutEffect(() => {
    const prevMonth = prevMonth0.current;
    const reversed = prevMonth > firstMonth;
    const offsetX = monthWidth;
    let from = reversed ? -offsetX * 2 : 0;

    if (prevMonth !== allMonths[0] && prevMonth !== allMonths[2]) {
      from = -offsetX;
    }

    const to = -offsetX;
    if (from !== to) {
      void spring.start({ from: { x: from }, to: { x: to } });
    }
  }, [spring, firstMonth, monthWidth, allMonths]);

  useLayoutEffect(() => {
    prevMonth0.current = firstMonth;
  }, [firstMonth]);

  useLayoutEffect(() => {
    void spring.start({ to: { x: -monthWidth }, immediate: true });
  }, [spring, monthWidth]);

  return {
    /** The month before the first shown, the months shown, the month after. */
    allMonths,
    /** Each cell's width: one column. */
    monthWidth,
    /** The strip's transform, animated. */
    transform: styles.x.to(x => `translateX(${x}px)`),
    /** Whether the cell at `index` of `allMonths` is one of the two off screen. */
    isOffscreen: (index: number) =>
      index === 0 || index === allMonths.length - 1,
  };
}
