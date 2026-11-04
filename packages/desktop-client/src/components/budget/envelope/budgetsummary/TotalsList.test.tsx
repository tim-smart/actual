import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TotalsList } from './TotalsList';

const sheet: Record<string, number> = {
  'available-funds': 100000,
  'last-month-overspent': 0,
  'total-budgeted': -112345,
  'buffered-selected': 0,
  'to-budget': -12345,
};

vi.mock('#hooks/useSheetName', () => ({
  useSheetName: (binding: string) => ({
    sheetName: 'budget202611',
    fullSheetName: `budget202611!${binding}`,
  }),
}));

vi.mock('#hooks/useSheetValue', () => ({
  useSheetValue: (binding: string) => sheet[binding],
}));

vi.mock('#hooks/useFormat', () => ({
  useFormat: () => (value: number) => (value / 100).toFixed(2),
}));

vi.mock('#hooks/usePrivacyMode', () => ({
  usePrivacyMode: () => true,
}));

describe('TotalsList', () => {
  it('masks the resulting to budget amount in privacy mode', () => {
    render(<TotalsList prevMonthName="Oct" showResult />);

    expect(screen.getByText('Overbudgeted')).toBeInTheDocument();
    // A masked amount has a redacted copy drawn over it
    expect(screen.getByText('-123.45')).toBeInTheDocument();
    expect(screen.getByText('*123*45')).toBeInTheDocument();
  });
});
