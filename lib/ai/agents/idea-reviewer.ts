import { Agent, AgentContext, IdeaReviewerResult, ContentIdea, ScoredContentIdea, ProgressCallback } from '@/types/ai-agents';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';
import { generateWithModel } from '../models';

export class IdeaReviewerAgent implements Agent {
  name = 'Idea Reviewer';
  description = 'Scores and selects the best 30 ideas based on engagement potential, specificity, contrarian angle, results-focus, and platform fit';
  modelConfig: AIModelConfig = AI_MODELS.GOOGLE_FLASH;

  async execute(
    context: AgentContext,
    onProgress?: ProgressCallback,
    ideas?: ContentIdea[]
  ): Promise<IdeaReviewerResult> {
    if (!ideas || ideas.length === 0) {
      throw new Error('No ideas provided for review');
    }

    onProgress?.({
      phase: 'idea_review',
      progress: 45,
      message: 'Starting idea review and scoring',
      details: `Reviewing ${ideas.length} ideas`,
    });

    const batchSize = 20;
    const scoredIdeas: ScoredContentIdea[] = [];

    for (let i = 0; i < ideas.length; i += batchSize) {
      const batch = ideas.slice(i, i + batchSize);
      const progress = 45 + ((i / ideas.length) * 15);

      onProgress?.({
        phase: 'idea_review',
        progress,
        message: `Scoring ideas (${i + batch.length}/${ideas.length})`,
        details: 'Evaluating engagement potential and quality',
      });

      try {
        const scored = await this.scoreBatch(batch, context);
        scoredIdeas.push(...scored);
      } catch (error) {
        console.error('Error scoring batch:', error);
        const fallbackScored = batch.map(idea => this.fallbackScore(idea));
        scoredIdeas.push(...fallbackScored);
      }
    }

    scoredIdeas.sort((a, b) => b.totalScore - a.totalScore);

    onProgress?.({
      phase: 'idea_review',
      progress: 60,
      message: 'Selecting best 30 ideas strategically',
      details: 'Ensuring platform balance and diversity',
    });

    const selectedIdeas = this.selectBest30(scoredIdeas, context.platforms, context.contentPillars);

    const rejectedCount = ideas.length - selectedIdeas.length;
    const averageScore = selectedIdeas.reduce((sum, idea) => sum + idea.totalScore, 0) / selectedIdeas.length;

    const selectionReasoning = this.buildSelectionReasoning(selectedIdeas, context.platforms, context.contentPillars);

    onProgress?.({
      phase: 'idea_review',
      progress: 65,
      message: `Selected ${selectedIdeas.length} best ideas`,
      details: `Average score: ${averageScore.toFixed(1)}/80`,
    });

    return {
      selectedIdeas,
      rejectedCount,
      averageScore,
      selectionReasoning,
    };
  }

  private async scoreBatch(batch: ContentIdea[], context: AgentContext): Promise<ScoredContentIdea[]> {
    const prompt = this.buildScoringPrompt(batch, context);

    const response = await generateWithModel(
      this.modelConfig,
      prompt,
      'You are an expert content strategist. Score content ideas objectively based on engagement potential. Return ONLY valid JSON.'
    );

    return this.parseScoresFromResponse(response.content, batch);
  }

  private buildScoringPrompt(batch: ContentIdea[], context: AgentContext): string {
    return `
You are an expert content strategist evaluating content ideas for ${context.targetAudience} in the ${context.niche} niche.

SCORING CRITERIA (1-10 for each):

1. ENGAGEMENT SCORE: Will this stop scrolling and drive comments/shares/saves?
   - 9-10: Irresistible, must engage
   - 7-8: Very engaging
   - 5-6: Moderately engaging
   - 1-4: Low engagement potential

2. SPECIFICITY SCORE: How specific vs generic is this idea?
   - 9-10: Extremely specific (numbers, exact methods, concrete examples)
   - 7-8: Quite specific
   - 5-6: Somewhat specific
   - 1-4: Generic/vague

3. CONTRARIAN SCORE: Does it challenge conventional wisdom appropriately?
   - 9-10: Bold, fresh perspective backed by logic
   - 7-8: Challenges norms constructively
   - 5-6: Somewhat different angle
   - 1-4: Conventional/common advice

4. RESULTS SCORE: How results-focused is it?
   - 9-10: Specific outcomes, numbers, transformations
   - 7-8: Clear results mentioned
   - 5-6: Results implied
   - 1-4: Process-focused, no clear results

5. PLATFORM FIT SCORE: How well does it fit the platform's strengths?
   - 9-10: Perfect platform match
   - 7-8: Good fit
   - 5-6: Acceptable fit
   - 1-4: Poor platform match

IDEAS TO SCORE:

${batch.map((idea, index) => `
IDEA ${index + 1}:
Platform: ${idea.platform}
Title: ${idea.title}
Description: ${idea.description}
Content Pillar: ${idea.contentPillar}
`).join('\n---\n')}

TASK: Score each idea on all 5 criteria. Calculate totalScore (sum of all scores, max 50).

Return a JSON array with this exact structure:

[
  {
    "ideaIndex": 0,
    "engagementScore": 8,
    "specificityScore": 9,
    "contrarianScore": 7,
    "resultsScore": 8,
    "platformFitScore": 9,
    "totalScore": 41,
    "reasoning": "Brief explanation of scores (1-2 sentences)"
  }
]

Score all ${batch.length} ideas. Return ONLY the JSON array, no markdown or explanations.
    `.trim();
  }

  private parseScoresFromResponse(content: string, batch: ContentIdea[]): ScoredContentIdea[] {
    try {
      let jsonContent = content.trim();

      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }

      const scores = JSON.parse(jsonContent.trim());
      const scoresArray = Array.isArray(scores) ? scores : [scores];

      return scoresArray.map(score => {
        const idea = batch[score.ideaIndex];
        return {
          ...idea,
          engagementScore: score.engagementScore || 5,
          specificityScore: score.specificityScore || 5,
          contrarianScore: score.contrarianScore || 5,
          resultsScore: score.resultsScore || 5,
          platformFitScore: score.platformFitScore || 5,
          totalScore: score.totalScore || 25,
          reasoning: score.reasoning || 'No reasoning provided',
        };
      });
    } catch (error) {
      console.error('Error parsing scores:', error);
      return batch.map(idea => this.fallbackScore(idea));
    }
  }

  private fallbackScore(idea: ContentIdea): ScoredContentIdea {
    const hasNumbers = /\d+/.test(idea.title + idea.description);
    const hasSpecificWords = /(exact|specific|step-by-step|proven|tested)/i.test(idea.title + idea.description);
    const hasContrarianWords = /(unpopular|wrong|myth|actually|really|truth)/i.test(idea.title + idea.description);
    const hasResultsWords = /(from .* to|result|grew|made|got|increased)/i.test(idea.title + idea.description);

    const engagementScore = hasContrarianWords ? 7 : 6;
    const specificityScore = hasNumbers && hasSpecificWords ? 8 : 5;
    const contrarianScore = hasContrarianWords ? 7 : 5;
    const resultsScore = hasResultsWords && hasNumbers ? 8 : 5;
    const platformFitScore = 6;

    return {
      ...idea,
      engagementScore,
      specificityScore,
      contrarianScore,
      resultsScore,
      platformFitScore,
      totalScore: engagementScore + specificityScore + contrarianScore + resultsScore + platformFitScore,
      reasoning: 'Scored using fallback algorithm',
    };
  }

  private selectBest30(
    scoredIdeas: ScoredContentIdea[],
    platforms: string[],
    contentPillars: string[]
  ): ScoredContentIdea[] {
    const minScoreThreshold = 25;
    const qualifiedIdeas = scoredIdeas.filter(idea => idea.totalScore >= minScoreThreshold);

    if (qualifiedIdeas.length <= 30) {
      return qualifiedIdeas;
    }

    const selected: ScoredContentIdea[] = [];
    const platformQuota = Math.ceil(30 / platforms.length);
    const pillarQuota = Math.ceil(30 / contentPillars.length);
    const platformCounts: Record<string, number> = {};
    const pillarCounts: Record<string, number> = {};

    for (const idea of qualifiedIdeas) {
      if (selected.length >= 30) break;

      const platformCount = platformCounts[idea.platform] || 0;
      const pillarCount = pillarCounts[idea.contentPillar] || 0;

      const platformNeedsMore = platformCount < platformQuota;
      const pillarNeedsMore = pillarCount < pillarQuota;

      if (platformNeedsMore || pillarNeedsMore || selected.length < 20) {
        selected.push(idea);
        platformCounts[idea.platform] = platformCount + 1;
        pillarCounts[idea.contentPillar] = pillarCount + 1;
      }
    }

    if (selected.length < 30) {
      const remaining = qualifiedIdeas.filter(idea => !selected.includes(idea));
      selected.push(...remaining.slice(0, 30 - selected.length));
    }

    return selected;
  }

  private buildSelectionReasoning(
    selectedIdeas: ScoredContentIdea[],
    platforms: string[],
    contentPillars: string[]
  ): string {
    const platformDist: Record<string, number> = {};
    const pillarDist: Record<string, number> = {};

    selectedIdeas.forEach(idea => {
      platformDist[idea.platform] = (platformDist[idea.platform] || 0) + 1;
      pillarDist[idea.contentPillar] = (pillarDist[idea.contentPillar] || 0) + 1;
    });

    const avgScores = {
      engagement: selectedIdeas.reduce((sum, i) => sum + i.engagementScore, 0) / selectedIdeas.length,
      specificity: selectedIdeas.reduce((sum, i) => sum + i.specificityScore, 0) / selectedIdeas.length,
      contrarian: selectedIdeas.reduce((sum, i) => sum + i.contrarianScore, 0) / selectedIdeas.length,
      results: selectedIdeas.reduce((sum, i) => sum + i.resultsScore, 0) / selectedIdeas.length,
      platformFit: selectedIdeas.reduce((sum, i) => sum + i.platformFitScore, 0) / selectedIdeas.length,
    };

    return `
Selected 30 highest-scoring ideas with strategic distribution:

Platform Distribution: ${Object.entries(platformDist).map(([p, c]) => `${p}: ${c}`).join(', ')}
Content Pillar Balance: ${Object.entries(pillarDist).map(([p, c]) => `${p}: ${c}`).join(', ')}

Average Scores:
- Engagement: ${avgScores.engagement.toFixed(1)}/10
- Specificity: ${avgScores.specificity.toFixed(1)}/10
- Contrarian: ${avgScores.contrarian.toFixed(1)}/10
- Results Focus: ${avgScores.results.toFixed(1)}/10
- Platform Fit: ${avgScores.platformFit.toFixed(1)}/10

Selection prioritized high engagement potential, specificity, and strategic variety across platforms and content pillars.
    `.trim();
  }
}
