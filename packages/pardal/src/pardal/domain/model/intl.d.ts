declare namespace Intl {
  class Segmenter {
    constructor(locale: string, options?: { granularity: "grapheme" | "word" | "sentence" });
    segment(input: string): Segments;
  }

  interface Segments {
    [Symbol.iterator](): IterableIterator<{ segment: string; index: number; input: string }>;
  }
}

// Add these to make the types available at the module level
interface Intl {
  Segmenter: {
    new (
      locale: string,
      options?: { granularity: "grapheme" | "word" | "sentence" }
    ): Intl.Segmenter;
  };
}
