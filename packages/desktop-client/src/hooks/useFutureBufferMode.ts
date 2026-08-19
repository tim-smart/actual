import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { FutureBufferMode } from '@actual-app/core/types/prefs';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

type UseFutureBufferModeResult = {
  // The selected future buffer mode. Unset preferences default to manual.
  futureBufferMode: FutureBufferMode;
  // Whether the future buffer mode setting should be shown (feature flag on + envelope).
  isFutureBufferModeAvailable: boolean;
  // Whether automatic mode owns the buffer and income carryover for the
  // given month. It manages the current and future months, while manual
  // controls remain available for past months.
  isManagedMonth: (month: string) => boolean;
  // Persist the future buffer mode preference via the atomic core action.
  setFutureBufferMode: (mode: FutureBufferMode) => Promise<void>;
};

export function useFutureBufferMode(): UseFutureBufferModeResult {
  const featureFlagEnabled = useFeatureFlag('futureBufferMode');
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [futureBufferModePref] = useSyncedPref('futureBufferMode');
  const dispatch = useDispatch();

  const futureBufferMode: FutureBufferMode =
    futureBufferModePref === 'automatic' ? 'automatic' : 'manual';
  const isFutureBufferModeAvailable =
    featureFlagEnabled && budgetType === 'envelope';

  const setFutureBufferMode = async (mode: FutureBufferMode) => {
    await send('budget/set-future-buffer-mode', { mode });
    dispatch(
      mergeSyncedPrefs({
        futureBufferMode: mode,
      }),
    );
  };

  const isManagedMonth = (month: string) =>
    isFutureBufferModeAvailable &&
    futureBufferMode === 'automatic' &&
    month >= monthUtils.currentMonth();

  return {
    futureBufferMode,
    isFutureBufferModeAvailable,
    isManagedMonth,
    setFutureBufferMode,
  };
}
