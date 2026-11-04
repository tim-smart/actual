import React, { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown, SvgUser } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as Platform from '@actual-app/core/shared/platform';
import type { TransObjectLiteral } from '@actual-app/core/types/util';
import { css, cx, keyframes } from '@emotion/css';

import { sync } from '#app/appSlice';
import { headerControlClass } from '#components/budget/headerStyles';
import { useHelpMenu } from '#hooks/useHelpMenu';
import type { HelpMenuItem } from '#hooks/useHelpMenu';
import { useNavigate } from '#hooks/useNavigate';
import { useNewsFeed } from '#hooks/useNewsFeed';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useSyncStatus } from '#hooks/useSyncStatus';
import { useDispatch, useSelector } from '#redux';

import { getAccountStatus, getInitials } from './accountStatus';
import type { AccountStatus } from './accountStatus';
import { useServerAccount } from './LoggedInUser';
import { PrivacyFilter } from './PrivacyFilter';

type AccountMenuItem =
  | 'sync'
  | 'privacy'
  | 'notifications'
  | HelpMenuItem
  | string;

const pulse = keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0.35 },
  '100%': { opacity: 1 },
});

const modifierKey = Platform.OS === 'mac' ? '⌘' : 'Ctrl+';

/** The avatar on the chip: a circle with the user's initials or a person. */
const AVATAR_SIZE = 20;

/**
 * The one control at the top right. Its menu holds everything the old row of
 * toolbar icons did: sync, privacy mode, notifications, help and the server
 * account actions. It looks like what it is, an account menu, whatever the
 * server is doing: an avatar with a chevron, the user's initials when
 * someone is signed in and a person otherwise. It is always the same
 * width, so no name or notice can push into the month headings beside it;
 * the name is in its tooltip and at the head of its menu. The dot on the
 * avatar, the tooltip, the menu header and the sync item all read one
 * account status, so they never disagree about whether the budget syncs.
 */
export function AccountMenu() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const {
    loading,
    serverUrl,
    isServerOffline,
    displayName,
    menuItems,
    onMenuSelect,
  } = useServerAccount();
  const hasSyncedPrefs = useSelector(state => state.prefs.synced);
  const { items: helpItems, onMenuSelect: onHelpSelect } = useHelpMenu();

  const { isSyncing, syncState } = useSyncStatus({ syncingEndDelayMs: 200 });
  const status = getAccountStatus(
    {
      serverUrl,
      isServerOffline,
      isLoadingUser: loading,
      syncState,
      isSyncing,
    },
    t,
  );
  const onSync = () => dispatch(sync());
  useHotkeys(
    'ctrl+s, cmd+s, meta+s',
    onSync,
    { enableOnFormTags: true, preventDefault: true, scopes: ['app'] },
    [onSync],
  );

  const [isPrivacyEnabledPref, setPrivacyEnabledPref] =
    useSyncedPref('isPrivacyEnabled');
  const isPrivacyEnabled = String(isPrivacyEnabledPref) === 'true';
  const togglePrivacy = () => setPrivacyEnabledPref(String(!isPrivacyEnabled));
  useHotkeys(
    'shift+ctrl+p, shift+cmd+p, shift+meta+p',
    togglePrivacy,
    { preventDefault: true, scopes: ['app'] },
    [togglePrivacy],
  );

  const { isEnabled: isNewsFeedEnabled, unseenCount: feedUnseenCount } =
    useNewsFeed();
  // The feed stays cached after it is turned off; don't keep counting it.
  const unseenCount = isNewsFeedEnabled ? feedUnseenCount : 0;

  useHotkeys('?', () => setIsOpen(true), { useKey: true });

  const items: MenuItem<AccountMenuItem>[] = [
    ...(status.syncAction
      ? [
          {
            name: 'sync',
            text: status.syncAction,
            key: `${modifierKey}S`,
            disabled: status.isSyncDisabled,
          },
        ]
      : []),
    {
      name: 'privacy',
      text: t('Privacy mode'),
      toggle: isPrivacyEnabled,
      tooltip: t('Hide amounts on screen ({{shortcut}})', {
        shortcut: `⇧${modifierKey}P`,
      }),
    },
    ...(isNewsFeedEnabled
      ? [
          {
            name: 'notifications',
            text:
              unseenCount > 0
                ? t('Notifications ({{count}} unread)', { count: unseenCount })
                : t('Notifications'),
          },
        ]
      : []),
    Menu.line,
    ...helpItems,
    Menu.line,
    ...menuItems,
  ];

  const onSelect = (name: AccountMenuItem) => {
    switch (name) {
      case 'sync':
        setIsOpen(false);
        void onSync();
        break;
      case 'privacy':
        togglePrivacy();
        break;
      case 'notifications':
        setIsOpen(false);
        void navigate('/notifications');
        break;
      case 'docs':
      case 'discord':
      case 'keyboard-shortcuts':
      case 'start-tour':
      case 'goal-templates':
        setIsOpen(false);
        onHelpSelect(name);
        break;
      default:
        setIsOpen(false);
        void onMenuSelect(name);
    }
  };

  // The name starts with who the chip stands for, then the status its dot
  // shows. A name hidden by privacy mode stays out of it.
  const isNameHidden = !!displayName && hasSyncedPrefs && isPrivacyEnabled;
  const accessibleLabel = [
    displayName && !isNameHidden
      ? t('{{name}}, account and app menu', { name: displayName })
      : t('Account and app menu'),
    status.message,
    unseenCount > 0 &&
      t('{{count}} unread notifications', { count: unseenCount }),
  ]
    .filter(Boolean)
    .join('. ');

  const initials = getInitials(displayName);
  const name = displayName && (
    <Text style={{ fontWeight: 600, color: theme.menuItemText }}>
      <Trans>
        Signed in as{' '}
        <PrivacyFilter>
          {{ userName: displayName } as TransObjectLiteral}
        </PrivacyFilter>
      </Trans>
    </Text>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Tooltip
        placement="bottom end"
        content={
          <View style={{ gap: 6, maxWidth: 260 }}>
            {displayName && (
              <View style={{ fontWeight: 600 }}>
                <Trans>
                  Signed in as{' '}
                  <PrivacyFilter>
                    {{ userName: displayName } as TransObjectLiteral}
                  </PrivacyFilter>
                </Trans>
              </View>
            )}
            <StatusLine status={status} isSyncing={isSyncing} />
            <View style={{ color: theme.pageTextLight }}>{status.detail}</View>
          </View>
        }
        triggerProps={{ isDisabled: isOpen }}
      >
        <Button
          ref={triggerRef}
          variant="bare"
          aria-label={accessibleLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          data-testid="help-menu-button"
          onPress={() => setIsOpen(true)}
          // The same control as the budget header's year button and
          // Today: one family of controls, on the title bar and on the
          // header's heading row alike
          className={cx(
            headerControlClass,
            css({ gap: 5, padding: '0 6px 0 2px' }),
          )}
        >
          <View
            aria-hidden
            style={{
              position: 'relative',
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.budgetControlTrack,
              color: theme.pageText,
              flexShrink: 0,
            }}
          >
            {initials ? (
              <Text
                style={{
                  fontSize: initials.length > 1 ? 9 : 10,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  lineHeight: 1,
                }}
              >
                {hasSyncedPrefs ? (
                  <PrivacyFilter>{initials}</PrivacyFilter>
                ) : (
                  initials
                )}
              </Text>
            ) : (
              <SvgUser style={{ width: 10, height: 10 }} />
            )}
            <StatusDot
              status={status}
              isSyncing={isSyncing}
              size={8}
              // A ring of the chip's own colour sets the dot off the
              // avatar behind it
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                boxShadow: `0 0 0 2px ${theme.tableBackground}`,
              }}
            />
          </View>
          {unseenCount > 0 && (
            <View
              aria-hidden
              style={{
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                lineHeight: '16px',
                textAlign: 'center',
                backgroundColor: theme.buttonPrimaryBackground,
                color: theme.notificationBadgeText,
              }}
            >
              {unseenCount > 9 ? t('{{max}}+', { max: 9 }) : unseenCount}
            </View>
          )}
          <SvgCheveronDown
            aria-hidden
            style={{
              width: 11,
              height: 11,
              flexShrink: 0,
              color: theme.tableHeaderText,
            }}
          />
        </Button>
      </Tooltip>

      <Popover
        placement="bottom end"
        offset={6}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={() => setIsOpen(false)}
        style={{ minWidth: 240 }}
      >
        <Menu
          header={
            <View
              style={{
                padding: '10px 12px 8px',
                borderBottom: `1px solid ${theme.menuBorder}`,
                marginBottom: 3,
                gap: 3,
              }}
            >
              {name ?? (
                <Text style={{ fontWeight: 600, color: theme.menuItemText }}>
                  <Trans>Account</Trans>
                </Text>
              )}
              {/* The server's state, second to who is signed in */}
              <StatusLine status={status} isSyncing={isSyncing} />
            </View>
          }
          items={items}
          onMenuSelect={onSelect}
        />
      </Popover>
    </View>
  );
}

/** The status dot: green when synced, amber when the server can't be
 * reached, grey when syncing is off by choice, red when a sync failed, and
 * nothing at all when there is no server to sync with. */
function StatusDot({
  status,
  isSyncing,
  size,
  style,
}: {
  status: AccountStatus;
  isSyncing: boolean;
  size: number;
  style?: CSSProperties;
}) {
  if (status.tone === 'none') {
    return null;
  }
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        backgroundColor:
          status.tone === 'error'
            ? theme.errorText
            : status.tone === 'warning'
              ? theme.warningText
              : status.tone === 'ok'
                ? theme.noticeBackgroundDark
                : theme.pageTextSubdued,
        ...(isSyncing && {
          animation: `${pulse} 1.2s ease-in-out infinite`,
        }),
        ...style,
      }}
    />
  );
}

/** The status in words, with its dot before it. */
function StatusLine({
  status,
  isSyncing,
}: {
  status: AccountStatus;
  isSyncing: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <StatusDot status={status} isSyncing={isSyncing} size={7} />
      <Text style={{ fontSize: 12, color: theme.tableHeaderText }}>
        {status.message}
      </Text>
    </View>
  );
}
