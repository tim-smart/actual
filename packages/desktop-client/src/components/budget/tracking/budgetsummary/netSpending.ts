/**
 * A month's spending as the summary shows it. The sheet stores spending as
 * a negative amount. When refunds outweigh purchases the month has no
 * spending to show, so it shows the net refund instead, as a positive
 * amount with its own label.
 */
export function getNetSpending(totalSpent: number, budgetedExpense: number) {
  if (totalSpent > 0) {
    return { kind: 'refunded', amount: totalSpent, isOverPlan: false } as const;
  }
  const spent = totalSpent === 0 ? 0 : -totalSpent;
  return {
    kind: 'spent',
    amount: spent,
    isOverPlan: spent > budgetedExpense,
  } as const;
}
