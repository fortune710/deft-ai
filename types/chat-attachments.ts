export type ChatParentId = string;

export type AttachmentProcessingStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'quarantined';

export type AttachmentSecurityStatus = 'pending' | 'passed' | 'blocked';

export interface AttachmentSecurityFinding {
  chunkIndex: number;
  category: string;
  reason: string;
  contentHash: string;
  confidence: number;
}

export interface AttachmentReference {
  attachmentId: string;
  fileName: string;
}

export interface ChatAttachment {
  id: string;
  parentId: ChatParentId;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isSelected: boolean;
  processingStatus: AttachmentProcessingStatus;
  securityStatus: AttachmentSecurityStatus;
  securityFindings: AttachmentSecurityFinding[];
  processingError?: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}
