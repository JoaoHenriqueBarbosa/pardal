import { describe, expect, test } from "bun:test";
import { LayoutAlignmentX, LayoutAlignmentY, SizingType } from "./domain/model/types";
import { RenderCommandType } from "./domain/rendering/commands";
import Pardal, { Sizing, Alignment, measureWords, wrapTextIntoLines } from "./index";

// Small helpers -------------------------------------------------------------

/** Render a document and return its RenderCommands (post-layout). */
async function commandsFor(build: (p: Pardal) => void) {
  let captured: Pardal | null = null;
  await Pardal.createDocument({ dimensions: { width: 400, height: 300 } }, (p) => {
    build(p);
    captured = p;
  });
  // createDocument runs the layout engine before returning, so the commands
  // are populated on the same instance.
  if (!captured) throw new Error("document callback did not run");
  return captured.getRenderCommands();
}

const rectCommands = (cmds: ReturnType<Pardal["getRenderCommands"]>) =>
  cmds.filter((c) => c.commandType === RenderCommandType.RECTANGLE);

// Sizing --------------------------------------------------------------------

describe("Sizing", () => {
  test("fixed carries the exact size", () => {
    const s = Sizing.fixed(120);
    expect(s.type).toBe(SizingType.FIXED);
    expect(s.size.fixed).toBe(120);
  });

  test("grow is a GROW axis", () => {
    expect(Sizing.grow().type).toBe(SizingType.GROW);
  });

  test("percent stores the fraction", () => {
    const s = Sizing.percent(0.5);
    expect(s.type).toBe(SizingType.PERCENT);
    expect(s.size.percent).toBe(0.5);
  });

  test("fit is a FIT axis", () => {
    expect(Sizing.fit().type).toBe(SizingType.FIT);
  });
});

describe("Alignment", () => {
  test("center aligns on both axes", () => {
    const a = Alignment.center();
    expect(a.x).toBe(LayoutAlignmentX.CENTER);
    expect(a.y).toBe(LayoutAlignmentY.CENTER);
  });
});

// Text measurement ----------------------------------------------------------

describe("text measurement", () => {
  const ctx = new Pardal().getContext();

  test("measureWords tokenizes words and spaces, measuring each", () => {
    // Like Clay, spaces are preserved as their own tokens so lines can be
    // reconstructed: "hello brave world" -> hello, ␣, brave, ␣, world.
    const tokens = measureWords(ctx, "hello brave world", 16);
    expect(tokens.length).toBe(5);
    const words = tokens.filter((t) => t.text.trim().length > 0);
    expect(words.map((w) => w.text)).toEqual(["hello", "brave", "world"]);
    for (const w of words) {
      expect(w.width).toBeGreaterThan(0);
      expect(w.height).toBeGreaterThan(0);
    }
  });

  test("measureWords returns nothing for empty input", () => {
    expect(measureWords(ctx, "", 16)).toEqual([]);
  });

  test("wrapTextIntoLines wraps a long string into multiple lines", () => {
    const sentence =
      "This sentence is long enough that it must wrap across more than one line when constrained.";
    const words = measureWords(ctx, sentence, 16);
    const narrow = wrapTextIntoLines(ctx, sentence, words, 120);
    const wide = wrapTextIntoLines(ctx, sentence, words, 4000);
    expect(narrow.length).toBeGreaterThan(1);
    // A very wide container needs fewer lines than a narrow one.
    expect(wide.length).toBeLessThan(narrow.length);
  });

  test("larger font produces wider words", () => {
    const small = measureWords(ctx, "word", 10)[0].width;
    const large = measureWords(ctx, "word", 30)[0].width;
    expect(large).toBeGreaterThan(small);
  });
});

// Document generation -------------------------------------------------------

describe("Pardal.createDocument", () => {
  test("produces valid PDF bytes", async () => {
    const buf = await Pardal.createDocument({ dimensions: { width: 200, height: 200 } }, (p) => {
      p.page(() => {
        p.text("hi", { fontSize: 16 });
      });
    });
    expect(buf.byteLength).toBeGreaterThan(0);
    // Every PDF file starts with "%PDF".
    const header = new TextDecoder().decode(new Uint8Array(buf).subarray(0, 4));
    expect(header).toBe("%PDF");
  });

  test("renders one page per page() call", async () => {
    let p!: Pardal;
    await Pardal.createDocument({ dimensions: { width: 200, height: 200 } }, (pardal) => {
      pardal.page(() => pardal.text("a"));
      pardal.page(() => pardal.text("b"));
      p = pardal;
    });
    expect(p.getContext().pages.length).toBe(2);
  });
});

// Regression: transparent background ---------------------------------------
//
// A container/text without an explicit `backgroundColor` must NOT paint a
// rectangle (previously it defaulted to solid white, drawing a white box
// behind every uncolored element). See element-factory + drawRectangle.

describe("transparent background (regression)", () => {
  test("a column without backgroundColor emits a transparent rectangle", async () => {
    const cmds = await commandsFor((p) => {
      p.page(() => {
        p.column({ width: Sizing.grow(), height: Sizing.grow() }, () => {
          p.text("no background here", { fillColor: "#123456" });
        });
      });
    });
    const rects = rectCommands(cmds);
    expect(rects.length).toBeGreaterThan(0);
    // No rectangle should carry an opaque white fill just because it was omitted.
    for (const r of rects) {
      expect(r.renderData.rectangle?.backgroundColor).not.toBe("#FFFFFF");
    }
  });

  test("an explicit backgroundColor is preserved", async () => {
    const cmds = await commandsFor((p) => {
      p.page(() => {
        p.column(
          { width: Sizing.grow(), height: Sizing.grow(), backgroundColor: "#374151" },
          () => {
            p.text("on a gray panel", { fillColor: "#FFFFFF" });
          }
        );
      });
    });
    const painted = rectCommands(cmds).map((r) => r.renderData.rectangle?.backgroundColor);
    expect(painted).toContain("#374151");
  });

  test("fillColor on text does not leak into a background rectangle", async () => {
    // fillColor is the *text* color; it must not become a filled box behind it.
    const cmds = await commandsFor((p) => {
      p.page(() => {
        p.text("colored text, no box", { fillColor: "#FF0000", width: Sizing.grow() });
      });
    });
    for (const r of rectCommands(cmds)) {
      expect(r.renderData.rectangle?.backgroundColor).not.toBe("#FF0000");
    }
  });
});
