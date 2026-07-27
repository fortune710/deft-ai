import { Command, MemorySaver } from "@langchain/langgraph";
import { beforeEach, describe, expect, it, vi } from "vitest";

const modelPrompts = vi.hoisted(() => [] as string[]);
const modelConfigs = vi.hoisted(() => [] as Array<{ maxTokens?: number }>);
const generatedWordCounts = vi.hoisted(() => [] as number[]);

vi.mock("@/lib/ai/models/get-model", () => ({
  getModel: (config: { maxTokens?: number }) => {
    modelConfigs.push(config);
    return {
      withStructuredOutput: () => ({
        invoke: async (prompt: string) => {
          modelPrompts.push(prompt);

          if (prompt.includes("video-script strategist")) {
            return {
              reasoningSteps: [
                "Reviewed the creator brief.",
                "Identified source-backed angles.",
              ],
              questions: [
                {
                  id: "angle",
                  question: "Which angle should lead?",
                  options: [
                    { label: "Human story", value: "human" },
                    { label: "Technical story", value: "technical" },
                  ],
                  allowCustom: true,
                  customPlaceholder: "Describe another angle",
                },
              ],
            };
          }

          const generatedWordCount = generatedWordCounts.shift() ?? 460;
          return {
            title: "Apollo 11 Untold Stories",
            hookOptions: [
              {
                id: "hook-1",
                text: "The moon landing story you missed",
                psychologyType: "curiosity",
              },
              {
                id: "hook-2",
                text: "Apollo 11 was stranger than you remember",
                psychologyType: "contrast",
              },
              {
                id: "hook-3",
                text: "Three Apollo details hidden in history",
                psychologyType: "specificity",
              },
            ],
            selectedHook: "hook-1",
            fullScript: Array.from(
              { length: generatedWordCount },
              (_, index) =>
                ["goodwill", "quarantine", "Collins"][index] ??
                `sourceword${index}`,
            ).join(" "),
            visualDirection: [
              {
                timeRange: "0:00–0:30",
                contentDescription: "Historic mission footage",
                bRollSuggestions: ["Apollo launch"],
                onScreenText: ["Apollo 11"],
                transitionNotes: "",
              },
            ],
            platformMetadata: {
              captions: "",
              hashtags: [],
              platformSpecificNotes: "",
            },
            thumbnailStrategy: {
              imagePrompt: "Apollo astronaut",
              overlayTextOptions: [],
            },
            goalAlignedCTA: "Follow for more history.",
            estimatedDuration: "3–5 minute read",
          };
        },
      }),
    };
  },
}));

import { scriptIntakeWorkflow } from "@/lib/ai/agents/script-intake-agent";
import { buildLinkContext } from "@/lib/script-generation/context";

describe("script intake LangGraph integration", () => {
  beforeEach(() => {
    modelPrompts.length = 0;
    modelConfigs.length = 0;
    generatedWordCounts.length = 0;
    generatedWordCounts.push(460);
  });

  it("preserves link context across questions and enforces text length", async () => {
    const linkContext = buildLinkContext(
      [
        {
          url: "https://example.com/apollo",
          rawContent:
            "SOURCE_MARKER: Apollo carried goodwill messages and required quarantine.",
        },
      ],
      "test-user",
    );
    const graph = scriptIntakeWorkflow.compile({
      checkpointer: new MemorySaver(),
    });
    const config = {
      configurable: { thread_id: "script-intake-integration-test" },
    };

    const interrupted = await graph.invoke(
      {
        userId: "test-user",
        modelName: "gemini-2.5-flash",
        prompt: "Create an Apollo 11 Twitter thread from the attached source.",
        platforms: ["twitter"],
        duration: "medium",
        linkContext,
        attachmentContext: "",
      },
      config,
    );

    expect(interrupted.questions).toHaveLength(1);

    const completed = await graph.invoke(
      new Command({
        resume: {
          angle: "Human story",
        },
      }),
      config,
    );

    expect(completed.generatedScript?.title).toBe("Apollo 11 Untold Stories");
    expect(
      completed.generatedScript?.fullScript.trim().split(/\s+/),
    ).toHaveLength(460);

    const generationPrompt = modelPrompts.find((prompt) =>
      prompt.includes("SOURCE GROUNDING"),
    );
    expect(generationPrompt).toContain("SOURCE_MARKER");
    expect(generationPrompt).toContain("at least 450 words");
    expect(generationPrompt).toContain("3–5 minute read");
    expect(generationPrompt).toContain("complete, numbered thread");
    expect(modelConfigs.at(-1)?.maxTokens).toBe(8192);
  });

  it("expands the actual prior draft when a Twitter thread is too short", async () => {
    generatedWordCounts.length = 0;
    generatedWordCounts.push(200, 460);
    const graph = scriptIntakeWorkflow.compile({
      checkpointer: new MemorySaver(),
    });
    const config = {
      configurable: { thread_id: "script-intake-length-repair-test" },
    };

    await graph.invoke(
      {
        userId: "test-user",
        modelName: "gemini-2.5-flash",
        prompt: "Create a substantive Twitter thread about Apollo 11.",
        platforms: ["twitter"],
        duration: "medium",
        linkContext: "",
        attachmentContext: "",
      },
      config,
    );

    const completed = await graph.invoke(
      new Command({ resume: { angle: "Human story" } }),
      config,
    );
    const repairPrompt = modelPrompts.find((prompt) =>
      prompt.includes("PRIOR DRAFT — BEGIN"),
    );

    expect(repairPrompt).toContain("only 200 words");
    expect(repairPrompt).toContain("sourceword199");
    expect(
      completed.generatedScript?.fullScript.trim().split(/\s+/),
    ).toHaveLength(460);
  });
});
