import { DecoratorNode, NodeKey, LexicalNode, SerializedLexicalNode, LexicalEditor, EditorConfig, $createTextNode, $getRoot, $getNodeByKey, TextNode } from 'lexical';
import { realmPlugin, addLexicalNode$, addImportVisitor$, addExportVisitor$ } from '@mdxeditor/editor';
import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'SuggestedEditPlugin' });

export type SerializedSuggestedEditNode = SerializedLexicalNode & {
  before: string;
  after: string;
  id: string;
  messageId?: string;
};

export class SuggestedEditNode extends DecoratorNode<JSX.Element> {
  __before: string;
  __after: string;
  __id: string;
  __messageId: string;

  static getType(): string {
    return 'suggested-edit';
  }

  static clone(node: SuggestedEditNode): SuggestedEditNode {
    return new SuggestedEditNode(node.__before, node.__after, node.__id, node.__messageId, node.__key);
  }

  constructor(before: string, after: string, id: string, messageId: string = '', key?: NodeKey) {
    super(key);
    this.__before = before;
    this.__after = after;
    this.__id = id;
    this.__messageId = messageId;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'block';
    span.style.width = '100%';
    span.className = 'suggested-edit-container';
    return span;
  }

  updateDOM(): boolean {
    return false;
  }

  static importJSON(serializedNode: SerializedSuggestedEditNode): SuggestedEditNode {
    return new SuggestedEditNode(serializedNode.before, serializedNode.after, serializedNode.id, serializedNode.messageId);
  }

  exportJSON(): SerializedSuggestedEditNode {
    return {
      type: 'suggested-edit',
      version: 1,
      before: this.__before,
      after: this.__after,
      id: this.__id,
      messageId: this.__messageId,
    };
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return (
      <div className="my-6 border rounded-xl overflow-hidden bg-background shadow-xl border-primary/30 animate-in fade-in zoom-in-95 duration-300 ring-4 ring-primary/5">
        <div className="bg-primary/5 px-4 py-2 border-b border-primary/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />
                Proposed Edit
            </span>
            <span className="text-[10px] text-muted-foreground opacity-70 italic">AI Suggested</span>
        </div>
        <div className="flex flex-col md:flex-row items-stretch border-b border-border/50">
          <div className="flex-1 p-5 bg-destructive/5 border-b md:border-b-0 md:border-r border-border/50 relative group">
            <div className="absolute top-2 left-3 text-[10px] uppercase tracking-wider font-extrabold text-destructive/40">Remove</div>
            <div className="pt-4 text-sm leading-relaxed whitespace-pre-wrap text-destructive/90 font-medium italic decoration-destructive/30 line-through">
                {this.__before}
            </div>
          </div>
          <div className="flex-1 p-5 bg-green-500/5 relative">
            <div className="absolute top-2 left-3 text-[10px] uppercase tracking-wider font-extrabold text-green-600/40">Apply</div>
            <div className="pt-4 text-sm leading-relaxed whitespace-pre-wrap text-green-700 dark:text-green-400 font-bold bg-green-500/10 rounded px-2 -mx-2">
                {this.__after}
            </div>
          </div>
        </div>
        <div className="bg-muted/10 p-3 flex items-center justify-end gap-3 px-6">
            <span className="text-xs text-muted-foreground mr-auto hidden sm:inline">Would you like to apply this change?</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-full px-4 text-xs font-semibold transition-all group"
              onClick={() => {
                log.info('Rejected proposal', { id: this.__id });
                if (this.__messageId) {
                  window.dispatchEvent(new CustomEvent('proposal-resolved', { 
                    detail: { messageId: this.__messageId, status: 'rejected' } 
                  }));
                }
                editor.update(() => {
                  const textNode = $createTextNode(this.__before);
                  this.replace(textNode);
                });
              }}
            >
              <X className="h-3.5 w-3.5 mr-1 group-hover:rotate-90 transition-transform" />
              Discard
            </Button>
            <Button
              size="sm"
              className="h-8 bg-green-600 hover:bg-green-700 text-white rounded-full px-5 text-xs font-bold shadow-lg shadow-green-600/20 transition-all hover:scale-105 active:scale-95 flex items-center"
              onClick={() => {
                log.info('Accepted proposal', { id: this.__id });
                if (this.__messageId) {
                  window.dispatchEvent(new CustomEvent('proposal-resolved', { 
                    detail: { messageId: this.__messageId, status: 'accepted' } 
                  }));
                }
                editor.update(() => {
                  const textNode = $createTextNode(this.__after);
                  this.replace(textNode);
                });
              }}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Accept Change
            </Button>
        </div>
      </div>
    );
  }
}

export const suggestedEditPlugin = realmPlugin<{}>({
  init(realm) {
    realm.pub(addLexicalNode$, SuggestedEditNode);

    realm.pub(addImportVisitor$, {
      testNode: (node: any) => node.type === 'html' && node.value.startsWith('<suggestion'),
      visitNode: ({ mdastNode, actions }: any) => {
        const value = mdastNode.value as string;
        const before = value.match(/before="([^"]*)"/)?.[1] || '';
        const after = value.match(/after="([^"]*)"/)?.[1] || '';
        const id = value.match(/id="([^"]*)"/)?.[1] || '';
        const messageId = value.match(/messageId="([^"]*)"/)?.[1] || '';
        actions.addAndStepInto(new SuggestedEditNode(before, after, id, messageId));
      }
    });

    realm.pub(addExportVisitor$, {
      testLexicalNode: (lexicalNode: LexicalNode): lexicalNode is SuggestedEditNode => lexicalNode instanceof SuggestedEditNode,
      visitLexicalNode: ({ lexicalNode, actions }: any) => {
        actions.addProperty('type', 'html');
        actions.addProperty('value', `<suggestion before="${lexicalNode.__before}" after="${lexicalNode.__after}" id="${lexicalNode.__id}" messageId="${lexicalNode.__messageId}" />`);
      }
    });
  }
});
