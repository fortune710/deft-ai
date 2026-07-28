"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, ChevronRight, HelpCircle, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { AttachmentLine } from "@/components/icons/attachment";
import { Link as LinkIcon } from "@/components/icons/link";
import { FilmScriptFill } from "@/components/icons/script";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/hooks/use-clerk-auth";
import { useContentProfile } from "@/hooks/use-content-profile";
import { useCreateSession } from "@/hooks/use-script-chats";
import {
  useContentItems,
  useCreateContentItem,
} from "@/hooks/use-content-items";
import {
  useChatAttachments,
  useUploadChatAttachments,
} from "@/hooks/use-chat-attachments";
import {
  ScriptIntakeInput,
  type ScriptLinkPreview,
} from "@/components/script-creator/script-intake-input";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { EditorContent, ScriptDuration } from "@/types/script-chat";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { storageKeys } from "@/utils/storage-keys";
import { AI_MODELS, type AIModelName } from "@/types/ai-models";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types/content-engine";

const log = logger.child({ file: "app/scripts/new/page.tsx" });

const emptyEditorContent: EditorContent = {
  hookOptions: [],
  selectedHookId: null,
  fullScript: "",
  visualDirection: [],
  platformMetadata: {},
  thumbnailStrategy: { imagePrompt: "", overlayTextOptions: [] },
  goalAlignedCTA: "",
  estimatedDuration: "",
};

type IntakeQuestion = {
  id: string;
  question: string;
  options: Array<{ label: string; value: string }>;
  allowCustom: boolean;
  customPlaceholder: string;
};

type IntakeReasoningStep = { id: string; content: string };

type SubmittedSource = {
  id: string;
  kind: "file" | "link" | "script";
  label: string;
};

function chooseComposerHeading(userId: string) {
  const hour = new Date().getHours();
  const messages =
    hour < 6
      ? [
          "It’s a late-night script session.",
          "Let’s turn that midnight idea into a script.",
        ]
      : hour < 12
        ? [
            "Good morning. What are we creating?",
            "A fresh day deserves a fresh script.",
          ]
        : hour < 17
          ? [
              "Let’s make something worth watching.",
              "What story are we shaping today?",
            ]
          : hour < 21
            ? [
                "Good evening. Let’s write your next script.",
                "Let’s finish the day with a strong idea.",
              ]
            : [
                "It’s a late-night script session.",
                "One more great idea before the day ends.",
              ];
  const heading = messages[Math.floor(Math.random() * messages.length)];
  log.info("Selected refreshed script composer heading", {
    userId,
    action: "select_script_composer_heading",
    hour,
    heading,
  });
  return heading;
}

async function consumeIntakeStream(
  response: Response,
  userId: string,
  sessionId: string,
  onEvent: (type: string, data: Record<string, unknown>) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The script agent did not return a stream");
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const type = event.match(/^event: (.+)$/m)?.[1];
      const rawData = event.match(/^data: (.+)$/m)?.[1];
      if (type && rawData)
        onEvent(type, JSON.parse(rawData) as Record<string, unknown>);
    }
  }
  log.info("Consumed script intake agent stream", {
    userId,
    action: "consume_script_intake_stream",
    sessionId,
    statusCode: response.status,
  });
}

export default function NewScriptPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useContentProfile();
  const createContentItem = useCreateContentItem();
  const createScriptRecord = useCreateSession();
  const { data: contentIdeas } = useContentItems();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scriptRecordId, setScriptRecordId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [links, setLinks] = useState<ScriptLinkPreview[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reasoningSteps, setReasoningSteps] = useState<IntakeReasoningStep[]>(
    [],
  );
  const [intakePhase, setIntakePhase] = useState<
    "compose" | "reasoning" | "questions"
  >("compose");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [sourcesUploadStarted, setSourcesUploadStarted] = useState(false);
  const [expectedAttachmentCount, setExpectedAttachmentCount] = useState(0);
  const [selectedContentItemIds, setSelectedContentItemIds] = useState<
    string[]
  >([]);
  const [submittedSources, setSubmittedSources] = useState<SubmittedSource[]>(
    [],
  );
  const [composerHeading, setComposerHeading] = useState(
    "What are we creating today?",
  );
  const questionRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useLocalStorage<AIModelName>(
    storageKeys.localStorage.chatModel,
    AI_MODELS.GOOGLE_PRO.model,
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "youtube",
  ]);
  const [selectedDuration, setSelectedDuration] =
    useState<ScriptDuration>("medium");
  const initializedScriptOptionsRef = useRef(false);
  const { data: attachments } = useChatAttachments(sessionId ?? "");
  const uploadAttachments = useUploadChatAttachments(
    sessionId ?? "",
    attachments.length,
  );
  const hasBlockingSources = attachments.some(
    (attachment) =>
      attachment.isSelected &&
      ["queued", "processing"].includes(attachment.processingStatus),
  );

  log.debug("Rendering new script intake page", {
    userId: userId || "signed_out",
    action: "render_new_script_intake_page",
    hasSession: Boolean(sessionId),
    intakePhase,
    questionCount: questions.length,
    currentQuestionIndex,
    reasoningStepCount: reasoningSteps.length,
    stagedFileCount: stagedFiles.length,
  });

  useEffect(() => {
    if (!profileLoading && !profile) router.replace("/onboarding");
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (!profile || initializedScriptOptionsRef.current) return;
    const supportedPlatforms: Platform[] = [
      "youtube",
      "instagram",
      "tiktok",
      "twitter",
      "linkedin",
      "facebook",
    ];
    const preferredProfilePlatform =
      profile.question_3_platforms.find((platform) => platform.isPrimary)
        ?.name ?? profile.question_3_platforms[0]?.name;
    const profilePlatform = supportedPlatforms.includes(
      preferredProfilePlatform as Platform,
    )
      ? (preferredProfilePlatform as Platform)
      : "youtube";
    if (profilePlatform) {
      setSelectedPlatforms([profilePlatform]);
    }
    initializedScriptOptionsRef.current = true;
    log.info("Initialized script generation options from creator profile", {
      userId: userId || "signed_out",
      action: "initialize_script_generation_options",
      platforms: [profilePlatform],
      duration: "medium",
    });
  }, [profile, userId]);

  useEffect(() => {
    setComposerHeading(chooseComposerHeading(userId || "signed_out"));
  }, [userId]);

  useEffect(() => {
    return () => {
      if (questionRevealTimeoutRef.current) {
        clearTimeout(questionRevealTimeoutRef.current);
        log.debug("Cleared script question reveal timer", {
          userId: userId || "signed_out",
          action: "clear_script_question_reveal_timer",
        });
      }
    };
  }, [userId]);

  const runAgent = useCallback(
    async (
      action: "start" | "resume",
      targetSessionId: string,
      submittedAnswers: Record<string, string> = answers,
    ) => {
      log.info("Submitting script intake agent request", {
        userId: userId || "signed_out",
        action: "run_script_intake_agent",
        sessionId: targetSessionId,
        intakeAction: action,
        answerCount: Object.keys(submittedAnswers).length,
      });
      if (action === "start") {
        setReasoningSteps([]);
        setIntakePhase("reasoning");
      }
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/script/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            sessionId: targetSessionId,
            scriptRecordId,
            prompt,
            links: links.map((link) => link.url),
            contentItemIds: selectedContentItemIds,
            model: selectedModel,
            platforms: selectedPlatforms,
            duration: selectedDuration,
            answers: Object.fromEntries(
              questions.map((question) => [
                question.question,
                submittedAnswers[question.id] ?? "",
              ]),
            ),
          }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "The script agent could not start");
        }
        await consumeIntakeStream(
          response,
          userId || "signed_out",
          targetSessionId,
          (eventType, data) => {
            if (eventType === "reasoning_step") {
              const step = data as IntakeReasoningStep;
              setReasoningSteps((current) => [
                ...current.filter((item) => item.id !== step.id),
                step,
              ]);
              log.info("Received script intake progress summary", {
                userId: userId || "signed_out",
                action: "receive_script_intake_reasoning_step",
                sessionId: targetSessionId,
                reasoningStepId: step.id,
              });
            }
            if (eventType === "questions") {
              setQuestions(data.questions as IntakeQuestion[]);
              setCurrentQuestionIndex(0);
              setSelectedOption("");
              setCustomAnswer("");
              if (questionRevealTimeoutRef.current) {
                clearTimeout(questionRevealTimeoutRef.current);
              }
              questionRevealTimeoutRef.current = setTimeout(() => {
                setIntakePhase("questions");
                log.info("Revealed sequential script intake questions", {
                  userId: userId || "signed_out",
                  action: "reveal_script_intake_questions",
                  sessionId: targetSessionId,
                  questionCount: (data.questions as IntakeQuestion[]).length,
                });
              }, 900);
              log.info("Received script intake questions", {
                userId: userId || "signed_out",
                action: "receive_script_intake_questions",
                sessionId: targetSessionId,
                questionCount: (data.questions as IntakeQuestion[]).length,
              });
            }
            if (eventType === "final_result") {
              toast.success("Your script is ready");
              router.push(`/scripts/edit/${targetSessionId}`);
            }
            if (eventType === "error")
              throw new Error(
                String(data.message || "The script agent could not finish"),
              );
          },
        );
      } catch (error) {
        setIntakePhase(action === "start" ? "compose" : "questions");
        toast.error(
          error instanceof Error ? error.message : "Unable to create script",
        );
        log.error("Script intake agent request failed", {
          userId: userId || "signed_out",
          action: "run_script_intake_agent",
          sessionId: targetSessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      answers,
      links,
      prompt,
      questions,
      router,
      selectedContentItemIds,
      selectedDuration,
      selectedModel,
      selectedPlatforms,
      scriptRecordId,
      userId,
    ],
  );

  useEffect(() => {
    if (!pendingStart || !sessionId) return;
    if (stagedFiles.length && !sourcesUploadStarted) {
      setSourcesUploadStarted(true);
      const uploadSources = async () => {
        try {
          await uploadAttachments.mutateAsync(stagedFiles);
          setExpectedAttachmentCount(stagedFiles.length);
          setStagedFiles([]);
          log.info("Uploaded staged script sources after request submission", {
            userId: userId || "signed_out",
            action: "upload_staged_script_sources",
            sessionId,
            fileCount: stagedFiles.length,
            statusCode: 201,
          });
        } catch (error) {
          setPendingStart(false);
          setIsSubmitting(false);
          setSourcesUploadStarted(false);
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to upload source files",
          );
          log.error("Failed to upload staged script sources", {
            userId: userId || "signed_out",
            action: "upload_staged_script_sources",
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };
      void uploadSources();
      return;
    }
    if (
      stagedFiles.length ||
      expectedAttachmentCount > attachments.length ||
      hasBlockingSources
    )
      return;
    setPendingStart(false);
    void runAgent("start", sessionId);
  }, [
    attachments.length,
    expectedAttachmentCount,
    hasBlockingSources,
    pendingStart,
    runAgent,
    sessionId,
    sourcesUploadStarted,
    stagedFiles,
    uploadAttachments,
    userId,
  ]);

  const handleStartRequest = async () => {
    if (!prompt.trim() || isSubmitting) return;
    const sourceBadges: SubmittedSource[] = [
      ...links.map((link) => ({
        id: `link-${link.url}`,
        kind: "link" as const,
        label: link.title || link.siteName || link.url,
      })),
      ...stagedFiles.map((file, index) => ({
        id: `file-${file.name}-${file.size}-${index}`,
        kind: "file" as const,
        label: file.name,
      })),
      ...contentIdeas
        .filter((idea) => selectedContentItemIds.includes(idea.id))
        .map((idea) => ({
          id: `script-${idea.id}`,
          kind: "script" as const,
          label: idea.title,
        })),
    ];
    setSubmittedSources(sourceBadges);
    setIsSubmitting(true);
    setIntakePhase("reasoning");
    setReasoningSteps([
      {
        id: "prepare_sources",
        content: "Reviewing your brief and attached source material.",
      },
    ]);
    try {
      const platform = selectedPlatforms[0] || "youtube";
      const contentItem = await createContentItem.mutateAsync({
        title: "New script",
        description: prompt.trim().slice(0, 280),
        platform,
        scheduled_date: new Date().toISOString().slice(0, 10),
        status: "in_progress",
        content: {},
      });
      const scriptRecord = await createScriptRecord.mutateAsync({
        title: "New script",
        editorContent: {
          ...emptyEditorContent,
          contentItemId: contentItem.id,
          platform,
          platforms: selectedPlatforms,
          durationPreset: selectedDuration,
        },
      });
      setSessionId(contentItem.id);
      setScriptRecordId(scriptRecord.id);
      setPendingStart(true);
      setSourcesUploadStarted(false);
      setExpectedAttachmentCount(0);
      log.info("Created script content item from submitted request", {
        userId: userId || "signed_out",
        action: "create_script_content_item_from_request",
        itemId: contentItem.id,
        scriptRecordId: scriptRecord.id,
        platform,
        platforms: selectedPlatforms,
        duration: selectedDuration,
        submittedSourceCount: sourceBadges.length,
        statusCode: 201,
      });
    } catch (error) {
      setIsSubmitting(false);
      setIntakePhase("compose");
      toast.error("Unable to begin your script request");
      log.error("Failed to create script content item from submitted request", {
        userId: userId || "signed_out",
        action: "create_script_content_item_from_request",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleQuestionOptionSelect = (value: string) => {
    setSelectedOption(value);
    setCustomAnswer("");
    log.debug("Selected script intake question option", {
      userId: userId || "signed_out",
      action: "select_script_intake_question_option",
      sessionId: sessionId || "pending",
      questionId: questions[currentQuestionIndex]?.id || "unknown",
      value,
    });
  };

  const handleCustomAnswerChange = (value: string) => {
    setSelectedOption("custom");
    setCustomAnswer(value);
    log.debug("Updated custom script intake answer", {
      userId: userId || "signed_out",
      action: "update_custom_script_intake_answer",
      sessionId: sessionId || "pending",
      questionId: questions[currentQuestionIndex]?.id || "unknown",
      answerLength: value.length,
    });
  };

  const handleContinueQuestion = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    const finalAnswer =
      selectedOption === "custom" ? customAnswer.trim() : selectedOption;
    if (!finalAnswer) return;
    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: finalAnswer,
    };
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((current) => current + 1);
      setSelectedOption("");
      setCustomAnswer("");
      log.info("Advanced to next script intake question", {
        userId: userId || "signed_out",
        action: "advance_script_intake_question",
        sessionId: sessionId || "pending",
        completedQuestionId: currentQuestion.id,
        nextQuestionIndex: currentQuestionIndex + 1,
      });
      return;
    }

    if (!sessionId) return;
    setIntakePhase("reasoning");
    setReasoningSteps([
      {
        id: "apply_answers",
        content: "Applying your answers to the script direction.",
      },
      {
        id: "generate_draft",
        content:
          "Building the hook, structure, visuals, and final call to action.",
      },
    ]);
    log.info("Submitted sequential script intake answers", {
      userId: userId || "signed_out",
      action: "submit_sequential_script_intake_answers",
      sessionId,
      answerCount: Object.keys(updatedAnswers).length,
    });
    void runAgent("resume", sessionId, updatedAnswers);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const hasCurrentAnswer =
    selectedOption === "custom"
      ? customAnswer.trim().length > 0
      : selectedOption.length > 0;

  if (profileLoading || !profile?.completed_at)
    return (
      <AppLayout>
        <div className="flex min-h-[500px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="-mx-6 -mt-6 border-b px-6 py-5">
        <Breadcrumb>
          <BreadcrumbList className="text-base [font-family:var(--inter)]">
            <BreadcrumbItem>
              <BreadcrumbLink
                href="/scripts"
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                Script Creator
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">
                New Script
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-4xl items-center py-8">
        <div className="w-full">
          {intakePhase === "compose" && (
            <div className="mx-auto w-full space-y-5 md:w-[76%]">
              <div className="flex items-center justify-center gap-3 px-4 text-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white p-2 shadow-sm">
                  <Image
                    src="/deft-logo.png"
                    alt="Deft"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </span>
                <h1 className="font-alan-sans text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                  {composerHeading}
                </h1>
              </div>
              <ScriptIntakeInput
                value={prompt}
                links={links}
                files={stagedFiles}
                attachments={attachments}
                contentIdeas={contentIdeas}
                selectedContentItemIds={selectedContentItemIds}
                selectedModel={selectedModel}
                selectedPlatforms={selectedPlatforms}
                selectedDuration={selectedDuration}
                isSubmitting={isSubmitting}
                isProcessingSources={hasBlockingSources}
                onChange={setPrompt}
                onLinksChange={setLinks}
                onFilesChange={setStagedFiles}
                onSelectedContentItemIdsChange={setSelectedContentItemIds}
                onModelChange={setSelectedModel}
                onPlatformsChange={setSelectedPlatforms}
                onDurationChange={setSelectedDuration}
                onSubmit={() => void handleStartRequest()}
              />
            </div>
          )}

          {intakePhase === "reasoning" && (
            <section className="mx-auto w-full max-w-xl space-y-8 px-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Your script brief
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 shadow-sm">
                  <p className="whitespace-pre-wrap break-words font-alan-sans text-base font-medium italic leading-relaxed text-foreground/90">
                    &ldquo;{prompt}&rdquo;
                  </p>
                </div>
              </div>

              {submittedSources.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                    <AttachmentLine className="h-3.5 w-3.5" />
                    Attachments
                  </div>
                  <div
                    className="flex flex-wrap gap-2"
                    aria-label="Submitted attachments"
                  >
                    {submittedSources.map((source) => (
                      <Badge
                        key={source.id}
                        variant="outline"
                        className="max-w-full gap-1.5 rounded-md border-border/70 bg-muted/40 px-2.5 py-1 font-alan-sans text-xs font-medium text-foreground"
                        title={source.label}
                      >
                        {source.kind === "link" ? (
                          <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : source.kind === "script" ? (
                          <FilmScriptFill className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <AttachmentLine className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{source.label}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative space-y-6">
                <div className="absolute bottom-2 left-4 top-10 -z-10 w-px bg-border/50" />
                <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                  <span className="flex h-8 w-8 items-center justify-center">
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full bg-muted-foreground/25" />
                    )}
                  </span>
                  Preparing your script
                </div>

                <div className="space-y-5">
                  {reasoningSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-5 animate-in fade-in slide-in-from-bottom-1"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-sm">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      </span>
                      <p className="flex-1 pt-1.5 font-alan-sans text-sm font-medium leading-relaxed text-foreground">
                        {step.content}
                      </p>
                    </div>
                  ))}
                  {isSubmitting && (
                    <div
                      className="flex items-center gap-5"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </span>
                      <span className="h-3.5 w-44 animate-pulse rounded-full bg-muted" />
                      <span className="sr-only">
                        The script agent is reviewing your request.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {intakePhase === "questions" && currentQuestion && (
            <section className="mx-auto mt-4 w-full max-w-xl animate-in fade-in slide-in-from-bottom-3">
              <div className="rounded-2xl border border-border/40 bg-background/50 p-5 font-alan-sans shadow-sm backdrop-blur-sm md:p-6">
                <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  <span>Questions</span>
                  <span className="ml-auto font-mono text-xs tracking-tight opacity-60">
                    {currentQuestionIndex + 1} / {questions.length}
                  </span>
                </div>

                <div className="space-y-4">
                  <h2 className="text-sm font-semibold leading-snug text-foreground md:text-base">
                    {currentQuestion.question}
                  </h2>

                  <div className="space-y-1.5 pb-2">
                    {currentQuestion.options.map((option, index) => {
                      const letter = String.fromCharCode(65 + index);
                      const isSelected = selectedOption === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={isSelected}
                          disabled={isSubmitting}
                          onClick={() =>
                            handleQuestionOptionSelect(option.value)
                          }
                          className={cn(
                            "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transform-none",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-transparent bg-transparent hover:bg-muted/30",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {letter}
                          </span>
                          <span
                            className={cn(
                              "text-[13px]",
                              isSelected
                                ? "font-medium text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })}

                    {currentQuestion.allowCustom && (
                      <div
                        className={cn(
                          "mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-[background-color,border-color,box-shadow] duration-200 focus-within:ring-3 focus-within:ring-ring/40",
                          selectedOption === "custom" || customAnswer
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-transparent bg-transparent hover:bg-muted/30",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                            selectedOption === "custom" || customAnswer
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {String.fromCharCode(
                            65 + currentQuestion.options.length,
                          )}
                        </span>
                        <Textarea
                          value={customAnswer}
                          onChange={(event) =>
                            handleCustomAnswerChange(event.target.value)
                          }
                          onFocus={() => setSelectedOption("custom")}
                          placeholder={
                            currentQuestion.customPlaceholder ||
                            "Specify your own answer..."
                          }
                          rows={1}
                          disabled={isSubmitting}
                          className="h-auto min-h-5 resize-none overflow-hidden border-0 bg-transparent p-0 text-[13px] leading-5 shadow-none outline-none ring-0 placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button
                      onClick={handleContinueQuestion}
                      disabled={!hasCurrentAnswer || isSubmitting}
                      className="h-9 items-center gap-1.5 rounded-xl px-3.5 shadow-sm"
                    >
                      {currentQuestionIndex === questions.length - 1
                        ? "Generate script"
                        : "Continue"}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
