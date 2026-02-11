import { useCallback, useEffect, useRef, useState } from 'react';
import type { StaveNote } from 'vexflow';
import type { NoteData } from './MusicStaffEditor';
import { getNoteIndexAtPoint } from '../../utils/noteHitDetection';

export interface UseDragDropReturn {
  isDragging: boolean;
  dragIndex: number | null;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
}

const DRAG_THRESHOLD = 4; // pixels before drag activates

export function useDragDrop(
  notes: NoteData[],
  onNotesChange: (notes: NoteData[]) => void,
  staveNotesRef: React.RefObject<StaveNote[]>,
  screenToLogical: (x: number, y: number) => { x: number; y: number } | null,
  getClickPitch: (logicalY: number) => string | null,
): UseDragDropReturn {
  const [isDragging, setIsDragging] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragActivatedRef = useRef(false);
  const currentPitchRef = useRef<string | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Clean up if mouse leaves the window during drag
  useEffect(() => {
    if (!dragActivatedRef.current && dragIndexRef.current === null) return;
    const handleGlobalMouseUp = () => {
      dragIndexRef.current = null;
      dragStartRef.current = null;
      dragActivatedRef.current = false;
      currentPitchRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const logical = screenToLogical(e.clientX, e.clientY);
      if (!logical) return;

      const hitIdx = getNoteIndexAtPoint(logical.x, logical.y, staveNotesRef.current ?? []);
      if (hitIdx >= 0) {
        dragIndexRef.current = hitIdx;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        dragActivatedRef.current = false;
        currentPitchRef.current = notesRef.current[hitIdx]?.keys[0] ?? null;
        e.preventDefault();
      }
    },
    [staveNotesRef, screenToLogical],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragIndexRef.current === null || !dragStartRef.current) return;

      // Check threshold before activating drag
      if (!dragActivatedRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        dragActivatedRef.current = true;
        setIsDragging(true);
      }

      const logical = screenToLogical(e.clientX, e.clientY);
      if (!logical) return;

      const newPitch = getClickPitch(logical.y);
      if (!newPitch || newPitch === currentPitchRef.current) return;

      currentPitchRef.current = newPitch;
      const idx = dragIndexRef.current;
      const updated = notesRef.current.map((n, i) =>
        i === idx ? { ...n, keys: [newPitch] } : n,
      );
      onNotesChange(updated);
    },
    [screenToLogical, getClickPitch, onNotesChange],
  );

  const handleMouseUp = useCallback(() => {
    dragIndexRef.current = null;
    dragStartRef.current = null;
    dragActivatedRef.current = false;
    currentPitchRef.current = null;
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    dragIndex: dragIndexRef.current,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
