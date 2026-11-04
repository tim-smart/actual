import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';

type TrackingBudgetContextDefinition = {
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  currentMonth: string;
};

const TrackingBudgetContext = createContext<TrackingBudgetContextDefinition>({
  onBudgetAction: () => {
    throw new Error('Unitialised context method called: onBudgetAction');
  },
  currentMonth: 'unknown',
});

type TrackingBudgetProviderProps = Omit<
  TrackingBudgetContextDefinition,
  'currentMonth'
> & {
  children: ReactNode;
};
export function TrackingBudgetProvider({
  onBudgetAction,
  children,
}: TrackingBudgetProviderProps) {
  const currentMonth = monthUtils.currentMonth();

  return (
    <TrackingBudgetContext.Provider
      value={{
        currentMonth,
        onBudgetAction,
      }}
    >
      {children}
    </TrackingBudgetContext.Provider>
  );
}

export function useTrackingBudget() {
  return useContext(TrackingBudgetContext);
}
