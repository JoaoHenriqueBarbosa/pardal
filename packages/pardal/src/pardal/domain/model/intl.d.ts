declare namespace Intl {
  class Segmenter {
    constructor(locale: string, options?: { granularity: 'grapheme' | 'word' | 'sentence' });
    segment(input: string): Segments;
  }

  interface Segments {
    [Symbol.iterator](): IterableIterator<{ segment: string; index: number; input: string }>;
  }
} 