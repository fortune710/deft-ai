import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AIFeedback, ContentAnalytics, FeedbackGenerationResult, VideoMetrics, ContentType } from '@/types/content-analytics';
import { extractHookTranscript } from '@/lib/services/transcription';
import { generateWithModel } from './models';
import { AI_MODELS } from '@/types/ai-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

function extractVideoCTA(transcript: string, segments?: any[]): string {
  if (segments && segments.length > 0) {
    // Get last 10-20 seconds of transcript
    const totalDuration = segments[segments.length - 1]?.end_time || 0;
    const ctaStartTime = Math.max(0, totalDuration - 20);
    const ctaSegments = segments.filter(seg => seg.start_time >= ctaStartTime);
    return ctaSegments.map(seg => seg.text).join(' ').trim();
  }
  
  // Fallback: extract last 50 words or last paragraph
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    const lastFewSentences = sentences.slice(-2).join('. ').trim();
    return lastFewSentences.substring(0, 200);
  }
  
  const words = transcript.split(' ');
  return words.slice(-50).join(' ').trim();
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

function buildVideoFeedbackPrompt(
  currentContent: ContentAnalytics,
  historicalContent: HistoricalContent[]
): string {
  const hookTranscript = extractHookTranscript(currentContent.transcript || '');
  const ctaTranscript = extractVideoCTA(currentContent.transcript || '');

  let prompt = `You are an expert video content analyst specializing in ${currentContent.platform} content. Analyze this video and provide detailed, actionable feedback.

**Current Video Analysis:**

**Platform:** ${currentContent.platform}
**Title:** ${currentContent.title}
**Metrics:**
- Views: ${currentContent.metrics?.views || 0}
- Likes: ${currentContent.metrics?.likes || 0}
- Comments: ${currentContent.metrics?.comments || 0}
- Shares: ${currentContent.metrics?.shares || 0}
- Engagement Rate: ${currentContent.metrics?.engagement_rate?.toFixed(2) || '0.00'}%

**Hook (First 3-5 seconds):**
"${hookTranscript}"

**CTA (Last 10-20 seconds):**
"${ctaTranscript}"

**Full Transcript:**
${currentContent.transcript || ''}

`;

  if (historicalContent.length > 0) {
    prompt += `\n**User's Previous Content for Context:**\n\n`;

    historicalContent.forEach((content, index) => {
      prompt += `Content ${index + 1}: "${content.title}" (${content.platform}, ${content.content_type})
- Views: ${content.metrics?.views || 'N/A'}
- Engagement Rate: ${content.metrics?.engagement_rate?.toFixed(2) || 'N/A'}%
- Overall Score: ${content.analysis_results?.overall_score || 'N/A'}/10\n\n`;
    });

    const videosWithMetrics = historicalContent.filter(c => c.metrics);
    if (videosWithMetrics.length > 0) {
      const avgEngagement = videosWithMetrics.reduce((sum, c) => sum + (c.metrics?.engagement_rate || 0), 0) / videosWithMetrics.length;
      const bestContent = videosWithMetrics.reduce((best, c) =>
        (c.metrics?.engagement_rate || 0) > ((best?.metrics?.engagement_rate || 0)) ? c : best
      );

      prompt += `\n**Historical Performance:**
- Average Engagement Rate: ${avgEngagement.toFixed(2)}%
- Best Performing Content: "${bestContent.title}" (${bestContent.metrics?.engagement_rate?.toFixed(2)}% engagement)\n\n`;
    }
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
    "transcript_excerpt": "${hookTranscript}"
  },
  "cta_analysis": {
    "score": <number 1-10>,
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"],
    "cta_text": "${ctaTranscript}",
    "effectiveness_notes": "<detailed analysis of CTA effectiveness, clarity, and actionability>"
  },
  "content_quality": {
    "score": <number 1-10>,
    "highlights": ["<highlight 1>", "<highlight 2>"],
    "issues": ["<issue 1>", "<issue 2>"],
    "pacing_notes": "<detailed pacing analysis>"
  },
  "retention_tips": {
    "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"],
    "critical_moments": ["<moment 1>", "<moment 2>"],
    "drop_off_predictions": ["<prediction 1>", "<prediction 2>"]
  },`;

  if (historicalContent.length > 0) {
    prompt += `
  "comparison_insights": {
    "vs_user_average": {
      "views_diff_percentage": <number>,
      "engagement_diff_percentage": <number>,
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
2. Hook Analysis: Evaluate the first 3-5 seconds - does it grab attention? Is there a clear value proposition?
3. CTA Analysis: Evaluate the call-to-action in the last 10-20 seconds - is it clear, compelling, and actionable? Does it align with the content goal? Is it specific enough to drive action?
4. Content Quality: Assess structure, pacing, clarity, entertainment value, and educational content
5. Retention Tips: Identify where viewers might drop off and provide specific fixes
6. Platform-Specific: Consider ${currentContent.platform} best practices and algorithm preferences
7. Comparison: ${historicalContent.length > 0 ? 'Compare with user\'s previous content and identify patterns' : 'Provide general benchmarks'}
8. Actionable: Every suggestion must be specific and implementable

Respond ONLY with the JSON object, no additional text.`;

  return prompt;
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

function parseAIResponse(response: string): AIFeedback {
  try {
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;
    console.log('jsonString', jsonString);

    const parsed = JSON.parse(jsonString);
    return {
      ...parsed,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error parsing AI response:', err);
    throw new Error('Failed to parse AI feedback response');
  }
}

export async function analyzeTextContent(contentText: string, platform: string): Promise<AIFeedback> {
  const prompt = buildTextFeedbackPrompt(
    {
      content_text: contentText,
      platform: platform as any,
    } as ContentAnalytics,
    []
  );

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

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
      if (!content.transcript || content.transcript.trim().length === 0) {
        return { success: false, error: 'Video transcript is required for feedback generation' };
      }
      prompt = buildVideoFeedbackPrompt(content, historicalContent);
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
