import { logger } from "../logger";
import type {
  ChangeStatus,
  EditorContent,
  EditProposal,
} from "../../types/script-chat";

const log = logger.child({ file: "lib/script-editing/proposals.ts" });
const EXPLICIT_DOCUMENT_SCOPE_PATTERN =
  /\b(?:entire|whole|full)\s+(?:script|draft|piece|content)\b/i;
const DOCUMENT_TRANSFORMATION_PATTERN =
  /\b(?:flesh\s+out|expand|condense|shorten|reduce|compress|trim|restructure|rewrite)\b[\s\S]{0,80}\b(?:script|draft|piece|content)\b/i;
const DOCUMENT_LENGTH_PATTERN =
  /\b(?:to|into|under|around|approximately|exactly)\s+\d+\s+(?:paragraphs?|words?)\b/i;
const DOCUMENT_ATTRIBUTE_PATTERN =
  /\b(?:script|draft|piece|content)\b[\s\S]{0,80}\b(?:punchier|stronger|clearer|tighter|shorter|longer|more\s+(?:concise|focused|detailed|engaging)|less\s+(?:repetitive|verbose|formal))\b|\b(?:throughout|across)\s+(?:the\s+)?(?:script|draft|piece|content)\b/i;
const LOCAL_SCOPE_PATTERN =
  /\b(?:first|last|opening|closing|intro(?:duction)?|conclusion|hook|cta|sentence|paragraph|section)\b/i;

export type ProposalResolution = Exclude<ChangeStatus, "pending">;

export type ApplyEditProposalResult = {
  applied: boolean;
  content: EditorContent | string;
  reason?: "empty_source" | "source_not_found" | "scope_too_broad";
};

export type SuggestionLocator = {
  messageId: string;
  proposalIndex: number;
};

export type ProposalSourceMatch = {
  index: number;
  length: number;
  text: string;
  strategy: "exact" | "trimmed" | "flexible_whitespace";
};

function escapeRegex(value: string, userId: string): string {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  log.debug("Escaped proposal source text for bounded matching", {
    userId,
    action: "escape_script_proposal_source_regex",
    sourceLength: value.length,
    escapedLength: escaped.length,
  });
  return escaped;
}

export function locateProposalSourceText(
  target: string,
  proposalSource: string,
  userId: string,
): ProposalSourceMatch | null {
  const exactIndex = target.indexOf(proposalSource);
  if (exactIndex >= 0) {
    log.debug("Located exact proposal source text", {
      userId,
      action: "locate_script_proposal_source",
      strategy: "exact",
      sourceLength: proposalSource.length,
      targetLength: target.length,
      matchIndex: exactIndex,
    });
    return {
      index: exactIndex,
      length: proposalSource.length,
      text: proposalSource,
      strategy: "exact",
    };
  }

  const trimmedSource = proposalSource.trim();
  if (!trimmedSource) {
    log.warn("Could not locate an empty proposal source", {
      userId,
      action: "locate_script_proposal_source",
      strategy: "trimmed",
      sourceLength: proposalSource.length,
      targetLength: target.length,
    });
    return null;
  }

  const trimmedIndex = target.indexOf(trimmedSource);
  if (trimmedIndex >= 0) {
    log.debug("Located trimmed proposal source text", {
      userId,
      action: "locate_script_proposal_source",
      strategy: "trimmed",
      sourceLength: trimmedSource.length,
      targetLength: target.length,
      matchIndex: trimmedIndex,
    });
    return {
      index: trimmedIndex,
      length: trimmedSource.length,
      text: trimmedSource,
      strategy: "trimmed",
    };
  }

  const flexiblePattern = trimmedSource
    .split(/\s+/)
    .map((part) => escapeRegex(part, userId))
    .join("\\s+");
  const flexibleMatch = new RegExp(flexiblePattern, "u").exec(target);
  if (!flexibleMatch || flexibleMatch.index === undefined) {
    log.warn("Could not locate proposal source text", {
      userId,
      action: "locate_script_proposal_source",
      strategy: "flexible_whitespace",
      sourceLength: trimmedSource.length,
      targetLength: target.length,
    });
    return null;
  }

  log.debug("Located proposal source with flexible whitespace matching", {
    userId,
    action: "locate_script_proposal_source",
    strategy: "flexible_whitespace",
    sourceLength: trimmedSource.length,
    targetLength: target.length,
    matchIndex: flexibleMatch.index,
    matchedLength: flexibleMatch[0].length,
  });
  return {
    index: flexibleMatch.index,
    length: flexibleMatch[0].length,
    text: flexibleMatch[0],
    strategy: "flexible_whitespace",
  };
}

export function isDocumentRewriteRequest(
  editRequest: string,
  userId: string,
): boolean {
  const hasExplicitDocumentScope =
    EXPLICIT_DOCUMENT_SCOPE_PATTERN.test(editRequest);
  const hasDocumentTransformation =
    DOCUMENT_TRANSFORMATION_PATTERN.test(editRequest);
  const hasDocumentLengthConstraint =
    DOCUMENT_LENGTH_PATTERN.test(editRequest);
  const hasDocumentAttributeChange =
    DOCUMENT_ATTRIBUTE_PATTERN.test(editRequest);
  const hasLocalScope = LOCAL_SCOPE_PATTERN.test(editRequest);
  const isDocumentRewrite =
    hasExplicitDocumentScope ||
    hasDocumentLengthConstraint ||
    hasDocumentAttributeChange ||
    (hasDocumentTransformation && !hasLocalScope);
  log.info("Classified script edit request scope", {
    userId,
    action: "classify_script_edit_request_scope",
    requestLength: editRequest.length,
    hasExplicitDocumentScope,
    hasDocumentTransformation,
    hasDocumentLengthConstraint,
    hasDocumentAttributeChange,
    hasLocalScope,
    isDocumentRewrite,
  });
  return isDocumentRewrite;
}

export function createSuggestionMarkup(
  proposal: EditProposal,
  locator: SuggestionLocator,
  userId: string,
): string {
  const markup = `<suggestion before="${encodeURIComponent(proposal.before)}" after="${encodeURIComponent(proposal.after)}" id="${encodeURIComponent(`${locator.messageId}:${locator.proposalIndex}`)}" messageId="${encodeURIComponent(locator.messageId)}" />`;
  log.debug("Created deterministic inline suggestion markup", {
    userId,
    action: "create_inline_script_suggestion_markup",
    messageId: locator.messageId,
    proposalIndex: locator.proposalIndex,
    sourceLength: proposal.before.length,
    replacementLength: proposal.after.length,
  });
  return markup;
}

export function materializeSuggestionsForGeneration(
  markdown: string,
  userId: string,
): string {
  let suggestionCount = 0;
  const materialized = markdown.replace(
    /<suggestion\s+before="([^"]*)"\s+after="([^"]*)"\s+id="([^"]*)"\s+messageId="([^"]*)"\s*\/>/g,
    (_markup, encodedBefore: string) => {
      suggestionCount += 1;
      try {
        return decodeURIComponent(encodedBefore);
      } catch (error) {
        log.warn("Could not decode inline suggestion source text", {
          userId,
          action: "materialize_script_suggestions_for_generation",
          error: error instanceof Error ? error.message : String(error),
        });
        return encodedBefore;
      }
    },
  );
  log.debug("Materialized pending suggestions into current source text", {
    userId,
    action: "materialize_script_suggestions_for_generation",
    suggestionCount,
    markdownLength: markdown.length,
    materializedLength: materialized.length,
  });
  return materialized;
}

export function anchorEditProposalsToCurrentContent(
  proposals: EditProposal[],
  currentContent: EditorContent | string,
  userId: string,
): EditProposal[] {
  const comparableContent =
    typeof currentContent === "string"
      ? materializeSuggestionsForGeneration(currentContent, userId)
      : currentContent;
  const anchoredProposals: EditProposal[] = [];
  const occupiedRanges = new Map<string, Array<{ start: number; end: number }>>();

  for (const proposal of proposals) {
    const source = proposal.before.trim();
    if (!source) continue;
    if (proposal.scope === "document") {
      log.warn("Discarded a document-level edit proposal", {
        userId,
        action: "anchor_edit_proposals_to_current_script",
        section: proposal.section,
        scope: proposal.scope,
        reason: "whole_script_suggestions_are_not_independently_actionable",
      });
      continue;
    }
    const targetKey =
      typeof comparableContent === "string"
        ? "markdown"
        : proposal.section === "goalAlignedCTA"
          ? "goalAlignedCTA"
          : "fullScript";
    const target =
      typeof comparableContent === "string"
        ? comparableContent
        : proposal.section === "goalAlignedCTA"
          ? comparableContent.goalAlignedCTA
          : comparableContent.fullScript;
    const match = locateProposalSourceText(target, proposal.before, userId);
    if (!match) continue;

    const coversWholeTarget =
      target.slice(0, match.index).trim().length === 0 &&
      target.slice(match.index + match.length).trim().length === 0;
    if (coversWholeTarget) {
      log.warn("Discarded a suggestion that replaced the complete script", {
        userId,
        action: "anchor_edit_proposals_to_current_script",
        section: proposal.section,
        scope: proposal.scope ?? "sentence",
        targetLength: target.length,
      });
      continue;
    }

    const ranges = occupiedRanges.get(targetKey) ?? [];
    const nextRange = {
      start: match.index,
      end: match.index + match.length,
    };
    const overlapsExisting = ranges.some(
      (range) =>
        nextRange.start < range.end &&
        nextRange.end > range.start,
    );
    if (overlapsExisting) {
      log.warn("Discarded an overlapping script edit suggestion", {
        userId,
        action: "anchor_edit_proposals_to_current_script",
        section: proposal.section,
        scope: proposal.scope ?? "sentence",
        matchIndex: match.index,
        matchLength: match.length,
      });
      continue;
    }

    ranges.push(nextRange);
    occupiedRanges.set(targetKey, ranges);
    anchoredProposals.push({ ...proposal, before: match.text });
  }

  log.info("Anchored generated edit proposals to the current script snapshot", {
    userId,
    action: "anchor_edit_proposals_to_current_script",
    proposalCount: proposals.length,
    anchoredProposalCount: anchoredProposals.length,
    discardedProposalCount: proposals.length - anchoredProposals.length,
    documentProposalCount: proposals.filter(
      (proposal) => proposal.scope === "document",
    ).length,
  });
  return anchoredProposals;
}

export function applyEditProposalToContent(
  currentContent: EditorContent | string,
  proposal: EditProposal,
  userId: string,
  locator?: SuggestionLocator,
): ApplyEditProposalResult {
  const source = proposal.before.trim();
  if (!source) {
    log.warn("Refused an edit proposal without source text", {
      userId,
      action: "apply_partial_script_edit_proposal",
      section: proposal.section,
      reason: "empty_source",
    });
    return { applied: false, content: currentContent, reason: "empty_source" };
  }

  const isMarkdown = typeof currentContent === "string";
  if (isMarkdown && locator) {
    const suggestionMarkup = createSuggestionMarkup(
      proposal,
      locator,
      userId,
    );
    if (currentContent.includes(suggestionMarkup)) {
      const content = currentContent.replace(suggestionMarkup, proposal.after);
      log.info("Accepted an inline suggestion at its highlighted range", {
        userId,
        action: "apply_partial_script_edit_proposal",
        messageId: locator.messageId,
        proposalIndex: locator.proposalIndex,
        section: proposal.section,
        sourceLength: proposal.before.length,
        replacementLength: proposal.after.length,
      });
      return { applied: true, content };
    }
  }

  const target = isMarkdown
    ? currentContent
    : proposal.section === "goalAlignedCTA"
      ? currentContent.goalAlignedCTA
      : currentContent.fullScript;
  const match = locateProposalSourceText(target, proposal.before, userId);

  if (!match) {
    log.warn("Refused an edit proposal whose source text was not found", {
      userId,
      action: "apply_partial_script_edit_proposal",
      section: proposal.section,
      reason: "source_not_found",
      sourceLength: source.length,
      targetLength: target.length,
    });
    return {
      applied: false,
      content: currentContent,
      reason: "source_not_found",
    };
  }

  const coversWholeTarget =
    target.slice(0, match.index).trim().length === 0 &&
    target.slice(match.index + match.length).trim().length === 0;
  if (proposal.scope === "document" || coversWholeTarget) {
    log.warn("Refused an edit proposal that replaced the complete script", {
      userId,
      action: "apply_partial_script_edit_proposal",
      section: proposal.section,
      reason: "scope_too_broad",
      sourceLength: match.length,
      targetLength: target.length,
      scope: proposal.scope ?? "sentence",
    });
    return {
      applied: false,
      content: currentContent,
      reason: "scope_too_broad",
    };
  }

  const updatedTarget = `${target.slice(0, match.index)}${proposal.after}${target.slice(match.index + match.length)}`;
  const content = isMarkdown
    ? updatedTarget
    : proposal.section === "goalAlignedCTA"
      ? { ...currentContent, goalAlignedCTA: updatedTarget }
      : { ...currentContent, fullScript: updatedTarget };

  log.info("Applied a bounded edit proposal to part of the script", {
    userId,
    action: "apply_partial_script_edit_proposal",
    section: proposal.section,
    replacementRatio: match.length / Math.max(target.length, 1),
    sourceLength: match.length,
    replacementLength: proposal.after.length,
    matchStrategy: match.strategy,
    scope: proposal.scope ?? "sentence",
  });
  return { applied: true, content };
}

export function rejectEditProposalInContent(
  currentContent: EditorContent | string,
  proposal: EditProposal,
  userId: string,
  locator: SuggestionLocator,
): ApplyEditProposalResult {
  if (typeof currentContent !== "string") {
    log.info("Rejected a proposal without changing legacy editor content", {
      userId,
      action: "reject_partial_script_edit_proposal",
      messageId: locator.messageId,
      proposalIndex: locator.proposalIndex,
      section: proposal.section,
    });
    return { applied: true, content: currentContent };
  }

  const suggestionMarkup = createSuggestionMarkup(proposal, locator, userId);
  const content = currentContent.includes(suggestionMarkup)
    ? currentContent.replace(suggestionMarkup, proposal.before)
    : currentContent;
  log.info("Rejected an inline suggestion while preserving its source text", {
    userId,
    action: "reject_partial_script_edit_proposal",
    messageId: locator.messageId,
    proposalIndex: locator.proposalIndex,
    section: proposal.section,
    removedHighlight: content !== currentContent,
  });
  return { applied: true, content };
}

export function resolveEditProposalStatus(
  proposals: EditProposal[],
  proposalIndex: number,
  status: ProposalResolution,
  userId: string,
): { proposals: EditProposal[]; aggregateStatus: ChangeStatus } {
  if (
    !Number.isInteger(proposalIndex) ||
    proposalIndex < 0 ||
    proposalIndex >= proposals.length
  ) {
    log.error("Rejected an invalid edit proposal resolution index", {
      userId,
      action: "resolve_individual_edit_proposal",
      proposalIndex,
      proposalCount: proposals.length,
      status,
      error: "Proposal index is out of range",
    });
    throw new Error("Proposal index is out of range");
  }

  const updatedProposals = proposals.map((proposal, index) =>
    index === proposalIndex ? { ...proposal, status } : proposal,
  );
  const statuses = updatedProposals.map(
    (proposal) => proposal.status ?? "pending",
  );
  const aggregateStatus = statuses.includes("pending")
    ? "pending"
    : statuses.includes("accepted")
      ? "accepted"
      : "rejected";

  log.info("Resolved one edit proposal without removing its siblings", {
    userId,
    action: "resolve_individual_edit_proposal",
    proposalIndex,
    proposalCount: proposals.length,
    status,
    aggregateStatus,
    pendingProposalCount: statuses.filter(
      (proposalStatus) => proposalStatus === "pending",
    ).length,
  });
  return { proposals: updatedProposals, aggregateStatus };
}
