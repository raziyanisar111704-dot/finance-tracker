// "warning" from 80% of the budget, "exceeded" once spending is above it.
// Compared with integers (spent × 5 ≥ limit × 4 means ≥ 80%), so there is no
// rounding at the threshold. Spending exactly the budget is a warning.
export function budgetStatus(spentMinor, limitMinor) {
  if (spentMinor > limitMinor) return 'exceeded';
  if (spentMinor * 5 >= limitMinor * 4) return 'warning';
  return 'ok';
}
