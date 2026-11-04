import React, { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  FIGURE_SIZES,
  getFigureFont,
  HEADER_CONTROL_RADIUS,
  HEADER_FONTS,
  SUMMARY_AMOUNT_HEIGHT,
  SUMMARY_CHIP_BORDER,
  SUMMARY_CHIP_PADDING,
  SUMMARY_FIGURE_CHEVRON,
  SUMMARY_FIGURE_CHEVRON_GAP,
  SUMMARY_FIGURE_HEIGHT,
  SUMMARY_LABEL_GAP,
  SUMMARY_LABEL_HEIGHT,
  SUMMARY_WIDE_FIGURE_GAP,
  SUMMARY_WIDE_FIGURE_HEIGHT,
} from '#components/budget/budgetHeaderLayout';
import type { FigureSize } from '#components/budget/budgetHeaderLayout';
import { CoverMenu } from '#components/budget/envelope/CoverMenu';
import { useEnvelopeSheetName } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { HoldMenu } from '#components/budget/envelope/HoldMenu';
import { TransferMenu } from '#components/budget/envelope/TransferMenu';
import { formatMonthLabel } from '#components/budget/monthLabel';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { useLanguage } from '#hooks/useLocale';
import { envelopeBudget } from '#spreadsheet/bindings';

import { getToBudgetLabel } from './getToBudgetLabel';
import { ToBudgetMenu } from './ToBudgetMenu';
import { TotalsList } from './TotalsList';

type ToBudgetProps = {
  month: string;
  /** How much is left to budget this month. */
  amount: number;
  /** Show the label beside the amount rather than under it. */
  isWide?: boolean;
  /** The size of the amount: the largest at which every month's fits. */
  figureSize?: FigureSize;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  prevMonthName: string;
};

/**
 * The month's headline figure: how much is left to budget, set large in
 * its state's colour on the month itself, with the label on a small chip
 * under it. The whole figure is the button that opens the breakdown of
 * where the amount comes from and the actions for it; the chip is what
 * says so. Hovering previews the same breakdown.
 */
export function ToBudget({
  month,
  amount,
  isWide = false,
  figureSize = FIGURE_SIZES[0],
  prevMonthName,
  onBudgetAction,
}: ToBudgetProps) {
  const { t } = useTranslation();
  const [menuStep, _setMenuStep] = useState<string>('actions');
  const triggerRef = useRef(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const format = useFormat();
  const language = useLanguage();

  const ref = useRef<HTMLSpanElement>(null);
  const setMenuStep = (menu: string) => {
    if (menu) ref.current?.focus();
    _setMenuStep(menu);
  };

  const sheetName = useEnvelopeSheetName(envelopeBudget.toBudget);
  const isNegative = amount < 0;
  const isPositive = amount > 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const [position, setPosition] = useState({ crossOffset: 0, offset: 0 });
  const resetPosition = (crossOffset = 0, offset = 0) =>
    setPosition({ crossOffset, offset });

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      crossOffset: e.clientX - rect.left,
      offset: e.clientY - rect.bottom,
    });
    setMenuOpen(true);
  };

  const closeMenu = () => {
    setMenuStep('actions');
    setMenuOpen(false);
    // The menu doesn't trap focus, so nothing hands it back when it
    // closes. Escape or choosing an action leaves it nowhere: return it to
    // the figure. A click elsewhere has already moved it, so leave it.
    requestAnimationFrame(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        buttonRef.current?.focus();
      }
    });
  };

  // The amount is set in its state's colour on the month itself; the
  // chip under it carries the state's tint and hairline, and is the
  // button to act with. It is framed as the header's other controls are:
  // the same corner radius and the same one-pixel shadow, and, pointed
  // at, the same deeper tint and darker edge rather than a lift of its
  // own; pressed, its shadow goes.
  const state = isPositive
    ? {
        color: theme.toBudgetPositive,
        backgroundColor: theme.toBudgetPositiveBackground,
        borderColor: theme.toBudgetPositiveBorder,
        hoverBorderColor: theme.toBudgetPositive,
      }
    : isNegative
      ? {
          color: theme.toBudgetNegativeText,
          backgroundColor: theme.toBudgetNegativeBackground,
          borderColor: theme.toBudgetNegativeBorder,
          hoverBorderColor: theme.toBudgetNegativeText,
        }
      : {
          // Nothing to act on: the same quiet chip as a tracking plan
          color: theme.pageText,
          backgroundColor: theme.budgetProjectedBackground,
          borderColor: theme.toBudgetZeroBorder,
          hoverBorderColor: theme.pageTextSubdued,
        };
  // Pointed at, only the chip answers, with a slightly deeper tint and
  // its edge in the state's colour; the light positive figure and its
  // chip's label keep AA on it (4.56:1 on the tinted chip). The type
  // itself gets no wash: a box around the figure made it a block
  const hoverTint = `color-mix(in srgb, ${state.color} 4%, ${state.backgroundColor})`;

  const formatted = format(amount, 'financial');
  const label = getToBudgetLabel(amount, t);

  return (
    <>
      <View
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        style={{ minWidth: 0, maxWidth: '100%', flexShrink: 0 }}
      >
        <Tooltip
          content={
            <View style={{ padding: 7 }}>
              <TotalsList prevMonthName={prevMonthName} showResult />
            </View>
          }
          placement="bottom start"
          offset={6}
          triggerProps={{ isDisabled: menuOpen, delay: 500 }}
        >
          <Button
            ref={buttonRef}
            variant="bare"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('{{month}}: {{amount}} {{label}}. Open actions', {
              month: formatMonthLabel(month, language, 'long', true),
              amount: formatted,
              label,
            })}
            data-cellname={sheetName}
            data-testid="summary-figure"
            onPress={() => {
              resetPosition();
              setMenuOpen(true);
            }}
            className={css({
              ...(isWide
                ? {
                    flexDirection: 'row',
                    // The chip is centred on the amount's figures: on its
                    // baseline it hung below them, since the chip has
                    // more under its text than a figure has
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: SUMMARY_WIDE_FIGURE_GAP,
                    height: SUMMARY_WIDE_FIGURE_HEIGHT,
                  }
                : {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    gap: SUMMARY_LABEL_GAP,
                    height: SUMMARY_FIGURE_HEIGHT,
                  }),
              flexShrink: 0,
              minWidth: 0,
              maxWidth: '100%',
              padding: 0,
              // The chip's shadow and its focus ring fall just outside
              // the figure's box
              overflow: 'visible',
              border: 'none',
              backgroundColor: 'transparent',
              color: state.color,
              transition: 'background-color .15s',
              [`& [data-summary-chip]`]: {
                transition: 'background-color .15s, border-color .15s',
              },
              '&[data-hovered]': {
                backgroundColor: 'transparent',
                color: state.color,
                '& [data-summary-chip]': {
                  backgroundColor: hoverTint,
                  borderColor: state.hoverBorderColor,
                },
              },
              '&[data-pressed]': {
                backgroundColor: 'transparent',
                color: state.color,
                '& [data-summary-chip]': {
                  backgroundColor: hoverTint,
                  borderColor: state.hoverBorderColor,
                  boxShadow: 'none',
                },
              },
              // Keyboard focus rings the chip, the part of the figure
              // that is a control, as the header's other controls are
              // ringed; a ring around the amount too boxed the type
              '&[data-focus-visible]': {
                outline: 'none',
                '& [data-summary-chip]': {
                  outline: `2px solid ${theme.budgetFocusRing}`,
                  outlineOffset: 1,
                },
              },
            })}
          >
            <FinancialText
              data-summary-figure="amount"
              style={{
                ...getFigureFont(figureSize),
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: `${SUMMARY_AMOUNT_HEIGHT}px`,
                whiteSpace: 'nowrap',
              }}
            >
              <PrivacyFilter>{formatted}</PrivacyFilter>
            </FinancialText>
            <View
              data-summary-chip
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SUMMARY_FIGURE_CHEVRON_GAP,
                minWidth: 0,
                maxWidth: '100%',
                height: SUMMARY_LABEL_HEIGHT,
                padding: `0 ${SUMMARY_CHIP_PADDING}px`,
                borderRadius: HEADER_CONTROL_RADIUS,
                border: `${SUMMARY_CHIP_BORDER}px solid ${state.borderColor}`,
                backgroundColor: state.backgroundColor,
                boxShadow: `0 1px 2px ${theme.budgetSummaryShadow}`,
                whiteSpace: 'nowrap',
              }}
            >
              <Text
                data-summary-figure="label"
                style={{
                  ...HEADER_FONTS.figureLabel,
                  lineHeight: `${SUMMARY_LABEL_HEIGHT - 2}px`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </Text>
              <SvgCheveronDown
                style={{
                  width: SUMMARY_FIGURE_CHEVRON,
                  height: SUMMARY_FIGURE_CHEVRON,
                  flexShrink: 0,
                }}
              />
            </View>
          </Button>
        </Tooltip>
      </View>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={closeMenu}
        style={{ width: 240, margin: 1 }}
        isNonModal
        {...position}
      >
        <span tabIndex={-1} ref={ref}>
          {menuStep === 'actions' && (
            <View
              style={{
                padding: '8px 10px 6px',
                borderBottom: `1px solid ${theme.menuBorder}`,
              }}
            >
              <TotalsList
                prevMonthName={prevMonthName}
                showResult
                style={{ justifyContent: 'flex-start' }}
              />
            </View>
          )}
          {menuStep === 'actions' && (
            <ToBudgetMenu
              onTransfer={() => setMenuStep('transfer')}
              onCover={() => setMenuStep('cover')}
              onHoldBuffer={() => setMenuStep('buffer')}
              onResetHoldBuffer={() => {
                onBudgetAction(month, 'reset-hold');
                closeMenu();
              }}
              month={month}
              onBudgetAction={onBudgetAction}
            />
          )}
          {menuStep === 'buffer' && (
            <HoldMenu
              onClose={closeMenu}
              onSubmit={amount => {
                onBudgetAction(month, 'hold', { amount });
              }}
            />
          )}
          {menuStep === 'transfer' && (
            <TransferMenu
              initialAmount={amount}
              onClose={closeMenu}
              onSubmit={(amount, categoryId) => {
                onBudgetAction(month, 'transfer-available', {
                  amount,
                  category: categoryId,
                });
              }}
            />
          )}
          {menuStep === 'cover' && (
            <CoverMenu
              showToBeBudgeted={false}
              initialAmount={amount}
              onClose={closeMenu}
              onSubmit={(amount, categoryId) => {
                onBudgetAction(month, 'cover-overbudgeted', {
                  category: categoryId,
                  amount,
                  currencyCode: format.currency.code,
                });
              }}
            />
          )}
        </span>
      </Popover>
    </>
  );
}
