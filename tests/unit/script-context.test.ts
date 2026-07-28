import { describe, expect, it } from "vitest";

import {
  buildAttachmentContext,
  buildLinkContext,
  normalizeGeneratedScriptTitle,
} from "@/lib/script-generation/context";

describe("script source context", () => {
  it("includes extracted link content and excludes failed links", () => {
    const context = buildLinkContext(
      [
        {
          url: "https://example.com/source",
          rawContent: "A source-specific goodwill message.",
        },
        {
          url: "https://example.com/failed",
          rawContent: "This content must not be included.",
          failed: true,
        },
      ],
      "test-user",
    );

    expect(context).toContain("https://example.com/source");
    expect(context).toContain("source-specific goodwill message");
    expect(context).not.toContain("must not be included");
  });

  it("includes extracted file chunks with filename and MIME type", () => {
    const context = buildAttachmentContext(
      [
        {
          fileName: "research.pdf",
          mimeType: "application/pdf",
          content: "Extracted PDF evidence.",
        },
      ],
      "test-user",
    );

    expect(context).toContain("research.pdf (application/pdf)");
    expect(context).toContain("Extracted PDF evidence");
  });

  it("caps source context at the generation limit", () => {
    const context = buildLinkContext(
      [
        {
          url: "https://example.com/large",
          rawContent: "x".repeat(40_000),
        },
      ],
      "test-user",
    );

    expect(context).toHaveLength(30_000);
  });

  it("normalizes the model-generated history title", () => {
    expect(
      normalizeGeneratedScriptTitle(
        "  Apollo 11's   Untold Stories  ",
        "test-user",
      ),
    ).toBe("Apollo 11's Untold Stories");
  });
});
