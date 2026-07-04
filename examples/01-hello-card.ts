/// <reference types="bun-types" />
//
// Example 01 — a hello-world card built from shapes and text.
// No external assets, no custom fonts: uses PDFKit's built-in Helvetica.
//
// Run: bun run examples/01-hello-card.ts
// Output: examples/output/01-hello-card.pdf
//
import Pardal, { Sizing, Alignment, TextAlignment } from "pardal";

const colors = {
  bg: "#0F172A",
  card: "#1E293B",
  accent: "#38BDF8",
  text: "#E2E8F0",
  muted: "#94A3B8",
};

const pdf = await Pardal.createDocument(
  { dimensions: { width: 595, height: 842 } }, // A4 portrait, in points
  (p) => {
    p.page(() => {
      // Full-page background, centering its single child.
      p.column(
        {
          width: Sizing.grow(),
          height: Sizing.grow(),
          backgroundColor: colors.bg,
          childAlignment: Alignment.center(),
          padding: 40,
        },
        () => {
          // The card.
          p.column(
            {
              width: Sizing.fixed(420),
              height: Sizing.fit(),
              backgroundColor: colors.card,
              cornerRadius: 16,
              padding: 32,
              childGap: 16,
              childAlignment: Alignment.center(),
            },
            () => {
              // Accent bar.
              p.rect({
                width: Sizing.fixed(64),
                height: Sizing.fixed(6),
                backgroundColor: colors.accent,
                cornerRadius: 3,
              });

              p.text("Pardal", {
                fontSize: 42,
                fillColor: colors.text,
                textAlignment: TextAlignment.CENTER,
                width: Sizing.grow(),
              });

              p.text(
                "A declarative, flexbox-style layout engine that renders straight to PDF.",
                {
                  fontSize: 16,
                  fillColor: colors.muted,
                  textAlignment: TextAlignment.CENTER,
                  width: Sizing.grow(),
                }
              );
            }
          );
        }
      );
    });
  }
);

await Bun.write("examples/output/01-hello-card.pdf", pdf);
console.log("wrote examples/output/01-hello-card.pdf");
