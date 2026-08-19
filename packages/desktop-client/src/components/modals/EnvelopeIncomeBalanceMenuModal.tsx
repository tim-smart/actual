import { Trans, useTranslation } from 'react-i18next';

import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategory } from '#hooks/useCategory';
import { useFutureBufferMode } from '#hooks/useFutureBufferMode';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

type EnvelopeIncomeBalanceMenuModalProps = Extract<
  ModalType,
  { name: 'envelope-income-balance-menu' }
>['options'];

export function EnvelopeIncomeBalanceMenuModal({
  categoryId,
  month,
  onCarryover,
  onShowActivity,
}: EnvelopeIncomeBalanceMenuModalProps) {
  const { t } = useTranslation();
  const { data: category } = useCategory(categoryId);
  const { isManagedMonth } = useFutureBufferMode();

  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );
  const hideCarryover = isManagedMonth(month);

  if (!category) {
    return null;
  }

  return (
    <MobileSheet name="envelope-income-balance-menu" title={category.name}>
      <MobileSheetBalanceHeader
        label={<Trans>Received</Trans>}
        carryover={envelopeBudget.catCarryover(categoryId)}
        balance={envelopeBudget.catSumAmount(categoryId)}
        goal={envelopeBudget.catGoal(categoryId)}
        budgeted={envelopeBudget.catBudgeted(categoryId)}
        longGoal={envelopeBudget.catLongGoal(categoryId)}
      />
      <MobileSheetSection>
        {!hideCarryover && (
          <MobileSheetRow
            label={carryover ? t('Disable auto hold') : t('Enable auto hold')}
            onPress={() => onCarryover(!carryover)}
          />
        )}
        <MobileSheetRow
          label={t('View transactions')}
          onPress={() => onShowActivity()}
        />
      </MobileSheetSection>
    </MobileSheet>
  );
}
