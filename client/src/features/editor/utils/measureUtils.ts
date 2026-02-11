import type { NoteData } from '../components/MusicStaffEditor/MusicStaffEditor';
import { getBeats, parseTimeSignature } from './durationUtils';

export interface Measure {
  startIndex: number; // index into the flat notes array
  notes: NoteData[];
  totalBeats: number;
  isFull: boolean;
}

/**
 * Split a flat array of notes into measures based on the time signature.
 * Notes are never split — a note that would overflow goes to the next measure.
 */
export function splitIntoMeasures(
  notes: NoteData[],
  timeSig: string,
): Measure[] {
  if (notes.length === 0) return [];

  const { numBeats, beatValue } = parseTimeSignature(timeSig);
  const measures: Measure[] = [];
  let currentNotes: NoteData[] = [];
  let currentBeats = 0;
  let startIndex = 0;

  for (let i = 0; i < notes.length; i++) {
    const noteBeats = getBeats(notes[i].duration, beatValue);

    if (currentBeats + noteBeats > numBeats && currentNotes.length > 0) {
      // Current measure is full, push it
      measures.push({
        startIndex,
        notes: currentNotes,
        totalBeats: currentBeats,
        isFull: Math.abs(currentBeats - numBeats) < 0.001,
      });
      currentNotes = [];
      currentBeats = 0;
      startIndex = i;
    }

    currentNotes.push(notes[i]);
    currentBeats += noteBeats;

    // If we've exactly filled the measure, close it
    if (Math.abs(currentBeats - numBeats) < 0.001) {
      measures.push({
        startIndex,
        notes: currentNotes,
        totalBeats: currentBeats,
        isFull: true,
      });
      currentNotes = [];
      currentBeats = 0;
      startIndex = i + 1;
    }
  }

  // Remaining notes form a partial (incomplete) measure
  if (currentNotes.length > 0) {
    measures.push({
      startIndex,
      notes: currentNotes,
      totalBeats: currentBeats,
      isFull: false,
    });
  }

  return measures;
}
