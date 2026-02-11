import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Voice,
  Formatter,
  Accidental,
  Dot,
  Barline,
  Beam,
  type RenderContext,
} from 'vexflow';
import { getPitchesForClef } from '../../utils/pitchUtils';
import { getNoteIndexAtPoint, applyNoteIndexAttributes } from '../../utils/noteHitDetection';
import { parseTimeSignature } from '../../utils/durationUtils';
import { splitIntoMeasures } from '../../utils/measureUtils';
import { computeMeasureLayout, computeTotalHeight } from '../../utils/measureLayout';
import { useDragDrop } from './useDragDrop';
import './MusicStaffEditor.scss';

const STAVE_SCALE = 1.5;

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
  selectedKeyIndex?: number | null;
  onNoteSelect?: (noteIndex: number | null, keyIndex?: number) => void;
  onNoteContextMenu?: (e: React.MouseEvent, noteIndex: number, keyIndex: number) => void;
  onStaveContextMenu?: (e: React.MouseEvent, pitch: string) => void;
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
  selectedKeyIndex,
  onNoteSelect,
  onNoteContextMenu,
  onStaveContextMenu,
}: MusicStaffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const stavesRef = useRef<Stave[]>([]);
  const staveNotesRef = useRef<StaveNote[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const hoveredNoteRef = useRef<number | null>(null);
  const pendingNoteRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOccurredRef = useRef(false);

  // ResizeObserver to track container width changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render the stave(s) and notes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || containerWidth <= 0) return;

    container.innerHTML = '';

    const hasKeySig = !!(keySignature && keySignature !== 'C');
    const { numBeats, beatValue } = parseTimeSignature(timeSignature);
    const logicalWidth = Math.floor(containerWidth / STAVE_SCALE);

    if (notes.length === 0) {
      // Empty state: render a single empty stave
      const renderer = new Renderer(container, Renderer.Backends.SVG);
      renderer.resize(containerWidth, Math.ceil(200 * STAVE_SCALE));
      rendererRef.current = renderer;
      const context = renderer.getContext();
      context.scale(STAVE_SCALE, STAVE_SCALE);

      const stave = new Stave(10, 30, logicalWidth - 30);
      stave.addClef(clef);
      stave.addTimeSignature(timeSignature);
      if (hasKeySig) stave.addKeySignature(keySignature);
      stave.setContext(context).draw();

      stavesRef.current = [stave];
      staveNotesRef.current = [];
      return;
    }

    // Split notes into measures and compute layout
    const measures = splitIntoMeasures(notes, timeSignature);
    const layouts = computeMeasureLayout(measures, logicalWidth, numBeats, hasKeySig);
    const totalHeight = computeTotalHeight(layouts);

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(containerWidth, Math.ceil(totalHeight * STAVE_SCALE));
    rendererRef.current = renderer;
    const context: RenderContext = renderer.getContext();
    context.scale(STAVE_SCALE, STAVE_SCALE);

    const allStaveNotes: StaveNote[] = [];
    const staves: Stave[] = [];

    // Render each measure
    for (let mi = 0; mi < measures.length; mi++) {
      const measure = measures[mi];
      const layout = layouts[mi];

      // Create stave for this measure
      const stave = new Stave(layout.x, layout.y, layout.width);

      // Decorations
      if (layout.isFirstMeasure) {
        stave.addClef(clef);
        stave.addTimeSignature(timeSignature);
        if (hasKeySig) stave.addKeySignature(keySignature);
      } else if (layout.isFirstOnLine) {
        stave.addClef(clef);
      }

      // Suppress the default beginning barline on non-first measures within a
      // line — the previous measure's end barline already serves as the divider.
      if (!layout.isFirstOnLine) {
        stave.setBegBarType(Barline.type.NONE);
      }

      // Barline type
      if (layout.isLastMeasure) {
        stave.setEndBarType(Barline.type.END);
      } else {
        stave.setEndBarType(Barline.type.SINGLE);
      }

      stave.setContext(context).draw();
      staves.push(stave);

      // Create StaveNotes for this measure
      const measureStaveNotes = measure.notes.map((n, localIdx) => {
        const flatIndex = measure.startIndex + localIdx;
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

        // Default note color (orange)
        sn.setStyle({ fillStyle: '#ff8a00', strokeStyle: '#ff8a00' });

        // Playback highlight
        if (flatIndex === highlightedNoteIndex) {
          sn.setStyle({ fillStyle: '#ffffff', strokeStyle: '#ffffff' });
        }

        // Selection highlight
        if (flatIndex === selectedNoteIndex) {
          if (selectedKeyIndex != null && n.keys.length > 1) {
            sn.setKeyStyle(selectedKeyIndex, { fillStyle: '#ffffff', strokeStyle: '#ffffff' });
            sn.setStemStyle({ fillStyle: '#ffffff', strokeStyle: '#ffffff' });
          } else {
            sn.setStyle({ fillStyle: '#ffffff', strokeStyle: '#ffffff' });
          }
        }

        return sn;
      });

      // Format and draw
      try {
        const voice = new Voice({ numBeats, beatValue }).setStrict(false);
        voice.addTickables(measureStaveNotes);
        // Usable width for formatting: measure width minus decorations padding
        const formatWidth = Math.max(50, layout.width - (layout.isFirstOnLine ? 60 : 20));
        new Formatter().joinVoices([voice]).format([voice], formatWidth);
        voice.draw(context, stave);

        // Generate beams for sub-quarter notes (8th, 16th, etc.)
        const beamableNotes = measureStaveNotes.filter(
          (sn) => !sn.isRest() && sn.getIntrinsicTicks() < 4096,
        );
        if (beamableNotes.length >= 2) {
          const beams = Beam.generateBeams(beamableNotes);
          beams.forEach((b) => b.setContext(context).draw());
        }
      } catch {
        // Fallback: try with relaxed voice
        try {
          const voice = new Voice({ numBeats: 128, beatValue: 4 }).setStrict(false);
          voice.addTickables(measureStaveNotes);
          const formatWidth = Math.max(50, layout.width - 20);
          new Formatter().joinVoices([voice]).format([voice], formatWidth);
          voice.draw(context, stave);

          // Generate beams in fallback too
          const beamableNotes = measureStaveNotes.filter(
            (sn) => !sn.isRest() && sn.getIntrinsicTicks() < 4096,
          );
          if (beamableNotes.length >= 2) {
            const beams = Beam.generateBeams(beamableNotes);
            beams.forEach((b) => b.setContext(context).draw());
          }
        } catch {
          // Skip this measure if it can't render
        }
      }

      allStaveNotes.push(...measureStaveNotes);
    }

    // Render ties (works across staves)
    for (let i = 0; i < allStaveNotes.length - 1; i++) {
      if (notes[i]?.tied) {
        try {
          const tie = new StaveTie({
            firstNote: allStaveNotes[i],
            lastNote: allStaveNotes[i + 1],
          });
          tie.setContext(context).draw();
        } catch {
          // Cross-stave ties may fail silently
        }
      }
    }

    // Store refs and apply data attributes
    stavesRef.current = staves;
    staveNotesRef.current = allStaveNotes;
    applyNoteIndexAttributes(allStaveNotes);

    // Apply CSS glow classes
    if (highlightedNoteIndex != null) {
      const el = container.querySelector(`[data-note-index="${highlightedNoteIndex}"]`);
      if (el) el.classList.add('MusicStaffEditor__note--playing');
    }
    if (selectedNoteIndex != null) {
      const el = container.querySelector(`[data-note-index="${selectedNoteIndex}"]`);
      if (el) el.classList.add('MusicStaffEditor__note--selected');
    }
  }, [notes, clef, timeSignature, keySignature, highlightedNoteIndex, selectedNoteIndex, selectedKeyIndex, containerWidth]);

  /** Convert screen (mouse event) coordinates to VexFlow logical coordinates. */
  const screenToLogical = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } | null => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return {
        x: (screenX - rect.left + container.scrollLeft) / STAVE_SCALE,
        y: (screenY - rect.top + container.scrollTop) / STAVE_SCALE,
      };
    },
    [],
  );

  /** Find the stave whose Y range contains the given logical Y. */
  const getStaveForY = useCallback(
    (logicalY: number): Stave | null => {
      for (const stave of stavesRef.current) {
        const top = stave.getYForLine(0) - 30;
        const bottom = stave.getYForLine(4) + 30;
        if (logicalY >= top && logicalY <= bottom) {
          return stave;
        }
      }
      // Default to the closest stave
      let closest: Stave | null = null;
      let closestDist = Infinity;
      for (const stave of stavesRef.current) {
        const mid = (stave.getYForLine(0) + stave.getYForLine(4)) / 2;
        const dist = Math.abs(logicalY - mid);
        if (dist < closestDist) {
          closestDist = dist;
          closest = stave;
        }
      }
      return closest;
    },
    [],
  );

  const getClickPitch = useCallback(
    (logicalY: number) => {
      const stave = getStaveForY(logicalY);
      if (!stave) return null;

      const topLineY = stave.getYForLine(0);
      const bottomLineY = stave.getYForLine(4);
      const lineSpacing = (bottomLineY - topLineY) / 4;
      const halfSpace = lineSpacing / 2;

      const pitches = getPitchesForClef(clef);
      // pitches[0] is 2 half-spaces above line 0, so reference = topLineY - 2 * halfSpace
      const referenceY = topLineY - 2 * halfSpace;

      const pitchIndex = Math.round((logicalY - referenceY) / halfSpace);
      const clampedIndex = Math.max(0, Math.min(pitchIndex, pitches.length - 1));
      return pitches[clampedIndex];
    },
    [clef, getStaveForY],
  );

  // Drag-to-repitch hook
  const {
    isDragging,
    handleMouseDown: dragMouseDown,
    handleMouseMove: dragMouseMove,
    handleMouseUp: dragMouseUp,
  } = useDragDrop(notes, onNotesChange, staveNotesRef, screenToLogical, getClickPitch);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly) return;
      dragOccurredRef.current = false;
      dragMouseDown(e);
    },
    [readOnly, dragMouseDown],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update hovered note (for hover-delete)
      const logical = screenToLogical(e.clientX, e.clientY);
      if (logical) {
        const hitIdx = getNoteIndexAtPoint(logical.x, logical.y, staveNotesRef.current ?? []);
        hoveredNoteRef.current = hitIdx >= 0 ? hitIdx : null;
      }

      if (readOnly) return;
      dragMouseMove(e);
      if (isDragging) {
        dragOccurredRef.current = true;
      }
    },
    [readOnly, dragMouseMove, isDragging, screenToLogical, staveNotesRef],
  );

  const handleMouseUp = useCallback(() => {
    dragMouseUp();
  }, [dragMouseUp]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) return;

      // Skip click if a drag just occurred
      if (dragOccurredRef.current) {
        dragOccurredRef.current = false;
        return;
      }

      const logical = screenToLogical(e.clientX, e.clientY);
      if (!logical) return;

      if (mode === 'select') {
        const hitIdx = getNoteIndexAtPoint(logical.x, logical.y, staveNotesRef.current);
        if (hitIdx >= 0) {
          const ki = resolveKeyIndex(hitIdx, logical.y);
          onNoteSelect?.(hitIdx, ki);
        } else {
          onNoteSelect?.(null);
        }
        return;
      }

      // Place mode
      const pitch = getClickPitch(logical.y);
      if (!pitch) return;

      // Shift+click: add pitch to the nearest existing note (chord building)
      if (e.shiftKey && notes.length > 0) {
        // Find nearest note by X position
        let nearestIdx = notes.length - 1;
        let closestDist = Infinity;
        for (let i = 0; i < staveNotesRef.current.length; i++) {
          try {
            const noteX = staveNotesRef.current[i].getAbsoluteX();
            const dist = Math.abs(logical.x - noteX);
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

      // Always add a new note (no toggle/removal in place mode)
      const newNote: NoteData = { keys: [pitch], duration: selectedDuration };
      onNotesChange([...notes, newNote]);
    },
    [notes, clef, selectedDuration, onNotesChange, readOnly, mode, onNoteSelect, getClickPitch, screenToLogical],
  );

  const resolveKeyIndex = useCallback(
    (noteIndex: number, logicalY: number): number => {
      const note = notes[noteIndex];
      if (!note || note.keys.length <= 1) return 0;
      // Use logical Y to find the closest pitch in this chord
      const clickedPitch = getClickPitch(logicalY);
      if (!clickedPitch) return 0;
      const pitches = getPitchesForClef(clef);
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < note.keys.length; i++) {
        const dist = Math.abs(pitches.indexOf(note.keys[i]) - pitches.indexOf(clickedPitch));
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    },
    [notes, clef, getClickPitch],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (readOnly) return;

      const logical = screenToLogical(e.clientX, e.clientY);
      if (!logical) return;

      const hitIdx = getNoteIndexAtPoint(logical.x, logical.y, staveNotesRef.current);
      if (hitIdx >= 0 && onNoteContextMenu) {
        e.preventDefault();
        const keyIdx = resolveKeyIndex(hitIdx, logical.y);
        onNoteContextMenu(e, hitIdx, keyIdx);
      } else if (hitIdx < 0 && onStaveContextMenu) {
        const pitch = getClickPitch(logical.y);
        if (pitch) {
          e.preventDefault();
          onStaveContextMenu(e, pitch);
        }
      }
    },
    [readOnly, onNoteContextMenu, onStaveContextMenu, resolveKeyIndex, screenToLogical, getClickPitch],
  );

  // Hover-delete and keyboard note entry
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readOnly) return;

      // Let select mode handle Delete when a note is selected
      if (mode === 'select' && selectedNoteIndex != null) return;

      // Hover-delete: Delete/Backspace removes hovered note
      if ((e.key === 'Delete' || e.key === 'Backspace') && hoveredNoteRef.current !== null) {
        e.preventDefault();
        const idx = hoveredNoteRef.current;
        onNotesChange(notes.filter((_, i) => i !== idx));
        hoveredNoteRef.current = null;
        return;
      }

      // Keyboard note entry: letter (a-g) then octave (1-6)
      const key = e.key.toLowerCase();
      if (/^[a-g]$/.test(key)) {
        e.preventDefault();
        pendingNoteRef.current = key;
        if (pendingTimerRef.current !== null) clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = setTimeout(() => {
          pendingNoteRef.current = null;
          pendingTimerRef.current = null;
        }, 500);
        return;
      }

      if (/^[1-6]$/.test(e.key) && pendingNoteRef.current !== null) {
        e.preventDefault();
        const pitch = `${pendingNoteRef.current}/${e.key}`;
        const validPitches = getPitchesForClef(clef);
        if (validPitches.includes(pitch)) {
          const newNote: NoteData = { keys: [pitch], duration: selectedDuration };
          onNotesChange([...notes, newNote]);
        }
        // Clear pending state
        pendingNoteRef.current = null;
        if (pendingTimerRef.current !== null) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        return;
      }

      // Any other key clears pending note
      if (pendingNoteRef.current !== null) {
        pendingNoteRef.current = null;
        if (pendingTimerRef.current !== null) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
      }
    },
    [readOnly, mode, selectedNoteIndex, notes, onNotesChange, clef, selectedDuration],
  );

  const classNames = [
    'MusicStaffEditor',
    readOnly && 'MusicStaffEditor--readOnly',
    mode === 'select' && 'MusicStaffEditor--selectMode',
    isDragging && 'MusicStaffEditor--dragging',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      ref={containerRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      tabIndex={0}
    />
  );
}
