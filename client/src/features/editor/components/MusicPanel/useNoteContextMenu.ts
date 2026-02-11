import { useCallback } from 'react';
import type { ContextMenuItem } from '../../../../components/shared/ContextMenu';
import type { NoteData } from '../MusicStaffEditor';
import { shiftPitch, getPitchesForClef } from '../../utils/pitchUtils';
import { getBaseDuration, toggleDotted } from '../../utils/durationUtils';

const DURATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'w', label: 'Whole' },
  { value: 'h', label: 'Half' },
  { value: 'q', label: 'Quarter' },
  { value: '8', label: 'Eighth' },
  { value: '16', label: 'Sixteenth' },
];

function formatPitch(pitch: string): string {
  const [note, octave] = pitch.split('/');
  return `${note.toUpperCase()}${octave}`;
}

export function useNoteContextMenu(
  notes: NoteData[],
  clef: string,
  onNotesChange: (notes: NoteData[]) => void,
) {
  const buildItems = useCallback(
    (noteIndex: number, keyIndex = 0): ContextMenuItem[] => {
      const note = notes[noteIndex];
      if (!note) return [];
      const pitches = getPitchesForClef(clef);

      const updateNote = (patch: Partial<NoteData>) => {
        const updated = notes.map((n, i) => (i === noteIndex ? { ...n, ...patch } : n));
        onNotesChange(updated);
      };

      // Clamp keyIndex to valid range
      const ki = Math.min(keyIndex, note.keys.length - 1);
      const targetPitch = note.keys[ki];
      const targetAcc = note.accidentals?.[ki] ?? null;
      const isChord = note.keys.length > 1;
      const baseDur = getBaseDuration(note.duration);

      // Helper: update a single key's pitch, re-sort for VexFlow
      const moveKey = (direction: 'up' | 'down') => {
        const newKeys = [...note.keys];
        const newAcc = note.accidentals ? [...note.accidentals] : note.keys.map(() => null);
        newKeys[ki] = shiftPitch(newKeys[ki], direction, clef);
        const pairs = newKeys.map((k, i) => ({ key: k, acc: newAcc[i] }));
        pairs.sort((a, b) => pitches.indexOf(b.key) - pitches.indexOf(a.key));
        updateNote({ keys: pairs.map((p) => p.key), accidentals: pairs.map((p) => p.acc) });
      };

      // Helper: set accidental on a single key
      const setAccidental = (acc: string) => {
        const newAcc = note.accidentals ? [...note.accidentals] : note.keys.map(() => null);
        newAcc[ki] = newAcc[ki] === acc ? null : acc;
        updateNote({ accidentals: newAcc });
      };

      const label = isChord ? ` ${formatPitch(targetPitch)}` : '';

      const items: ContextMenuItem[] = [
        {
          label: 'Delete',
          danger: true,
          onClick: () => onNotesChange(notes.filter((_, i) => i !== noteIndex)),
        },
        {
          label: `Move${label} Up`,
          onClick: () => moveKey('up'),
        },
        {
          label: `Move${label} Down`,
          onClick: () => moveKey('down'),
        },
      ];

      // For chords, also offer "Move All Up/Down"
      if (isChord) {
        items.push(
          {
            label: 'Move All Up',
            onClick: () => {
              const newKeys = note.keys.map((k) => shiftPitch(k, 'up', clef));
              updateNote({ keys: newKeys });
            },
          },
          {
            label: 'Move All Down',
            onClick: () => {
              const newKeys = note.keys.map((k) => shiftPitch(k, 'down', clef));
              updateNote({ keys: newKeys });
            },
          },
        );
      }

      items.push(
        {
          label: 'Add Pitch',
          shortcut: 'Shift+Click',
          children: (() => {
            const highestKey = note.keys.reduce((a, b) =>
              pitches.indexOf(a) < pitches.indexOf(b) ? a : b,
            );
            const lowestKey = note.keys.reduce((a, b) =>
              pitches.indexOf(a) > pitches.indexOf(b) ? a : b,
            );
            const above = shiftPitch(highestKey, 'up', clef);
            const below = shiftPitch(lowestKey, 'down', clef);
            return [
              {
                label: `Up (${formatPitch(above)})`,
                disabled: above === highestKey,
                onClick: () => {
                  if (note.keys.includes(above)) return;
                  const newKeys = [...note.keys, above].sort(
                    (a, b) => pitches.indexOf(b) - pitches.indexOf(a),
                  );
                  const newAcc = newKeys.map((k) => {
                    const idx = note.keys.indexOf(k);
                    return idx >= 0 ? (note.accidentals?.[idx] ?? null) : null;
                  });
                  updateNote({ keys: newKeys, accidentals: newAcc });
                },
              },
              {
                label: `Down (${formatPitch(below)})`,
                disabled: below === lowestKey,
                onClick: () => {
                  if (note.keys.includes(below)) return;
                  const newKeys = [...note.keys, below].sort(
                    (a, b) => pitches.indexOf(b) - pitches.indexOf(a),
                  );
                  const newAcc = newKeys.map((k) => {
                    const idx = note.keys.indexOf(k);
                    return idx >= 0 ? (note.accidentals?.[idx] ?? null) : null;
                  });
                  updateNote({ keys: newKeys, accidentals: newAcc });
                },
              },
            ];
          })(),
        },
      );

      // Remove Pitch — only for chords
      if (isChord) {
        items.push({
          label: `Remove ${formatPitch(targetPitch)}`,
          onClick: () => {
            const newKeys = note.keys.filter((_, i) => i !== ki);
            const newAcc = note.accidentals?.filter((_, i) => i !== ki);
            updateNote({ keys: newKeys, accidentals: newAcc });
          },
        });
      }

      items.push(
        {
          label: 'Duration',
          children: DURATION_OPTIONS.map((d) => ({
            label: d.label,
            checked: baseDur === d.value,
            onClick: () => {
              const dur = note.dotted ? d.value + 'd' : d.value;
              updateNote({ duration: dur });
            },
          })),
        },
        {
          label: `Sharp${label}`,
          checked: targetAcc === '#',
          onClick: () => setAccidental('#'),
        },
        {
          label: `Flat${label}`,
          checked: targetAcc === 'b',
          onClick: () => setAccidental('b'),
        },
        {
          label: `Natural${label}`,
          checked: targetAcc === 'n',
          onClick: () => setAccidental('n'),
        },
        {
          label: 'Dotted',
          checked: !!note.dotted,
          onClick: () => {
            updateNote({
              duration: toggleDotted(note.duration),
              dotted: !note.dotted,
            });
          },
        },
        {
          label: 'Tie',
          checked: !!note.tied,
          disabled: noteIndex >= notes.length - 1,
          onClick: () => {
            updateNote({ tied: !note.tied });
          },
        },
      );

      return items;
    },
    [notes, clef, onNotesChange],
  );

  return { buildItems };
}
