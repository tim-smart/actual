import React from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createTestAppStore, TestProviders } from '#mocks';

import { ToBudgetMenu } from './ToBudgetMenu';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const mocks = vi.hoisted(() => ({
  featureFlag: false,
  budgetType: 'envelope' as string,
  futureBufferModePref: undefined as string | undefined,
  sheetValues: {} as Record<string, number>,
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

vi.mock('#components/budget/envelope/EnvelopeBudgetComponents', () => ({
  useEnvelopeSheetValue: (binding: string) => mocks.sheetValues[binding] ?? 0,
}));

function setSheetValues(values: Record<string, number>) {
  mocks.sheetValues = values;
}

function renderMenu(month: string) {
  const store = createTestAppStore();

  return {
    store,
    ...render(
      <TestProviders store={store}>
        <ToBudgetMenu
          month={month}
          onTransfer={vi.fn()}
          onCover={vi.fn()}
          onHoldBuffer={vi.fn()}
          onResetHoldBuffer={vi.fn()}
          onBudgetAction={vi.fn()}
        />
      </TestProviders>,
    ),
  };
}

const currentMonth = monthUtils.currentMonth();
const futureMonth = monthUtils.addMonths(currentMonth, 1);
const pastMonth = monthUtils.subMonths(currentMonth, 1);

beforeEach(() => {
  mocks.featureFlag = false;
  mocks.budgetType = 'envelope';
  mocks.futureBufferModePref = undefined;
  // Default sheet values: positive To Budget, an auto/manual buffer present.
  setSheetValues({
    'to-budget': 10000,
    'buffered-selected': 5000,
    buffered: 0,
    'buffered-auto': 0,
  });
});

describe('ToBudgetMenu future buffer mode action', () => {
  it('does not show the future buffer mode action when the feature flag is off', () => {
    mocks.featureFlag = false;
    renderMenu(currentMonth);

    expect(
      screen.queryByText('Change future buffer mode'),
    ).not.toBeInTheDocument();
  });

  it('does not show the future buffer mode action for tracking budgets', () => {
    mocks.featureFlag = true;
    mocks.budgetType = 'tracking';
    renderMenu(currentMonth);

    expect(
      screen.queryByText('Change future buffer mode'),
    ).not.toBeInTheDocument();
  });

  it('shows a normal menu item when the flag is on', () => {
    mocks.featureFlag = true;
    mocks.futureBufferModePref = 'manual';
    renderMenu(currentMonth);

    expect(screen.getByText('Change future buffer mode')).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { hidden: true }),
    ).not.toBeInTheDocument();
  });

  it('opens the future buffer mode modal when selected', async () => {
    mocks.featureFlag = true;
    mocks.futureBufferModePref = 'manual';

    const { store } = renderMenu(currentMonth);

    await userEvent.click(screen.getByText('Change future buffer mode'));

    expect(store.getState().modals.modalStack).toEqual([
      { name: 'future-buffer-mode' },
    ]);
  });

  it('hides conflicting manual controls for the current/future month while active', () => {
    mocks.featureFlag = true;
    mocks.futureBufferModePref = 'automatic';

    renderMenu(futureMonth);

    expect(screen.queryByText('Hold for next month')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Disable current auto hold'),
    ).not.toBeInTheDocument();
    // The mode action itself remains available.
    expect(screen.getByText('Change future buffer mode')).toBeInTheDocument();
  });

  it('keeps manual controls visible for past months while active', () => {
    mocks.featureFlag = true;
    mocks.futureBufferModePref = 'automatic';

    renderMenu(pastMonth);

    expect(screen.getByText('Hold for next month')).toBeInTheDocument();
    expect(screen.getByText('Disable current auto hold')).toBeInTheDocument();
    expect(screen.getByText('Change future buffer mode')).toBeInTheDocument();
  });

  it('hides the manual reset buffer control for current/future months while active', () => {
    mocks.featureFlag = true;
    mocks.futureBufferModePref = 'automatic';
    setSheetValues({
      'to-budget': 10000,
      'buffered-selected': 5000,
      buffered: 5000,
      'buffered-auto': 0,
    });

    renderMenu(currentMonth);

    expect(
      screen.queryByText("Reset next month's buffer"),
    ).not.toBeInTheDocument();
  });
});
