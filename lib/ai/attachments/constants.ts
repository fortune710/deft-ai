export const CHAT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;
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
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'video/quicktime',
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
  '.mp3',
  '.wav',
  '.m4a',
  '.mp4',
  '.webm',
  '.mov',
] as const;
