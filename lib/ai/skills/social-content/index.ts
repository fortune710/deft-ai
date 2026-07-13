import fs from 'fs';
import path from 'path';

const BASE_PATH = path.join(process.cwd(), 'lib/ai/skills/social-content');

/**
 * Skill Loader for Social Content Skill
 * Synchronously reads the markdown skill files at module load time for zero latency.
 */

export const SOCIAL_CONTENT_SKILL = fs.readFileSync(path.join(BASE_PATH, 'SKILL.md'), 'utf-8');
export const PLATFORMS_REFERENCE = fs.readFileSync(path.join(BASE_PATH, 'references/platforms.md'), 'utf-8');
export const POST_TEMPLATES_REFERENCE = fs.readFileSync(path.join(BASE_PATH, 'references/post-templates.md'), 'utf-8');
export const REVERSE_ENGINEERING_REFERENCE = fs.readFileSync(path.join(BASE_PATH, 'references/reverse-engineering.md'), 'utf-8');

/**
 * Returns platform-specific strategy from the platforms reference.
 */
export function getSkillForPlatform(platform: string): string {
  const platformLower = platform.toLowerCase();
  const sections = PLATFORMS_REFERENCE.split('---');

  // Find section that starts with the platform name header
  const section = sections.find(s => s.includes(`## ${platformLower.charAt(0).toUpperCase() + platformLower.slice(1)}`));

  return section || '';
}

/**
 * Returns a combined prompt context using the skill persona and relevant references.
 */
export function getSocialContentExpertPersona(): string {
  return `
${SOCIAL_CONTENT_SKILL}

<voice_principles>
${REVERSE_ENGINEERING_REFERENCE.split('### 5. LAYER VOICE — Apply Direct Response Principles')[1]?.split('### 6. CONVERT')[0] || ''}
</voice_principles>
  `.trim();
}

/**
 * Extracts and returns the 'Platform Quick Reference' table from the main skill file.
 */
export function getPlatformQuickReference(): string {
  const table = SOCIAL_CONTENT_SKILL.split('## Platform Quick Reference')[1]?.split('---')[0] || '';
  return `
## Platform Quick Reference (Authoritative Guidelines)
${table}
  `.trim();
}
