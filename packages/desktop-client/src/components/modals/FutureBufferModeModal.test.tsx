import React from 'react';

import { initServer } from '@actual-app/core/platform/client/connection';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { FutureBufferModeModal } from './FutureBufferModeModal';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const mocks = vi.hoisted(() => ({
  featureFlag: true,
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

function renderModal() {
  return render(
    <TestProviders>
      <FutureBufferModeModal />
    </TestProviders>,
  );
}

beforeEach(() => {
  mocks.featureFlag = true;
  mocks.budgetType = 'envelope';
  mocks.futureBufferModePref = undefined;
});

describe('FutureBufferModeModal', () => {
  it('explains both future buffer modes', () => {
    renderModal();

    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
    expect(
      screen.getByText(/Manage the funds held for future months yourself/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Let Actual manage the buffer for you/),
    ).toBeInTheDocument();
  });

  it('saves the selected mode', async () => {
    mocks.futureBufferModePref = 'manual';
    const handler = vi.fn();
    initServer({ 'budget/set-future-buffer-mode': handler });

    renderModal();

    await userEvent.click(
      screen.getByRole('button', { name: 'Automatic mode' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(handler).toHaveBeenCalledWith({ mode: 'automatic' });
  });
});
