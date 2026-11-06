import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { useGlobalPref } from '#hooks/useGlobalPref';

import { useSidebar } from './sidebar/SidebarProvider';

type TitlebarLayout = {
  /**
   * The title bar has given up its row. On the budget page it has nothing
   * of its own to show but the account menu, so the budget header takes
   * the top of the page and the account menu sits on its heading row
   * instead. This holds in the desktop app as well as the browser: the
   * desktop window has the system's own frame, which is where its drag
   * strip and window controls are, and the row inside the window holds
   * neither. (The renderer build resolves the platform module to its
   * browser variant in any case, so a platform guard here would only look
   * like one.)
   */
  isCollapsed: boolean;
};

const TitlebarLayoutContext = createContext<TitlebarLayout>({
  isCollapsed: false,
});

/** Decides whether the title bar keeps its row. */
export function TitlebarLayoutProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const sidebar = useSidebar();
  const { isNarrowWidth } = useResponsive();
  const [floatingSidebar] = useGlobalPref('floatingSidebar');

  // The sidebar's menu button and Back are the title bar's own; with
  // either to show, it keeps its row
  const hasOwnControls =
    floatingSidebar || sidebar.alwaysFloats || !!location.state?.goBack;
  const isCollapsed =
    !isNarrowWidth && location.pathname === '/budget' && !hasOwnControls;

  return (
    <TitlebarLayoutContext.Provider value={{ isCollapsed }}>
      {children}
    </TitlebarLayoutContext.Provider>
  );
}

export function useTitlebarLayout() {
  return useContext(TitlebarLayoutContext);
}
