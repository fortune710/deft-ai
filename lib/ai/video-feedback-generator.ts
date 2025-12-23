import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import type { AIFeedback, VideoAnalytics, FeedbackGenerationResult, VideoMetrics } from '@/types/video-analytics';
import { extractHookTranscript } from '@/lib/services/google-speech';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface HistoricalVideo {
  id: string;
  title: string;
  platform: string;
  metrics: VideoMetrics;
  ai_feedback: AIFeedback | null;
}

export async function fetchUserVideoHistory(userId: string, limit: number = 5): Promise<HistoricalVideo[]> {
  try {
    const { data, error } = await supabase
      .from('video_analytics')
      .select('id, title, platform, metrics, ai_feedback')
      .eq('user_id', userId)
      .eq('processing_status', 'completed')
      .not('ai_feedback', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching video history:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in fetchUserVideoHistory:', err);
    return [];
  }
}

function buildFeedbackPrompt(
  currentVideo: VideoAnalytics,
  historicalVideos: HistoricalVideo[]
): string {
  const hookTranscript = extractHookTranscript(currentVideo.transcript);

  let prompt = `You are an expert video content analyst specializing in ${currentVideo.platform} content. Analyze this video and provide detailed, actionable feedback.

**Current Video Analysis:**

**Platform:** ${currentVideo.platform}
**Title:** ${currentVideo.title}
**Metrics:**
- Views: ${currentVideo.metrics.views}
- Likes: ${currentVideo.metrics.likes}
- Comments: ${currentVideo.metrics.comments}
- Shares: ${currentVideo.metrics.shares}
- Engagement Rate: ${currentVideo.metrics.engagement_rate.toFixed(2)}%

**Hook (First 3-5 seconds):**
"${hookTranscript}"

**Full Transcript:**
${currentVideo.transcript}

`;

  if (historicalVideos.length > 0) {
    prompt += `\n**User's Previous Videos for Context:**\n\n`;

    historicalVideos.forEach((video, index) => {
      prompt += `Video ${index + 1}: "${video.title}" (${video.platform})
- Views: ${video.metrics.views}
- Engagement Rate: ${video.metrics.engagement_rate.toFixed(2)}%
- Overall Score: ${video.ai_feedback?.overall_score || 'N/A'}/10\n\n`;
    });

    const avgEngagement = historicalVideos.reduce((sum, v) => sum + v.metrics.engagement_rate, 0) / historicalVideos.length;
    const bestVideo = historicalVideos.reduce((best, v) =>
      v.metrics.engagement_rate > (best?.metrics.engagement_rate || 0) ? v : best
    );

    prompt += `\n**Historical Performance:**
- Average Engagement Rate: ${avgEngagement.toFixed(2)}%
- Best Performing Video: "${bestVideo.title}" (${bestVideo.metrics.engagement_rate.toFixed(2)}% engagement)\n\n`;
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

  if (historicalVideos.length > 0) {
    prompt += `
  "comparison_insights": {
    "vs_user_average": {
      "views_diff_percentage": <number>,
      "engagement_diff_percentage": <number>,
      "performance_trend": "<better|average|worse>"
    },
    "best_performing_comparison": {
      "video_id": "${historicalVideos[0].id}",
      "title": "${historicalVideos[0].title}",
      "what_worked": ["<insight 1>", "<insight 2>"]
    }
  },`;
  }

  prompt += `
  "next_video_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}
\`\`\`

**Analysis Guidelines:**
1. Hook Analysis: Evaluate the first 3-5 seconds - does it grab attention? Is there a clear value proposition?
2. Content Quality: Assess structure, pacing, clarity, entertainment value, and educational content
3. Retention Tips: Identify where viewers might drop off and provide specific fixes
4. Platform-Specific: Consider ${currentVideo.platform} best practices and algorithm preferences
5. Comparison: ${historicalVideos.length > 0 ? 'Compare with user\'s previous videos and identify patterns' : 'Provide general benchmarks'}
6. Actionable: Every suggestion must be specific and implementable

Respond ONLY with the JSON object, no additional text.`;

  return prompt;
}

function parseAIResponse(response: string): AIFeedback {
  try {
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;

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

export async function generateVideoFeedback(videoId: string, userId: string): Promise<FeedbackGenerationResult> {
  try {
    const { data: video, error: videoError } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('id', videoId)
      .maybeSingle();

    if (videoError || !video) {
      return { success: false, error: 'Video not found' };
    }

    if (!video.transcript || video.transcript.trim().length === 0) {
      return { success: false, error: 'Video transcript is required for feedback generation' };
    }

    const historicalVideos = await fetchUserVideoHistory(userId);

    const prompt = buildFeedbackPrompt(video as VideoAnalytics, historicalVideos);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const feedback = parseAIResponse(text);

    const { error: updateError } = await supabase
      .from('video_analytics')
      .update({ ai_feedback: feedback })
      .eq('id', videoId);

    if (updateError) {
      return { success: false, error: `Failed to save feedback: ${updateError.message}` };
    }

    const { error: historyError } = await supabase
      .from('video_feedback_history')
      .insert({
        user_id: userId,
        video_id: videoId,
        overall_score: feedback.overall_score,
        hook_score: feedback.hook_analysis.score,
        content_score: feedback.content_quality.score,
        engagement_rate: video.metrics.engagement_rate,
      });

    if (historyError) {
      console.error('Failed to save feedback history:', historyError);
    }

    return { success: true, feedback };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during feedback generation',
    };
  }
}
