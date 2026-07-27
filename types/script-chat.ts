import type { AttachmentReference } from "./chat-attachments";
import type { Platform } from "./content-engine";

export type MessageRole = "user" | "assistant";
export type MessageType = "ask" | "edit";
export type ChangeStatus = "pending" | "accepted" | "rejected";
export type ScriptDuration = "really_short" | "medium" | "long";

export interface HookOption {
  id: string;
  text: string;
  psychologyType: string;
}

export interface VisualScene {
  timeRange: string;
  contentDescription: string;
  bRollSuggestions: string[];
  onScreenText: string[];
  transitionNotes?: string;
}

export interface ThumbnailStrategy {
  imagePrompt: string;
  overlayTextOptions: string[];
}

export interface PlatformMetadata {
  captions?: string;
  hashtags?: string[];
  platformSpecificNotes?: string;
}

export interface EditorContent {
  contentItemId?: string;
  hookOptions: HookOption[];
  selectedHookId: string | null;
  fullScript: string;
  visualDirection: VisualScene[];
  platformMetadata: PlatformMetadata;
  thumbnailStrategy: ThumbnailStrategy;
  goalAlignedCTA: string;
  estimatedDuration: string;
  platform?: string;
  platforms?: Platform[];
  durationPreset?: ScriptDuration;
}

export interface InstantExecutionOutput {
  hookOptions: HookOption[];
  selectedHook: string;
  fullScript: string;
  visualDirection: VisualScene[];
  platformMetadata: PlatformMetadata;
  thumbnailStrategy: ThumbnailStrategy;
  goalAlignedCTA: string;
  estimatedDuration: string;
}

export interface EditProposal {
  section: string;
  before: string;
  after: string;
  description: string;
  status?: ChangeStatus;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: MessageRole;
  message_type: MessageType;
  content: string;
  proposed_changes?: EditProposal[];
  change_status?: ChangeStatus;
  created_at: string;
  attachment_refs: AttachmentReference[];
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  editor_content: EditorContent;
  created_at: string;
  updated_at: string;
}

export interface CreateSessionInput {
  initialPrompt: string;
  platform?: string;
}

export interface CreateMessageInput {
  session_id: string;
  message_type: MessageType;
  content: string;
}

export interface AcceptChangesInput {
  message_id: string;
  session_id: string;
  proposed_changes: EditProposal[];
}
