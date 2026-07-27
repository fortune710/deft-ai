import type { Platform } from "@/types/content-engine";
import type { ScriptDuration } from "@/types/script-chat";

export type ScriptContentFormat = "video" | "text";

export const SCRIPT_PLATFORM_FORMATS: Record<Platform, ScriptContentFormat> = {
  youtube: "video",
  instagram: "video",
  tiktok: "video",
  twitter: "text",
  linkedin: "text",
  facebook: "text",
};

export const SCRIPT_LENGTH_REQUIREMENTS: Record<
  ScriptContentFormat,
  Record<
    ScriptDuration,
    {
      label: string;
      timing: string;
      minimumWords: number;
      maxOutputTokens: number;
      targetWords: string;
      unit: string;
    }
  >
> = {
  video: {
    really_short: {
      label: "Really short",
      timing: "30–45 seconds",
      minimumWords: 90,
      maxOutputTokens: 4096,
      targetWords: "90–120 words",
      unit: "spoken script",
    },
    medium: {
      label: "Medium",
      timing: "90–120 seconds",
      minimumWords: 225,
      maxOutputTokens: 6144,
      targetWords: "225–300 words",
      unit: "spoken script",
    },
    long: {
      label: "Long",
      timing: "3–5 minutes",
      minimumWords: 450,
      maxOutputTokens: 8192,
      targetWords: "450–750 words",
      unit: "spoken script",
    },
  },
  text: {
    really_short: {
      label: "Really short",
      timing: "1–2 minute read",
      minimumWords: 180,
      maxOutputTokens: 6144,
      targetWords: "180–280 words",
      unit: "written post",
    },
    medium: {
      label: "Medium",
      timing: "3–5 minute read",
      minimumWords: 450,
      maxOutputTokens: 8192,
      targetWords: "450–750 words",
      unit: "written post",
    },
    long: {
      label: "Long",
      timing: "6–10 minute read",
      minimumWords: 900,
      maxOutputTokens: 12288,
      targetWords: "900–1,500 words",
      unit: "written post",
    },
  },
};
