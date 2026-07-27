'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
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
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { suggestedEditPlugin } from './suggested-edit-plugin';
import { EditProposal } from '@/types/script-chat';
import { logger } from '@/lib/logger';
import { createSuggestionMarkup } from '@/lib/script-editing/proposals';

const log = logger.child({ module: 'MdxScriptEditor' });

export interface MdxScriptEditorRef {
    setMarkdown: (markdown: string) => void;
    getMarkdown: () => string;
    applyProposals: (
        proposals: EditProposal[],
        messageId: string,
    ) => { appliedIndices: number[]; markdown: string };
}

interface MdxScriptEditorProps {
    initialMarkdown: string;
    onChange?: (markdown: string) => void;
    isSaving?: boolean;
    userId: string;
}

export const MdxScriptEditor = forwardRef<MdxScriptEditorRef, MdxScriptEditorProps>(
    ({ initialMarkdown, onChange, isSaving, userId }, ref) => {
        const editorRef = useRef<MDXEditorMethods>(null);

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
            applyProposals: (proposals: EditProposal[], messageId: string) => {
                let markdown = editorRef.current?.getMarkdown() || '';
                const appliedIndices: number[] = [];
                for (const [proposalIndex, proposal] of proposals.entries()) {
                    if ((proposal.status ?? 'pending') !== 'pending') {
                        log.debug('Skipped a resolved proposal while restoring editor highlights', {
                            userId,
                            action: 'highlight_script_edit_proposal',
                            messageId,
                            proposalIndex,
                            status: proposal.status,
                        });
                        continue;
                    }
                    if (
                        !proposal.before.trim() ||
                        !markdown.includes(proposal.before)
                    ) {
                        log.warn('Could not highlight a proposal outside the current editor text', {
                            userId,
                            action: 'highlight_script_edit_proposal',
                            messageId,
                            proposalIndex,
                            section: proposal.section,
                            sourceLength: proposal.before.length,
                        });
                        continue;
                    }
                    const markup = createSuggestionMarkup(
                        proposal,
                        { messageId, proposalIndex },
                        userId,
                    );
                    markdown = markdown.replace(proposal.before, markup);
                    appliedIndices.push(proposalIndex);
                }
                if (appliedIndices.length) {
                    editorRef.current?.setMarkdown(markdown);
                }
                log.info('Highlighted exact edit proposal ranges in the script editor', {
                    userId,
                    action: 'highlight_script_edit_proposals',
                    messageId,
                    proposalCount: proposals.length,
                    highlightedProposalCount: appliedIndices.length,
                    highlightedProposalIndices: appliedIndices,
                });
                return { appliedIndices, markdown };
            },
        }));

        // Some aesthetics: remove basic borders, add subtle shadows, great typography
        return (
            <div className="flex-1 flex flex-col h-full bg-background relative selection:bg-primary/20">
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
                                suggestedEditPlugin(),
                                toolbarPlugin({
                                    toolbarContents: () => (
                                        <div className="flex flex-wrap items-center gap-1 p-1 bg-muted/30 rounded-full border border-border/50 sticky top-0 z-20 backdrop-blur-md mb-8 px-4 h-11 pointer-events-auto
                                            [&_button]:text-white [&_button:hover]:bg-white [&_button:hover]:text-black [&_button]:transition-colors [&_button]:rounded-md
                                            [&_[role=combobox]]:bg-white/10 [&_[role=combobox]]:border-none [&_[role=combobox]]:text-white [&_[role=combobox]:hover]:bg-white [&_[role=combobox]:hover]:text-black [&_[role=combobox]]:transition-colors
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
MdxScriptEditor.displayName = 'MdxScriptEditor';
