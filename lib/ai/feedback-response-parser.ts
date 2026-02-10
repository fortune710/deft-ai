import type { AIFeedback } from '@/types/content-analytics';

export function parseAIResponse(response: string): AIFeedback {
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
