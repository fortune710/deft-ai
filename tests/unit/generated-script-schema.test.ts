import { describe, expect, it } from "vitest";

import { generatedScriptSchema } from "@/lib/script-generation/schema";

const validGeneratedScript = {
  title: "Apollo 11 Untold Stories",
  hookOptions: [
    { id: "hook-1", text: "First hook", psychologyType: "curiosity" },
    { id: "hook-2", text: "Second hook", psychologyType: "authority" },
    { id: "hook-3", text: "Third hook", psychologyType: "contrast" },
  ],
  selectedHook: "hook-1",
  fullScript: "A complete generated script.",
  visualDirection: [
    {
      timeRange: "0:00–0:10",
      contentDescription: "Opening scene",
      bRollSuggestions: [],
      onScreenText: [],
      transitionNotes: "",
    },
  ],
  platformMetadata: {
    captions: "",
    hashtags: [],
    platformSpecificNotes: "",
  },
  thumbnailStrategy: {
    imagePrompt: "Astronaut on the moon",
    overlayTextOptions: [],
  },
  goalAlignedCTA: "Follow for more.",
  estimatedDuration: "45 seconds",
};

describe("generated script structured-output schema", () => {
  it("accepts required empty values instead of optional nullable fields", () => {
    expect(generatedScriptSchema.safeParse(validGeneratedScript).success).toBe(
      true,
    );
  });

  it.each([
    ["transitionNotes", { transitionNotes: null }],
    ["captions", { captions: null }],
    ["hashtags", { hashtags: null }],
    ["platformSpecificNotes", { platformSpecificNotes: null }],
  ])("rejects nullable %s output", (field, replacement) => {
    const candidate = structuredClone(validGeneratedScript);

    if (field === "transitionNotes") {
      Object.assign(candidate.visualDirection[0], replacement);
    } else {
      Object.assign(candidate.platformMetadata, replacement);
    }

    expect(generatedScriptSchema.safeParse(candidate).success).toBe(false);
  });

  it("requires an AI-generated summary title", () => {
    const candidate = structuredClone(validGeneratedScript) as Record<
      string,
      unknown
    >;
    delete candidate.title;

    expect(generatedScriptSchema.safeParse(candidate).success).toBe(false);
  });
});
