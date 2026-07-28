import { logger } from "@/lib/logger.server";
import type { TavilyExtractResult } from "@/lib/integrations/tavily";

const log = logger.child({ file: "lib/script-generation/context.ts" });

export function buildAttachmentContext(
  sources: Array<{ fileName: string; mimeType: string; content: string }>,
  userId: string,
) {
  const context = sources
    .map(
      (source) =>
        `[${source.fileName} (${source.mimeType})]\n${source.content}`,
    )
    .join("\n\n")
    .slice(0, 30_000);
  log.info("Built script attachment context", {
    userId,
    action: "build_script_attachment_context",
    sourceCount: sources.length,
    contextLength: context.length,
  });
  return context;
}

export function buildContentIdeaContext(
  contentIdeas: Array<{
    title: string;
    description?: string | null;
    content: unknown;
    script_content?: string | null;
  }>,
  userId: string,
) {
  const context = contentIdeas
    .map(
      (item) =>
        `[Generated content idea: ${item.title}]\nDescription: ${item.description ?? ""}\n${item.script_content || JSON.stringify(item.content)}`,
    )
    .join("\n\n")
    .slice(0, 30_000);
  log.info("Built generated content idea reference context", {
    userId,
    action: "build_content_idea_reference_context",
    contentIdeaCount: contentIdeas.length,
    contextLength: context.length,
  });
  return context;
}

export function buildLinkContext(
  results: TavilyExtractResult[],
  userId: string,
) {
  const context = results
    .filter((result) => !result.failed && result.rawContent)
    .map((result) => `[${result.url}]\n${result.rawContent}`)
    .join("\n\n")
    .slice(0, 30_000);
  log.info("Built script link research context", {
    userId,
    action: "build_script_link_context",
    sourceCount: results.length,
    contextLength: context.length,
  });
  return context;
}

export function normalizeGeneratedScriptTitle(
  generatedTitle: string,
  userId: string,
) {
  const title =
    generatedTitle.trim().replace(/\s+/g, " ").slice(0, 80) ||
    "Untitled script";
  log.debug("Normalized generated script summary title", {
    userId,
    action: "normalize_generated_script_title",
    originalLength: generatedTitle.length,
    titleLength: title.length,
  });
  return title;
}
