import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import type { RemoteFile, SyncedLocalFile } from '@actual-app/core/types/file';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { useAuth } from '#auth/AuthProvider';
import { Permissions } from '#auth/types';
import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { useDispatch, useSelector } from '#redux';
import { getUserData, signOut } from '#users/usersSlice';

import { PrivacyFilter } from './PrivacyFilter';
import { useMultiuserEnabled, useServerURL } from './ServerContext';

export type ServerStatus = {
  state: 'none' | 'offline' | 'online';
  message: string;
  tooltip: ReactNode;
};

type ServerAccountMenuItem = {
  name: string;
  text: string;
};

/**
 * Everything the account menu needs to know about the server and the signed
 * in user: the connection status, who is signed in, and the actions that
 * apply (sign out, change password, server URL, user management).
 */
export function useServerAccount() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector(state => state.user.data);
  const [loading, setLoading] = useState(true);
  const serverUrl = useServerURL();
  const [budgetId] = useMetadataPref('id');
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const location = useLocation();
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();
  const allFiles = useSelector(state => state.budgetfiles.allFiles || []);
  const remoteFiles = allFiles.filter(
    f => f.state === 'remote' || f.state === 'synced' || f.state === 'detached',
  ) as (SyncedLocalFile | RemoteFile)[];
  const currentFile = remoteFiles.find(f => f.cloudFileId === cloudFileId);

  const initializeUserData = useCallback(async () => {
    try {
      await dispatch(getUserData());
    } catch (error) {
      console.error('Failed to initialize user data:', error);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void initializeUserData();
  }, [initializeUserData]);

  useEffect(() => {
    return listen('sync-event', ({ type }) => {
      setLoading(type === 'start');
    });
  }, []);

  async function onCloseBudget() {
    await dispatch(closeBudget());
  }

  async function onChangePassword() {
    await onCloseBudget();
    void navigate('/change-password');
  }

  const onMenuSelect = async (type: string) => {
    switch (type) {
      case 'change-password':
        void onChangePassword();
        break;
      case 'sign-in':
        await onCloseBudget();
        void navigate('/login');
        break;
      case 'user-access':
        void navigate('/user-access');
        break;
      case 'user-directory':
        void navigate('/user-directory');
        break;
      case 'index':
        void navigate('/');
        break;
      case 'sign-out':
        void dispatch(signOut());
        break;
      case 'config-server':
        await onCloseBudget();
        void navigate('/config-server');
        break;
      default:
        break;
    }
  };

  function getServerStatus(): ServerStatus {
    if (!serverUrl) {
      return {
        state: 'none',
        message: t('No server'),
        tooltip: (
          <Trans>
            A server syncs your budget across devices and keeps a backup of your
            data.
            <br />
            Click to set one up.
          </Trans>
        ),
      };
    }

    if (userData?.offline) {
      return {
        state: 'offline',
        message: t('Server offline'),
        tooltip: (
          <Trans>
            Can't reach your server right now.
            <br />
            Changes are saved locally and will sync once it's reachable again.
          </Trans>
        ),
      };
    }

    return {
      state: 'online',
      message: t('Server online'),
      tooltip: (
        <Trans>Connected to your server — your budget is syncing.</Trans>
      ),
    };
  }

  const getMenuItems = (): (ServerAccountMenuItem | typeof Menu.line)[] => {
    const isAdmin = hasPermission(Permissions.ADMINISTRATOR);

    const baseMenu: (ServerAccountMenuItem | typeof Menu.line)[] = [];
    if (
      serverUrl &&
      !userData?.offline &&
      userData?.loginMethod === 'password'
    ) {
      baseMenu.push({ name: 'change-password', text: t('Change password') });
    }
    if (serverUrl) {
      baseMenu.push({ name: 'sign-out', text: t('Sign out') });
    }
    baseMenu.push({
      name: 'config-server',
      text: serverUrl ? t('Change server URL') : t('Start using a server'),
    });

    const adminMenu: (ServerAccountMenuItem | typeof Menu.line)[] = [];
    if (multiuserEnabled && isAdmin) {
      if (!budgetId && location.pathname !== '/') {
        adminMenu.push({ name: 'index', text: t('View file list') });
      } else if (
        serverUrl &&
        !userData?.offline &&
        location.pathname !== '/user-directory'
      ) {
        adminMenu.push({ name: 'user-directory', text: t('User Directory') });
      }
    }

    if (
      multiuserEnabled &&
      ((currentFile && userData && currentFile.owner === userData.userId) ||
        isAdmin) &&
      serverUrl &&
      !userData?.offline &&
      cloudFileId &&
      location.pathname !== '/user-access'
    ) {
      adminMenu.push({
        name: 'user-access',
        text: t('User Access Management'),
      });
    }

    if (adminMenu.length > 0) {
      adminMenu.push(Menu.line);
    }

    return [...adminMenu, ...baseMenu];
  };

  // The last known name stays while the server is asked again (every sync
  // asks), so the account menu's avatar never flickers between the
  // initials and a blank person
  const displayName =
    multiuserEnabled && userData?.displayName ? userData.displayName : null;

  return {
    loading: loading && Boolean(serverUrl),
    serverUrl,
    /** The server has been found unreachable. */
    isServerOffline: !!userData?.offline,
    serverStatus: getServerStatus(),
    displayName,
    menuItems: getMenuItems(),
    onMenuSelect,
  };
}

type LoggedInUserProps = {
  hideIfNoServer?: boolean;
  style?: CSSProperties;
};

export function LoggedInUser({ hideIfNoServer, style }: LoggedInUserProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hasSyncedPrefs = useSelector(state => state.prefs.synced);
  const {
    loading,
    serverUrl,
    serverStatus,
    displayName,
    menuItems,
    onMenuSelect,
  } = useServerAccount();

  if (hideIfNoServer && !serverUrl) return null;

  if (loading) {
    return (
      <Text
        style={{
          color: theme.pageTextLight,
          fontStyle: 'italic',
          ...styles.delayedFadeIn,
          ...style,
        }}
      >
        <Trans>Connecting...</Trans>
      </Text>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', ...style }}>
      <Tooltip
        placement="bottom end"
        content={serverStatus.tooltip}
        triggerProps={{ isDisabled: menuOpen }}
      >
        <Button
          ref={triggerRef}
          variant="bare"
          onPress={() => setMenuOpen(true)}
        >
          {serverStatus.message}
        </Button>
      </Tooltip>
      {displayName && !hasSyncedPrefs && (
        <small>
          (
          <Trans>
            logged in as:{' '}
            <span>{{ userName: displayName } as TransObjectLiteral}</span>
          </Trans>
          )
        </small>
      )}
      {displayName && hasSyncedPrefs && (
        <small>
          (
          <Trans>
            logged in as:{' '}
            <span>
              <PrivacyFilter>
                {{ userName: displayName } as TransObjectLiteral}
              </PrivacyFilter>
            </span>
          </Trans>
          )
        </small>
      )}

      <Popover
        offset={8}
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu
          onMenuSelect={name => {
            setMenuOpen(false);
            void onMenuSelect(name);
          }}
          items={menuItems.filter(Boolean)}
        />
      </Popover>
    </View>
  );
}
