import type { WeeklyAverageTemplate } from '@actual-app/core/types/models/templates';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { HistoricalAutomation } from './HistoricalAutomation';

const template: WeeklyAverageTemplate = {
  type: 'weeklyAverage',
  numWeeks: 12,
  weekday: 'monday',
  directive: 'template',
  priority: 1,
};

describe('weekly average weekday field', () => {
  it('lists the weekdays Monday through Sunday', async () => {
    render(<HistoricalAutomation template={template} dispatch={vi.fn()} />, {
      wrapper: TestProviders,
    });

    await userEvent.click(screen.getByLabelText('Once every'));

    const options = within(screen.getByRole('menu'))
      .getAllByText(/day$/)
      .map(option => option.textContent);
    expect(options).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
  });
});
