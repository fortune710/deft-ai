import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIFeedback, ContentAnalytics } from '@/types/content-analytics';
import type { AIModelConfig } from '@/types/ai-models';
import { parseAIResponse } from './feedback-response-parser';

interface HistoricalContentSummary {
  id: string;
  title: string;
  platform: string;
  content_type: string;
  metrics: ContentAnalytics['metrics'];
  analysis_results: ContentAnalytics['analysis_results'];
}

interface VideoFeedbackResult {
  success: boolean;
  feedback?: AIFeedback;
  error?: string;
  modelFileReference?: string | null;
}

function buildVideoFeedbackPrompt(
  currentContent: ContentAnalytics,
  historicalContent: HistoricalContentSummary[]
): string {
  let prompt = `You are an expert video content analyst specializing in ${currentContent.platform} content. Analyze the provided video and provide detailed, actionable feedback based on what you see and hear.

**Current Video Context:**

**Platform:** ${currentContent.platform}
**Title:** ${currentContent.title}
**Description:** ${currentContent.description}
**Metrics:**
- Views: ${currentContent.metrics?.views || 0}
- Likes: ${currentContent.metrics?.likes || 0}
- Comments: ${currentContent.metrics?.comments || 0}
- Shares: ${currentContent.metrics?.shares || 0}
- Engagement Rate: ${currentContent.metrics?.engagement_rate?.toFixed(2) || '0.00'}%

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
      const avgEngagement =
        videosWithMetrics.reduce((sum, c) => sum + (c.metrics?.engagement_rate || 0), 0) /
        videosWithMetrics.length;
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
    "transcript_excerpt": "<short excerpt or description of the opening hook from the video>"
  },
  "cta_analysis": {
    "score": <number 1-10>,
    "strengths": ["<strength 1>", "<strength 2>"],
    "improvements": ["<improvement 1>", "<improvement 2>"],
    "cta_text": "<call-to-action observed in the video>",
    "effectiveness_notes": "<detailed analysis of CTA effectiveness, clarity, and actionability>"
  },
  "content_quality": {
    "score": <number 1-10>,
    "highlights": ["<highlight 1>", "<highlight 2>"],
    "issues": ["<issue 1>", "<issue 2>"],
    "pacing_notes": "<detailed pacing analysis based on the video>"
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
2. Hook Analysis: Evaluate the first 3-5 seconds of the video - does it grab attention? Is there a clear value proposition?
3. CTA Analysis: Evaluate the call-to-action in the last 10-20 seconds - is it clear, compelling, and actionable? Does it align with the content goal? Is it specific enough to drive action?
4. Content Quality: Assess structure, pacing, clarity, entertainment value, and educational content using the actual video
5. Retention Tips: Identify where viewers might drop off and provide specific fixes
6. Platform-Specific: Consider ${currentContent.platform} best practices and algorithm preferences
7. Comparison: ${historicalContent.length > 0 ? 'Compare with user\'s previous content and identify patterns' : 'Provide general benchmarks'}
8. Actionable: Every suggestion must be specific and implementable

Respond ONLY with the JSON object, no additional text.`;

  return prompt;
}

export async function generateVideoFeedback(
  videoUrl: string,
  content: ContentAnalytics,
  historicalContent: HistoricalContentSummary[],
  modelConfig: AIModelConfig
): Promise<VideoFeedbackResult> {
  try {
    if (modelConfig.provider !== 'google') {
      return {
        success: false,
        error: `Video analysis requires a Gemini model. Unsupported provider: ${modelConfig.provider}`,
      };
    }

    if (!content.video_file_path) {
      return { success: false, error: 'Video file path is required for video feedback generation' };
    }

    const prompt = buildVideoFeedbackPrompt(content, historicalContent);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: modelConfig.model,
      systemInstruction: 'You are an expert content strategist. Respond ONLY with the JSON object, no additional text.',
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        topK: modelConfig.topK,
      },
    });

    const result = await model.generateContent([
      { text: prompt },
      { fileData: { fileUri: videoUrl, mimeType: 'video/mp4' } },
    ]);
    const responseText = result.response.text();
    const feedback = parseAIResponse(responseText);

    return {
      success: true,
      feedback,
      modelFileReference: videoUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during video feedback generation',
    };
  }
}
