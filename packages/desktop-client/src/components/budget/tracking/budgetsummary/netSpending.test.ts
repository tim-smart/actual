import { getNetSpending } from './netSpending';

describe('getNetSpending', () => {
  it('shows a net refund as a positive refund, not negative spending', () => {
    // +301.09 in the Spent column: refunds outweighed purchases
    expect(getNetSpending(30109, 0)).toEqual({
      kind: 'refunded',
      amount: 30109,
      isOverPlan: false,
    });
  });

  it('shows spending as a positive amount', () => {
    expect(getNetSpending(-30000, 40000)).toEqual({
      kind: 'spent',
      amount: 30000,
      isOverPlan: false,
    });
    expect(getNetSpending(0, 0)).toEqual({
      kind: 'spent',
      amount: 0,
      isOverPlan: false,
    });
  });

  it('flags spending above the plan', () => {
    expect(getNetSpending(-50000, 40000)).toEqual({
      kind: 'spent',
      amount: 50000,
      isOverPlan: true,
    });
  });
});
