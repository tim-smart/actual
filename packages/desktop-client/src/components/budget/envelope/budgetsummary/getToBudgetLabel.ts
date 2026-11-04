import type { TFunction } from 'i18next';

/** The words beside a "to budget" figure: what the amount means. */
export function getToBudgetLabel(amount: number, t: TFunction) {
  return amount < 0 ? t('Overbudgeted') : t('To Budget');
}
