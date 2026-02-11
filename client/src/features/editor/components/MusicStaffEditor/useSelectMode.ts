import { useCallback, useEffect, useState } from 'react';
import type { NoteData } from './MusicStaffEditor';
import { shiftPitch, getPitchesForClef } from '../../utils/pitchUtils';

export interface NoteSelection {
  noteIndex: number;
  keyIndex: number;
}

export interface UseSelectModeReturn {
  selection: NoteSelection | null;
  setSelection: (s: NoteSelection | null) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
}

export function useSelectMode(
  notes: NoteData[],
  clef: string,
  onNotesChange: (notes: NoteData[]) => void,
  containerRef: React.RefObject<HTMLDivElement | null>,
): UseSelectModeReturn {
  const [selection, setSelection] = useState<NoteSelection | null>(null);

  // Clear selection if notes change and index is out of bounds
  useEffect(() => {
    if (selection !== null && selection.noteIndex >= notes.length) {
      setSelection(null);
    }
  }, [notes.length, selection]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selection === null) return;

      const { noteIndex, keyIndex } = selection;
      const note = notes[noteIndex];
      if (!note) return;

      const ki = Math.min(keyIndex, note.keys.length - 1);
      const pitches = getPitchesForClef(clef);

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Arrow: move all keys
            const newKeys = note.keys.map((k) => shiftPitch(k, 'up', clef));
            const updated = notes.map((n, i) =>
              i === noteIndex ? { ...n, keys: newKeys } : n,
            );
            onNotesChange(updated);
          } else {
            // Move only the selected key
            const newKeys = [...note.keys];
            const newAcc = note.accidentals ? [...note.accidentals] : note.keys.map(() => null);
            newKeys[ki] = shiftPitch(newKeys[ki], 'up', clef);
            const pairs = newKeys.map((k, i) => ({ key: k, acc: newAcc[i], wasSelected: i === ki }));
            pairs.sort((a, b) => pitches.indexOf(b.key) - pitches.indexOf(a.key));
            const newKi = pairs.findIndex((p) => p.wasSelected);
            const updated = notes.map((n, i) =>
              i === noteIndex
                ? { ...n, keys: pairs.map((p) => p.key), accidentals: pairs.map((p) => p.acc) }
                : n,
            );
            onNotesChange(updated);
            setSelection({ noteIndex, keyIndex: newKi >= 0 ? newKi : ki });
          }
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          if (e.shiftKey) {
            const newKeys = note.keys.map((k) => shiftPitch(k, 'down', clef));
            const updated = notes.map((n, i) =>
              i === noteIndex ? { ...n, keys: newKeys } : n,
            );
            onNotesChange(updated);
          } else {
            const newKeys = [...note.keys];
            const newAcc = note.accidentals ? [...note.accidentals] : note.keys.map(() => null);
            newKeys[ki] = shiftPitch(newKeys[ki], 'down', clef);
            const pairs = newKeys.map((k, i) => ({ key: k, acc: newAcc[i], wasSelected: i === ki }));
            pairs.sort((a, b) => pitches.indexOf(b.key) - pitches.indexOf(a.key));
            const newKi = pairs.findIndex((p) => p.wasSelected);
            const updated = notes.map((n, i) =>
              i === noteIndex
                ? { ...n, keys: pairs.map((p) => p.key), accidentals: pairs.map((p) => p.acc) }
                : n,
            );
            onNotesChange(updated);
            setSelection({ noteIndex, keyIndex: newKi >= 0 ? newKi : ki });
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (noteIndex > 0) {
            const updated = [...notes];
            [updated[noteIndex - 1], updated[noteIndex]] = [
              updated[noteIndex],
              updated[noteIndex - 1],
            ];
            onNotesChange(updated);
            setSelection({ noteIndex: noteIndex - 1, keyIndex: ki });
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (noteIndex < notes.length - 1) {
            const updated = [...notes];
            [updated[noteIndex], updated[noteIndex + 1]] = [
              updated[noteIndex + 1],
              updated[noteIndex],
            ];
            onNotesChange(updated);
            setSelection({ noteIndex: noteIndex + 1, keyIndex: ki });
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          e.preventDefault();
          const updated = notes.filter((_, i) => i !== noteIndex);
          onNotesChange(updated);
          setSelection(null);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setSelection(null);
          break;
        }
      }
    },
    [selection, notes, clef, onNotesChange],
  );

  // Register keydown listener on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, handleKeyDown]);

  return { selection, setSelection, handleKeyDown };
}
