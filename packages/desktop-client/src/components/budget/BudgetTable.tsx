import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import type { DropPosition } from '#components/sort';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useCategories } from '#hooks/useCategories';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';

import { BudgetCategories } from './BudgetCategories';
import type { SummaryLayout } from './budgetHeaderLayout';
import {
  CORNER_CONTROLS_MAX_WIDTH,
  CORNER_PADDING_LEFT,
  CORNER_ROW_GAP,
  getSummaryHeight,
  HEADER_CONTROL_GAP,
} from './budgetHeaderLayout';
import { BudgetPageHeader } from './BudgetPageHeader';
import { BudgetSummaries } from './BudgetSummaries';
import { BudgetTotals } from './BudgetTotals';
import { MonthCountSelector } from './MonthCountSelector';
import { MonthsProvider } from './MonthsContext';
import type { MonthBounds } from './MonthsContext';
import {
  findSortDown,
  findSortUp,
  getScrollbarWidth,
  separateGroups,
} from './util';

type BudgetTableProps = {
  type: string;
  prewarmStartMonth: string;
  startMonth: string;
  numMonths: number;
  monthBounds: MonthBounds;
  onSaveCategory: (category: CategoryEntity) => void;
  onDeleteCategory: (id: CategoryEntity['id']) => void;
  onSaveGroup: (group: CategoryGroupEntity) => void;
  onDeleteGroup: (id: CategoryGroupEntity['id']) => void;
  onApplyBudgetTemplatesInGroup: (
    categoryIds: Array<CategoryEntity['id']>,
  ) => void;
  onSortCategories?: (
    groupId: CategoryGroupEntity['id'],
    direction: 'asc' | 'desc',
  ) => void;
  onReorderCategory: (params: {
    id: CategoryEntity['id'];
    groupId: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onReorderGroup: (params: {
    id: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onShowActivity: (id: CategoryEntity['id'], month?: string) => void;
  onBudgetAction: (month: string, type: string, args: unknown) => void;
  onJumpToToday: () => void;
  onSelectMonth: (month: string) => void;
  compactMonthHeader: boolean;
  summaryLayout: SummaryLayout;
};

export function BudgetTable(props: BudgetTableProps) {
  const {
    type,
    prewarmStartMonth,
    startMonth,
    numMonths,
    monthBounds,
    onSaveCategory,
    onDeleteCategory,
    onSaveGroup,
    onDeleteGroup,
    onApplyBudgetTemplatesInGroup,
    onSortCategories,
    onReorderCategory,
    onReorderGroup,
    onShowActivity,
    onBudgetAction,
    onJumpToToday,
    onSelectMonth,
    compactMonthHeader,
    summaryLayout,
  } = props;

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');
  const [showHiddenCategories, setShowHiddenCategoriesPef] = useLocalPref(
    'budget.showHiddenCategories',
  );
  const [maxMonthsPref, setMaxMonthsPref] = useGlobalPref('maxMonths');
  const [editing, setEditing] = useState<{ id: string; cell: string } | null>(
    null,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // The header and totals stop where the table's columns do: short of
  // the scrollbar gutter, at whatever width this browser draws it.
  const [scrollbarGutter, setScrollbarGutter] = useState(getScrollbarWidth);
  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }
    const measure = () => setScrollbarGutter(el.offsetWidth - el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The header has a fixed height, so the saved position is valid
  // as soon as the table mounts.
  useLayoutEffect(() => {
    const savedScrollPosition = sessionStorage.getItem(
      'budget-scroll-position',
    );
    if (savedScrollPosition != null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = Number(savedScrollPosition);
      sessionStorage.removeItem('budget-scroll-position');
    }
  }, []);

  const onEditMonth = (id: string, month: string) => {
    setEditing(id ? { id, cell: month } : null);
  };

  const onEditName = (id: string) => {
    setEditing(id ? { id, cell: 'name' } : null);
  };

  const _onReorderCategory = (
    id: string,
    dropPos: DropPosition | null,
    targetId: string,
  ) => {
    const isGroup = !!categoryGroups.find(g => g.id === targetId);

    if (isGroup) {
      const { targetId: groupId } = findSortUp(
        categoryGroups,
        dropPos,
        targetId,
      );
      const group = categoryGroups.find(g => g.id === groupId);

      if (group) {
        const { categories = [] } = group;
        onReorderCategory({
          id,
          groupId: group.id,
          targetId:
            categories.length === 0 || dropPos === 'top'
              ? null
              : categories[0].id,
        });
      }
    } else {
      const group = categoryGroups.find(({ categories = [] }) =>
        categories.some(cat => cat.id === targetId),
      );

      if (group) {
        onReorderCategory({
          id,
          groupId: group.id,
          ...findSortDown(group.categories || [], dropPos, targetId),
        });
      }
    }
  };

  const _onReorderGroup = (
    id: string,
    dropPos: DropPosition | null,
    targetId: string,
  ) => {
    const [expenseGroups] = separateGroups(categoryGroups); // exclude Income group from sortable groups to fix off-by-one error
    onReorderGroup({
      id,
      ...findSortDown(expenseGroups, dropPos, targetId),
    });
  };

  const moveVertically = (dir: 1 | -1) => {
    const flattened = categoryGroups.reduce(
      (all, group) => {
        if (collapsedGroupIds.includes(group.id)) {
          return all.concat({ id: group.id, isGroup: true });
        }
        return all.concat([
          { id: group.id, isGroup: true },
          ...(group?.categories || []),
        ]);
      },
      [] as Array<
        { id: CategoryGroupEntity['id']; isGroup: boolean } | CategoryEntity
      >,
    );

    if (editing) {
      const idx = flattened.findIndex(item => item.id === editing.id);
      let nextIdx = idx + dir;

      while (nextIdx >= 0 && nextIdx < flattened.length) {
        const next = flattened[nextIdx];

        if ('isGroup' in next && next.isGroup) {
          nextIdx += dir;
          continue;
        } else if (
          type === 'tracking' ||
          ('is_income' in next && !next.is_income)
        ) {
          onEditMonth(next.id, editing.cell);
          return;
        } else {
          break;
        }
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!editing) {
      return null;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      moveVertically(e.shiftKey ? -1 : 1);
    }
  };

  const onCollapse = (collapsedIds: string[]) => {
    setCollapsedGroupIdsPref(collapsedIds);
  };

  const onToggleHiddenCategories = () => {
    setShowHiddenCategoriesPef(!showHiddenCategories);
  };

  const toggleHiddenCategories = () => {
    onToggleHiddenCategories();
  };

  const expandAllCategories = () => {
    onCollapse([]);
  };

  const collapseAllCategories = () => {
    onCollapse(categoryGroups.map(g => g.id));
  };

  const _onShowActivity = (id: string, month?: string) => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem(
        'budget-scroll-position',
        String(scrollContainerRef.current.scrollTop),
      );
    }
    onShowActivity(id, month);
  };

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <View
      data-testid="budget-table"
      style={{
        flex: 1,
        ...(styles.lightScrollbar && {
          '& ::-webkit-scrollbar': {
            backgroundColor: 'transparent',
          },
          '& ::-webkit-scrollbar-thumb:vertical': {
            backgroundColor: theme.pageTextSubdued,
            // changed from tableHeaderBackground. pageTextSubdued is always visible on pageBackground
          },
        }),
      }}
    >
      <BudgetPageHeader
        startMonth={prewarmStartMonth}
        numMonths={numMonths}
        monthBounds={monthBounds}
        compactMonthHeader={compactMonthHeader}
        scrollbarGutter={scrollbarGutter}
        onMonthSelect={onSelectMonth}
        onJumpToToday={onJumpToToday}
        cornerControls={
          <View
            style={{
              // The row under the pager: how many months are shown. It
              // is as wide as the pager's row, with the same padding
              // either side, so the corner reads as one block, and its
              // width never changes while stepping.
              maxWidth: CORNER_CONTROLS_MAX_WIDTH,
              padding: `${CORNER_ROW_GAP}px ${HEADER_CONTROL_GAP}px 0 ${CORNER_PADDING_LEFT}px`,
            }}
          >
            <MonthCountSelector
              maxMonths={maxMonthsPref || 1}
              onChange={value => setMaxMonthsPref(value)}
            />
          </View>
        }
      >
        <View
          style={{
            flexDirection: 'row',
            overflow: 'hidden',
            height: getSummaryHeight(summaryLayout, compactMonthHeader),
          }}
        >
          <MonthsProvider
            startMonth={prewarmStartMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            type={type}
            compactHeader={compactMonthHeader}
            summaryLayout={summaryLayout}
          >
            <BudgetSummaries />
          </MonthsProvider>
        </View>
      </BudgetPageHeader>

      <MonthsProvider
        startMonth={startMonth}
        numMonths={numMonths}
        monthBounds={monthBounds}
        type={type}
      >
        <BudgetTotals
          scrollbarGutter={scrollbarGutter}
          toggleHiddenCategories={toggleHiddenCategories}
          expandAllCategories={expandAllCategories}
          collapseAllCategories={collapseAllCategories}
        />
        <View
          ref={scrollContainerRef}
          data-testid="budget-table-scroll-container"
          style={{
            overflowY: 'scroll',
            overflowAnchor: 'none',
            flex: 1,
            marginLeft: 5,
            marginRight: 5,
            backgroundColor: theme.tableBackground,
            borderRadius: '0 0 6px 6px',
          }}
        >
          <View
            style={{
              flexShrink: 0,
            }}
            onKeyDown={onKeyDown}
          >
            <SchedulesProvider query={schedulesQuery}>
              <BudgetCategories
                categoryGroups={categoryGroups}
                editingCell={editing}
                onEditMonth={onEditMonth}
                onEditName={onEditName}
                onSaveCategory={onSaveCategory}
                onSaveGroup={onSaveGroup}
                onDeleteCategory={onDeleteCategory}
                onDeleteGroup={onDeleteGroup}
                onReorderCategory={_onReorderCategory}
                onReorderGroup={_onReorderGroup}
                onBudgetAction={onBudgetAction}
                onShowActivity={_onShowActivity}
                onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
                onSortCategories={onSortCategories}
              />
            </SchedulesProvider>
          </View>
        </View>
      </MonthsProvider>
    </View>
  );
}

BudgetTable.displayName = 'BudgetTable';
