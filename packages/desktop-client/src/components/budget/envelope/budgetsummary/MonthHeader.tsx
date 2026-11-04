import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css, cx } from '@emotion/css';

import { HEADER_CONTROL_RADIUS } from '#components/budget/budgetHeaderLayout';
import { useEnvelopeBudget } from '#components/budget/envelope/EnvelopeBudgetContext';
import {
  headerFocusRing,
  headerIconButtonClass,
} from '#components/budget/headerStyles';
import { NotesButton } from '#components/NotesButton';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useUndo } from '#hooks/useUndo';

import { BudgetMonthMenu } from './BudgetMonthMenu';

const monthActionClass = cx(
  headerIconButtonClass,
  css({ width: 24, height: 24 }),
);

const notesButtonClass = css({
  borderRadius: HEADER_CONTROL_RADIUS,
  ...headerFocusRing,
});

type MonthHeaderProps = {
  month: string;
};

/** The month menu shown beside a month's heading, and its note if any. */
export function MonthHeader({ month }: MonthHeaderProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { onBudgetAction } = useEnvelopeBudget();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { showUndoNotification } = useUndo();
  const notesId = `budget-${month}`;
  const hasNote = !!useNotes(notesId);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const displayMonth = monthUtils.format(month, "LLLL ''yy", locale);
  const fullMonth = monthUtils.format(month, 'LLLL yyyy', locale);

  function onMenuClose() {
    setMenuOpen(false);
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {/* A month with a note shows it; one without offers "Add note" in
          its menu, so each heading carries one icon unless there is
          something to read */}
      {(hasNote || isAddingNote) && (
        <NotesButton
          id={notesId}
          width={14}
          height={14}
          tooltipPosition="bottom start"
          defaultColor={theme.pageTextLight}
          label={t('Notes for {{month}}', { month: fullMonth })}
          className={notesButtonClass}
          defaultOpen={isAddingNote}
          onClose={note => {
            if (!note) {
              setIsAddingNote(false);
              triggerRef.current?.focus();
            }
          }}
        />
      )}
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Options for {{month}}', { month: fullMonth })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onPress={() => setMenuOpen(true)}
        className={monthActionClass}
      >
        <SvgDotsHorizontalTriple width={14} height={14} />
      </Button>

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={onMenuClose}
      >
        <BudgetMonthMenu
          onAddNote={
            hasNote
              ? undefined
              : () => {
                  onMenuClose();
                  setIsAddingNote(true);
                }
          }
          onCopyLastMonthBudget={() => {
            onBudgetAction(month, 'copy-last');
            onMenuClose();
            showUndoNotification({
              message: t(
                "{{displayMonth}} budgets have all been set to last month's budgeted amounts.",
                { displayMonth },
              ),
            });
          }}
          onSetBudgetsToZero={() => {
            onBudgetAction(month, 'set-zero');
            onMenuClose();
            showUndoNotification({
              message: t(
                '{{displayMonth}} budgets have all been set to zero.',
                {
                  displayMonth,
                },
              ),
            });
          }}
          onSetMonthsAverage={numberOfMonths => {
            onBudgetAction(month, `set-${numberOfMonths}-avg`);
            onMenuClose();
            showUndoNotification({
              message:
                numberOfMonths === 12
                  ? t(
                      `${displayMonth} budgets have all been set to yearly average.`,
                    )
                  : t(
                      `${displayMonth} budgets have all been set to ${numberOfMonths} month average.`,
                    ),
            });
          }}
          onCheckTemplates={() => {
            onBudgetAction(month, 'check-templates');
            onMenuClose();
          }}
          onApplyBudgetTemplates={() => {
            onBudgetAction(month, 'apply-goal-template');
            onMenuClose();
            showUndoNotification({
              message: t(
                '{{displayMonth}} budget templates have been applied.',
                {
                  displayMonth,
                },
              ),
            });
          }}
          onOverwriteWithBudgetTemplates={() => {
            onBudgetAction(month, 'overwrite-goal-template');
            onMenuClose();
            showUndoNotification({
              message: t(
                '{{displayMonth}} budget templates have been overwritten.',
                { displayMonth },
              ),
            });
          }}
          onEndOfMonthCleanup={() => {
            onBudgetAction(month, 'cleanup-goal-template');
            onMenuClose();
            showUndoNotification({
              message: t(
                '{{displayMonth}} end-of-month cleanup templates have been applied.',
                { displayMonth },
              ),
            });
          }}
        />
      </Popover>
    </View>
  );
}
