import { createGeminiClient } from './gemini-client';
import type { UserContentProfile } from '@/types/niche-mapping';
import type { InstantExecutionOutput, EditProposal } from '@/types/script-chat';

export async function generateInitialScript(
  prompt: string,
  userProfile: UserContentProfile | null,
  platform?: string
): Promise<InstantExecutionOutput> {
  const gemini = createGeminiClient();

  const systemPrompt = buildInstantExecutionPrompt(userProfile, platform);

  const fullPrompt = `${systemPrompt}

User Request: ${prompt}

Generate a complete short-form video script with all required components. Return ONLY a valid JSON object with no additional text or markdown formatting.`;

  const result = await gemini.generateContent(fullPrompt);
  const response = result.response.text();

  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedResponse);
    return parsed as InstantExecutionOutput;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateEditProposal(
  editRequest: string,
  currentContent: any,
  userProfile: UserContentProfile | null
): Promise<{ content: string; proposedChanges: EditProposal[] }> {
  const gemini = createGeminiClient();

  const contextPrompt = userProfile?.system_prompt || '';

  const prompt = `You are helping edit a video script. The user wants to make changes.

Current Script Content:
${JSON.stringify(currentContent, null, 2)}

${contextPrompt}

User's Edit Request: ${editRequest}

Analyze the request and generate specific edit proposals. Return a JSON object with:
{
  "content": "A brief explanation of the proposed changes",
  "proposedChanges": [
    {
      "section": "hookOptions" | "fullScript" | "visualDirection" | "thumbnailStrategy" | "platformMetadata" | "goalAlignedCTA",
      "before": "Current text/content",
      "after": "Proposed new text/content",
      "description": "Why this change helps"
    }
  ]
}

Return ONLY valid JSON with no additional text or markdown formatting.`;

  const result = await gemini.generateContent(prompt);
  const response = result.response.text();

  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedResponse);
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse edit proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateAskResponse(
  question: string,
  currentContent: any,
  userProfile: UserContentProfile | null
): Promise<string> {
  const gemini = createGeminiClient();

  const contextPrompt = userProfile?.system_prompt || '';

  const prompt = `You are a helpful content creation assistant. The user has a question about their video script.

Current Script Content:
${JSON.stringify(currentContent, null, 2)}

${contextPrompt}

User's Question: ${question}

Provide a helpful, concise answer that helps them understand and improve their content. Be specific and actionable.`;

  const result = await gemini.generateContent(prompt);
  return result.response.text();
}

export async function regenerateHook(
  hookIndex: number,
  currentHooks: any[],
  guidance: string,
  userProfile: UserContentProfile | null
): Promise<{ text: string; psychologyType: string }> {
  const gemini = createGeminiClient();

  const contextPrompt = userProfile?.system_prompt || '';

  const prompt = `You are generating a new hook variation for a video script.

Current Hooks:
${JSON.stringify(currentHooks, null, 2)}

${contextPrompt}

User Guidance: ${guidance}

Generate ONE new hook that is different from the existing ones. Return a JSON object:
{
  "text": "The hook text (under 10 words)",
  "psychologyType": "Psychology principle used (e.g., Curiosity Gap, Social Proof, Fear of Missing Out, etc.)"
}

Return ONLY valid JSON with no additional text or markdown formatting.`;

  const result = await gemini.generateContent(prompt);
  const response = result.response.text();

  const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedResponse);
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse hook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function buildInstantExecutionPrompt(
  userProfile: UserContentProfile | null,
  platform?: string
): string {
  const basePrompt = userProfile?.system_prompt || '';

  return `${basePrompt}

You are an expert short-form video script generator. Generate a complete, production-ready script for a 30-60 second video.

Return a JSON object with this EXACT structure:
{
  "hookOptions": [
    {
      "id": "hook-1",
      "text": "First 3-5 second hook (under 10 words)",
      "psychologyType": "Psychology principle (e.g., Curiosity Gap, Social Proof, Pattern Interrupt, etc.)"
    },
    {
      "id": "hook-2",
      "text": "Second hook option",
      "psychologyType": "Different psychology principle"
    },
    {
      "id": "hook-3",
      "text": "Third hook option",
      "psychologyType": "Different psychology principle"
    }
  ],
  "selectedHook": "hook-1",
  "fullScript": "Complete 30-60 second script with timing markers. Format as:\n[0-3s] Hook line here\n[3-8s] Setup/context\n[8-15s] Main point 1\n[15-25s] Main point 2\n[25-35s] Main point 3 or payoff\n[35-40s] CTA",
  "visualDirection": [
    {
      "timeRange": "0-3s",
      "contentDescription": "What's happening in this scene",
      "bRollSuggestions": ["Specific b-roll idea 1", "Alternative b-roll idea 2"],
      "onScreenText": ["Text overlay 1", "Text overlay 2"],
      "transitionNotes": "How to transition to next scene"
    }
  ],
  "platformMetadata": {
    "captions": "Optimized caption text with relevant hashtags",
    "hashtags": ["#relevant1", "#relevant2", "#relevant3"],
    "platformSpecificNotes": "Platform-specific tips (e.g., for TikTok: use trending sounds)"
  },
  "thumbnailStrategy": {
    "imagePrompt": "Detailed description for thumbnail image generation (e.g., 'Close-up of surprised face with bright background')",
    "overlayTextOptions": ["Short punchy text option 1", "Alternative text option 2", "Third option"]
  },
  "goalAlignedCTA": "Specific call-to-action aligned with user's goal: ${userProfile?.question_2_goal || 'engagement'}",
  "estimatedDuration": "35 seconds"
}

${platform ? `Target Platform: ${platform}` : ''}

Make the script:
- Attention-grabbing from second 1
- Fast-paced and engaging
- Optimized for watch-through rate
- Actionable and valuable
- Aligned with the user's content goals and niche

Return ONLY the JSON object, no markdown formatting, no additional text.`;
}
