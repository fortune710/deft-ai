'use server';

import { revalidatePath } from 'next/cache';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { ConvexServerAuthError, getAuthenticatedConvexClient } from '@/lib/convex/server';
import { logger } from '@/lib/logger.server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const log = logger.child({ module: 'customize' });

export type CustomObjectType = 'brand guide' | 'social link' | 'others';

export interface CustomObject {
  id: string;
  user_id: string;
  name: string;
  type: CustomObjectType;
  content: string | null;
  created_at: string;
}

/**
 * Fetch all custom objects for the current authenticated user.
 */
export async function getCustomObjects() {
  let userId = 'unknown';
  try {
    const authenticated = await getAuthenticatedConvexClient('get_custom_objects');
    userId = authenticated.userId;
    const documents = await authenticated.convex.query(api.customObjects.listCurrent, {});
    const data = documents.map((document) => ({
      id: document._id,
      user_id: document.user_id,
      name: document.name,
      type: document.type,
      content: document.content ?? null,
      created_at: document.created_at ?? new Date(document._creationTime).toISOString(),
    }));
    log.info('Fetched custom objects from Convex', {
      userId,
      action: 'get_custom_objects',
      statusCode: 200,
      objectCount: data.length,
    });
    return { success: true, data };
  } catch (error) {
    const statusCode = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to fetch custom objects from Convex', {
      userId,
      action: 'get_custom_objects',
      statusCode,
      error,
    });
    return { success: false, error: error instanceof Error ? error.message : 'Internal server error', data: [] };
  }
}

/**
 * Handle creation of a custom object via FormData, including server-side file extraction.
 */
export async function handleCreateCustomObject(formData: FormData) {
  let userId = 'unknown';
  try {
    const authenticated = await getAuthenticatedConvexClient('create_custom_object');
    userId = authenticated.userId;

    const name = formData.get('name') as string;
    const type = formData.get('type') as CustomObjectType;
    const rawContent = formData.get('content') as string;
    const file = formData.get('file') as File | null;

    if (!name || !type) {
      log.warn('Custom object name or type is missing', {
        userId,
        action: 'create_custom_object',
        statusCode: 400,
      });
      return { success: false, error: 'Name and type are required' };
    }

    let extractedContent: string | null = rawContent || null;

    if (file && file.size > 0) {
      log.info('Processing file upload for custom object', { 
        userId,
        fileName: file.name, 
        fileType: file.type,
        action: 'file_extraction_start'
      });

      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const pdfData = await parser.getText();
        extractedContent = pdfData.text;
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
      ) {
        const result = await mammoth.extractRawText({ buffer });
        extractedContent = result.value;
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        extractedContent = buffer.toString('utf-8');
      } else {
        log.warn('Unsupported file type for extraction', { 
          userId,
          fileType: file.type,
          fileName: file.name
        });
      }
    }

    log.info('Creating custom object', { 
      userId,
      name, 
      type, 
      hasContent: !!extractedContent,
      action: 'create_custom_object' 
    });

    const document = await authenticated.convex.mutation(api.customObjects.createCurrent, {
      name,
      type,
      content: extractedContent,
    });
    const newObject = document ? {
      id: document._id,
      user_id: document.user_id,
      name: document.name,
      type: document.type,
      content: document.content ?? null,
      created_at: document.created_at ?? new Date(document._creationTime).toISOString(),
    } : null;

    revalidatePath('/customize');
    log.info('Created custom object in Convex', {
      userId,
      action: 'create_custom_object',
      statusCode: 200,
      objectId: document?._id,
    });
    return { success: true, data: newObject };
  } catch (error) {
    const statusCode = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Unexpected error in handleCreateCustomObject', { 
      userId,
      action: 'create_custom_object',
      statusCode,
      error,
    });
    return { success: false, error: error instanceof Error ? error.message : 'Failed to process and create object' };
  }
}

/**
 * Delete a custom object by ID.
 */
export async function deleteCustomObject(id: string) {
  let userId = 'unknown';
  try {
    const authenticated = await getAuthenticatedConvexClient('delete_custom_object');
    userId = authenticated.userId;
    log.info('Deleting custom object from Convex', {
      userId,
      objectId: id,
      action: 'delete_custom_object',
    });
    await authenticated.convex.mutation(api.customObjects.removeCurrent, {
      objectId: id as Id<'custom_objects'>,
    });

    revalidatePath('/customize');
    log.info('Deleted custom object from Convex', {
      userId,
      objectId: id,
      action: 'delete_custom_object',
      statusCode: 200,
    });
    return { success: true };
  } catch (error) {
    const statusCode = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to delete custom object from Convex', {
      userId,
      objectId: id,
      action: 'delete_custom_object',
      statusCode,
      error,
    });
    return { success: false, error: error instanceof Error ? error.message : 'Internal server error' };
  }
}
