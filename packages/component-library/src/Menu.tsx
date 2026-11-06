import { useContext, useEffect, useId, useRef } from 'react';
import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  SVGProps,
} from 'react';
import { OverlayTriggerStateContext } from 'react-aria-components';

import { css } from '@emotion/css';

import { styles } from './styles';
import { Text } from './Text';
import { theme } from './theme';
import { Toggle } from './Toggle';
import { View } from './View';

const MenuLine: unique symbol = Symbol('menu-line');
const MenuLabel: unique symbol = Symbol('menu-label');
Menu.line = MenuLine as typeof MenuLine;
Menu.label = MenuLabel as typeof MenuLabel;

// The keyboard focus mark on an item: an inset ring, so it shows on the
// highlight as well as on the menu itself
// Hover and keyboard focus share the highlight, but only keyboard focus gets
// the ring, and only the focused item answers Enter or Space
const menuItemClassName = css({
  outline: 'none',
  userSelect: 'none',
  color: theme.menuItemText,
  '&:is(:hover, :focus-visible):not([aria-disabled])': {
    backgroundColor: theme.menuItemBackgroundHover,
    color: theme.menuItemTextHover,
  },
  // On the highlight a shortcut hint takes the item's colour; its own
  // accent falls below AA there
  '&:is(:hover, :focus-visible):not([aria-disabled]) [data-keybinding]': {
    color: 'inherit',
  },
  '&:focus-visible': {
    boxShadow: `inset 0 0 0 2px ${theme.menuItemFocusRing}`,
  },
});

type KeybindingProps = {
  keyName: ReactNode;
};

function Keybinding({ keyName }: KeybindingProps) {
  return (
    <Text
      data-keybinding
      style={{ fontSize: 10, color: theme.menuKeybindingText }}
    >
      {keyName}
    </Text>
  );
}

export type MenuItemObject<NameType, Type extends string | symbol = string> = {
  type?: Type;
  name: NameType;
  disabled?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  iconSize?: number;
  text: string;
  key?: string;
  toggle?: boolean;
  tooltip?: string;
};

export type MenuItem<NameType = string> =
  | MenuItemObject<NameType>
  | MenuItemObject<string, typeof Menu.label>
  | typeof Menu.line;

function isLabel<T>(
  item: MenuItemObject<T> | MenuItemObject<string, typeof Menu.label>,
): item is MenuItemObject<string, typeof Menu.label> {
  return item.type === Menu.label;
}

type MenuProps<NameType> = {
  header?: ReactNode;
  footer?: ReactNode;
  items: Array<MenuItem<NameType>>;
  onMenuSelect?: (itemName: NameType) => void;
  style?: CSSProperties;
  className?: string;
  getItemStyle?: (item: MenuItemObject<NameType>) => CSSProperties;
  /** "close" closes the surrounding dialog once an item is chosen. */
  slot?: string | null;
};

export function Menu<const NameType = string>({
  header,
  footer,
  items: allItems,
  onMenuSelect,
  style,
  className,
  getItemStyle,
  slot,
}: MenuProps<NameType>) {
  const elRef = useRef<HTMLDivElement>(null);
  const groupId = useId();
  // The item elements by index, so keyboard navigation can move real focus
  // between them
  const itemRefs = useRef(new Map<number, HTMLDivElement>());
  const items = allItems.filter(x => x);
  const overlayState = useContext(OverlayTriggerStateContext);

  function choose(item: MenuItemObject<NameType>) {
    if (item.disabled) {
      return;
    }
    onMenuSelect?.(item.name);
    if (slot === 'close') {
      overlayState?.close();
    }
  }

  function getItemElements() {
    return [...itemRefs.current.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, el]) => el);
  }

  // The pointer only paints its highlight; the keyboard works from the item
  // that has focus, so hovering one item never changes what Enter chooses
  function onKeyDown(e: KeyboardEvent) {
    const elements = getItemElements();
    if (elements.length === 0) {
      return;
    }
    const current = elements.indexOf(e.target as HTMLDivElement);
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowUp':
        next = current === -1 ? elements.length - 1 : current - 1;
        break;
      case 'ArrowDown':
        next = current === -1 ? 0 : current + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = elements.length - 1;
        break;
      default:
    }
    if (next !== null) {
      e.preventDefault();
      elements[Math.min(Math.max(next, 0), elements.length - 1)].focus();
    }
  }

  // Enter and Space choose the focused item exactly once, toggles included.
  // Caught before the item button handles the key itself; keys typed into a
  // field in the header or footer are left alone.
  function onKeyDownCapture(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') {
      return;
    }
    const entry = [...itemRefs.current.entries()].find(
      ([, el]) => el === e.target,
    );
    if (!entry) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const item = items[entry[0]];
    if (item !== Menu.line && !isLabel(item)) {
      choose(item);
    }
  }

  // Opening the menu puts focus on its first item, unless the user is typing
  // somewhere; the focus ring shows only when the keyboard opened it
  useEffect(() => {
    const activeElement = document.activeElement;

    if (
      activeElement &&
      (['input', 'select', 'textarea'].includes(
        activeElement.tagName.toLowerCase(),
      ) ||
        activeElement.hasAttribute('contenteditable') ||
        activeElement.getAttribute('role') === 'textbox')
    ) {
      return;
    }

    const first = getItemElements()[0];
    if (first) {
      first.focus();
    } else {
      elRef.current?.focus();
    }
  }, []);

  function renderItem(item: MenuItem<NameType>, idx: number) {
    if (item === Menu.line) {
      return (
        <View key={idx} role="separator" style={{ margin: '3px 0px' }}>
          <View style={{ borderTop: '1px solid ' + theme.menuBorder }} />
        </View>
      );
    } else if (isLabel(item)) {
      return (
        <Text
          key={idx}
          id={`${groupId}-${idx}`}
          aria-hidden
          style={{
            color: theme.menuItemTextHeader,
            fontSize: 11,
            lineHeight: '1em',
            textTransform: 'uppercase',
            margin: '3px 9px',
            marginTop: 5,
          }}
        >
          {item.name}
        </Text>
      );
    }

    const Icon = item.icon;
    const isToggle = item.toggle !== undefined;

    return (
      <View
        // By position, not name: a menu whose items arrive after it opens
        // (placeholder first, real actions once loaded) keeps the focused
        // element, since removing it would blur and close a non-modal popover
        // oxlint-disable-next-line react/no-array-index-key
        key={idx}
        innerRef={el => {
          if (el) {
            itemRefs.current.set(idx, el);
          } else {
            itemRefs.current.delete(idx);
          }
        }}
        role={isToggle ? 'menuitemcheckbox' : 'menuitem'}
        tabIndex={-1}
        aria-checked={isToggle ? item.toggle : undefined}
        aria-disabled={item.disabled || undefined}
        className={menuItemClassName}
        style={{
          cursor: 'default',
          padding: 10,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          ...styles.smallText,
          ...(item.disabled && { color: theme.buttonBareDisabledText }),
        }}
        // Inline, so a caller's colours win over the shared highlight as
        // they always have
        nativeStyle={getItemStyle?.(item)}
        onClick={() => choose(item)}
      >
        {/* Force it to line up evenly */}
        {isToggle ? (
          <View
            style={{
              flexDirection: 'row',
              flex: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text title={item.tooltip}>{item.text}</Text>
            {/* Only a picture of the state: the item itself is the
                checkbox, so the switch takes no focus or clicks */}
            <View
              aria-hidden
              inert
              style={{ marginLeft: 5, pointerEvents: 'none' }}
            >
              <Toggle id={`${groupId}-toggle-${idx}`} isOn={!!item.toggle} />
            </View>
          </View>
        ) : (
          <>
            {Icon && (
              <Icon
                width={item.iconSize || 10}
                height={item.iconSize || 10}
                style={{ marginRight: 7, width: item.iconSize || 10 }}
              />
            )}
            <Text title={item.tooltip}>{item.text}</Text>
            <View style={{ flex: 1 }} />
          </>
        )}
        {item.key && <Keybinding keyName={item.key} />}
      </View>
    );
  }

  // Items under a label form a named group, so the label is announced with
  // them; anything before the first label sits directly in the menu
  const sections: Array<{ labelIndex: number | null; indexes: number[] }> = [
    { labelIndex: null, indexes: [] },
  ];
  items.forEach((item, idx) => {
    if (item !== Menu.line && isLabel(item)) {
      sections.push({ labelIndex: idx, indexes: [] });
    } else {
      sections[sections.length - 1].indexes.push(idx);
    }
  });

  return (
    <View
      className={className}
      style={{ outline: 'none', borderRadius: 4, overflow: 'hidden', ...style }}
    >
      {header}
      <View
        role="menu"
        tabIndex={-1}
        style={{ outline: 'none' }}
        onKeyDown={onKeyDown}
        onKeyDownCapture={onKeyDownCapture}
        innerRef={elRef}
      >
        {sections.map(({ labelIndex, indexes }) =>
          labelIndex === null ? (
            indexes.map(idx => renderItem(items[idx], idx))
          ) : (
            <View
              key={labelIndex}
              role="group"
              aria-labelledby={`${groupId}-${labelIndex}`}
            >
              {renderItem(items[labelIndex], labelIndex)}
              {indexes.map(idx => renderItem(items[idx], idx))}
            </View>
          ),
        )}
      </View>
      {footer}
    </View>
  );
}
