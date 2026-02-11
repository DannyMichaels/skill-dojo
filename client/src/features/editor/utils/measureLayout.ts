import type { Measure } from './measureUtils';

export interface MeasureLayout {
  measureIndex: number;
  x: number;
  y: number;
  width: number;
  isFirstOnLine: boolean;
  isFirstMeasure: boolean;
  isLastMeasure: boolean;
  lineIndex: number;
}

const STAVE_HEIGHT = 120; // vertical space per stave line (stave + gap)
const CLEF_WIDTH = 40; // extra width for clef at start of each line
const TIME_SIG_WIDTH = 30; // extra width for time signature on first measure
const KEY_SIG_WIDTH = 20; // extra width for key signature on first measure
const MIN_MEASURE_WIDTH = 100;
const STAVE_PADDING = 20; // left/right margin

/**
 * Compute the layout (position + size) for each measure, wrapping to new lines
 * when measures overflow the container width.
 */
export function computeMeasureLayout(
  measures: Measure[],
  containerWidth: number,
  beatsPerMeasure: number,
  hasKeySig: boolean,
): MeasureLayout[] {
  if (measures.length === 0 || containerWidth <= 0) return [];

  const usableWidth = containerWidth - STAVE_PADDING * 2;

  // Base width per beat — we'll scale measure widths proportionally
  const baseBeatWidth = Math.max(
    30,
    Math.min(80, usableWidth / (beatsPerMeasure * 4)),
  );

  const layouts: MeasureLayout[] = [];
  let lineIndex = 0;
  let x = STAVE_PADDING;
  let lineStart = 0;

  for (let i = 0; i < measures.length; i++) {
    const isFirstMeasure = i === 0;
    const isFirstOnLine = i === lineStart;

    // Calculate measure width
    let width = Math.max(
      MIN_MEASURE_WIDTH,
      measures[i].totalBeats * baseBeatWidth,
    );

    // Extra space for decorations
    let extraWidth = 0;
    if (isFirstOnLine) extraWidth += CLEF_WIDTH;
    if (isFirstMeasure) {
      extraWidth += TIME_SIG_WIDTH;
      if (hasKeySig) extraWidth += KEY_SIG_WIDTH;
    }
    width += extraWidth;

    // Check if this measure fits on the current line
    if (!isFirstOnLine && x + width > containerWidth - STAVE_PADDING) {
      // Wrap to new line
      lineIndex++;
      x = STAVE_PADDING;
      lineStart = i;
    }

    const isFirstOnLineAfterWrap = i === lineStart;
    // If we just wrapped, recalculate width with clef space
    if (isFirstOnLineAfterWrap && !isFirstOnLine) {
      width = Math.max(
        MIN_MEASURE_WIDTH,
        measures[i].totalBeats * baseBeatWidth,
      );
      width += CLEF_WIDTH;
    }

    layouts.push({
      measureIndex: i,
      x,
      y: lineIndex * STAVE_HEIGHT + 30,
      width,
      isFirstOnLine: isFirstOnLineAfterWrap || isFirstOnLine,
      isFirstMeasure,
      isLastMeasure: i === measures.length - 1,
      lineIndex,
    });

    x += width;
  }

  return layouts;
}

/** Compute the total SVG height needed for all stave lines. */
export function computeTotalHeight(layouts: MeasureLayout[]): number {
  if (layouts.length === 0) return 200;
  const maxLine = layouts[layouts.length - 1].lineIndex;
  return (maxLine + 1) * STAVE_HEIGHT + 60;
}
