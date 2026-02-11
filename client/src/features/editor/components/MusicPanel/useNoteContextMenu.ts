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
    (noteIndex: number): ContextMenuItem[] => {
      const note = notes[noteIndex];
      if (!note) return [];

      const updateNote = (patch: Partial<NoteData>) => {
        const updated = notes.map((n, i) => (i === noteIndex ? { ...n, ...patch } : n));
        onNotesChange(updated);
      };

      const isChord = note.keys.length > 1;
      const currentAcc = note.accidentals?.[0] ?? null;
      const baseDur = getBaseDuration(note.duration);
      const pitches = getPitchesForClef(clef);

      // Chord: add pitch above highest / below lowest
      const highestKey = note.keys.reduce((a, b) =>
        pitches.indexOf(a) < pitches.indexOf(b) ? a : b,
      );
      const lowestKey = note.keys.reduce((a, b) =>
        pitches.indexOf(a) > pitches.indexOf(b) ? a : b,
      );
      const pitchAbove = shiftPitch(highestKey, 'up', clef);
      const pitchBelow = shiftPitch(lowestKey, 'down', clef);

      const addPitchToNote = (pitch: string) => {
        if (note.keys.includes(pitch)) return;
        const newKeys = [...note.keys, pitch].sort(
          (a, b) => pitches.indexOf(b) - pitches.indexOf(a),
        );
        const newAccidentals = newKeys.map((k) => {
          const oldIdx = note.keys.indexOf(k);
          return oldIdx >= 0 ? (note.accidentals?.[oldIdx] ?? null) : null;
        });
        updateNote({ keys: newKeys, accidentals: newAccidentals });
      };

      const removePitchFromNote = (pitch: string) => {
        if (note.keys.length <= 1) return;
        const keyIdx = note.keys.indexOf(pitch);
        const newKeys = note.keys.filter((_, i) => i !== keyIdx);
        const newAccidentals = note.accidentals?.filter((_, i) => i !== keyIdx);
        updateNote({ keys: newKeys, accidentals: newAccidentals });
      };

      const items: ContextMenuItem[] = [
        {
          label: 'Delete',
          danger: true,
          onClick: () => onNotesChange(notes.filter((_, i) => i !== noteIndex)),
        },
        {
          label: 'Add Pitch',
          shortcut: 'Shift+Click',
          children: [
            {
              label: `Up (${formatPitch(pitchAbove)})`,
              disabled: pitchAbove === highestKey,
              onClick: () => addPitchToNote(pitchAbove),
            },
            {
              label: `Down (${formatPitch(pitchBelow)})`,
              disabled: pitchBelow === lowestKey,
              onClick: () => addPitchToNote(pitchBelow),
            },
          ],
        },
      ];

      // Remove Pitch — only show when chord has multiple keys
      if (isChord) {
        items.push({
          label: 'Remove Pitch',
          children: note.keys.map((key, keyIdx) => ({
            label: formatPitch(key) + (note.accidentals?.[keyIdx] ? ` (${note.accidentals[keyIdx]})` : ''),
            onClick: () => removePitchFromNote(key),
          })),
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
          label: 'Move Up',
          onClick: () => {
            const newKeys = note.keys.map((k) => shiftPitch(k, 'up', clef));
            updateNote({ keys: newKeys });
          },
        },
        {
          label: 'Move Down',
          onClick: () => {
            const newKeys = note.keys.map((k) => shiftPitch(k, 'down', clef));
            updateNote({ keys: newKeys });
          },
        },
        {
          label: 'Sharp',
          checked: currentAcc === '#',
          onClick: () => {
            const newAcc = (note.accidentals ?? note.keys.map(() => null)).map((a) =>
              a === '#' ? null : '#',
            );
            updateNote({ accidentals: newAcc });
          },
        },
        {
          label: 'Flat',
          checked: currentAcc === 'b',
          onClick: () => {
            const newAcc = (note.accidentals ?? note.keys.map(() => null)).map((a) =>
              a === 'b' ? null : 'b',
            );
            updateNote({ accidentals: newAcc });
          },
        },
        {
          label: 'Natural',
          checked: currentAcc === 'n',
          onClick: () => {
            const newAcc = (note.accidentals ?? note.keys.map(() => null)).map((a) =>
              a === 'n' ? null : 'n',
            );
            updateNote({ accidentals: newAcc });
          },
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
