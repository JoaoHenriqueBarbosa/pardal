/// <reference types="bun-types" />
//
// Example 02 — an invoice, exercising rows, columns, grow/fixed sizing,
// nested layout, and text alignment. No external assets.
//
// Run: bun run examples/02-invoice.ts
// Output: examples/output/02-invoice.pdf
//
import Pardal, { Sizing, Alignment, TextAlignment } from "pardal";

const c = {
  page: "#FFFFFF",
  ink: "#111827",
  muted: "#6B7280",
  line: "#E5E7EB",
  brand: "#4F46E5",
  zebra: "#F9FAFB",
};

type Item = { name: string; qty: number; price: number };
const items: Item[] = [
  { name: "Layout engine license", qty: 1, price: 480 },
  { name: "PDF rendering module", qty: 2, price: 120 },
  { name: "Priority support (12 months)", qty: 1, price: 240 },
];
const money = (n: number) => `$ ${n.toFixed(2)}`;
const total = items.reduce((s, it) => s + it.qty * it.price, 0);

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
          childGap: 28,
        },
        () => {
          // Header row: title on the left, invoice meta on the right.
          p.row(
            { width: Sizing.grow(), height: Sizing.fit() },
            () => {
              p.column({ width: Sizing.grow(), height: Sizing.fit(), childGap: 4 }, () => {
                p.text("INVOICE", { fontSize: 32, fillColor: c.brand });
                p.text("Pardal Software Ltda.", { fontSize: 12, fillColor: c.muted });
              });
              p.column(
                { width: Sizing.fixed(180), height: Sizing.fit(), childGap: 4 },
                () => {
                  p.text("#INV-2026-014", {
                    fontSize: 12,
                    fillColor: c.ink,
                    textAlignment: TextAlignment.RIGHT,
                    width: Sizing.grow(),
                  });
                  p.text("2026-07-04", {
                    fontSize: 12,
                    fillColor: c.muted,
                    textAlignment: TextAlignment.RIGHT,
                    width: Sizing.grow(),
                  });
                }
              );
            }
          );

          // Divider.
          p.rect({ width: Sizing.grow(), height: Sizing.fixed(2), backgroundColor: c.line });

          // Table header.
          p.row(
            { width: Sizing.grow(), height: Sizing.fit(), padding: 8 },
            () => {
              p.text("Item", { fontSize: 12, fillColor: c.muted, width: Sizing.grow() });
              p.text("Qty", {
                fontSize: 12,
                fillColor: c.muted,
                width: Sizing.fixed(60),
                textAlignment: TextAlignment.RIGHT,
              });
              p.text("Amount", {
                fontSize: 12,
                fillColor: c.muted,
                width: Sizing.fixed(100),
                textAlignment: TextAlignment.RIGHT,
              });
            }
          );

          // Table rows (zebra striped).
          for (let i = 0; i < items.length; i++) {
            const it = items[i];
            p.row(
              {
                width: Sizing.grow(),
                height: Sizing.fit(),
                padding: 8,
                backgroundColor: i % 2 === 0 ? c.zebra : c.page,
                cornerRadius: 4,
              },
              () => {
                p.text(it.name, { fontSize: 13, fillColor: c.ink, width: Sizing.grow() });
                p.text(String(it.qty), {
                  fontSize: 13,
                  fillColor: c.ink,
                  width: Sizing.fixed(60),
                  textAlignment: TextAlignment.RIGHT,
                });
                p.text(money(it.qty * it.price), {
                  fontSize: 13,
                  fillColor: c.ink,
                  width: Sizing.fixed(100),
                  textAlignment: TextAlignment.RIGHT,
                });
              }
            );
          }

          p.rect({ width: Sizing.grow(), height: Sizing.fixed(2), backgroundColor: c.line });

          // Total row, right-aligned.
          p.row(
            { width: Sizing.grow(), height: Sizing.fit(), padding: 8, childAlignment: Alignment.center() },
            () => {
              p.text("Total", { fontSize: 16, fillColor: c.ink, width: Sizing.grow() });
              p.text(money(total), {
                fontSize: 20,
                fillColor: c.brand,
                width: Sizing.fixed(160),
                textAlignment: TextAlignment.RIGHT,
              });
            }
          );
        }
      );
    });
  }
);

await Bun.write("examples/output/02-invoice.pdf", pdf);
console.log("wrote examples/output/02-invoice.pdf");
