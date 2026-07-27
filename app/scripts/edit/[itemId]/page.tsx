"use client";

import { useParams, useRouter } from "next/navigation";
import {
  useContentItem,
  useUpdateItemContent,
} from "@/hooks/use-content-items";
import {
  useResolveEditProposal,
  useSessionMessages,
} from "@/hooks/use-script-chats";
import {
  MdxScriptEditor,
  MdxScriptEditorRef,
} from "@/components/editor/mdx-script-editor";
import { ChatPanel } from "@/components/editor/chat-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, PanelRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { contentToMarkdown } from "@/lib/utils/script-markdown";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { motion, useReducedMotion } from "framer-motion";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/use-clerk-auth";
import type { EditProposal } from "@/types/script-chat";

const log = logger.child({ file: "app/scripts/edit/[itemId]/page.tsx" });

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;
  const { userId } = useAuth();

  const { data: contentItem, isLoading: itemLoading } = useContentItem(itemId);
  const { data: messages } = useSessionMessages(itemId);
  const updateItemContent = useUpdateItemContent();
  const resolveProposal = useResolveEditProposal();
  const editorRef = useRef<MdxScriptEditorRef>(null);
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedMessageIdsRef = useRef<Set<string>>(new Set());
  const shouldReduceMotion = useReducedMotion();

  const [initialMarkdown, setInitialMarkdown] = useState<string | null>(null);
  const [currentMarkdown, setCurrentMarkdown] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);

  log.debug("Rendering content editor", {
    action: "render_content_editor",
    userId: userId || "signed_out",
    itemId,
    showChat,
    currentMarkdownLength: currentMarkdown?.length ?? 0,
  });

  const setChatPanelVisibility = (
    nextState: boolean,
    source: "toggle" | "chat_panel",
  ) => {
    log.info("Updating assistant panel visibility", {
      action: "update_assistant_panel_visibility",
      userId: userId || "signed_out",
      itemId,
      nextState,
      source,
    });

    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
      log.debug("Cancelled pending assistant panel collapse", {
        action: "cancel_assistant_panel_collapse",
        userId: userId || "signed_out",
        itemId,
        source,
      });
    }

    if (nextState) {
      try {
        chatPanelRef.current?.expand();
        log.debug("Expanded assistant panel layout", {
          action: "expand_assistant_panel_layout",
          userId: userId || "signed_out",
          itemId,
          source,
        });
      } catch (error) {
        log.error("Failed to expand assistant panel layout", {
          action: "expand_assistant_panel_layout",
          userId: userId || "signed_out",
          itemId,
          source,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      setShowChat(true);
      return;
    }

    setShowChat(false);
    const collapseDelay = shouldReduceMotion ? 200 : 240;
    collapseTimeoutRef.current = setTimeout(() => {
      log.debug("Completing assistant panel collapse", {
        action: "complete_assistant_panel_collapse",
        userId: userId || "signed_out",
        itemId,
        source,
        collapseDelay,
      });

      try {
        chatPanelRef.current?.collapse();
      } catch (error) {
        log.error("Failed to collapse assistant panel layout", {
          action: "collapse_assistant_panel_layout",
          userId: userId || "signed_out",
          itemId,
          source,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        collapseTimeoutRef.current = null;
      }
    }, collapseDelay);
  };

  const handleChatToggle = () => {
    log.info("Toggling assistant panel", {
      action: "toggle_assistant_panel",
      userId: userId || "signed_out",
      itemId,
      nextState: !showChat,
    });
    setChatPanelVisibility(!showChat, "toggle");
  };

  const handleChatClose = () => {
    log.info("Closing assistant panel from chat controls", {
      action: "close_assistant_panel_from_chat",
      userId: userId || "signed_out",
      itemId,
    });
    setChatPanelVisibility(false, "chat_panel");
  };

  useEffect(() => {
    log.debug("Registered assistant panel collapse cleanup", {
      action: "register_assistant_panel_collapse_cleanup",
      userId: userId || "signed_out",
      itemId,
    });

    return () => {
      log.debug("Cleaning up assistant panel collapse timer", {
        action: "cleanup_assistant_panel_collapse_timer",
        userId: userId || "signed_out",
        itemId,
      });
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = null;
      }
    };
  }, [itemId, userId]);

  useEffect(() => {
    if (contentItem && initialMarkdown === null) {
      const markdown =
        contentItem.script_content || contentToMarkdown(contentItem.content);
      setInitialMarkdown(markdown);
      setCurrentMarkdown(markdown);
      log.info("Initialized the live script editor snapshot", {
        action: "initialize_live_script_editor_snapshot",
        userId: userId || "signed_out",
        itemId,
        markdownLength: markdown.length,
      });
    }
  }, [contentItem, initialMarkdown, itemId, userId]);

  useEffect(() => {
    const handleHighlightedProposalResolution = (
      event: Event,
    ) => {
      const detail = (
        event as CustomEvent<{
          messageId: string;
          proposalIndex: number;
          status: "accepted" | "rejected";
        }>
      ).detail;
      if (
        !detail?.messageId ||
        !Number.isInteger(detail.proposalIndex) ||
        !["accepted", "rejected"].includes(detail.status)
      ) {
        log.warn("Ignored an invalid highlighted proposal resolution event", {
          action: "resolve_highlighted_script_proposal",
          userId: userId || "signed_out",
          itemId,
          error: "Invalid proposal resolution event",
        });
        return;
      }

      const markdown = editorRef.current?.getMarkdown() ?? currentMarkdown ?? "";
      setCurrentMarkdown(markdown);
      updateItemContent.mutate({
        itemId,
        content: markdown as any,
      });
      void resolveProposal.mutateAsync({
        messageId: detail.messageId,
        proposalIndex: detail.proposalIndex,
        status: detail.status,
        sessionId: itemId,
      }).then(() => {
        log.info("Resolved a suggestion from its editor highlight", {
          action: "resolve_highlighted_script_proposal",
          userId: userId || "signed_out",
          itemId,
          messageId: detail.messageId,
          proposalIndex: detail.proposalIndex,
          status: detail.status,
        });
      }).catch((error) => {
        log.error("Failed to persist a highlighted proposal resolution", {
          action: "resolve_highlighted_script_proposal",
          userId: userId || "signed_out",
          itemId,
          messageId: detail.messageId,
          proposalIndex: detail.proposalIndex,
          status: detail.status,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    };

    window.addEventListener(
      "proposal-resolved",
      handleHighlightedProposalResolution,
    );
    log.debug("Registered highlighted proposal resolution listener", {
      action: "register_highlighted_proposal_resolution_listener",
      userId: userId || "signed_out",
      itemId,
    });
    return () => {
      window.removeEventListener(
        "proposal-resolved",
        handleHighlightedProposalResolution,
      );
      log.debug("Removed highlighted proposal resolution listener", {
        action: "remove_highlighted_proposal_resolution_listener",
        userId: userId || "signed_out",
        itemId,
      });
    };
  }, [
    currentMarkdown,
    itemId,
    resolveProposal,
    updateItemContent,
    userId,
  ]);

  useEffect(() => {
    if (!currentMarkdown || !editorRef.current) return;
    for (const message of messages ?? []) {
      if (
        message.role !== "assistant" ||
        message.message_type !== "edit" ||
        message.change_status !== "pending" ||
        !message.proposed_changes?.length ||
        highlightedMessageIdsRef.current.has(message.id)
      ) {
        continue;
      }
      const result = editorRef.current.applyProposals(
        message.proposed_changes,
        message.id,
      );
      highlightedMessageIdsRef.current.add(message.id);
      if (result.appliedIndices.length) {
        setCurrentMarkdown(result.markdown);
        updateItemContent.mutate({
          itemId,
          content: result.markdown as any,
        });
      }
      log.info("Restored pending suggestion highlights in the script editor", {
        action: "restore_pending_script_suggestion_highlights",
        userId: userId || "signed_out",
        itemId,
        messageId: message.id,
        proposalCount: message.proposed_changes.length,
        highlightedProposalCount: result.appliedIndices.length,
      });
    }
  }, [currentMarkdown, itemId, messages, updateItemContent, userId]);

  const handleManualMarkdownChange = (newMarkdown: string) => {
    setCurrentMarkdown(newMarkdown);
    updateItemContent.mutate({
      itemId,
      content: newMarkdown as any,
    });
    log.debug("Updated the live script editor snapshot", {
      action: "update_live_script_editor_snapshot",
      userId: userId || "signed_out",
      itemId,
      markdownLength: newMarkdown.length,
    });
  };

  const handleAIContentUpdate = (newMarkdown: string) => {
    editorRef.current?.setMarkdown(newMarkdown);
    handleManualMarkdownChange(newMarkdown);
  };

  const handleProposalsGenerated = (
    proposals: EditProposal[],
    messageId: string,
  ) => {
    const result = editorRef.current?.applyProposals(proposals, messageId);
    if (!result) {
      log.warn("Could not access the editor to highlight generated proposals", {
        action: "highlight_generated_script_proposals",
        userId: userId || "signed_out",
        itemId,
        messageId,
        proposalCount: proposals.length,
      });
      return;
    }
    highlightedMessageIdsRef.current.add(messageId);
    handleManualMarkdownChange(result.markdown);
    log.info("Inserted generated suggestions at exact script ranges", {
      action: "highlight_generated_script_proposals",
      userId: userId || "signed_out",
      itemId,
      messageId,
      proposalCount: proposals.length,
      highlightedProposalCount: result.appliedIndices.length,
      highlightedProposalIndices: result.appliedIndices,
    });
  };

  if (
    itemLoading ||
    initialMarkdown === null ||
    currentMarkdown === null
  ) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/50 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contentItem) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Content not found
          </h2>
          <Button
            variant="outline"
            onClick={() => router.push("/content-engine")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Content Ideas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/content-engine"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Content Engine
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-foreground">
                  {contentItem.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showChat ? "secondary" : "outline"}
            size="icon"
            onClick={handleChatToggle}
            aria-label={
              showChat ? "Close assistant panel" : "Open assistant panel"
            }
            aria-pressed={showChat}
            className="h-8 w-8 rounded-lg"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 relative">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={showChat ? 70 : 100}
            minSize={40}
            className="relative custom-scrollbar flex flex-col items-stretch"
          >
            <MdxScriptEditor
              ref={editorRef}
              initialMarkdown={initialMarkdown}
              onChange={handleManualMarkdownChange}
              isSaving={updateItemContent.isPending}
              userId={userId || "signed_out"}
            />
          </ResizablePanel>

          <ResizableHandle
            disabled={!showChat}
            className={`w-1.5 shrink-0 bg-transparent hover:bg-primary/20 transition-[opacity,background-color] duration-[160ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] ${
              showChat ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <ResizablePanel
            ref={chatPanelRef}
            collapsible
            collapsedSize={0}
            defaultSize={30}
            minSize={25}
            maxSize={40}
            className="overflow-hidden"
          >
            <motion.div
              initial={false}
              animate={{
                opacity: showChat ? 1 : 0,
                transform:
                  showChat || shouldReduceMotion
                    ? "translateX(0%)"
                    : "translateX(100%)",
              }}
              transition={{
                duration: shouldReduceMotion ? 0.2 : 0.24,
                ease: shouldReduceMotion
                  ? [0.23, 1, 0.32, 1]
                  : [0.32, 0.72, 0, 1],
              }}
              aria-hidden={!showChat}
              {...(!showChat ? { inert: "" } : {})}
              className="flex h-full flex-col border-l bg-accent/30 shadow-inner"
            >
              <ChatPanel
                sessionId={itemId}
                messages={messages || []}
                editorContent={currentMarkdown}
                onClose={handleChatClose}
                onContentUpdate={handleAIContentUpdate}
                onProposalsGenerated={handleProposalsGenerated}
                showHeader={false}
              />
            </motion.div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
