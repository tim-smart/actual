import type { TFunction } from 'i18next';

import type { SyncState } from '#hooks/useSyncStatus';

/**
 * The one state of the account menu's dot, name, tooltip, menu header and
 * sync item. Each is a different view of this value, so they can never
 * disagree about whether the budget is syncing.
 *
 * - `no-server`: the budget is on this device only; there is no server to
 *   have a state, so nothing is shown as a dot.
 * - `error`: the last sync with the server did not complete.
 * - `offline`: there is a server, but it cannot be reached right now; an
 *   amber dot, so it never passes for a deliberate local-only state.
 * - `local`: there is a server, but this file has never been uploaded to
 *   it, so it does not sync.
 * - `disabled`: syncing is turned off for this file.
 * - `syncing`: a sync is under way.
 * - `connecting`: the server is being asked who is signed in.
 * - `synced`: connected, and the budget is up to date with the server.
 */
export type AccountStatusKind =
  | 'no-server'
  | 'error'
  | 'offline'
  | 'local'
  | 'disabled'
  | 'syncing'
  | 'connecting'
  | 'synced';

export type AccountStatus = {
  kind: AccountStatusKind;
  /** The state in two or three words, as the menu header shows it. */
  message: string;
  /** What that means and, where there is one, what to do about it. */
  detail: string;
  /**
   * How the dot is drawn: green, amber, grey, red, or not at all. Amber is
   * for a server that should be reachable and isn't; grey for the states
   * that were chosen, a local file or sync turned off.
   */
  tone: 'ok' | 'warning' | 'quiet' | 'error' | 'none';
  /** The sync item's text, or null where there is no server to sync with. */
  syncAction: string | null;
  /** The sync item can't do anything right now. */
  isSyncDisabled: boolean;
};

export type AccountStatusInputs = {
  /** The server URL, or nothing when the budget is on this device only. */
  serverUrl: string | null | undefined;
  /** The server has been found unreachable. */
  isServerOffline: boolean;
  /** Who is signed in is still being fetched from the server. */
  isLoadingUser: boolean;
  /** The last sync's outcome, from the sync events. */
  syncState: SyncState;
  isSyncing: boolean;
};

/** Works out the account status from the server and sync facts. */
export function getAccountStatus(
  {
    serverUrl,
    isServerOffline,
    isLoadingUser,
    syncState,
    isSyncing,
  }: AccountStatusInputs,
  t: TFunction,
): AccountStatus {
  if (!serverUrl) {
    return {
      kind: 'no-server',
      message: t('No server'),
      detail: t(
        'Your budget is saved on this device only. A server syncs it across devices and keeps a backup.',
      ),
      tone: 'none',
      syncAction: null,
      isSyncDisabled: true,
    };
  }
  if (syncState === 'error') {
    return {
      kind: 'error',
      message: t('Sync failed'),
      detail: t(
        'The last sync with your server did not complete. Try syncing again; if it keeps failing, check the server.',
      ),
      tone: 'error',
      syncAction: t('Sync failed. Try again'),
      isSyncDisabled: false,
    };
  }
  if (isServerOffline || syncState === 'offline') {
    return {
      kind: 'offline',
      message: t('Server unreachable'),
      detail: t(
        'Your server cannot be reached right now. Changes are saved on this device and will sync once it is reachable again.',
      ),
      tone: 'warning',
      syncAction: t('Offline. Will sync when reconnected'),
      isSyncDisabled: true,
    };
  }
  if (syncState === 'local') {
    return {
      kind: 'local',
      message: t('Not on the server'),
      detail: t(
        'This file is on this device only. Upload it from the file list to sync it with your server.',
      ),
      tone: 'quiet',
      syncAction: t('Local file, not synced'),
      isSyncDisabled: true,
    };
  }
  if (syncState === 'disabled') {
    return {
      kind: 'disabled',
      message: t('Sync turned off'),
      detail: t('Syncing is turned off for this file.'),
      tone: 'quiet',
      syncAction: t('Syncing disabled for this file'),
      isSyncDisabled: true,
    };
  }
  if (isSyncing) {
    return {
      kind: 'syncing',
      message: t('Syncing…'),
      detail: t('Your budget is syncing with your server.'),
      tone: 'ok',
      syncAction: t('Syncing…'),
      isSyncDisabled: false,
    };
  }
  if (isLoadingUser) {
    return {
      kind: 'connecting',
      message: t('Connecting…'),
      detail: t('Checking who is signed in to your server.'),
      tone: 'quiet',
      syncAction: t('Sync now'),
      isSyncDisabled: false,
    };
  }
  return {
    kind: 'synced',
    message: t('Synced with server'),
    detail: t(
      'Connected to your server. Your budget is up to date across your devices.',
    ),
    tone: 'ok',
    syncAction: t('Sync now'),
    isSyncDisabled: false,
  };
}

/**
 * The initials for an account's avatar: the first letter of the first and
 * last words of the name, in the name's own script. An empty name gives
 * none.
 */
export function getInitials(name: string | null | undefined) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
  return (first + last).toLocaleUpperCase();
}
