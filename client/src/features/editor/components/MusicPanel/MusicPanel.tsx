import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import MusicStaffEditor, { type NoteData, type InteractionMode } from '../MusicStaffEditor';
import NotePalette from '../NotePalette';
import Button from '../../../../components/shared/Button';
import ContextMenu from '../../../../components/shared/ContextMenu';
import { usePlayback } from './usePlayback';
import { useNoteContextMenu } from './useNoteContextMenu';
import { useSelectMode } from '../MusicStaffEditor/useSelectMode';
import './MusicPanel.scss';

interface NotationData {
  clef: 'treble' | 'bass' | 'alto';
  timeSignature: string;
  keySignature: string;
  tempo: number;
  notes: NoteData[];
}

interface MusicPanelProps {
  notation?: string;
  onSubmit: (notation: string) => void;
  submitting?: boolean;
  onPopOut?: () => void;
  compact?: boolean;
}

const DEFAULT_TEMPO = 120;

const DEFAULT_NOTATION: NotationData = {
  clef: 'treble',
  timeSignature: '4/4',
  keySignature: 'C',
  tempo: DEFAULT_TEMPO,
  notes: [],
};

function parseNotation(raw?: string): NotationData {
  if (!raw) return { ...DEFAULT_NOTATION };
  try {
    const parsed = JSON.parse(raw);
    return {
      clef: parsed.clef || 'treble',
      timeSignature: parsed.timeSignature || '4/4',
      keySignature: parsed.keySignature || 'C',
      tempo: typeof parsed.tempo === 'number' ? parsed.tempo : DEFAULT_TEMPO,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return { ...DEFAULT_NOTATION };
  }
}

const CLEF_OPTIONS = ['treble', 'bass', 'alto'] as const;
const TIME_SIG_OPTIONS = ['4/4', '3/4', '2/4', '6/8', '2/2', '3/8'];
const KEY_SIG_OPTIONS = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db'];

export default function MusicPanel({
  notation,
  onSubmit,
  submitting,
  onPopOut,
  compact,
}: MusicPanelProps) {
  const [data, setData] = useState<NotationData>(() => parseNotation(notation));
  const [selectedDuration, setSelectedDuration] = useState('q');
  const [mode, setMode] = useState<InteractionMode>('place');
  const staffContainerRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    position: { x: number; y: number };
    noteIndex: number;
    keyIndex: number;
    stavePitch?: string;
  }>({ open: false, position: { x: 0, y: 0 }, noteIndex: -1, keyIndex: 0 });

  // Playback
  const { isPlaying, currentNoteIndex, play, stop } = usePlayback(data.notes, data.tempo, data.keySignature);

  // Context menu actions
  const { buildItems } = useNoteContextMenu(data.notes, data.clef, (notes) =>
    setData((prev) => ({ ...prev, notes })),
  );

  // Select mode
  const { selection, setSelection } = useSelectMode(
    data.notes,
    data.clef,
    (notes) => setData((prev) => ({ ...prev, notes })),
    staffContainerRef,
  );

  // Sync when notation prop changes
  useEffect(() => {
    if (notation) {
      setData(parseNotation(notation));
    }
  }, [notation]);

  // Clear selection when switching modes
  useEffect(() => {
    if (mode === 'place') {
      setSelection(null);
    }
  }, [mode, setSelection]);

  const handleNotesChange = useCallback((notes: NoteData[]) => {
    setData((prev) => ({ ...prev, notes }));
  }, []);

  const handleClefChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const clef = e.target.value as NotationData['clef'];
    setData((prev) => ({ ...prev, clef }));
  }, []);

  const handleTimeSigChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setData((prev) => ({ ...prev, timeSignature: e.target.value }));
  }, []);

  const handleKeySigChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setData((prev) => ({ ...prev, keySignature: e.target.value }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(JSON.stringify(data));
  }, [data, onSubmit]);

  const handleTempoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val > 0 && val <= 300) {
      setData((prev) => ({ ...prev, tempo: val }));
    }
  }, []);

  const handleApplyDuration = useCallback(
    (duration: string) => {
      if (selection === null) return;
      setData((prev) => ({
        ...prev,
        notes: prev.notes.map((n, i) =>
          i === selection.noteIndex ? { ...n, duration } : n,
        ),
      }));
    },
    [selection],
  );

  const handleClear = useCallback(() => {
    setData((prev) => ({ ...prev, notes: [] }));
    setSelection(null);
  }, [setSelection]);

  const handleNoteContextMenu = useCallback((e: React.MouseEvent, noteIndex: number, keyIndex: number) => {
    setContextMenu({
      open: true,
      position: { x: e.clientX, y: e.clientY },
      noteIndex,
      keyIndex,
    });
  }, []);

  const handleStaveContextMenu = useCallback((e: React.MouseEvent, pitch: string) => {
    setContextMenu({
      open: true,
      position: { x: e.clientX, y: e.clientY },
      noteIndex: -1,
      keyIndex: 0,
      stavePitch: pitch,
    });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <div className={`MusicPanel${compact ? ' MusicPanel--compact' : ''}`}>
      <div className="MusicPanel__toolbar">
        <div className="MusicPanel__toolbarLeft">
          <select
            className="MusicPanel__select"
            value={data.clef}
            onChange={handleClefChange}
            title="Clef"
          >
            {CLEF_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>

          <select
            className="MusicPanel__select"
            value={data.timeSignature}
            onChange={handleTimeSigChange}
            title="Time Signature"
          >
            {TIME_SIG_OPTIONS.map((ts) => (
              <option key={ts} value={ts}>
                {ts}
              </option>
            ))}
          </select>

          <select
            className="MusicPanel__select"
            value={data.keySignature}
            onChange={handleKeySigChange}
            title="Key Signature"
          >
            {KEY_SIG_OPTIONS.map((ks) => (
              <option key={ks} value={ks}>
                {ks}
              </option>
            ))}
          </select>

          <input
            className="MusicPanel__tempoInput"
            type="number"
            min={20}
            max={300}
            value={data.tempo}
            onChange={handleTempoChange}
            title="Tempo (BPM)"
          />
          <span className="MusicPanel__tempoLabel">BPM</span>

          <NotePalette
            selected={selectedDuration}
            onSelect={setSelectedDuration}
            mode={mode}
            onModeChange={setMode}
            onApplyDuration={selection ? handleApplyDuration : undefined}
          />
        </div>

        <div className="MusicPanel__toolbarActions">
          <Button
            size="sm"
            variant="ghost"
            onClick={isPlaying ? stop : play}
            disabled={data.notes.length === 0}
            title={isPlaying ? 'Stop' : 'Play'}
          >
            {isPlaying ? <Square size={14} /> : <Play size={14} />}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear}>
            Clear
          </Button>
          {onPopOut && (
            <Button size="sm" variant="ghost" onClick={onPopOut}>
              Pop out
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            loading={submitting}
            disabled={data.notes.length === 0}
          >
            Submit
          </Button>
        </div>
      </div>

      <div className="MusicPanel__staff" ref={staffContainerRef}>
        <MusicStaffEditor
          notes={data.notes}
          clef={data.clef}
          timeSignature={data.timeSignature}
          keySignature={data.keySignature}
          selectedDuration={selectedDuration}
          onNotesChange={handleNotesChange}
          mode={mode}
          highlightedNoteIndex={currentNoteIndex}
          selectedNoteIndex={mode === 'select' ? (selection?.noteIndex ?? null) : null}
          selectedKeyIndex={mode === 'select' ? (selection?.keyIndex ?? null) : null}
          onNoteSelect={(noteIndex, keyIndex) => {
            if (noteIndex === null) {
              setSelection(null);
            } else {
              setSelection({ noteIndex, keyIndex: keyIndex ?? 0 });
            }
          }}
          onNoteContextMenu={handleNoteContextMenu}
          onStaveContextMenu={handleStaveContextMenu}
        />
      </div>

      <ContextMenu
        open={contextMenu.open}
        position={contextMenu.position}
        items={
          contextMenu.open
            ? contextMenu.noteIndex >= 0
              ? buildItems(contextMenu.noteIndex, contextMenu.keyIndex)
              : contextMenu.stavePitch
                ? [
                    {
                      label: `Add ${selectedDuration === 'q' ? 'quarter' : selectedDuration === 'h' ? 'half' : selectedDuration === 'w' ? 'whole' : selectedDuration === '8' ? 'eighth' : selectedDuration === '16' ? 'sixteenth' : ''} note (${contextMenu.stavePitch})`,
                      onClick: () => {
                        setData((prev) => ({
                          ...prev,
                          notes: [...prev.notes, { keys: [contextMenu.stavePitch!], duration: selectedDuration }],
                        }));
                      },
                    },
                    {
                      label: 'Add rest',
                      onClick: () => {
                        setData((prev) => ({
                          ...prev,
                          notes: [...prev.notes, { keys: ['b/4'], duration: selectedDuration + 'r' }],
                        }));
                      },
                    },
                  ]
                : []
            : []
        }
        onClose={handleContextMenuClose}
      />
    </div>
  );
}
