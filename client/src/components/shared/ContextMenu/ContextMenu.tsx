import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import './ContextMenu.scss';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  shortcut?: string;
  children?: ContextMenuItem[];
}

export interface ContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

function MenuItemRow({
  item,
  onClose,
}: {
  item: ContextMenuItem;
  onClose: () => void;
}) {
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    if (item.disabled) return;
    if (hasChildren) return; // submenu items don't do anything on click
    item.onClick?.();
    onClose();
  }, [item, hasChildren, onClose]);

  const classNames = [
    'ContextMenu__item',
    item.danger && 'ContextMenu__item--danger',
    item.disabled && 'ContextMenu__item--disabled',
    item.checked && 'ContextMenu__item--checked',
    hasChildren && 'ContextMenu__item--hasChildren',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={itemRef}
      className={classNames}
      onClick={handleClick}
      onMouseEnter={() => hasChildren && setSubmenuOpen(true)}
      onMouseLeave={() => hasChildren && setSubmenuOpen(false)}
    >
      <span className="ContextMenu__check">{item.checked ? '\u2713' : ''}</span>
      {item.icon && <span className="ContextMenu__icon">{item.icon}</span>}
      <span className="ContextMenu__label">{item.label}</span>
      {item.shortcut && <span className="ContextMenu__shortcut">{item.shortcut}</span>}
      {hasChildren && <span className="ContextMenu__arrow">&#9656;</span>}
      {hasChildren && submenuOpen && (
        <div className="ContextMenu__submenu">
          {item.children!.map((child, i) => (
            <MenuItemRow key={i} item={child} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContextMenu({ open, position, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => onClose();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open, onClose]);

  // Viewport bounds adjustment
  const [adjustedPos, setAdjustedPos] = useState(position);
  useEffect(() => {
    if (!open || !menuRef.current) {
      setAdjustedPos(position);
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    let { x, y } = position;
    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 8;
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 8;
    }
    setAdjustedPos({ x: Math.max(0, x), y: Math.max(0, y) });
  }, [open, position]);

  if (!open) return null;

  return (
    <div className="ContextMenu__overlay" onClick={onClose}>
      <div
        ref={menuRef}
        className="ContextMenu"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, i) => (
          <MenuItemRow key={i} item={item} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}
