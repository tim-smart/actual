import type { ReactNode } from 'react';

import { css } from '@emotion/css';

import { Button } from '#Button';
import { theme } from '#theme';

import type { RangePosition } from './util';

/**
 * How a cell sits in a band that runs across the row: whether the band
 * carries on into the cell before it and after it, so only its outer ends
 * are rounded.
 */
export type BandJoin = { before: boolean; after: boolean };

type GridButtonProps = {
  selected: boolean;
  disabled: boolean;
  /** Marks the current month/day so it stands out even when not selected. */
  isToday?: boolean;
  /** Where the cell falls in the range band (or the hover preview). */
  position?: RangePosition;
  /**
   * Given (null outside the range) when every cell in the range is
   * selected, as one band: where the band joins this cell's neighbours.
   * Selection is then shown and announced alike for every cell in it.
   */
  band?: BandJoin | null;
  /** Full accessible name (e.g. the complete localized date). */
  label: string;
  onSelect: () => void;
  /** Called on pointer-enter to preview the range band. */
  onHover?: () => void;
  children: ReactNode;
};

/** Rounds only the band's outer ends. */
function bandRadius({ before, after }: BandJoin, radius = 4) {
  return `${before ? 0 : radius}px ${after ? 0 : radius}px ${
    after ? 0 : radius
  }px ${before ? 0 : radius}px`;
}

/**
 * Focus is a ring in the text colour, a shape neither the band's fill nor
 * today's underline share; above the neighbours, which the band leaves no
 * gap to.
 */
const spanFocusClass = css({
  position: 'relative',
  '&[data-focus-visible]': {
    zIndex: 1,
    outline: `2px solid ${theme.pageText}`,
    outlineOffset: 1,
  },
});

export function GridButton({
  selected,
  disabled,
  isToday = false,
  position = null,
  band,
  label,
  onSelect,
  onHover,
  children,
}: GridButtonProps) {
  const inRange = position != null;
  const rangeEdge = position === 'middle' || position == null ? null : position;
  if (band !== undefined) {
    return (
      <SpanGridButton
        selected={selected}
        disabled={disabled}
        isToday={isToday}
        band={band}
        label={label}
        onSelect={onSelect}
        onHover={onHover}
      >
        {children}
      </SpanGridButton>
    );
  }
  return (
    <Button
      variant={selected ? 'primary' : 'bare'}
      isDisabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      onPress={onSelect}
      onHoverStart={onHover}
      style={({ isHovered }) => ({
        padding: '8px 4px',
        fontSize: 12,
        minWidth: 0,
        // Match the selected (primary) variant's 1px border so selecting a
        // cell doesn't resize the grid.
        ...(selected
          ? {
              color: theme.datePickerSelectedText,
              ...(isHovered && {
                backgroundColor: theme.datePickerSelectedBackgroundHover,
              }),
            }
          : { border: '1px solid transparent' }),
        ...(isToday && {
          fontWeight: 'bold',
          // Inset ring marks the current period without shifting layout.
          boxShadow: `inset 0 0 0 1px ${theme.pageTextPositive}`,
          // On the range band or the hover fill the accent colour falls
          // below AA in the dark themes; the ring and weight still mark
          // the month there
          ...(!selected &&
            !inRange &&
            !isHovered && { color: theme.pageTextPositive }),
        }),
        ...(inRange &&
          !selected && {
            backgroundColor: theme.datePickerRangeBackground,
            borderRadius:
              rangeEdge === 'start'
                ? '4px 0 0 4px'
                : rangeEdge === 'end'
                  ? '0 4px 4px 0'
                  : 0,
          }),
      })}
    >
      {children}
    </Button>
  );
}

/**
 * A cell in a grid whose whole range is selected. Each state has its own
 * mark, so any of them can combine: the range is one filled band, today
 * underlined, focus a ring and hover a deeper fill.
 */
function SpanGridButton({
  selected,
  disabled,
  isToday,
  band,
  label,
  onSelect,
  onHover,
  children,
}: Omit<GridButtonProps, 'position'> & { isToday: boolean }) {
  return (
    <Button
      variant="bare"
      isDisabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      onPress={onSelect}
      onHoverStart={onHover}
      className={spanFocusClass}
      style={({ isHovered }) => ({
        padding: '8px 4px',
        fontSize: 12,
        minWidth: 0,
        border: '1px solid transparent',
        borderRadius: 4,
        ...(band && {
          fontWeight: 600,
          color: theme.datePickerSelectedText,
          backgroundColor: isHovered
            ? theme.datePickerSelectedBackgroundHover
            : theme.buttonPrimaryBackground,
          borderRadius: bandRadius(band),
        }),
        ...(isToday && {
          fontWeight: 700,
          textDecorationLine: 'underline',
          textDecorationThickness: 2,
          textUnderlineOffset: 3,
          // The accent colour only off the band and the hover fill, where
          // it keeps AA; the underline marks today on both
          ...(!band && !isHovered && { color: theme.pageTextPositive }),
        }),
      })}
    >
      {children}
    </Button>
  );
}
