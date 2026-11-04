import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Route, Routes, useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgArrowLeft } from '@actual-app/components/icons/v1';
import {
  SvgAlertTriangle,
  SvgNavigationMenu,
} from '@actual-app/components/icons/v2';
import { SpaceBetween } from '@actual-app/components/space-between';
import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { isDevelopmentEnvironment } from '@actual-app/core/shared/environment';
import * as Platform from '@actual-app/core/shared/platform';
import { css, cx } from '@emotion/css';

import { headerControlClass } from '#components/budget/headerStyles';
import { FinancialText } from '#components/FinancialText';
import { SharedArrayBufferWarning } from '#components/SharedArrayBufferWarning';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useNavigate } from '#hooks/useNavigate';
import { useSheetValue } from '#hooks/useSheetValue';
import * as bindings from '#spreadsheet/bindings';

import { AccountMenu } from './AccountMenu';
import { AccountSyncCheck } from './accounts/AccountSyncCheck';
import { Link } from './common/Link';
import { useSidebar } from './sidebar/SidebarProvider';
import { ThemeSelector } from './ThemeSelector';
import { useTitlebarLayout } from './TitlebarLayout';

/**
 * The link to the uncategorized transactions, red because they want
 * attention. On the budget header's heading row it is a compact control
 * of the header's own family, a warning sign and the count, so it can
 * never push into the month heading beside it; the full sentence is its
 * name and tooltip.
 */
function UncategorizedButton({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  const count: number | null = useSheetValue(bindings.uncategorizedCount());
  if (count === null || count <= 0) {
    return null;
  }
  if (!compact) {
    return (
      <Link
        variant="button"
        buttonVariant="bare"
        to="/categories/uncategorized"
        style={{
          color: theme.errorText,
        }}
      >
        <Trans count={count}>{{ count }} uncategorized transactions</Trans>
      </Link>
    );
  }
  const sentence = t('{{count}} uncategorized transactions', { count });
  return (
    <Tooltip
      placement="bottom end"
      content={
        <View style={{ gap: 4 }}>
          <View style={{ fontWeight: 600 }}>{sentence}</View>
          <View>
            <Trans>Click to give them categories.</Trans>
          </View>
        </View>
      }
    >
      <Link
        variant="button"
        buttonVariant="bare"
        to="/categories/uncategorized"
        aria-label={sentence}
        className={cx(
          headerControlClass,
          css({
            gap: 4,
            padding: '0 8px 0 7px',
            color: theme.errorText,
            '&[data-hovered]': { color: theme.errorText },
            '&[data-pressed]': { color: theme.errorText },
          }),
        )}
      >
        <SvgAlertTriangle
          aria-hidden
          style={{ width: 12, height: 12, flexShrink: 0 }}
        />
        <FinancialText style={{ fontWeight: 600 }}>{count}</FinancialText>
      </Link>
    </Tooltip>
  );
}

/**
 * The controls at the title bar's right end: the account menu, and the
 * notices that go with it. Where the title bar has given up its row, the
 * budget header shows them on its heading row instead; the development
 * theme switch stays off that row, where it would cost the last month
 * its name.
 */
export function TitlebarControls({ inHeader = false }: { inHeader?: boolean }) {
  const isTestEnv = useIsTestEnv();
  return (
    <SpaceBetween gap={10}>
      <UncategorizedButton compact={inHeader} />
      <SharedArrayBufferWarning />
      {isDevelopmentEnvironment() && !isTestEnv && !inHeader && (
        <ThemeSelector />
      )}
      <AccountMenu />
    </SpaceBetween>
  );
}

type TitlebarProps = {
  style?: CSSProperties;
};

export function Titlebar({ style }: TitlebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');
  const { isCollapsed } = useTitlebarLayout();

  return isNarrowWidth || isCollapsed ? null : (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 10px 0 15px',
        height: 36,
        pointerEvents: 'none',
        '& *': {
          pointerEvents: 'auto',
        },
        ...(!Platform.isBrowser && Platform.OS === 'mac' && floatingSidebar
          ? { paddingLeft: 80 }
          : {}),
        ...style,
      }}
    >
      {(floatingSidebar || sidebar.alwaysFloats) && (
        <Button
          aria-label={t('Sidebar menu')}
          variant="bare"
          style={{ marginRight: 8 }}
          onHoverStart={e => {
            if (e.pointerType === 'mouse') {
              sidebar.setHidden(false);
            }
          }}
          onPress={e => {
            if (e.pointerType !== 'mouse') {
              sidebar.setHidden(!sidebar.hidden);
            }
          }}
        >
          <SvgNavigationMenu
            className="menu"
            style={{ width: 15, height: 15, left: 0 }}
          />
        </Button>
      )}

      <Routes>
        <Route
          path="*"
          element={
            location.state?.goBack ? (
              <Button variant="bare" onPress={() => navigate(-1)}>
                <SvgArrowLeft
                  width={10}
                  height={10}
                  style={{ marginRight: 5 }}
                />{' '}
                <Trans>Back</Trans>
              </Button>
            ) : null
          }
        />

        <Route path="/accounts/:id" element={<AccountSyncCheck />} />
      </Routes>
      <View style={{ flex: 1 }} />
      <TitlebarControls />
    </View>
  );
}
