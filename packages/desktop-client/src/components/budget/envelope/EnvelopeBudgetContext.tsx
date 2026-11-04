import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';

type EnvelopeBudgetContextDefinition = {
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  currentMonth: string;
};

const EnvelopeBudgetContext = createContext<EnvelopeBudgetContextDefinition>({
  onBudgetAction: () => {
    throw new Error('Unitialised context method called: onBudgetAction');
  },
  currentMonth: 'unknown',
});

type EnvelopeBudgetProviderProps = Omit<
  EnvelopeBudgetContextDefinition,
  'currentMonth'
> & {
  children: ReactNode;
};
export function EnvelopeBudgetProvider({
  onBudgetAction,
  children,
}: EnvelopeBudgetProviderProps) {
  const currentMonth = monthUtils.currentMonth();

  return (
    <EnvelopeBudgetContext.Provider
      value={{
        currentMonth,
        onBudgetAction,
      }}
    >
      {children}
    </EnvelopeBudgetContext.Provider>
  );
}

export function useEnvelopeBudget() {
  return useContext(EnvelopeBudgetContext);
}
