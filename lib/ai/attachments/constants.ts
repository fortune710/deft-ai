export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_ATTACHMENT_MAX_FILES = 10;
export const CHAT_ATTACHMENT_CHUNK_SIZE = 1_500;
export const CHAT_ATTACHMENT_CHUNK_OVERLAP = 200;
export const CHAT_ATTACHMENT_EMBEDDING_DIMENSIONS = 1_536;
export const CHAT_ATTACHMENT_RETRIEVAL_LIMIT = 8;

export const CHAT_ATTACHMENT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export const CHAT_ATTACHMENT_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
] as const;
