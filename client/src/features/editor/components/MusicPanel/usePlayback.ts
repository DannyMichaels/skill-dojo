import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import type { NoteData } from '../MusicStaffEditor';
import { vexflowPitchToTone } from '../../utils/pitchUtils';
import { vexflowDurationToTone } from '../../utils/durationUtils';

export interface UsePlaybackReturn {
  isPlaying: boolean;
  currentNoteIndex: number | null;
  play: () => Promise<void>;
  stop: () => void;
}

export function usePlayback(notes: NoteData[], bpm = 120, keySignature = 'C'): UsePlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState<number | null>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const playingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    playingRef.current = false;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setIsPlaying(false);
    setCurrentNoteIndex(null);
  }, []);

  const play = useCallback(async () => {
    if (notes.length === 0) return;

    // Ensure audio context is started (browser autoplay policy)
    await Tone.start();

    // Stop any previous playback
    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    // Create or reuse synth
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    }

    const synth = synthRef.current;
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    let currentTime = 0;
    playingRef.current = true;
    setIsPlaying(true);

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const toneDuration = vexflowDurationToTone(note.duration);

      // Schedule highlight update
      const noteIndex = i;
      transport.scheduleOnce(() => {
        if (playingRef.current) {
          setCurrentNoteIndex(noteIndex);
        }
      }, currentTime);

      // Schedule note sound (skip for rests)
      if (toneDuration) {
        const pitches = note.keys.map((key, keyIdx) =>
          vexflowPitchToTone(key, note.accidentals?.[keyIdx], keySignature),
        );
        const dur = toneDuration;
        const time = currentTime;
        transport.scheduleOnce((t) => {
          if (playingRef.current) {
            synth.triggerAttackRelease(pitches, dur, t);
          }
        }, time);
      }

      // Calculate duration in seconds for scheduling next note
      // Tone.Time handles the conversion using the current BPM
      currentTime += Tone.Time(toneDuration ?? '4n').toSeconds();
    }

    // Schedule stop at the end
    transport.scheduleOnce(() => {
      playingRef.current = false;
      setIsPlaying(false);
      setCurrentNoteIndex(null);
    }, currentTime);

    transport.start();
  }, [notes, bpm, keySignature]);

  return { isPlaying, currentNoteIndex, play, stop };
}
