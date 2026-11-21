import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  getSummaryLayout,
  maxSummaryWidths,
  NO_SUMMARY_WIDTHS,
} from './budgetHeaderLayout';
import type { SummaryDetailsKind, SummaryWidths } from './budgetHeaderLayout';
import { useFontsVersion } from './measureText';

/**
 * What a month's summary needs: the widths of its arrangements at each
 * figure size, and its detail lines.
 */
export type SummaryNeeds = {
  widths: SummaryWidths;
  detailLines: number;
};

type ReportSummaryNeeds = (month: string, needs: SummaryNeeds | null) => void;

const SummaryNeedsContext = createContext<ReportSummaryNeeds | null>(null);

export const SummaryNeedsProvider = SummaryNeedsContext.Provider;

const sameWidths = (a: SummaryWidths, b: SummaryWidths) =>
  (['figure', 'wideFigure', 'detailColumns'] as const).every(key =>
    a[key].every((w, i) => b[key][i] === w),
  ) && a.details === b.details;

const NO_NEEDS: SummaryNeeds = { widths: NO_SUMMARY_WIDTHS, detailLines: 0 };

/**
 * Chooses the summary layout. Every month in the budget's range reports
 * what it displays, whether or not it is on screen, so the layout already
 * suits every month before the first step. Whether details go under the
 * figure, which sets the row's height, the figure's column and the size
 * of its amount are decided for the whole budget, so stepping never
 * moves the table, a figure or the details beside it.
 */
export function useSummaryLayout(
  columnWidth: number,
  resetKey: string,
  details: SummaryDetailsKind,
) {
  const byMonth = useRef({
    key: resetKey,
    needs: new Map<string, SummaryNeeds>(),
  });
  const [needed, setNeeded] = useState({ key: resetKey, ...NO_NEEDS });
  const reportSummaryNeeds = useCallback<ReportSummaryNeeds>(
    (month, needs) => {
      if (byMonth.current.key !== resetKey) {
        byMonth.current = { key: resetKey, needs: new Map() };
      }
      if (needs) {
        byMonth.current.needs.set(month, needs);
      } else {
        byMonth.current.needs.delete(month);
      }
      const all = [...byMonth.current.needs.values()];
      const next = {
        key: resetKey,
        widths: maxSummaryWidths(all.map(n => n.widths)),
        detailLines: Math.max(0, ...all.map(n => n.detailLines)),
      };
      setNeeded(prev =>
        prev.key === resetKey &&
        sameWidths(prev.widths, next.widths) &&
        prev.detailLines === next.detailLines
          ? prev
          : next,
      );
    },
    [resetKey],
  );

  const { key, ...needs } = needed;
  const summaryLayout = getSummaryLayout({
    columnWidth,
    details,
    ...(key === resetKey ? needs : NO_NEEDS),
  });
  return { summaryLayout, reportSummaryNeeds };
}

/** Tells the budget table what this month's summary displays. */
export function useReportSummaryNeeds(month: string, needs: SummaryNeeds) {
  const report = useContext(SummaryNeedsContext);
  const { detailLines } = needs;
  // The widths are measured afresh each render, and again once the web
  // font is in; only their values matter
  useFontsVersion();
  const widthsKey = JSON.stringify(needs.widths);
  useEffect(() => {
    report?.(month, {
      widths: JSON.parse(widthsKey) as SummaryWidths,
      detailLines,
    });
  }, [report, month, widthsKey, detailLines]);
  useEffect(() => () => report?.(month, null), [report, month]);
}
