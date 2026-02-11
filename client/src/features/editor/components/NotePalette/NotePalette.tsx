import { MousePointer2 } from 'lucide-react';
import type { InteractionMode } from '../MusicStaffEditor';
import './NotePalette.scss';

interface NotePaletteProps {
  selected: string;
  onSelect: (duration: string) => void;
  mode?: InteractionMode;
  onModeChange?: (mode: InteractionMode) => void;
  onApplyDuration?: (duration: string) => void;
}

const DURATIONS = [
  { value: 'w', label: '\uD834\uDD5D', title: 'Whole' },
  { value: 'h', label: '\uD834\uDD5E', title: 'Half' },
  { value: 'q', label: '\uD834\uDD5F', title: 'Quarter' },
  { value: '8', label: '\uD834\uDD60', title: 'Eighth' },
  { value: '16', label: '\uD834\uDD61', title: 'Sixteenth' },
  { value: 'wr', label: '\uD834\uDD3B', title: 'Whole Rest' },
  { value: 'hr', label: '\uD834\uDD3C', title: 'Half Rest' },
  { value: 'qr', label: '\uD834\uDD3D', title: 'Quarter Rest' },
];

export default function NotePalette({
  selected,
  onSelect,
  mode = 'place',
  onModeChange,
  onApplyDuration,
}: NotePaletteProps) {
  const isSelectMode = mode === 'select';

  return (
    <div className={`NotePalette${isSelectMode ? ' NotePalette--selectMode' : ''}`}>
      {onModeChange && (
        <button
          className={`NotePalette__btn NotePalette__btn--mode${isSelectMode ? ' NotePalette__btn--active' : ''}`}
          onClick={() => onModeChange(isSelectMode ? 'place' : 'select')}
          title={isSelectMode ? 'Switch to Place mode' : 'Switch to Select mode'}
          type="button"
        >
          <MousePointer2 size={16} />
        </button>
      )}
      {DURATIONS.map((d) => (
        <button
          key={d.value}
          className={`NotePalette__btn${selected === d.value ? ' NotePalette__btn--active' : ''}`}
          onClick={() => {
            if (isSelectMode && onApplyDuration) {
              onApplyDuration(d.value);
            } else {
              onSelect(d.value);
            }
          }}
          title={d.title}
          type="button"
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
