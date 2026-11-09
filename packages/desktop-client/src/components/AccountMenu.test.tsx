import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { AccountMenu } from './AccountMenu';
import { getAccountStatus, getInitials } from './accountStatus';

let mockUnseenCount = 0;
let mockNewsFeedEnabled = true;

vi.mock('#hooks/useNewsFeed', () => ({
  useNewsFeed: () => ({
    isEnabled: mockNewsFeedEnabled,
    entries: [],
    unseenCount: mockUnseenCount,
    lastSeenNewsDate: undefined,
    markAllSeen: vi.fn(),
    isLoading: false,
    errorKind: undefined,
    retry: vi.fn(),
  }),
}));

vi.mock('#hooks/useSyncStatus', () => ({
  useSyncStatus: () => ({ isSyncing: false, syncState: null }),
}));

vi.mock('#hooks/useHelpMenu', () => ({
  useHelpMenu: () => ({
    items: [{ name: 'docs', text: 'Documentation' }],
    onMenuSelect: vi.fn(),
  }),
}));

let mockDisplayName: string | null = null;

vi.mock('./LoggedInUser', () => ({
  useServerAccount: () => ({
    loading: false,
    serverUrl: 'https://example.test',
    isServerOffline: false,
    serverStatus: { state: 'online', message: 'Server online', tooltip: '' },
    displayName: mockDisplayName,
    menuItems: [{ name: 'sign-out', text: 'Sign out' }],
    onMenuSelect: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderMenu() {
  return render(
    <TestProviders>
      <MemoryRouter initialEntries={['/budget']}>
        <AccountMenu />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </TestProviders>,
  );
}

describe('AccountMenu', () => {
  beforeEach(() => {
    mockUnseenCount = 0;
    mockNewsFeedEnabled = true;
    mockDisplayName = null;
  });

  it('names the control as the account menu, with the sync state', () => {
    renderMenu();
    const button = screen.getByRole('button', {
      name: 'Account and app menu. Synced with server',
    });
    // The state and the name are in the accessible name, not on the chip,
    // which is always the same width
    expect(button).not.toHaveTextContent('Synced');
  });

  it('shows a signed-in user as initials and names the chip after them', () => {
    mockDisplayName = 'Ada Lovelace';
    renderMenu();
    const button = screen.getByRole('button', {
      name: 'Ada Lovelace, account and app menu. Synced with server',
    });
    expect(button).toHaveTextContent('AL');
    expect(button).not.toHaveTextContent('Ada Lovelace');
  });

  it('announces unread notifications and caps the badge at 9+', () => {
    mockUnseenCount = 12;
    renderMenu();
    expect(
      screen.getByRole('button', {
        name: 'Account and app menu. Synced with server. 12 unread notifications',
      }),
    ).toHaveTextContent('9+');
  });

  it('ignores cached unread entries once the news feed is turned off', () => {
    mockUnseenCount = 3;
    mockNewsFeedEnabled = false;
    renderMenu();
    const button = screen.getByRole('button', {
      name: 'Account and app menu. Synced with server',
    });
    expect(button).not.toHaveTextContent('3');
  });

  it('holds sync, privacy, notifications, help and account actions', async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Account and app menu. Synced with server',
      }),
    );

    expect(screen.getByText('Sync now')).toBeInTheDocument();
    expect(screen.getByText('Privacy mode')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('opens the notifications page from the menu', async () => {
    mockUnseenCount = 3;
    renderMenu();
    expect(screen.getByTestId('location')).toHaveTextContent('/budget');

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Account and app menu. Synced with server. 3 unread notifications',
      }),
    );
    await userEvent.click(screen.getByText('Notifications (3 unread)'));

    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
  });

  it('chooses the focused item from the keyboard, whatever is hovered', async () => {
    renderMenu();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Account and app menu. Synced with server',
      }),
    );
    expect(screen.getByRole('menuitem', { name: /Sync now/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    const privacy = screen.getByRole('menuitemcheckbox', {
      name: 'Privacy mode',
    });
    expect(privacy).toHaveFocus();
    expect(privacy).toHaveAttribute('aria-checked', 'false');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus();
    await userEvent.keyboard('{Home}{ArrowDown}{ArrowDown}');

    const notifications = screen.getByRole('menuitem', {
      name: 'Notifications',
    });
    expect(notifications).toHaveFocus();
    await userEvent.hover(
      screen.getByRole('menuitem', { name: 'Documentation' }),
    );
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
  });
});

describe('getAccountStatus', () => {
  const t = ((key: string) => key) as unknown as Parameters<
    typeof getAccountStatus
  >[1];
  const base = {
    serverUrl: 'https://example.test',
    isServerOffline: false,
    isLoadingUser: false,
    syncState: null,
    isSyncing: false,
  } as const;

  it('has no state without a server, and no sync item', () => {
    const status = getAccountStatus({ ...base, serverUrl: null }, t);
    expect(status.kind).toBe('no-server');
    expect(status.tone).toBe('none');
    expect(status.syncAction).toBeNull();
  });

  it('puts a failed sync before a healthy server', () => {
    const status = getAccountStatus({ ...base, syncState: 'error' }, t);
    expect(status).toMatchObject({
      kind: 'error',
      tone: 'error',
      isSyncDisabled: false,
    });
  });

  it('is offline whether the server or the network says so', () => {
    expect(getAccountStatus({ ...base, isServerOffline: true }, t).kind).toBe(
      'offline',
    );
    expect(
      getAccountStatus({ ...base, syncState: 'offline' }, t),
    ).toMatchObject({ kind: 'offline', tone: 'warning', isSyncDisabled: true });
  });

  it('tells a local-only file and disabled sync apart from being synced', () => {
    expect(getAccountStatus({ ...base, syncState: 'local' }, t).kind).toBe(
      'local',
    );
    expect(getAccountStatus({ ...base, syncState: 'disabled' }, t).kind).toBe(
      'disabled',
    );
    expect(getAccountStatus(base, t)).toMatchObject({
      kind: 'synced',
      tone: 'ok',
    });
  });

  it('shows syncing over connecting, and connecting over synced', () => {
    expect(
      getAccountStatus({ ...base, isSyncing: true, isLoadingUser: true }, t)
        .kind,
    ).toBe('syncing');
    expect(getAccountStatus({ ...base, isLoadingUser: true }, t).kind).toBe(
      'connecting',
    );
  });
});

describe('getInitials', () => {
  it('takes the first and last names, in upper case', () => {
    expect(getInitials('ada lovelace')).toBe('AL');
    expect(getInitials('Ada')).toBe('A');
    expect(getInitials('Ada King, Countess of Lovelace')).toBe('AL');
    expect(getInitials('')).toBe('');
    expect(getInitials(null)).toBe('');
  });
});
