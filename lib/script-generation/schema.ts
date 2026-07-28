import { z } from "zod";

export const scriptIntakeSchema = z.object({
  reasoningSteps: z.array(z.string()).min(2).max(3),
  questions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        options: z
          .array(
            z.object({
              label: z.string(),
              value: z.string(),
            }),
          )
          .min(2)
          .max(4),
        allowCustom: z.boolean(),
        customPlaceholder: z.string(),
      }),
    )
    .min(1)
    .max(3),
});

export const generatedScriptSchema = z.object({
  title: z.string().min(3).max(80),
  hookOptions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        psychologyType: z.string(),
      }),
    )
    .min(3)
    .max(5),
  selectedHook: z.string(),
  fullScript: z.string(),
  visualDirection: z.array(
    z.object({
      timeRange: z.string(),
      contentDescription: z.string(),
      bRollSuggestions: z.array(z.string()),
      onScreenText: z.array(z.string()),
      transitionNotes: z.string(),
    }),
  ),
  platformMetadata: z.object({
    captions: z.string(),
    hashtags: z.array(z.string()),
    platformSpecificNotes: z.string(),
  }),
  thumbnailStrategy: z.object({
    imagePrompt: z.string(),
    overlayTextOptions: z.array(z.string()),
  }),
  goalAlignedCTA: z.string(),
  estimatedDuration: z.string(),
});

export type ScriptIntakeQuestion = z.infer<
  typeof scriptIntakeSchema
>["questions"][number];
export type GeneratedScript = z.infer<typeof generatedScriptSchema>;
