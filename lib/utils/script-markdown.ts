/**
 * Converts a content object (or string) into a unified Markdown string.
 * This ensures legacy structured objects can be rendered in the new MDX editor.
 * If the input is already a string (the new format), it returns it as-is.
 */
export function contentToMarkdown(content: any): string {
    if (typeof content === 'string') {
        return content;
    }

    if (!content || typeof content !== 'object') {
        return '';
    }

    const sections: string[] = [];

    // Hook
    const hook = content.hook_suggestion || (content.hookOptions && content.hookOptions[0]?.text);
    if (hook) {
        sections.push(`## Hook\n${hook}\n`);
    }

    // Script Content
    if (content.script_content) {
        sections.push(`## Script\n${content.script_content}\n`);
    }

    // Visual Direction
    if (content.visual_direction && Array.isArray(content.visual_direction) && content.visual_direction.length > 0) {
        sections.push(`## Visual Direction\n`);
        content.visual_direction.forEach((scene: any) => {
            sections.push(`### [${scene.timeRange || 'Scene'}]\n**Action**: ${scene.contentDescription || ''}`);
            if (scene.onScreenText && scene.onScreenText.length > 0) {
                sections.push(`\n**Text**: ${scene.onScreenText.join(', ')}`);
            }
            sections.push(''); // new line
        });
    }

    // CTA
    if (content.cta_suggestion) {
        sections.push(`## Call to Action\n${content.cta_suggestion}\n`);
    }

    // Metadata / Hashtags
    if (content.hashtags && Array.isArray(content.hashtags)) {
        sections.push(`## Tags\n${content.hashtags.join(' ')}\n`);
    }

    return sections.join('\n');
}
