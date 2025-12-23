export function injectSystemContext(userPrompt: string, systemPrompt?: string | null): string {
  if (!systemPrompt) {
    return userPrompt;
  }

  return `${systemPrompt}\n\nUser Request: ${userPrompt}`;
}

export function formatContentPillars(pillars: string[]): string {
  if (pillars.length === 0) return '';

  return `Your content should align with these pillars:\n${pillars.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
}
