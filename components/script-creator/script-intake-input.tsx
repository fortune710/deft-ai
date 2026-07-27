"use client";

import * as React from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-clerk-auth";
import { logger } from "@/lib/logger";
import { AI_MODELS, type AIModelName } from "@/types/ai-models";
import { Brain as BrainIcon } from "@/components/icons/brain";
import type { ChatAttachment } from "@/types/chat-attachments";
import type { ContentItem } from "@/types/content-engine";
import { AttachmentLine } from "@/components/icons/attachment";
import { Link as LinkIcon } from "@/components/icons/link";
import { FilmScriptFill } from "@/components/icons/script";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Platform } from "@/types/content-engine";
import type { ScriptDuration } from "@/types/script-chat";
import { YoutubeLine } from "@/components/icons/youtube";
import { Instagram } from "@/components/icons/instagram";
import { BaselineTiktok } from "@/components/icons/tiktok";
import { Twitter } from "@/components/icons/twitter";
import { Linkedin } from "@/components/icons/linkedin";
import { BaselineFacebook } from "@/components/icons/facebook";
import {
  SCRIPT_LENGTH_REQUIREMENTS,
  SCRIPT_PLATFORM_FORMATS,
} from "@/lib/script-generation/options";

const log = logger.child({
  file: "components/script-creator/script-intake-input.tsx",
});

const attachmentOptionClassName =
  "group h-auto min-h-8 w-full justify-start gap-2 rounded-[5px] px-2 py-2 text-[13px] font-normal text-foreground select-none outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:bg-foreground/10 focus-visible:text-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50 data-[highlighted]:bg-foreground/10 data-[highlighted]:text-foreground dark:hover:bg-foreground/10";

const sourceCardClassName =
  "group relative flex h-[76px] w-[230px] shrink-0 snap-start overflow-hidden rounded-xl border border-border/70 bg-background/85";

const sourceVisualClassName =
  "relative flex h-full w-[72px] shrink-0 items-center justify-center bg-muted/70 bg-cover bg-center";

const SCRIPT_PLATFORM_OPTIONS = [
  { value: "youtube", label: "YouTube", icon: YoutubeLine },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "tiktok", label: "TikTok", icon: BaselineTiktok },
  { value: "twitter", label: "X", icon: Twitter },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
  { value: "facebook", label: "Facebook", icon: BaselineFacebook },
] satisfies Array<{
  value: Platform;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}>;

const SCRIPT_DURATION_VALUES: ScriptDuration[] = [
  "really_short",
  "medium",
  "long",
];

export interface ScriptLinkPreview {
  url: string;
  title: string;
  description: string;
  image: string | null;
  siteName: string;
  status: "loading" | "ready" | "failed";
}

interface ScriptIntakeInputProps {
  value: string;
  links: ScriptLinkPreview[];
  files: File[];
  attachments: ChatAttachment[];
  contentIdeas: ContentItem[];
  selectedContentItemIds: string[];
  selectedModel: AIModelName;
  selectedPlatforms: Platform[];
  selectedDuration: ScriptDuration;
  isSubmitting: boolean;
  isProcessingSources: boolean;
  onChange: (value: string) => void;
  onLinksChange: React.Dispatch<React.SetStateAction<ScriptLinkPreview[]>>;
  onFilesChange: (files: File[]) => void;
  onSelectedContentItemIdsChange: (contentItemIds: string[]) => void;
  onModelChange: (model: AIModelName) => void;
  onPlatformsChange: (platforms: Platform[]) => void;
  onDurationChange: (duration: ScriptDuration) => void;
  onSubmit: () => void;
}

function getFileFormat(fileName: string, userId: string) {
  const lastDot = fileName.lastIndexOf(".");
  const fileFormat =
    lastDot >= 0 && lastDot < fileName.length - 1
      ? fileName.slice(lastDot + 1).toUpperCase()
      : "FILE";
  log.debug("Resolved script source file format", {
    userId,
    action: "resolve_script_source_file_format",
    fileName,
    fileFormat,
  });
  return fileFormat;
}

interface SourceFilePreviewProps {
  file?: File;
  previewUrl?: string;
  mimeType: string;
  fileName: string;
  userId: string;
}

interface PdfThumbnailProps {
  file?: File;
  previewUrl: string;
  fileName: string;
  userId: string;
}

function PdfThumbnail({
  file,
  previewUrl,
  fileName,
  userId,
}: PdfThumbnailProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "failed">(
    "loading",
  );

  React.useEffect(() => {
    let cancelled = false;
    let releasePdf: (() => void) | undefined;

    const renderPdfPreview = async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const source = file
          ? { data: new Uint8Array(await file.arrayBuffer()) }
          : { url: previewUrl };
        const loadingTask = pdfjs.getDocument(source);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const pixelRatio = window.devicePixelRatio || 1;
        const scale = (72 / baseViewport.width) * pixelRatio;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) {
          await pdf.destroy();
          return;
        }
        const context = canvas.getContext("2d");
        if (!context) throw new Error("PDF preview canvas is unavailable");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = "72px";
        canvas.style.height = `${Math.ceil(viewport.height / pixelRatio)}px`;
        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });
        await renderTask.promise;
        if (!cancelled) setStatus("ready");
        releasePdf = () => {
          renderTask.cancel();
          void pdf.destroy();
          void loadingTask.destroy();
        };
        log.info("Rendered first-page PDF attachment thumbnail", {
          userId,
          action: "render_pdf_attachment_thumbnail",
          fileName,
          statusCode: 200,
        });
      } catch (error) {
        if (!cancelled) setStatus("failed");
        log.warn("Unable to render PDF attachment thumbnail", {
          userId,
          action: "render_pdf_attachment_thumbnail",
          fileName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void renderPdfPreview();
    return () => {
      cancelled = true;
      releasePdf?.();
      log.debug("Released PDF attachment thumbnail", {
        userId,
        action: "release_pdf_attachment_thumbnail",
        fileName,
      });
    };
  }, [file, fileName, previewUrl, userId]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label={`First page preview of ${fileName}`}
        className={`absolute left-0 top-0 bg-white ${status === "ready" ? "block" : "hidden"}`}
      />
      {status === "loading" && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {status === "failed" && (
        <span className="text-[10px] font-semibold text-muted-foreground">
          PDF
        </span>
      )}
    </>
  );
}

function SourceFilePreview({
  file,
  previewUrl,
  mimeType,
  fileName,
  userId,
}: SourceFilePreviewProps) {
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string>();

  React.useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    log.debug("Created local script attachment preview", {
      userId,
      action: "create_script_attachment_preview",
      fileName,
      mimeType,
    });
    return () => {
      URL.revokeObjectURL(objectUrl);
      log.debug("Released local script attachment preview", {
        userId,
        action: "release_script_attachment_preview",
        fileName,
        mimeType,
      });
    };
  }, [file, fileName, mimeType, userId]);

  const resolvedPreviewUrl = localPreviewUrl || previewUrl;
  const fileFormat = getFileFormat(fileName, userId);

  log.debug("Rendering script attachment preview", {
    userId,
    action: "render_script_attachment_preview",
    fileName,
    mimeType,
    fileFormat,
    hasPreviewUrl: Boolean(resolvedPreviewUrl),
  });

  if (!resolvedPreviewUrl) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (
    mimeType.startsWith("image/") ||
    ["PNG", "JPG", "JPEG", "WEBP"].includes(fileFormat)
  ) {
    return (
      <Image
        src={resolvedPreviewUrl}
        alt=""
        fill
        unoptimized
        sizes="72px"
        className="object-cover"
      />
    );
  }

  if (
    mimeType.startsWith("video/") ||
    ["MP4", "WEBM", "MOV"].includes(fileFormat)
  ) {
    return (
      <video
        src={resolvedPreviewUrl}
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
        onLoadedMetadata={(event) => {
          event.currentTarget.currentTime = Math.min(
            0.1,
            event.currentTarget.duration || 0.1,
          );
          log.debug("Loaded script video attachment thumbnail", {
            userId,
            action: "load_script_video_attachment_thumbnail",
            fileName,
            mimeType,
          });
        }}
      />
    );
  }

  if (mimeType === "application/pdf" || fileFormat === "PDF") {
    return (
      <PdfThumbnail
        file={file}
        previewUrl={resolvedPreviewUrl}
        fileName={fileName}
        userId={userId}
      />
    );
  }

  if (
    mimeType.startsWith("audio/") ||
    ["MP3", "WAV", "M4A"].includes(fileFormat)
  ) {
    return (
      <svg
        viewBox="0 0 72 44"
        role="img"
        aria-label={`Audio waveform for ${fileName}`}
        className="h-11 w-full px-2 text-primary"
      >
        <path
          d="M4 22h4m3 0V12m0 10v10m5-10V7m0 15v15m5-15V12m0 10v10m5-10V3m0 19v19m5-19V9m0 13v13m5-13V5m0 17v17m5-17V11m0 11v11m5-11V8m0 14v14m5-14V14m0 8v8m5-8h4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (mimeType.startsWith("text/") || ["TXT", "MD"].includes(fileFormat)) {
    return (
      <iframe
        src={resolvedPreviewUrl}
        title={`Preview of ${fileName}`}
        tabIndex={-1}
        className="pointer-events-none h-full w-full border-0 bg-white"
      />
    );
  }

  return (
    <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">
      {fileFormat}
    </span>
  );
}

export function ScriptIntakeInput({
  value,
  links,
  files,
  attachments,
  contentIdeas,
  selectedContentItemIds,
  selectedModel,
  selectedPlatforms,
  selectedDuration,
  isSubmitting,
  isProcessingSources,
  onChange,
  onLinksChange,
  onFilesChange,
  onSelectedContentItemIdsChange,
  onModelChange,
  onPlatformsChange,
  onDurationChange,
  onSubmit,
}: ScriptIntakeInputProps) {
  const { userId } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const sourceTrayRef = React.useRef<HTMLDivElement>(null);
  const [modelPopoverOpen, setModelPopoverOpen] = React.useState(false);
  const [attachmentPopoverOpen, setAttachmentPopoverOpen] =
    React.useState(false);
  const [attachmentMode, setAttachmentMode] = React.useState<
    "menu" | "link" | "script"
  >("menu");
  const [linkInput, setLinkInput] = React.useState("");
  const [sourceTrayOverflow, setSourceTrayOverflow] = React.useState({
    left: false,
    right: false,
  });
  const selectedModelConfig =
    Object.values(AI_MODELS).find((model) => model.model === selectedModel) ||
    AI_MODELS.GOOGLE_FLASH;
  const selectedPlatformConfig =
    SCRIPT_PLATFORM_OPTIONS.find(
      (platform) => platform.value === selectedPlatforms[0],
    ) || SCRIPT_PLATFORM_OPTIONS[0];
  const selectedContentFormat =
    SCRIPT_PLATFORM_FORMATS[selectedPlatformConfig.value];
  const durationOptions = SCRIPT_DURATION_VALUES.map((duration) => ({
    value: duration,
    ...SCRIPT_LENGTH_REQUIREMENTS[selectedContentFormat][duration],
  }));
  const selectedDurationConfig =
    durationOptions.find((duration) => duration.value === selectedDuration) ||
    durationOptions[1];
  const hasSources =
    links.length > 0 ||
    files.length > 0 ||
    attachments.length > 0 ||
    selectedContentItemIds.length > 0;

  const loadLinkPreview = async (url: string) => {
    try {
      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = (await response
        .json()
        .catch(() => ({}))) as Partial<ScriptLinkPreview> & { error?: string };
      if (!response.ok) throw new Error(body.error || "Preview unavailable");
      onLinksChange((current) =>
        current.map((link) =>
          link.url === url
            ? {
                url: body.url || url,
                title: body.title || new URL(url).hostname,
                description: body.description || "",
                image: body.image || null,
                siteName: body.siteName || new URL(url).hostname,
                status: "ready",
              }
            : link,
        ),
      );
      log.info("Loaded rich script link preview", {
        userId: userId || "signed_out",
        action: "load_script_link_preview",
        url,
        statusCode: response.status,
        hasImage: Boolean(body.image),
      });
    } catch (error) {
      onLinksChange((current) =>
        current.map((link) =>
          link.url === url ? { ...link, status: "failed" } : link,
        ),
      );
      log.warn("Unable to load rich script link preview", {
        userId: userId || "signed_out",
        action: "load_script_link_preview",
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const addLinkPreviews = (urls: string[]) => {
    const existingUrls = new Set(links.map((link) => link.url));
    const newUrls = [...new Set(urls)]
      .filter((url) => !existingUrls.has(url))
      .slice(0, Math.max(0, 5 - links.length));
    if (!newUrls.length) return;
    onLinksChange((current) => [
      ...current,
      ...newUrls.map((url) => ({
        url,
        title: new URL(url).hostname,
        description: url,
        image: null,
        siteName: new URL(url).hostname,
        status: "loading" as const,
      })),
    ]);
    for (const url of newUrls) void loadLinkPreview(url);
    log.info("Queued rich script link previews", {
      userId: userId || "signed_out",
      action: "queue_script_link_previews",
      addedCount: newUrls.length,
    });
  };

  const addLinksFromText = (text: string) => {
    const foundLinks = (text.match(/https?:\/\/[^\s<>()]+/g) ?? []).filter(
      (candidate) => {
        try {
          return ["http:", "https:"].includes(new URL(candidate).protocol);
        } catch {
          return false;
        }
      },
    );
    addLinkPreviews(foundLinks);
    log.info("Added pasted script source links", {
      userId: userId || "signed_out",
      action: "add_script_source_links",
      discoveredCount: foundLinks.length,
    });
    return foundLinks;
  };

  const handlePromptPaste = (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const pastedText = event.clipboardData.getData("text");
    const foundLinks = addLinksFromText(pastedText);
    if (!foundLinks.length) return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const textWithoutLinks = foundLinks
      .reduce((text, url) => text.replaceAll(url, ""), pastedText)
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n");
    const nextValue = `${value.slice(0, selectionStart)}${textWithoutLinks}${value.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + textWithoutLinks.length;

    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
    log.info("Removed previewed links from script prompt", {
      userId: userId || "signed_out",
      action: "extract_links_from_script_prompt",
      extractedLinkCount: foundLinks.length,
      retainedTextLength: textWithoutLinks.length,
    });
  };

  const handleLinkSubmit = () => {
    try {
      const url = new URL(linkInput.trim());
      if (!["http:", "https:"].includes(url.protocol))
        throw new Error("Unsupported URL protocol");
      addLinkPreviews([url.toString()]);
      setLinkInput("");
      setAttachmentMode("menu");
      setAttachmentPopoverOpen(false);
      log.info("Added script link from attachment menu", {
        userId: userId || "signed_out",
        action: "add_script_link_from_menu",
        url: url.toString(),
      });
    } catch (error) {
      log.warn("Rejected invalid script link from attachment menu", {
        userId: userId || "signed_out",
        action: "add_script_link_from_menu",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleAttachmentMenuChange = (open: boolean) => {
    setAttachmentPopoverOpen(open);
    if (!open) setAttachmentMode("menu");
    log.debug("Changed script source menu visibility", {
      userId: userId || "signed_out",
      action: "toggle_script_source_menu",
      open,
    });
  };

  const handleFileOption = () => {
    setAttachmentPopoverOpen(false);
    fileInputRef.current?.click();
    log.info("Opened file chooser from script source menu", {
      userId: userId || "signed_out",
      action: "open_script_source_file_chooser",
    });
  };

  const handleContentIdeaToggle = (contentItemId: string) => {
    const nextIds = selectedContentItemIds.includes(contentItemId)
      ? selectedContentItemIds.filter((id) => id !== contentItemId)
      : [...selectedContentItemIds, contentItemId].slice(-3);
    onSelectedContentItemIdsChange(nextIds);
    log.info("Changed generated content idea source selection", {
      userId: userId || "signed_out",
      action: "select_content_idea_source",
      contentItemId,
      selected: nextIds.includes(contentItemId),
    });
  };

  const handleFiles = (nextFiles: File[]) => {
    const availableSlots = Math.max(0, 10 - files.length - attachments.length);
    const acceptedFiles = nextFiles.slice(0, availableSlots);
    onFilesChange([...files, ...acceptedFiles]);
    log.info("Staged script source files for request submission", {
      userId: userId || "signed_out",
      action: "stage_script_source_files",
      fileCount: acceptedFiles.length,
      availableSlots,
    });
  };

  const handleRemoveLink = (url: string) => {
    onLinksChange((current) => current.filter((link) => link.url !== url));
    log.info("Removed script source link", {
      userId: userId || "signed_out",
      action: "remove_script_source_link",
      url,
    });
  };

  const handleRemoveFile = (fileName: string) => {
    onFilesChange(files.filter((file) => file.name !== fileName));
    log.info("Removed staged script source file", {
      userId: userId || "signed_out",
      action: "remove_staged_script_source_file",
      fileName,
    });
  };

  const handleModelSelect = (model: AIModelName) => {
    onModelChange(model);
    setModelPopoverOpen(false);
    log.info("Changed script intake model", {
      userId: userId || "signed_out",
      action: "change_script_intake_model",
      model,
    });
  };

  const handlePlatformSelect = (platform: Platform) => {
    onPlatformsChange([platform]);
    log.info("Changed target platform for script generation", {
      userId: userId || "signed_out",
      action: "change_script_generation_platform",
      platform,
      previousPlatform: selectedPlatforms[0],
    });
  };

  const handleDurationSelect = (duration: ScriptDuration) => {
    onDurationChange(duration);
    log.info("Changed target duration for script generation", {
      userId: userId || "signed_out",
      action: "change_script_generation_duration",
      duration,
      platforms: selectedPlatforms,
    });
  };

  const handleSubmit = () => {
    if (!value.trim() || isSubmitting || isProcessingSources) return;
    onSubmit();
    log.info("Submitted script intake brief", {
      userId: userId || "signed_out",
      action: "submit_script_intake_brief",
      model: selectedModel,
      linkCount: links.length,
      stagedFileCount: files.length,
      uploadedFileCount: attachments.length,
      platforms: selectedPlatforms,
      duration: selectedDuration,
    });
  };

  const updateSourceTrayOverflow = React.useCallback(() => {
    const tray = sourceTrayRef.current;
    if (!tray) return;
    const edgeThreshold = 6;
    const maxScrollLeft = Math.max(0, tray.scrollWidth - tray.clientWidth);
    const normalizedScrollLeft = Math.min(
      Math.max(tray.scrollLeft, 0),
      maxScrollLeft,
    );
    const nextOverflow = {
      left: normalizedScrollLeft > edgeThreshold,
      right: maxScrollLeft - normalizedScrollLeft > edgeThreshold,
    };
    setSourceTrayOverflow((current) => {
      if (
        current.left === nextOverflow.left &&
        current.right === nextOverflow.right
      ) {
        return current;
      }
      log.debug("Updated script source tray overflow controls", {
        userId: userId || "signed_out",
        action: "update_script_source_tray_overflow",
        canScrollLeft: nextOverflow.left,
        canScrollRight: nextOverflow.right,
        scrollLeft: normalizedScrollLeft,
        maxScrollLeft,
        scrollWidth: tray.scrollWidth,
        clientWidth: tray.clientWidth,
      });
      return nextOverflow;
    });
  }, [userId]);

  const scrollSourceTray = (direction: "left" | "right") => {
    const tray = sourceTrayRef.current;
    if (!tray) return;
    const distance = direction === "left" ? -240 : 240;
    tray.scrollBy({ left: distance, behavior: "smooth" });
    log.info("Scrolled script source tray", {
      userId: userId || "signed_out",
      action: "scroll_script_source_tray",
      direction,
      distance,
    });
  };

  React.useEffect(() => {
    const tray = sourceTrayRef.current;
    if (!tray) return;
    updateSourceTrayOverflow();
    const resizeObserver = new ResizeObserver(updateSourceTrayOverflow);
    resizeObserver.observe(tray);
    return () => resizeObserver.disconnect();
  }, [
    attachments.length,
    files.length,
    links.length,
    selectedContentItemIds.length,
    updateSourceTrayOverflow,
  ]);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.mp4,.webm,.mov"
        className="sr-only"
        onChange={(event) => {
          const selectedFiles = Array.from(event.target.files ?? []);
          event.target.value = "";
          handleFiles(selectedFiles);
        }}
      />

      {hasSources && (
        <div className="relative z-0 mx-3 overflow-hidden rounded-t-2xl border border-b-0 border-border/70 bg-muted/45 shadow-[0_-12px_30px_-24px_hsl(var(--foreground)/0.45)]">
          {sourceTrayOverflow.left && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-background/90 via-background/55 to-transparent backdrop-blur-[2px]" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 z-20 h-7 w-7 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur"
                onClick={() => scrollSourceTray("left")}
                aria-label="Scroll sources left"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          {sourceTrayOverflow.right && (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-background/90 via-background/55 to-transparent backdrop-blur-[2px]" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 z-20 h-7 w-7 -translate-y-1/2 rounded-full bg-background/90 shadow-md backdrop-blur"
                onClick={() => scrollSourceTray("right")}
                aria-label="Scroll sources right"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <div
            ref={sourceTrayRef}
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-3 pb-4 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={updateSourceTrayOverflow}
          >
            {links.map((link) => (
              <article key={link.url} className={sourceCardClassName}>
                <div
                  className={sourceVisualClassName}
                  style={
                    link.image
                      ? {
                          backgroundImage: `url(${JSON.stringify(link.image).slice(1, -1)})`,
                        }
                      : undefined
                  }
                >
                  {!link.image &&
                    (link.status === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Globe2 className="h-5 w-5 text-muted-foreground" />
                    ))}
                </div>
                <div className="min-w-0 flex-1 px-3 py-2">
                  <p className="truncate text-[11px] text-muted-foreground">
                    {link.siteName}
                  </p>
                  <h3 className="line-clamp-1 text-sm font-medium">
                    {link.title}
                  </h3>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {link.description || link.url}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                  onClick={() => handleRemoveLink(link.url)}
                  aria-label={`Remove ${link.title}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </article>
            ))}
            {files.map((file) => {
              const effectiveUserId = userId || "signed_out";
              const fileFormat = getFileFormat(file.name, effectiveUserId);
              return (
                <article
                  key={`${file.name}-${file.lastModified}`}
                  className={sourceCardClassName}
                >
                  <span className={sourceVisualClassName}>
                    <SourceFilePreview
                      file={file}
                      mimeType={file.type}
                      fileName={file.name}
                      userId={effectiveUserId}
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
                    <h3 className="truncate text-sm font-medium">
                      {file.name}
                    </h3>
                    <span className="w-fit rounded-[3px] border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide text-muted-foreground">
                      {fileFormat}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    onClick={() => handleRemoveFile(file.name)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </article>
              );
            })}
            {selectedContentItemIds.map((contentItemId) => {
              const contentIdea = contentIdeas.find(
                (item) => item.id === contentItemId,
              );
              if (!contentIdea) return null;
              return (
                <article key={contentIdea.id} className={sourceCardClassName}>
                  <span className={sourceVisualClassName}>
                    <FilmScriptFill className="h-5 w-5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1 px-3 py-2">
                    <h3 className="truncate text-sm font-medium">
                      {contentIdea.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Content idea
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    onClick={() => handleContentIdeaToggle(contentIdea.id)}
                    aria-label={`Remove ${contentIdea.title}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </article>
              );
            })}
            {attachments.map((attachment) => {
              const effectiveUserId = userId || "signed_out";
              const fileFormat = getFileFormat(
                attachment.fileName,
                effectiveUserId,
              );
              const busy = ["queued", "processing"].includes(
                attachment.processingStatus,
              );
              return (
                <article key={attachment.id} className={sourceCardClassName}>
                  <span className={`relative ${sourceVisualClassName}`}>
                    <SourceFilePreview
                      previewUrl={attachment.previewUrl}
                      mimeType={attachment.mimeType}
                      fileName={attachment.fileName}
                      userId={effectiveUserId}
                    />
                    {busy && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/45 backdrop-blur-[1px]">
                        <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                      </span>
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2">
                    <h3 className="truncate text-sm font-medium">
                      {attachment.fileName}
                    </h3>
                    <span className="w-fit rounded-[3px] border border-border/80 bg-muted/60 px-1.5 py-0.5 text-[9px] font-semibold leading-none tracking-wide text-muted-foreground">
                      {fileFormat}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`relative z-10 overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-[0_18px_60px_-36px_hsl(var(--foreground)/0.45)] transition-[border-color,box-shadow] duration-200 focus-within:border-primary/70 focus-within:ring-3 focus-within:ring-ring/20 ${hasSources ? "-mt-1" : ""}`}
      >
        <div className="grow px-5 pb-3 pt-5">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onPaste={handlePromptPaste}
            placeholder="What would you like to create?"
            className="min-h-[116px] w-full resize-none border-0 bg-transparent p-0 text-base text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 md:text-lg"
          />
        </div>
        <div className="mb-3 flex items-center justify-between px-3">
          <TooltipProvider delayDuration={250}>
            <Popover
              open={attachmentPopoverOpen}
              onOpenChange={handleAttachmentMenuChange}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Add sources"
                      className="h-10 w-10 rounded-full border border-border p-0 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Add files, links, or an existing script
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                side="top"
                align="start"
                sideOffset={8}
                className="relative flex max-h-[min(var(--radix-popover-content-available-height),24rem)] w-52 min-w-32 max-w-72 flex-col overflow-hidden rounded-[10px] border-border/70 bg-popover p-0 text-xs text-popover-foreground shadow-xl outline-none focus-visible:outline-none"
              >
                <div className="min-h-0 overflow-y-auto overscroll-contain rounded-[inherit] border-b border-transparent p-1">
                  {attachmentMode === "menu" && (
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        className={attachmentOptionClassName}
                        disabled={files.length + attachments.length >= 10}
                        onClick={handleFileOption}
                      >
                        <AttachmentLine className="h-[17px] w-[17px] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                        Add a file
                      </Button>
                      <Button
                        variant="ghost"
                        className={attachmentOptionClassName}
                        disabled={links.length >= 5}
                        onClick={() => setAttachmentMode("link")}
                      >
                        <LinkIcon className="h-[17px] w-[17px] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                        Upload a link
                      </Button>
                      <Button
                        variant="ghost"
                        className={attachmentOptionClassName}
                        onClick={() => setAttachmentMode("script")}
                      >
                        <FilmScriptFill className="h-[17px] w-[17px] shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                        Use existing script
                      </Button>
                    </div>
                  )}
                  {attachmentMode === "link" && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded px-1 py-1 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                        onClick={() => setAttachmentMode("menu")}
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Back
                      </button>
                      <div className="flex gap-1.5">
                        <Input
                          value={linkInput}
                          onChange={(event) => setLinkInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleLinkSubmit();
                            }
                          }}
                          placeholder="https://example.com"
                          className="h-8 text-xs"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-8 px-2.5 text-xs"
                          disabled={!linkInput.trim()}
                          onClick={handleLinkSubmit}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                  {attachmentMode === "script" && (
                    <div>
                      <button
                        type="button"
                        className="mb-0.5 flex items-center gap-1 rounded px-1 py-1 text-[11px] font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                        onClick={() => setAttachmentMode("menu")}
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Back
                      </button>
                      <div className="flex flex-col gap-0.5">
                        {contentIdeas.length === 0 ? (
                          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                            No generated content ideas yet
                          </p>
                        ) : (
                          contentIdeas.map((contentIdea) => {
                            const selected = selectedContentItemIds.includes(
                              contentIdea.id,
                            );
                            return (
                              <Button
                                key={contentIdea.id}
                                variant="ghost"
                                className={`${attachmentOptionClassName} text-left`}
                                onClick={() =>
                                  handleContentIdeaToggle(contentIdea.id)
                                }
                              >
                                <FilmScriptFill className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                                <span className="line-clamp-1 flex-1">
                                  {contentIdea.title}
                                </span>
                                {selected && (
                                  <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
                                )}
                              </Button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </TooltipProvider>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 max-w-44 gap-2 rounded-xl px-2.5 text-sm font-medium text-muted-foreground transition-[border-radius,background-color,color] hover:rounded-lg hover:bg-muted hover:text-foreground"
                  aria-label="Choose script platforms and duration"
                >
                  <span className="flex h-5 w-5 items-center justify-center">
                    {React.createElement(selectedPlatformConfig.icon, {
                      "aria-hidden": true,
                      className: "h-4 w-4",
                    })}
                  </span>
                  <span className="truncate">
                    {selectedPlatformConfig.label}
                  </span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{selectedDurationConfig.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={8}
                className="w-48 rounded-[10px] border-border/70 p-1 shadow-xl"
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="h-9 rounded-md px-2.5 text-sm transition-colors hover:bg-foreground/10 focus:bg-foreground/10 data-[highlighted]:bg-foreground/10 data-[state=open]:bg-foreground/10 [&>svg:last-child]:!ml-2">
                    <span>Platform</span>
                    <span className="ml-auto max-w-20 truncate text-xs text-muted-foreground">
                      {selectedPlatformConfig.label}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    sideOffset={4}
                    className="w-44 rounded-[10px] border-border/70 p-1 shadow-xl"
                  >
                    {SCRIPT_PLATFORM_OPTIONS.map((platform) => (
                      <DropdownMenuItem
                        key={platform.value}
                        onSelect={() => handlePlatformSelect(platform.value)}
                        className="h-9 rounded-md px-2.5 text-sm transition-colors hover:bg-foreground/10 focus:bg-foreground/10 data-[highlighted]:bg-foreground/10"
                      >
                        {React.createElement(platform.icon, {
                          "aria-hidden": true,
                          className: "mr-2 h-4 w-4 shrink-0",
                        })}
                        {platform.label}
                        {selectedPlatforms[0] === platform.value && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="h-9 rounded-md px-2.5 text-sm transition-colors hover:bg-foreground/10 focus:bg-foreground/10 data-[highlighted]:bg-foreground/10 data-[state=open]:bg-foreground/10 [&>svg:last-child]:!ml-2">
                    <span>Duration</span>
                    <span className="ml-auto max-w-20 truncate text-xs text-muted-foreground">
                      {selectedDurationConfig.label}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent
                    sideOffset={4}
                    className="w-44 rounded-[10px] border-border/70 p-1 shadow-xl"
                  >
                    {durationOptions.map((duration) => (
                      <DropdownMenuItem
                        key={duration.value}
                        onSelect={() => handleDurationSelect(duration.value)}
                        className="min-h-10 rounded-md px-2.5 transition-colors hover:bg-foreground/10 focus:bg-foreground/10 data-[highlighted]:bg-foreground/10"
                      >
                        <span className="flex flex-col">
                          <span className="text-sm">{duration.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {duration.timing}
                          </span>
                        </span>
                        {selectedDuration === duration.value && (
                          <Check className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-[border-radius,background-color,color] hover:rounded-lg hover:bg-muted hover:text-foreground"
                >
                  {React.createElement(selectedModelConfig.icon, {
                    "aria-hidden": true,
                    className: "h-4 w-4 shrink-0",
                  })}
                  <span>{selectedModelConfig.name}</span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="z-[100] w-52 rounded-xl p-1"
              >
                <div className="flex flex-col gap-1">
                  {Object.values(AI_MODELS).map((model) => (
                    <Button
                      key={model.model}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleModelSelect(model.model)}
                      aria-pressed={selectedModel === model.model}
                      className={`h-8 justify-start rounded-lg px-2 text-xs ${selectedModel === model.model ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
                    >
                      {React.createElement(model.icon, {
                        "aria-hidden": true,
                        className: "mr-2 h-3.5 w-3.5 shrink-0",
                      })}
                      {model.name}
                      {model.isReasoningModel && (
                        <BrainIcon
                          aria-hidden="true"
                          className="ml-auto h-3 w-3"
                        />
                      )}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              aria-label="Ask the script agent"
              className="h-10 w-10 rounded-full bg-primary p-0 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!value.trim() || isSubmitting || isProcessingSources}
              title={
                isProcessingSources
                  ? "Waiting for source files to finish analysis"
                  : undefined
              }
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary-foreground" />
              ) : (
                <ArrowUp className="h-5 w-5 text-primary-foreground" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
