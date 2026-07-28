"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    MDXEditorMethods,
    toolbarPlugin,
    UndoRedo,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    CreateLink,
    linkPlugin,
    linkDialogPlugin,
    ListsToggle,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import type { EditProposal } from "@/types/script-chat";
import { logger } from "@/lib/logger";
import { locateProposalSourceText } from "@/lib/script-editing/proposals";

const log = logger.child({ file: "components/editor/mdx-script-editor.tsx" });
const SCRIPT_SUGGESTION_HIGHLIGHT = "script-suggestion";
const SCRIPT_SUGGESTION_STYLE_ID = "script-suggestion-highlight-styles";

type HighlightRegistry = {
  delete: (name: string) => boolean;
  set: (name: string, highlight: unknown) => void;
};

type HighlightConstructor = new (...ranges: Range[]) => unknown;

export type ScriptSuggestionHighlight = {
  messageId: string;
  proposalIndex: number;
  proposal: EditProposal;
};

function ensureSuggestionHighlightStyles(userId: string): void {
  if (document.getElementById(SCRIPT_SUGGESTION_STYLE_ID)) {
    log.debug("Reused browser-injected script suggestion styles", {
      userId,
      action: "ensure_script_suggestion_highlight_styles",
      styleId: SCRIPT_SUGGESTION_STYLE_ID,
    });
    return;
  }

  const style = document.createElement("style");
  style.id = SCRIPT_SUGGESTION_STYLE_ID;
  style.textContent = `
    ::highlight(${SCRIPT_SUGGESTION_HIGHLIGHT}) {
      background-color: hsl(var(--primary) / 0.22);
      color: inherit;
      text-decoration-line: underline;
      text-decoration-color: hsl(var(--primary) / 0.72);
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }
  `;
  document.head.appendChild(style);
  log.info("Injected browser-only script suggestion styles", {
    userId,
    action: "ensure_script_suggestion_highlight_styles",
    styleId: SCRIPT_SUGGESTION_STYLE_ID,
  });
}

function applyBrowserSuggestionHighlights(
  container: HTMLElement,
  suggestions: ScriptSuggestionHighlight[],
  userId: string,
): () => void {
  const registry = (
    globalThis.CSS as typeof CSS & { highlights?: HighlightRegistry }
  )?.highlights;
  const HighlightClass = (
    globalThis as typeof globalThis & { Highlight?: HighlightConstructor }
  ).Highlight;
  const editor = container.querySelector<HTMLElement>('[contenteditable="true"]');

  if (!registry || !HighlightClass || !editor) {
    log.warn("Browser text highlights are unavailable for script suggestions", {
      userId,
      action: "highlight_script_proposal_ranges",
      suggestionCount: suggestions.length,
      hasHighlightRegistry: Boolean(registry),
      hasHighlightConstructor: Boolean(HighlightClass),
      hasEditor: Boolean(editor),
    });
    return () => {
      log.debug("Skipped unavailable script highlight cleanup", {
        userId,
        action: "cleanup_script_proposal_highlights",
      });
    };
  }

  ensureSuggestionHighlightStyles(userId);
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }
  const renderedText = textNodes.map((node) => node.data).join("");
  const claimedRanges: Array<{ start: number; end: number }> = [];
  const ranges: Range[] = [];

  for (const suggestion of suggestions) {
    if ((suggestion.proposal.status ?? "pending") !== "pending") continue;

    let searchOffset = 0;
    let locatedRange: { start: number; end: number } | null =
      suggestion.proposal.scope === "document" && renderedText.length
        ? { start: 0, end: renderedText.length }
        : null;
    while (searchOffset <= renderedText.length) {
      if (locatedRange) break;
      const match = locateProposalSourceText(
        renderedText.slice(searchOffset),
        suggestion.proposal.before,
        userId,
      );
      if (!match) break;
      const candidate = {
        start: searchOffset + match.index,
        end: searchOffset + match.index + match.length,
      };
      const overlapsClaimedRange = claimedRanges.some(
        (claimed) =>
          candidate.start < claimed.end && candidate.end > claimed.start,
      );
      if (!overlapsClaimedRange) {
        locatedRange = candidate;
        break;
      }
      searchOffset = candidate.end;
    }

    if (!locatedRange) {
      log.warn("Could not map a pending proposal into rendered editor text", {
        userId,
        action: "highlight_script_proposal_range",
        messageId: suggestion.messageId,
        proposalIndex: suggestion.proposalIndex,
        sourceLength: suggestion.proposal.before.length,
        renderedTextLength: renderedText.length,
      });
      continue;
    }

    let documentOffset = 0;
    let startPoint: { node: Text; offset: number } | null = null;
    let endPoint: { node: Text; offset: number } | null = null;
    for (const textNode of textNodes) {
      const nextOffset = documentOffset + textNode.data.length;
      if (
        !startPoint &&
        locatedRange.start >= documentOffset &&
        locatedRange.start <= nextOffset
      ) {
        startPoint = {
          node: textNode,
          offset: locatedRange.start - documentOffset,
        };
      }
      if (
        locatedRange.end >= documentOffset &&
        locatedRange.end <= nextOffset
      ) {
        endPoint = {
          node: textNode,
          offset: locatedRange.end - documentOffset,
        };
        break;
      }
      documentOffset = nextOffset;
    }

    if (!startPoint || !endPoint) {
      log.warn("Could not create DOM boundaries for a script suggestion", {
        userId,
        action: "highlight_script_proposal_range",
        messageId: suggestion.messageId,
        proposalIndex: suggestion.proposalIndex,
        rangeStart: locatedRange.start,
        rangeEnd: locatedRange.end,
      });
      continue;
    }

    const range = document.createRange();
    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    ranges.push(range);
    claimedRanges.push(locatedRange);
  }

  registry.delete(SCRIPT_SUGGESTION_HIGHLIGHT);
  if (ranges.length) {
    registry.set(
      SCRIPT_SUGGESTION_HIGHLIGHT,
      new HighlightClass(...ranges),
    );
  }
  editor.dataset.suggestionHighlightCount = String(ranges.length);
  log.info("Highlighted pending suggestions without changing script content", {
    userId,
    action: "highlight_script_proposal_ranges",
    suggestionCount: suggestions.length,
    highlightedRangeCount: ranges.length,
    renderedTextLength: renderedText.length,
  });

  return () => {
    registry.delete(SCRIPT_SUGGESTION_HIGHLIGHT);
    delete editor.dataset.suggestionHighlightCount;
    log.debug("Removed browser text highlights for script suggestions", {
      userId,
      action: "cleanup_script_proposal_highlights",
      highlightedRangeCount: ranges.length,
    });
  };
}

export interface MdxScriptEditorRef {
  setMarkdown: (markdown: string) => void;
  getMarkdown: () => string;
}

interface MdxScriptEditorProps {
  initialMarkdown: string;
  onChange?: (markdown: string) => void;
  isSaving?: boolean;
  userId: string;
  suggestions?: ScriptSuggestionHighlight[];
}

export const MdxScriptEditor = forwardRef<MdxScriptEditorRef, MdxScriptEditorProps>(
    ({ initialMarkdown, onChange, isSaving, userId, suggestions = [] }, ref) => {
        const editorRef = useRef<MDXEditorMethods>(null);
        const editorContainerRef = useRef<HTMLDivElement>(null);

        useImperativeHandle(ref, () => ({
            setMarkdown: (markdown: string) => {
                log.debug('Setting script editor markdown', {
                    userId,
                    action: 'set_script_editor_markdown',
                    markdownLength: markdown.length,
                });
                editorRef.current?.setMarkdown(markdown);
            },
            getMarkdown: () => {
                const markdown = editorRef.current?.getMarkdown() || '';
                log.debug('Read current script editor markdown', {
                    userId,
                    action: 'get_script_editor_markdown',
                    markdownLength: markdown.length,
                });
                return markdown;
            },
        }));

        useEffect(() => {
            const container = editorContainerRef.current;
            if (!container) {
                log.warn("Could not access the script editor highlight container", {
                    userId,
                    action: "highlight_script_proposal_ranges",
                    suggestionCount: suggestions.length,
                });
                return;
            }
            let removeHighlights = () => {
                log.debug("Cleaned up an uninitialized script highlight frame", {
                    userId,
                    action: "cleanup_script_proposal_highlights",
                });
            };
            const frame = window.requestAnimationFrame(() => {
                removeHighlights = applyBrowserSuggestionHighlights(
                    container,
                    suggestions,
                    userId,
                );
            });
            log.debug("Scheduled non-destructive script suggestion highlights", {
                userId,
                action: "schedule_script_proposal_highlights",
                suggestionCount: suggestions.length,
            });
            return () => {
                window.cancelAnimationFrame(frame);
                removeHighlights();
            };
        }, [suggestions, userId]);

        // Some aesthetics: remove basic borders, add subtle shadows, great typography
        return (
            <div
                ref={editorContainerRef}
                className="flex-1 flex flex-col h-full bg-background relative selection:bg-primary/20"
            >
                <div className="absolute top-4 right-6 text-xs text-muted-foreground z-10 flex items-center gap-2">
                    {isSaving && (
                        <span className="flex items-center gap-1.5 animate-pulse text-muted-foreground mr-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            Saving
                        </span>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-12 custom-scrollbar">
                    {/* We wrap the editor in prose for excellent typography */}
                    <div className="prose prose-neutral dark:prose-invert max-w-3xl mx-auto
            prose-headings:font-semibold prose-headings:tracking-tight 
            prose-h1:text-4xl prose-h1:mb-8 prose-h1:text-foreground
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:text-foreground/90 
            prose-h3:text-xl prose-h3:text-foreground/80
            prose-p:leading-relaxed prose-p:text-foreground/80
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-foreground/70
            focus-within:prose-a:outline-none">

                        <MDXEditor
                            className="mdxeditor-root"
                            ref={editorRef}
                            markdown={initialMarkdown}
                            onChange={onChange}
                            contentEditableClassName="outline-none min-h-[60vh] pb-32"
                            plugins={[
                                headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
                                listsPlugin(),
                                quotePlugin(),
                                thematicBreakPlugin(),
                                linkPlugin(),
                                linkDialogPlugin(),
                                markdownShortcutPlugin(),
                                toolbarPlugin({
                                    toolbarContents: () => (
                                        <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 rounded-full border border-border/50 sticky top-0 z-20 backdrop-blur-md mb-8 px-4 h-11 pointer-events-auto
                                            [&_button]:text-white [&_button:hover]:bg-primary [&_button:hover]:text-primary-foreground [&_button]:transition-colors [&_button]:rounded-md
                                            [&_[role=combobox]]:bg-white/10 [&_[role=combobox]]:border-none [&_[role=combobox]]:text-white [&_[role=combobox]:hover]:bg-primary [&_[role=combobox]:hover]:text-primary-foreground [&_[role=combobox]]:transition-colors
                                            [&_svg]:fill-current
                                        ">
                                            <UndoRedo />
                                            <div className="w-px h-4 bg-border mx-1" />
                                            <BoldItalicUnderlineToggles />
                                            <div className="w-px h-4 bg-border mx-1" />
                                            <BlockTypeSelect />
                                            <div className="w-px h-4 bg-border mx-1" />
                                            <ListsToggle />
                                            <div className="w-px h-4 bg-border mx-1" />
                                            <CreateLink />
                                        </div>
                                    )
                                })
                            ]}
                        />
                    </div>
                </div>
            </div>
        );
    }
);
MdxScriptEditor.displayName = "MdxScriptEditor";
