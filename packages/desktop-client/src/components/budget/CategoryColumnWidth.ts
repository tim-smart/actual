import { createContext, useContext } from 'react';

import { useGlobalPref } from '#hooks/useGlobalPref';

import { getCategoryColumnWidth } from './util';

/**
 * The category column width the budget table settled on: the expanded
 * width the user picked, narrowed if the window can't fit it.
 */
export const CategoryColumnWidthContext = createContext<number | null>(null);

export function useCategoryColumnWidth() {
  const [expandedState] = useGlobalPref('categoryExpandedState');
  const fitted = useContext(CategoryColumnWidthContext);
  return fitted ?? getCategoryColumnWidth(expandedState);
}
