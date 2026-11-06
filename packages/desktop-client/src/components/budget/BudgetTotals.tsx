import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import {
  SvgArrowButtonLeft1,
  SvgArrowButtonRight1,
  SvgArrowButtonSingleLeft1,
} from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useGlobalPref } from '#hooks/useGlobalPref';

import { useCategoryColumnWidth } from './CategoryColumnWidth';
import { RenderMonths } from './RenderMonths';

import { useBudgetComponents } from '.';

/** Height shared with the month cells: a column label over its total. */
export const BUDGET_TOTALS_ROW_HEIGHT = 42;

type BudgetTotalsProps = {
  /** The width of the table's scrollbar gutter, which the totals leave free. */
  scrollbarGutter: number;
  toggleHiddenCategories: () => void;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;
};

export function BudgetTotals({
  scrollbarGutter,
  toggleHiddenCategories,
  expandAllCategories,
  collapseAllCategories,
}: BudgetTotalsProps) {
  const { t } = useTranslation();
  const [categoryExpandedStatePref, setCategoryExpandedStatePref] =
    useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const categoryWidth = useCategoryColumnWidth();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const cycleExpandedState = () => {
    const nextState = (categoryExpandedState + 1) % 3;
    setCategoryExpandedStatePref(nextState);
  };

  const getExpandStateLabel = () => {
    switch (categoryExpandedState) {
      case 0:
        return t('Expand');
      case 1:
        return t('Fully Expand');
      case 2:
        return t('Collapse');
      default:
        return t('Expand');
    }
  };

  const { BudgetTotalsComponent: MonthComponent } = useBudgetComponents();

  return (
    <View
      data-testid="budget-totals"
      style={{
        backgroundColor: theme.budgetCurrentMonth, //use budget colors, not generic table colors
        flexDirection: 'row',
        flexShrink: 0,
        marginLeft: 5,
        marginRight: 5,
        paddingRight: scrollbarGutter,
        borderBottom: '1px solid ' + theme.tableBorder,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        // Shown on hover, keyboard focus, or while its menu is open
        '&:hover .hover-visible, & .hover-visible[data-focus-visible], & .hover-visible[aria-expanded="true"]':
          {
            opacity: 1,
          },
      }}
    >
      <View
        style={{
          width: categoryWidth,
          height: BUDGET_TOTALS_ROW_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 5,
          paddingRight: 5,
          color: theme.tableHeaderText,
          fontSize: 13,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <Button
          variant="bare"
          aria-label={getExpandStateLabel()}
          onPress={cycleExpandedState}
          className="hover-visible"
          style={{
            color: 'currentColor',
            padding: 3,
            marginRight: 10,
          }}
        >
          {categoryExpandedState === 0 ? (
            <SvgArrowButtonSingleLeft1 style={{ width: 12, height: 12 }} />
          ) : categoryExpandedState === 1 ? (
            <SvgArrowButtonLeft1 style={{ width: 12, height: 12 }} />
          ) : (
            <SvgArrowButtonRight1 style={{ width: 12, height: 12 }} />
          )}
        </Button>
        <View style={{ flexGrow: 1 }}>
          <Trans>Category</Trans>
        </View>
        <Button
          ref={triggerRef}
          variant="bare"
          aria-label={t('Category options')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onPress={() => setMenuOpen(true)}
          className="hover-visible"
          style={{ color: 'currentColor', padding: 3 }}
        >
          <SvgDotsHorizontalTriple width={15} height={15} />
        </Button>

        <Popover
          triggerRef={triggerRef}
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          style={{ width: 200 }}
        >
          <Menu
            onMenuSelect={type => {
              if (type === 'toggle-visibility') {
                toggleHiddenCategories();
              } else if (type === 'expandAllCategories') {
                expandAllCategories();
              } else if (type === 'collapseAllCategories') {
                collapseAllCategories();
              }
              setMenuOpen(false);
            }}
            items={[
              {
                name: 'toggle-visibility',
                text: t('Toggle hidden categories'),
              },
              {
                name: 'expandAllCategories',
                text: t('Expand all'),
              },
              {
                name: 'collapseAllCategories',
                text: t('Collapse all'),
              },
            ]}
          />
        </Popover>
      </View>
      <RenderMonths>
        <MonthComponent />
      </RenderMonths>
    </View>
  );
}

BudgetTotals.displayName = 'BudgetTotals';
