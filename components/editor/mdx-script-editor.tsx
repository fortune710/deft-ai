'use client';

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
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
import { suggestedEditPlugin, SuggestedEditNode } from './suggested-edit-plugin';
import { $getRoot, TextNode } from 'lexical';
import { EditProposal } from '@/types/script-chat';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'MdxScriptEditor' });

export interface MdxScriptEditorRef {
    setMarkdown: (markdown: string) => void;
    getMarkdown: () => string;
    applyProposal: (proposal: EditProposal) => boolean;
}

interface MdxScriptEditorProps {
    initialMarkdown: string;
    onChange?: (markdown: string) => void;
    isSaving?: boolean;
}

export const MdxScriptEditor = forwardRef<MdxScriptEditorRef, MdxScriptEditorProps>(
    ({ initialMarkdown, onChange, isSaving }, ref) => {
        const editorRef = useRef<MDXEditorMethods>(null);

        useImperativeHandle(ref, () => ({
            setMarkdown: (markdown: string) => {
                editorRef.current?.setMarkdown(markdown);
            },
            getMarkdown: () => {
                return editorRef.current?.getMarkdown() || '';
            },
            applyProposal: (proposal: EditProposal, messageId?: string) => {
                log.info('Applying proposal to editor markdown', { proposal, messageId });
                const currentMarkdown = editorRef.current?.getMarkdown() || '';
                
                // Simple case: exact match
                if (proposal.before.trim() !== '' && currentMarkdown.includes(proposal.before)) {
                    const tag = `<suggestion before="${proposal.before.replace(/"/g, '&quot;')}" after="${proposal.after.replace(/"/g, '&quot;')}" id="${Math.random().toString()}" messageId="${messageId || ''}" />`;
                    const nextMarkdown = currentMarkdown.replace(proposal.before, tag);
                    editorRef.current?.setMarkdown(nextMarkdown);
                    return true;
                }
                
                // If it's an addition or we can't find the exact block, we might want to append it?
                // But generally the AI provides a context.
                return false;
            }
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
