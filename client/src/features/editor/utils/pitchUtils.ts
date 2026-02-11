export const TREBLE_PITCHES = [
  'a/5', 'g/5', 'f/5', 'e/5', 'd/5', 'c/5', 'b/4', 'a/4', 'g/4', 'f/4',
  'e/4', 'd/4', 'c/4', 'b/3', 'a/3',
];

export const BASS_PITCHES = [
  'c/4', 'b/3', 'a/3', 'g/3', 'f/3', 'e/3', 'd/3', 'c/3', 'b/2', 'a/2',
  'g/2', 'f/2', 'e/2', 'd/2', 'c/2',
];

export const ALTO_PITCHES = [
  'b/5', 'a/5', 'g/5', 'f/5', 'e/5', 'd/5', 'c/5', 'b/4', 'a/4', 'g/4',
  'f/4', 'e/4', 'd/4', 'c/4', 'b/3',
];

export function getPitchesForClef(clef: string): string[] {
  switch (clef) {
    case 'bass': return BASS_PITCHES;
    case 'alto': return ALTO_PITCHES;
    default: return TREBLE_PITCHES;
  }
}

/**
 * Shift a pitch up or down one diatonic step within the clef's pitch array.
 */
export function shiftPitch(
  pitch: string,
  direction: 'up' | 'down',
  clef: string,
): string {
  const pitches = getPitchesForClef(clef);
  const idx = pitches.indexOf(pitch);
  if (idx === -1) return pitch;
  // "up" means higher pitch = lower index in the array
  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= pitches.length) return pitch;
  return pitches[newIdx];
}

/**
 * Map of key signatures to the note letters they sharpen or flatten.
 * Sharp keys: G(F#), D(F#C#), A(F#C#G#), E(F#C#G#D#), B(F#C#G#D#A#)
 * Flat keys:  F(Bb), Bb(BbEb), Eb(BbEbAb), Ab(BbEbAbDb), Db(BbEbAbDbGb)
 */
const KEY_SIGNATURE_ACCIDENTALS: Record<string, Record<string, string>> = {
  C: {},
  G: { f: '#' },
  D: { f: '#', c: '#' },
  A: { f: '#', c: '#', g: '#' },
  E: { f: '#', c: '#', g: '#', d: '#' },
  B: { f: '#', c: '#', g: '#', d: '#', a: '#' },
  F: { b: 'b' },
  Bb: { b: 'b', e: 'b' },
  Eb: { b: 'b', e: 'b', a: 'b' },
  Ab: { b: 'b', e: 'b', a: 'b', d: 'b' },
  Db: { b: 'b', e: 'b', a: 'b', d: 'b', g: 'b' },
};

/** Get the implied accidentals for a key signature. */
export function getKeySignatureAccidentals(keySignature: string): Record<string, string> {
  return KEY_SIGNATURE_ACCIDENTALS[keySignature] ?? {};
}

/**
 * Convert VexFlow pitch notation (e.g. "c/4") + optional accidental to
 * Tone.js notation (e.g. "C4", "C#4", "Bb3").
 *
 * If a keySignature is provided and the note has no explicit accidental,
 * the key signature's implied accidental is applied (e.g. F → F# in key of G).
 */
export function vexflowPitchToTone(
  pitch: string,
  accidental?: string | null,
  keySignature?: string,
): string {
  const [note, octave] = pitch.split('/');
  const base = note.toUpperCase();

  let acc = '';
  if (accidental === '#' || accidental === 'b' || accidental === 'n') {
    // Explicit accidental: 'n' (natural) means no accidental override
    acc = accidental === 'n' ? '' : accidental;
  } else if (keySignature) {
    // No explicit accidental — apply key signature
    const keyAcc = getKeySignatureAccidentals(keySignature);
    acc = keyAcc[note.toLowerCase()] ?? '';
  }

  return `${base}${acc}${octave}`;
}
