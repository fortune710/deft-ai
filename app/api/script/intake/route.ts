import { NextRequest, NextResponse } from "next/server";
import { Command } from "@langchain/langgraph";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  getAuthenticatedConvexClient,
  ConvexServerAuthError,
  toUserContentProfile,
} from "@/lib/convex/server";
import { getCheckpointer } from "@/lib/ai/agents/checkpointer";
import { scriptIntakeWorkflow } from "@/lib/ai/agents/script-intake-agent";
import type { GeneratedScript } from "@/lib/script-generation/schema";
import { tavilyExtract } from "@/lib/integrations/tavily";
import { logger } from "@/lib/logger.server";
import { AI_MODELS, type AIModelName } from "@/types/ai-models";
import type { Platform } from "@/types/content-engine";
import type { ScriptDuration } from "@/types/script-chat";
import {
  buildAttachmentContext,
  buildContentIdeaContext,
  buildLinkContext,
  normalizeGeneratedScriptTitle,
} from "@/lib/script-generation/context";

export const runtime = "nodejs";

const log = logger.child({ file: "app/api/script/intake/route.ts" });

function resolveContentPlatform(
  requestedPlatform: string | undefined,
  userId: string,
) {
  const supportedPlatforms: Platform[] = [
    "youtube",
    "instagram",
    "tiktok",
    "twitter",
    "linkedin",
    "facebook",
  ];
  const platform = supportedPlatforms.includes(requestedPlatform as Platform)
    ? (requestedPlatform as Platform)
    : "youtube";
  log.debug("Resolved generated script content platform", {
    userId,
    action: "resolve_generated_script_content_platform",
    requestedPlatform: requestedPlatform || "unknown",
    platform,
  });
  return platform;
}

function resolveRequestedPlatforms(
  requestedPlatforms: string[] | undefined,
  fallbackPlatform: string | undefined,
  userId: string,
) {
  const supportedPlatforms: Platform[] = [
    "youtube",
    "instagram",
    "tiktok",
    "twitter",
    "linkedin",
    "facebook",
  ];
  const platforms = [...new Set(requestedPlatforms ?? [])]
    .filter((platform): platform is Platform =>
      supportedPlatforms.includes(platform as Platform),
    )
    .slice(0, 1);
  const resolvedPlatforms =
    platforms.length > 0
      ? platforms
      : [resolveContentPlatform(fallbackPlatform, userId)];
  log.debug("Resolved target platforms for script generation", {
    userId,
    action: "resolve_script_generation_platforms",
    requestedPlatforms: requestedPlatforms ?? [],
    fallbackPlatform: fallbackPlatform || "unknown",
    platforms: resolvedPlatforms,
  });
  return resolvedPlatforms;
}

function resolveScriptDuration(
  requestedDuration: string | undefined,
  userId: string,
): ScriptDuration {
  const supportedDurations: ScriptDuration[] = [
    "really_short",
    "medium",
    "long",
  ];
  const duration = supportedDurations.includes(
    requestedDuration as ScriptDuration,
  )
    ? (requestedDuration as ScriptDuration)
    : "medium";
  log.debug("Resolved target duration for script generation", {
    userId,
    action: "resolve_script_generation_duration",
    requestedDuration: requestedDuration || "unknown",
    duration,
  });
  return duration;
}

function toContentItemContent(result: GeneratedScript, userId: string) {
  const selectedHook =
    result.hookOptions.find((hook) => hook.id === result.selectedHook) ??
    result.hookOptions[0];
  const content = {
    hook_suggestion: selectedHook?.text,
    script_content: result.fullScript,
    cta_suggestion: result.goalAlignedCTA,
    hashtags: result.platformMetadata.hashtags ?? [],
    caption: result.platformMetadata.captions ?? undefined,
    clip_suggestions: result.visualDirection.flatMap(
      (direction) => direction.bRollSuggestions,
    ),
    metadata: {
      hookType: selectedHook?.psychologyType,
      structure: result.estimatedDuration,
      callToAction: result.goalAlignedCTA,
      visualCues: result.visualDirection.flatMap(
        (direction) => direction.onScreenText,
      ),
      audioSuggestion:
        result.platformMetadata.platformSpecificNotes ?? undefined,
      researchSummary: `Generated with ${result.hookOptions.length} hook options and ${result.visualDirection.length} visual direction segments.`,
    },
  };
  log.debug("Mapped generated script into content item body", {
    userId,
    action: "map_generated_script_content_item",
    hookCount: result.hookOptions.length,
    visualDirectionCount: result.visualDirection.length,
  });
  return content;
}

function toScriptRecordEditorContent(
  result: GeneratedScript,
  contentItemId: string,
  platforms: Platform[],
  duration: ScriptDuration,
  userId: string,
) {
  const editorContent = {
    contentItemId,
    hookOptions: result.hookOptions,
    selectedHookId: result.hookOptions.some(
      (hook) => hook.id === result.selectedHook,
    )
      ? result.selectedHook
      : result.hookOptions[0]?.id,
    fullScript: result.fullScript,
    visualDirection: result.visualDirection.map((direction) => ({
      ...direction,
      transitionNotes: direction.transitionNotes ?? undefined,
    })),
    platformMetadata: {
      captions: result.platformMetadata.captions ?? undefined,
      hashtags: result.platformMetadata.hashtags ?? undefined,
      platformSpecificNotes:
        result.platformMetadata.platformSpecificNotes ?? undefined,
    },
    thumbnailStrategy: result.thumbnailStrategy,
    goalAlignedCTA: result.goalAlignedCTA,
    estimatedDuration: result.estimatedDuration,
    platform: platforms[0],
    platforms,
    durationPreset: duration,
  };
  log.debug("Mapped generated script into script index record", {
    userId,
    action: "map_generated_script_index_record",
    contentItemId,
    platforms,
    duration,
    hookCount: result.hookOptions.length,
  });
  return editorContent;
}

export async function POST(request: NextRequest) {
  let userId = "unknown";
  let sessionId = "unknown";
  let action = "unknown";
  try {
    const body = (await request.json()) as {
      action?: "start" | "resume";
      prompt?: string;
      sessionId?: string;
      scriptRecordId?: string;
      links?: string[];
      contentItemIds?: string[];
      model?: AIModelName;
      platforms?: string[];
      duration?: ScriptDuration;
      answers?: Record<string, string>;
    };
    action = body.action ?? "unknown";
    sessionId = body.sessionId ?? "";
    if ((action !== "start" && action !== "resume") || !sessionId) {
      return NextResponse.json(
        { error: "A valid action and script session are required" },
        { status: 400 },
      );
    }
    if (action === "start" && !body.prompt?.trim()) {
      return NextResponse.json(
        { error: "A script brief is required" },
        { status: 400 },
      );
    }
    const authenticated = await getAuthenticatedConvexClient(
      "run_script_intake_agent",
    );
    userId = authenticated.userId;
    const requestedModel = Object.values(AI_MODELS).some(
      (model) => model.model === body.model,
    )
      ? (body.model as AIModelName)
      : AI_MODELS.GOOGLE_PRO.model;
    const threadId = `${userId}:script:${sessionId}`;
    const config = { configurable: { thread_id: threadId } };
    const profile = toUserContentProfile(
      await authenticated.convex.query(api.userContentProfiles.getCurrent, {}),
    );
    const profilePrimaryPlatform = profile?.question_3_platforms?.find(
      (profilePlatform) => profilePlatform.isPrimary,
    )?.name;
    const selectedPlatforms = resolveRequestedPlatforms(
      body.platforms,
      profilePrimaryPlatform,
      userId,
    );
    const selectedDuration = resolveScriptDuration(body.duration, userId);
    const sourceLinks = [
      ...new Set(
        (body.links ?? []).filter((link) => {
          try {
            return ["http:", "https:"].includes(new URL(link).protocol);
          } catch {
            return false;
          }
        }),
      ),
    ].slice(0, 5);
    const attachments =
      action === "start"
        ? await authenticated.convex.query(
            api.scriptChatAttachments.getReadyContext,
            { parentId: sessionId as Id<"content_items"> },
          )
        : [];
    const contentItemIds = [...new Set(body.contentItemIds ?? [])].slice(0, 3);
    const contentIdeas =
      action === "start"
        ? (
            await Promise.all(
              contentItemIds.map((contentItemId) =>
                authenticated.convex.query(api.contentItems.get, {
                  itemId: contentItemId as Id<"content_items">,
                }),
              ),
            )
          ).filter(
            (script): script is NonNullable<typeof script> => script !== null,
          )
        : [];
    let linkContext = "";
    if (action === "start" && sourceLinks.length) {
      try {
        linkContext = buildLinkContext(
          await tavilyExtract(sourceLinks, userId),
          userId,
        );
        if (!linkContext.trim()) {
          throw new Error(
            "The attached link did not contain readable source content",
          );
        }
      } catch (error) {
        log.error("Stopping script intake because link content is unreadable", {
          userId,
          action: "read_script_source_links",
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error(
          "We could not read the attached link. Remove it or try another public page.",
        );
      }
    }
    log.info("Starting script intake agent stream", {
      userId,
      action: "run_script_intake_agent",
      sessionId,
      intakeAction: action,
      sourceLinkCount: sourceLinks.length,
      attachmentCount: attachments.length,
      contentIdeaCount: contentIdeas.length,
      model: requestedModel,
      platforms: selectedPlatforms,
      duration: selectedDuration,
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };
        try {
          const checkpointer = await getCheckpointer();
          const graph = scriptIntakeWorkflow.compile({ checkpointer });
          const input =
            action === "start"
              ? {
                  userId,
                  modelName: requestedModel,
                  prompt: body.prompt!.trim(),
                  platforms: selectedPlatforms,
                  duration: selectedDuration,
                  linkContext,
                  attachmentContext: [
                    buildAttachmentContext(attachments, userId),
                    buildContentIdeaContext(contentIdeas, userId),
                  ]
                    .filter(Boolean)
                    .join("\n\n"),
                }
              : new Command({ resume: body.answers ?? {} });
          const updates = await graph.stream(input as never, {
            ...config,
            streamMode: "updates",
          });
          for await (const update of updates) {
            if ("assess" in update && update.assess?.questions?.length) {
              for (const step of update.assess.reasoningSteps ?? []) {
                send("reasoning_step", {
                  content: step,
                  id: crypto.randomUUID(),
                });
              }
              send("questions", {
                questions: update.assess.questions,
                threadId,
              });
              log.info("Streamed script intake progress and questions", {
                userId,
                action: "stream_script_intake_questions",
                sessionId,
                reasoningStepCount: update.assess.reasoningSteps?.length ?? 0,
                questionCount: update.assess.questions.length,
                statusCode: 200,
              });
            }
            if ("generate" in update && update.generate?.generatedScript) {
              const generated = update.generate
                .generatedScript as GeneratedScript;
              const content = toContentItemContent(generated, userId);
              const platform = selectedPlatforms[0];
              const title = normalizeGeneratedScriptTitle(
                generated.title,
                userId,
              );
              await authenticated.convex.mutation(
                api.contentItems.updateContent,
                {
                  itemId: sessionId as Id<"content_items">,
                  content,
                },
              );
              await authenticated.convex.mutation(api.contentItems.update, {
                itemId: sessionId as Id<"content_items">,
                updates: {
                  title,
                  platform,
                  status: "ready",
                },
              });
              if (body.scriptRecordId) {
                const editorContent = toScriptRecordEditorContent(
                  generated,
                  sessionId,
                  selectedPlatforms,
                  selectedDuration,
                  userId,
                );
                await authenticated.convex.mutation(
                  api.scriptChats.updateEditorContent,
                  {
                    sessionId:
                      body.scriptRecordId as Id<"script_chat_sessions">,
                    editorContent,
                  },
                );
                await authenticated.convex.mutation(
                  api.scriptChats.updateSessionTitle,
                  {
                    sessionId:
                      body.scriptRecordId as Id<"script_chat_sessions">,
                    title,
                  },
                );
              }
              log.info("Saved generated script to content item", {
                userId,
                action: "save_generated_script_content_item",
                itemId: sessionId,
                scriptRecordId: body.scriptRecordId || "missing",
                platform,
                platforms: selectedPlatforms,
                duration: selectedDuration,
                statusCode: 200,
              });
              send("final_result", { itemId: sessionId });
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Script intake failed";
          log.error("Script intake agent failed", {
            userId,
            action: "run_script_intake_agent",
            sessionId,
            statusCode: 500,
            error: message,
          });
          send("error", { message });
        } finally {
          controller.close();
        }
      },
    });
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const statusCode =
      error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error("Failed to initialize script intake agent", {
      userId,
      action: "initialize_script_intake_agent",
      sessionId,
      statusCode,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start script intake",
      },
      { status: statusCode },
    );
  }
}
