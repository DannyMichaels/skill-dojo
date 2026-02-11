import { useCallback, useState } from 'react';
import MusicPanel from '../../../editor/components/MusicPanel';
import FloatingEditor from '../../../editor/components/FloatingEditor';
import ResizeHandle from '../ResizeHandle';
import { getKeySignatureAccidentals } from '../../../editor/utils/pitchUtils';
import type { RefObject } from 'react';

interface MusicTrainingProps {
  notation: string;
  sendMessage: (msg: string) => void;
  streaming: boolean;
  splitPercent: number;
  onResize: (pct: number) => void;
  splitRef: RefObject<HTMLDivElement | null>;
}

export default function MusicTraining({
  notation,
  sendMessage,
  streaming,
  splitPercent,
  onResize,
  splitRef,
}: MusicTrainingProps) {
  const [submitting, setSubmitting] = useState(false);
  const [floating, setFloating] = useState(false);

  const handleSubmit = useCallback(
    (notationJson: string) => {
      setSubmitting(true);
      try {
        const parsed = JSON.parse(notationJson);
        const keyAcc = getKeySignatureAccidentals(parsed.keySignature || 'C');

        // Resolve each pitch: apply key signature accidentals unless an explicit one is set
        const resolveKey = (key: string, accidental?: string | null): string => {
          const [note, octave] = key.split('/');
          if (accidental === 'n') return `${note}/${octave}`;
          if (accidental === '#' || accidental === 'b') return `${note}${accidental}/${octave}`;
          const implied = keyAcc[note.toLowerCase()];
          return implied ? `${note}${implied}/${octave}` : key;
        };

        const noteNames = parsed.notes
          .map((n: { keys: string[]; accidentals?: (string | null)[] }) =>
            n.keys.map((k: string, ki: number) => resolveKey(k, n.accidentals?.[ki])).join(','),
          )
          .join(' | ');
        const submitMsg = `Here is my notation (${parsed.clef} clef, ${parsed.timeSignature}, key of ${parsed.keySignature || 'C'}):\n\n${noteNames}\n\n\`\`\`json\n${notationJson}\n\`\`\``;
        sendMessage(submitMsg);
      } finally {
        setSubmitting(false);
      }
    },
    [sendMessage],
  );

  if (floating) {
    return (
      <FloatingEditor onDock={() => setFloating(false)} title="Music Editor">
        <MusicPanel
          notation={notation}
          onSubmit={handleSubmit}
          submitting={submitting || streaming}
          compact
        />
      </FloatingEditor>
    );
  }

  return (
    <>
      <ResizeHandle onResize={onResize} containerRef={splitRef} />
      <div
        className="TrainingScreen__editorPane"
        style={{ width: `${100 - splitPercent}%` }}
      >
        <MusicPanel
          notation={notation}
          onSubmit={handleSubmit}
          submitting={submitting || streaming}
          onPopOut={() => setFloating(true)}
        />
      </div>
    </>
  );
}
