import { useCallback, useEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Voice,
  Formatter,
  Accidental,
  Dot,
  type RenderContext,
} from 'vexflow';
import { getPitchesForClef } from '../../utils/pitchUtils';
import { getNoteIndexAtPoint, applyNoteIndexAttributes } from '../../utils/noteHitDetection';
import './MusicStaffEditor.scss';

export type InteractionMode = 'place' | 'select';

export interface NoteData {
  keys: string[];
  duration: string;
  accidentals?: (string | null)[];
  dotted?: boolean;
  tied?: boolean;
}

interface MusicStaffEditorProps {
  notes: NoteData[];
  clef: 'treble' | 'bass' | 'alto';
  timeSignature: string;
  keySignature: string;
  selectedDuration: string;
  onNotesChange: (notes: NoteData[]) => void;
  readOnly?: boolean;
  mode?: InteractionMode;
  highlightedNoteIndex?: number | null;
  selectedNoteIndex?: number | null;
  onNoteSelect?: (index: number | null) => void;
  onNoteContextMenu?: (e: React.MouseEvent, noteIndex: number) => void;
}

function buildVexDuration(note: NoteData): string {
  let dur = note.duration;
  // If dotted flag is set but duration doesn't have 'd', add it
  if (note.dotted && !dur.includes('d')) {
    const isRest = dur.endsWith('r');
    if (isRest) {
      dur = dur.replace('r', 'dr');
    } else {
      dur = dur + 'd';
    }
  }
  return dur;
}

export default function MusicStaffEditor({
  notes,
  clef,
  timeSignature,
  keySignature,
  selectedDuration,
  onNotesChange,
  readOnly = false,
  mode = 'place',
  highlightedNoteIndex,
  selectedNoteIndex,
  onNoteSelect,
  onNoteContextMenu,
}: MusicStaffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const staveRef = useRef<Stave | null>(null);
  const staveNotesRef = useRef<StaveNote[]>([]);

  // Render the stave and notes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const width = container.clientWidth || 600;
    const height = 200;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, height);
    rendererRef.current = renderer;

    const context: RenderContext = renderer.getContext();

    const stave = new Stave(10, 30, width - 30);
    stave.addClef(clef);
    stave.addTimeSignature(timeSignature);
    if (keySignature && keySignature !== 'C') {
      stave.addKeySignature(keySignature);
    }
    stave.setContext(context).draw();
    staveRef.current = stave;

    if (notes.length > 0) {
      const renderNotes = (numBeats: number, beatValue: number) => {
        const staveNotes = notes.map((n) => {
          const dur = buildVexDuration(n);
          const sn = new StaveNote({ keys: n.keys, duration: dur, clef });

          // Add accidentals
          if (n.accidentals) {
            n.accidentals.forEach((acc, keyIdx) => {
              if (acc) {
                sn.addModifier(new Accidental(acc), keyIdx);
              }
            });
          }

          // Add dots
          if (n.dotted) {
            Dot.buildAndAttach([sn]);
          }

          return sn;
        });

        const voice = new Voice({ numBeats, beatValue }).setStrict(false);
        voice.addTickables(staveNotes);
        new Formatter().joinVoices([voice]).format([voice], width - 80);
        voice.draw(context, stave);

        // Render ties between consecutive tied notes
        for (let i = 0; i < notes.length - 1; i++) {
          if (notes[i].tied) {
            const tie = new StaveTie({
              firstNote: staveNotes[i],
              lastNote: staveNotes[i + 1],
            });
            tie.setContext(context).draw();
          }
        }

        // Store refs and apply data attributes
        staveNotesRef.current = staveNotes;
        applyNoteIndexAttributes(staveNotes);
      };

      try {
        renderNotes(
          parseInt(timeSignature.split('/')[0], 10),
          parseInt(timeSignature.split('/')[1], 10),
        );
      } catch {
        try {
          renderNotes(128, 4);
        } catch {
          staveNotesRef.current = [];
        }
      }
    } else {
      staveNotesRef.current = [];
    }
  }, [notes, clef, timeSignature, keySignature]);

  // Highlight effect — applies/removes CSS classes without re-rendering VexFlow
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear all highlights
    container.querySelectorAll('.MusicStaffEditor__note--playing').forEach((el) => {
      el.classList.remove('MusicStaffEditor__note--playing');
    });

    if (highlightedNoteIndex != null) {
      const el = container.querySelector(`[data-note-index="${highlightedNoteIndex}"]`);
      if (el) el.classList.add('MusicStaffEditor__note--playing');
    }
  }, [highlightedNoteIndex]);

  // Selection highlight
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.querySelectorAll('.MusicStaffEditor__note--selected').forEach((el) => {
      el.classList.remove('MusicStaffEditor__note--selected');
    });

    if (selectedNoteIndex != null) {
      const el = container.querySelector(`[data-note-index="${selectedNoteIndex}"]`);
      if (el) el.classList.add('MusicStaffEditor__note--selected');
    }
  }, [selectedNoteIndex]);

  const getClickPitch = useCallback(
    (clientY: number) => {
      const container = containerRef.current;
      const stave = staveRef.current;
      if (!container || !stave) return null;

      const rect = container.getBoundingClientRect();
      const clickY = clientY - rect.top;

      const topLineY = stave.getYForLine(0);
      const bottomLineY = stave.getYForLine(4);
      const lineSpacing = (bottomLineY - topLineY) / 4;
      const halfSpace = lineSpacing / 2;

      const pitches = getPitchesForClef(clef);
      const referenceY = topLineY - halfSpace;

      const pitchIndex = Math.round((clickY - referenceY) / halfSpace);
      const clampedIndex = Math.max(0, Math.min(pitchIndex, pitches.length - 1));
      return pitches[clampedIndex];
    },
    [clef],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) return;

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (mode === 'select') {
        const hitIdx = getNoteIndexAtPoint(x, y, staveNotesRef.current);
        onNoteSelect?.(hitIdx >= 0 ? hitIdx : null);
        return;
      }

      // Place mode
      const pitch = getClickPitch(e.clientY);
      if (!pitch) return;

      // Shift+click: add pitch to the nearest existing note (chord building)
      if (e.shiftKey && notes.length > 0) {
        // Find nearest note by X position
        let nearestIdx = notes.length - 1;
        let closestDist = Infinity;
        for (let i = 0; i < staveNotesRef.current.length; i++) {
          try {
            const noteX = staveNotesRef.current[i].getAbsoluteX();
            const dist = Math.abs(x - noteX);
            if (dist < closestDist) {
              closestDist = dist;
              nearestIdx = i;
            }
          } catch {
            // getAbsoluteX may not be available
          }
        }

        const target = notes[nearestIdx];
        if (target.keys.includes(pitch)) {
          // Toggle off: remove pitch from chord (but don't remove the last pitch)
          if (target.keys.length > 1) {
            const updated = notes.map((n, i) =>
              i === nearestIdx
                ? {
                    ...n,
                    keys: n.keys.filter((k) => k !== pitch),
                    accidentals: n.accidentals?.filter((_, ai) => n.keys[ai] !== pitch),
                  }
                : n,
            );
            onNotesChange(updated);
          }
        } else {
          // Add pitch to chord, sorted low to high (VexFlow expects sorted keys)
          const newKeys = [...target.keys, pitch].sort((a, b) => {
            const pitches = getPitchesForClef(clef);
            return pitches.indexOf(b) - pitches.indexOf(a);
          });
          const newAccidentals = newKeys.map((k) => {
            const oldIdx = target.keys.indexOf(k);
            return oldIdx >= 0 ? (target.accidentals?.[oldIdx] ?? null) : null;
          });
          const updated = notes.map((n, i) =>
            i === nearestIdx ? { ...n, keys: newKeys, accidentals: newAccidentals } : n,
          );
          onNotesChange(updated);
        }
        return;
      }

      const existingIndex = notes.findIndex(
        (n) => n.keys.length === 1 && n.keys[0] === pitch,
      );

      if (existingIndex >= 0) {
        const updated = notes.filter((_, i) => i !== existingIndex);
        onNotesChange(updated);
      } else {
        const newNote: NoteData = { keys: [pitch], duration: selectedDuration };
        onNotesChange([...notes, newNote]);
      }
    },
    [notes, clef, selectedDuration, onNotesChange, readOnly, mode, onNoteSelect, getClickPitch],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly || !onNoteContextMenu) return;

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const hitIdx = getNoteIndexAtPoint(x, y, staveNotesRef.current);
      if (hitIdx >= 0) {
        e.preventDefault();
        onNoteContextMenu(e, hitIdx);
      }
    },
    [readOnly, onNoteContextMenu],
  );

  const classNames = [
    'MusicStaffEditor',
    readOnly && 'MusicStaffEditor--readOnly',
    mode === 'select' && 'MusicStaffEditor--selectMode',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      ref={containerRef}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      tabIndex={0}
    />
  );
}
