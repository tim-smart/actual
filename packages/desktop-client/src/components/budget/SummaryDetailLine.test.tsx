import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SummaryDetails } from './SummaryDetailLine';

vi.mock('#hooks/usePrivacyMode', () => ({
  usePrivacyMode: () => true,
}));

const ledger = [
  { label: 'Income', amount: '2,500.00', plan: { amount: '3,000.00' } },
  { label: 'Spent', amount: '1,634.21', plan: { amount: '450.00' } },
  {
    label: 'Over plan',
    amount: '1,184.21',
    color: 'rgb(1, 2, 3)',
    isOverPlan: true,
  },
];

describe('SummaryDetails', () => {
  it('masks every amount, plan and overrun in privacy mode', () => {
    render(
      <SummaryDetails
        lines={ledger}
        layout={{
          arrangement: 'inline',
          detailLines: 3,
          detailColumns: [60, 110],
        }}
      />,
    );

    // A masked amount has a redacted copy drawn over it
    for (const amount of [
      '2,500.00',
      '3,000.00',
      '1,634.21',
      '450.00',
      '1,184.21',
    ]) {
      expect(screen.getByText(amount)).toBeInTheDocument();
      expect(
        screen.getByText(amount.replace(/[^\d]/g, '*')),
      ).toBeInTheDocument();
    }
    expect(screen.getByText('Over plan')).toBeInTheDocument();
  });

  it('keeps the overrun masked under the figure too', () => {
    render(
      <SummaryDetails
        lines={ledger}
        layout={{
          arrangement: 'stacked',
          detailLines: 3,
          detailColumns: [0, 0],
        }}
      />,
    );

    expect(screen.getByText('1,184.21')).toBeInTheDocument();
    expect(screen.getByText('1*184*21')).toBeInTheDocument();
  });

  it('keeps each plan after its amount, in the same cell', () => {
    render(
      <SummaryDetails
        lines={ledger}
        layout={{
          arrangement: 'stacked',
          detailLines: 3,
          detailColumns: [0, 0],
        }}
      />,
    );

    const spent = screen.getByText('1,634.21');
    const plan = screen.getByText('450.00');
    expect(spent.closest('[data-summary-value]')).toBe(
      plan.closest('[data-summary-value]'),
    );
    // The overrun has no plan: its value is the amount alone
    expect(
      screen.getByText('1,184.21').closest('[data-summary-value]'),
    ).toHaveTextContent(/^1,184\.21(1\*184\*21)?$/);
  });
});
