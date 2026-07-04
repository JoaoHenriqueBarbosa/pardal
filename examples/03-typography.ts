/// <reference types="bun-types" />
//
// Example 03 — typography: markdown (bold/italic, nested), text wrapping,
// and the three text alignments. Isolates text behaviour.
//
// Run: bun run examples/03-typography.ts
// Output: examples/output/03-typography.pdf
//
import Pardal, { Sizing, TextAlignment } from "pardal";

const c = {
  page: "#FFFDF7",
  ink: "#1C1917",
  soft: "#78716C",
  rule: "#E7E5E4",
  accent: "#B45309",
};

const pdf = await Pardal.createDocument(
  { dimensions: { width: 595, height: 842 } },
  (p) => {
    p.page(() => {
      p.column(
        {
          width: Sizing.grow(),
          height: Sizing.grow(),
          backgroundColor: c.page,
          padding: 48,
          childGap: 20,
        },
        () => {
          p.text("Typography", { fontSize: 34, fillColor: c.accent, width: Sizing.grow() });

          p.text(
            "Pardal parses inline **Markdown**, so you can mix **bold**, *italic*, and even **bold with *nested italic* inside** in a single run of text.",
            { fontSize: 16, fillColor: c.ink, width: Sizing.grow() }
          );

          p.rect({ width: Sizing.grow(), height: Sizing.fixed(1), backgroundColor: c.rule });

          // Wrapping: a long paragraph must break across many lines within the column width.
          p.text(
            "This paragraph is deliberately long so that the layout engine has to wrap it across multiple lines. Word wrapping is measured per word against the available width, then each resulting line is laid out and aligned independently — the same approach the Clay layout library uses. Notice there is plenty of horizontal room, and the text fills it before wrapping.",
            { fontSize: 14, fillColor: c.soft, width: Sizing.grow() }
          );

          p.rect({ width: Sizing.grow(), height: Sizing.fixed(1), backgroundColor: c.rule });

          // The three alignments, each in its own full-width line.
          p.text("Left aligned — the default.", {
            fontSize: 14,
            fillColor: c.ink,
            width: Sizing.grow(),
            textAlignment: TextAlignment.LEFT,
          });
          p.text("Centered.", {
            fontSize: 14,
            fillColor: c.ink,
            width: Sizing.grow(),
            textAlignment: TextAlignment.CENTER,
          });
          p.text("Right aligned.", {
            fontSize: 14,
            fillColor: c.ink,
            width: Sizing.grow(),
            textAlignment: TextAlignment.RIGHT,
          });
        }
      );
    });
  }
);

await Bun.write("examples/output/03-typography.pdf", pdf);
console.log("wrote examples/output/03-typography.pdf");
