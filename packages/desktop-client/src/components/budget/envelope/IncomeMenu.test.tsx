import React from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '#mocks';

import { IncomeMenu } from './IncomeMenu';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const mocks = vi.hoisted(() => ({
  featureFlag: false,
  budgetType: 'envelope' as string,
  futureBufferModePref: undefined as string | undefined,
}));

vi.mock('#hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => mocks.featureFlag,
}));

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: (name: string) => {
    if (name === 'budgetType') return [mocks.budgetType, vi.fn()];
    if (name === 'futureBufferMode') {
      return [mocks.futureBufferModePref, vi.fn()];
    }
    return [undefined, vi.fn()];
  },
}));

vi.mock('./EnvelopeBudgetComponents', () => ({
  useEnvelopeSheetValue: () => false,
}));

function renderMenu(month: string) {
  return render(
    <TestProviders>
      <IncomeMenu
        categoryId="income-cat"
        month={month}
        onBudgetAction={vi.fn()}
        onShowActivity={vi.fn()}
        onClose={vi.fn()}
      />
    </TestProviders>,
  );
}

const currentMonth = monthUtils.currentMonth();
const futureMonth = monthUtils.addMonths(currentMonth, 1);
const pastMonth = monthUtils.subMonths(currentMonth, 1);

beforeEach(() => {
  mocks.featureFlag = false;
  mocks.budgetType = 'envelope';
  mocks.futureBufferModePref = undefined;
});

describe('IncomeMenu auto hold visibility', () => {
  it('shows the income auto-hold toggle when future buffer mode is off', () => {
    renderMenu(currentMonth);
    expect(screen.getByText('Enable auto hold')).toBeInTheDocument();
  });

  it('hides the income auto-hold toggle for current/future months while active', () => {
    mocks.featureFlag = true;
    mocks.futureBufferModePref = 'automatic';

    renderMenu(futureMonth);

    expect(screen.queryByText('Enable auto hold')).not.toBeInTheDocument();
    expect(screen.queryByText('Disable auto hold')).not.toBeInTheDocument();
    expect(screen.getByText('View transactions')).toBeInTheDocument();
  });

  it('shows the income auto-hold toggle for past months while active', () => {
    mocks.featureFlag = true;
    mocks.futureBufferModePref = 'automatic';

    renderMenu(pastMonth);

    expect(screen.getByText('Enable auto hold')).toBeInTheDocument();
    expect(screen.queryByText('Disable auto hold')).not.toBeInTheDocument();
    expect(screen.getByText('View transactions')).toBeInTheDocument();
  });
});
