/// <reference types="bun-types" />
//
// Example 04 — primitive shapes: rectangles, rounded rectangles, and circles,
// arranged with rows/columns to form a small stats panel.
//
// Run: bun run examples/04-shapes.ts
// Output: examples/output/04-shapes.pdf
//
import Pardal, { Sizing, Alignment, TextAlignment } from "pardal";

const c = {
  page: "#111827",
  panel: "#1F2937",
  text: "#F9FAFB",
  muted: "#9CA3AF",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
  blue: "#60A5FA",
};

function stat(p: Pardal, dot: string, label: string, value: string) {
  p.column(
    {
      width: Sizing.grow(),
      height: Sizing.fit(),
      backgroundColor: c.panel,
      cornerRadius: 12,
      padding: 20,
      childGap: 10,
    },
    () => {
      p.row(
        { width: Sizing.grow(), height: Sizing.fit(), childGap: 8, childAlignment: Alignment.center() },
        () => {
          p.circle({ width: Sizing.fixed(12), height: Sizing.fixed(12), backgroundColor: dot });
          p.text(label, { fontSize: 12, fillColor: c.muted, width: Sizing.grow() });
        }
      );
      p.text(value, { fontSize: 30, fillColor: c.text, width: Sizing.grow() });
    }
  );
}

const pdf = await Pardal.createDocument(
  { dimensions: { width: 595, height: 842 } },
  (p) => {
    p.page(() => {
      p.column(
        {
          width: Sizing.grow(),
          height: Sizing.grow(),
          backgroundColor: c.page,
          padding: 40,
          childGap: 24,
        },
        () => {
          p.text("Shapes & primitives", { fontSize: 28, fillColor: c.text, width: Sizing.grow() });

          // Row of stat cards, each grows to share the width equally.
          p.row(
            { width: Sizing.grow(), height: Sizing.fit(), childGap: 16 },
            () => {
              stat(p, c.green, "Passing", "149");
              stat(p, c.amber, "Skipped", "3");
              stat(p, c.red, "Failing", "0");
            }
          );

          // A palette strip built from rounded rectangles.
          p.text("Palette", { fontSize: 16, fillColor: c.muted, width: Sizing.grow() });
          p.row(
            { width: Sizing.grow(), height: Sizing.fixed(56), childGap: 12 },
            () => {
              for (const col of [c.green, c.amber, c.red, c.blue]) {
                p.rect({ width: Sizing.grow(), height: Sizing.grow(), backgroundColor: col, cornerRadius: 8 });
              }
            }
          );

          // Circles of increasing size, centered in a band.
          p.text("Circles", { fontSize: 16, fillColor: c.muted, width: Sizing.grow() });
          p.row(
            {
              width: Sizing.grow(),
              height: Sizing.fixed(90),
              backgroundColor: c.panel,
              cornerRadius: 12,
              childGap: 20,
              padding: 16,
              childAlignment: Alignment.center(),
            },
            () => {
              for (const d of [24, 40, 56, 72]) {
                p.circle({ width: Sizing.fixed(d), height: Sizing.fixed(d), backgroundColor: c.blue });
              }
            }
          );
        }
      );
    });
  }
);

await Bun.write("examples/output/04-shapes.pdf", pdf);
console.log("wrote examples/output/04-shapes.pdf");
