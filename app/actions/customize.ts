'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/constants';
import { logger } from '@/lib/logger';
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
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      log.error('Error getting user for getCustomObjects', { error: userError?.message });
      return { success: false, error: 'Unauthorized', data: [] };
    }

    log.info('Fetching custom objects', { userId: user.id, action: 'get_custom_objects' });
    
    const { data, error } = await supabase
      .from(TABLES.CUSTOM_OBJECTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching custom objects', { 
        userId: user.id, 
        error: error.message,
        action: 'get_custom_objects_error'
      });
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data as CustomObject[] };
  } catch (error: any) {
    log.error('Unexpected error in getCustomObjects', { error: error.message });
    return { success: false, error: 'Internal server error', data: [] };
  }
}

/**
 * Handle creation of a custom object via FormData, including server-side file extraction.
 */
export async function handleCreateCustomObject(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      log.error('Error getting user for handleCreateCustomObject', { error: userError?.message });
      return { success: false, error: 'Unauthorized' };
    }

    const name = formData.get('name') as string;
    const type = formData.get('type') as CustomObjectType;
    const rawContent = formData.get('content') as string;
    const file = formData.get('file') as File | null;

    if (!name || !type) {
      return { success: false, error: 'Name and type are required' };
    }

    let extractedContent: string | null = rawContent || null;

    if (file && file.size > 0) {
      log.info('Processing file upload for custom object', { 
        userId: user.id, 
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
          userId: user.id, 
          fileType: file.type,
          fileName: file.name
        });
      }
    }

    log.info('Creating custom object', { 
      userId: user.id, 
      name, 
      type, 
      hasContent: !!extractedContent,
      action: 'create_custom_object' 
    });

    const { data: newObject, error } = await supabase
      .from(TABLES.CUSTOM_OBJECTS)
      .insert({
        user_id: user.id,
        name,
        type,
        content: extractedContent,
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating custom object', { 
        userId: user.id, 
        error: error.message,
        action: 'create_custom_object_error'
      });
      return { success: false, error: error.message };
    }

    revalidatePath('/customize');
    return { success: true, data: newObject };
  } catch (error: any) {
    log.error('Unexpected error in handleCreateCustomObject', { 
        error: error.message,
        stack: error.stack
    });
    return { success: false, error: 'Failed to process and create object' };
  }
}

/**
 * Delete a custom object by ID.
 */
export async function deleteCustomObject(id: string) {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    log.info('Deleting custom object', { userId: user.id, objectId: id, action: 'delete_custom_object' });

    const { error } = await supabase
      .from(TABLES.CUSTOM_OBJECTS)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      log.error('Error deleting custom object', { 
        userId: user.id, 
        objectId: id, 
        error: error.message,
        action: 'delete_custom_object_error'
      });
      return { success: false, error: error.message };
    }

    revalidatePath('/customize');
    return { success: true };
  } catch (error: any) {
    log.error('Unexpected error in deleteCustomObject', { error: error.message });
    return { success: false, error: 'Internal server error' };
  }
}
