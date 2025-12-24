export interface PlatformHook {
  type: string;
  template: string;
  example: string;
}

export interface EngagementStrategy {
  platform: string;
  scrollStopTechniques: string[];
  hooks: PlatformHook[];
  patternInterrupts: string[];
  callToActions: string[];
  retentionTactics: string[];
}

export interface ContrarianAngle {
  type: 'challenge_status_quo' | 'reveal_truth' | 'expose_myth' | 'unpopular_opinion';
  template: string;
  examples: string[];
}

export interface ResultsFocusedFraming {
  type: string;
  template: string;
  requiredElements: string[];
}

export interface ContentTemplate {
  platform: string;
  format: string;
  structure: string[];
  hooks: string[];
  examples: string[];
}
