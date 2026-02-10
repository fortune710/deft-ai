import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIFeedback, ContentAnalytics, FeedbackGenerationResult, VideoMetrics, ContentType } from '@/types/content-analytics';
import { generateWithModel } from './models';
import { AI_MODELS } from '@/types/ai-models';
import { generateVideoFeedback } from './video-feedback-generator';
import { parseAIResponse } from './feedback-response-parser';

interface HistoricalContent {
  id: string;
  title: string;
  platform: string;
  content_type: ContentType;
  metrics: VideoMetrics | null;
  analysis_results: AIFeedback | null;
}

export async function fetchUserContentHistory(supabase: SupabaseClient, userId: string, limit: number = 5): Promise<HistoricalContent[]> {
  try {
    const { data, error } = await supabase
      .from('content_analytics')
      .select('id, title, platform, content_type, metrics, analysis_results')
      .eq('user_id', userId)
      .eq('processing_status', 'completed')
      .not('analysis_results', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching content history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in fetchUserContentHistory:', err);
    return [];
  }
}

function extractTextHook(text: string): string {
  // Extract first paragraph or first 200 characters
  const firstParagraph = text.split('\n\n')[0] || text.split('\n')[0] || text;
  return firstParagraph.substring(0, 200).trim();
}

function extractTextCTA(text: string): string {
  // Extract last paragraph or last 200 characters
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  if (paragraphs.length > 0) {
    const lastParagraph = paragraphs[paragraphs.length - 1];
    return lastParagraph.substring(Math.max(0, lastParagraph.length - 200)).trim();
  }
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const lastFewSentences = sentences.slice(-2).join('. ').trim();
    return lastFewSentences.substring(0, 200);
  }
  
  return text.substring(Math.max(0, text.length - 200)).trim();
}

function buildTextFeedbackPrompt(
  currentContent: ContentAnalytics,
  historicalContent: HistoricalContent[]
): string {
  const textHook = extractTextHook(currentContent.content_text || '');
  const textCTA = extractTextCTA(currentContent.content_text || '');

  let prompt = `You are an expert social media content analyst specializing in ${currentContent.platform} content. Analyze this text post and provide detailed, actionable feedback.

**Current Post Analysis:**

**Platform:** ${currentContent.platform}
**Title:** ${currentContent.title}
**Content Type:** Text Post

**Hook (Opening Lines):**
"${textHook}"

**CTA (Closing Lines):**
"${textCTA}"

**Full Content:**
${currentContent.content_text || ''}

`;

  if (historicalContent.length > 0) {
    prompt += `\n**User's Previous Content for Context:**\n\n`;

    historicalContent.forEach((content, index) => {
      prompt += `Content ${index + 1}: "${content.title}" (${content.platform}, ${content.content_type})
- Overall Score: ${content.analysis_results?.overall_score || 'N/A'}/10\n\n`;
    });
  }

  prompt += `
**Please provide a comprehensive analysis in the following JSON format:**

\`\`\`json
{
  "overall_score": <number 1-10>,
  "hook_analysis": {
    "score": <number 1-10>,
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"],
    "text_excerpt": "${textHook}"
  },
  "cta_analysis": {
    "score": <number 1-10>,
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"],
    "cta_text": "${textCTA}",
    "effectiveness_notes": "<detailed analysis of CTA effectiveness, clarity, and actionability>"
  },
  "content_quality": {
    "score": <number 1-10>,
    "highlights": ["<highlight 1>", "<highlight 2>"],
    "issues": ["<issue 1>", "<issue 2>"],
    "structure_notes": "<detailed structure and flow analysis>"
  },
  "retention_tips": {
    "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
  },`;

  if (historicalContent.length > 0) {
    prompt += `
  "comparison_insights": {
    "vs_user_average": {
      "views_diff_percentage": 0,
      "engagement_diff_percentage": 0,
      "performance_trend": "<better|average|worse>"
    },
    "best_performing_comparison": {
      "video_id": "${historicalContent[0].id}",
      "title": "${historicalContent[0].title}",
      "what_worked": ["<insight 1>", "<insight 2>"]
    }
  },`;
  }

  prompt += `
  "next_video_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}
\`\`\`

**Analysis Guidelines:**
1. Overall Score (Content Rating): Rate the overall content quality from 1-10, considering all aspects including hook, CTA, content quality, and engagement potential
2. Hook Analysis: Evaluate the opening lines - does it grab attention? Is there a clear value proposition or hook?
3. CTA Analysis: Evaluate the call-to-action in the closing lines - is it clear, compelling, and actionable? Does it align with the content goal? Is it specific enough to drive engagement (likes, comments, shares, follows)?
4. Content Quality: Assess structure, flow, clarity, engagement value, and overall message effectiveness
5. Platform-Specific: Consider ${currentContent.platform} best practices:
   ${currentContent.platform === 'twitter' ? '- Character limit optimization\n   - Thread structure (if applicable)\n   - Hashtag usage\n   - Engagement patterns' : ''}
   ${currentContent.platform === 'linkedin' ? '- Professional tone\n   - Value-driven content\n   - Engagement hooks\n   - Call-to-action clarity' : ''}
6. Structure: Evaluate paragraph breaks, readability, and flow
7. Comparison: ${historicalContent.length > 0 ? 'Compare with user\'s previous content and identify patterns' : 'Provide general benchmarks'}
8. Actionable: Every suggestion must be specific and implementable

Respond ONLY with the JSON object, no additional text.`;

  return prompt;
}

export async function analyzeTextContent(contentText: string, platform: string): Promise<AIFeedback> {
  const prompt = buildTextFeedbackPrompt(
    {
      content_text: contentText,
      platform: platform as any,
    } as ContentAnalytics,
    []
  );

  const response = await generateWithModel(
    AI_MODELS.GOOGLE_FLASH,
    prompt,
    'You are an expert content strategist. Respond ONLY with the JSON object, no additional text.'
  );
  const text = response.content;

  return parseAIResponse(text);
}

export async function generateContentFeedback(
  supabase: SupabaseClient,
  analyticsId: string,
  userId: string,
  options: { persist?: boolean } = {}
): Promise<FeedbackGenerationResult> {
  try {
    const { data: content, error: contentError } = await supabase
      .from('content_analytics')
      .select('*')
      .eq('id', analyticsId)
      .maybeSingle();

    if (contentError || !content) {
      return { success: false, error: 'Content not found' };
    }

    const historicalContent = await fetchUserContentHistory(supabase, userId);

    let prompt: string;
    if (content.content_type === 'text') {
      if (!content.content_text || content.content_text.trim().length === 0) {
        return { success: false, error: 'Content text is required for feedback generation' };
      }
      prompt = buildTextFeedbackPrompt(content, historicalContent);
    } else {
      const videoResult = await generateVideoFeedback(
        supabase,
        content,
        historicalContent,
        AI_MODELS.GOOGLE_FLASH
      );

      if (!videoResult.success || !videoResult.feedback) {
        return { success: false, error: videoResult.error || 'Video analysis failed' };
      }

      const { error: updateError } = await supabase
        .from('content_analytics')
        .update({
          analysis_results: videoResult.feedback,
          model_file_reference: videoResult.modelFileReference,
        })
        .eq('id', analyticsId);

      if (updateError) {
        return { success: false, error: `Failed to save feedback: ${updateError.message}` };
      }

      return { success: true, feedback: videoResult.feedback };
    }

    const response = await generateWithModel(
      AI_MODELS.GROK_REASONING,
      prompt,
      'You are an expert content strategist. Respond ONLY with the JSON object, no additional text.'
    );
    const text = response.content;

    const feedback = parseAIResponse(text);

    const { persist = true } = options;
    if (persist) {
      const { error: updateError } = await supabase
        .from('content_analytics')
        .update({ analysis_results: feedback })
        .eq('id', analyticsId);

      if (updateError) {
        return { success: false, error: `Failed to save feedback: ${updateError.message}` };
      }
    }

    return { success: true, feedback };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during feedback generation',
    };
  }
}
