import React, { useCallback, useContext, useState } from 'react';
import { animated } from 'react-spring';

import { theme } from '@actual-app/components/theme';
import { View, viewStyles } from '@actual-app/components/view';
import { currentMonth as getCurrentMonth } from '@actual-app/core/shared/months';
import { css } from '@emotion/css';

import { useResizeObserver } from '#hooks/useResizeObserver';

import { MonthsContext } from './MonthsContext';
import { useMonthSlide } from './useMonthSlide';

import { useBudgetComponents } from '.';

export function BudgetSummaries() {
  const { months } = useContext(MonthsContext);

  const [widthState, setWidthState] = useState(0);
  const containerRef = useResizeObserver<HTMLDivElement>(
    useCallback(rect => {
      setWidthState(rect.width);
    }, []),
    { measureOnAttach: true },
  );
  const { allMonths, monthWidth, transform, isOffscreen } = useMonthSlide(
    months,
    widthState,
  );

  const { SummaryComponent } = useBudgetComponents();
  const currentMonth = getCurrentMonth();

  return (
    <div
      className={css({
        flex: 1,
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
      })}
      ref={containerRef}
    >
      {/* The columns themselves, their tint and the line between them,
          laid out as the headings over them and the table's columns
          under them are, so each line falls on the same pixel as theirs.
          The strip of summaries slides over them when the months step,
          with the heading row's strip: its offset is a fraction of a
          pixel wherever the columns' width is, and a line drawn inside
          it would be smeared across two pixels and a touch to one side
          of the table's. */}
      <View
        aria-hidden
        data-testid="budget-summary-columns"
        style={{ position: 'absolute', inset: 0, flexDirection: 'row' }}
      >
        {months.map(month => (
          <View
            key={month}
            data-month={month}
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
          width: widthState,
          height: '100%',
          willChange: 'transform',
          transform,
        }}
      >
        {allMonths.map((month, index) => (
          // The first and last months only exist to animate in; keep their
          // controls out of the tab order and away from screen readers.
          <View
            key={month}
            inert={isOffscreen(index)}
            style={{ flex: `0 0 ${monthWidth}px` }}
          >
            <SummaryComponent month={month} />
          </View>
        ))}
      </animated.div>
    </div>
  );
}
