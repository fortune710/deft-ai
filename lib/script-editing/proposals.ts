import { logger } from "../logger";
import type {
  ChangeStatus,
  EditorContent,
  EditProposal,
} from "../../types/script-chat";

const log = logger.child({ file: "lib/script-editing/proposals.ts" });
const MAX_REPLACEMENT_RATIO = 0.65;

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
  const anchoredProposals = proposals.flatMap((proposal) => {
    const source = proposal.before.trim();
    if (!source) return [];
    const target =
      typeof comparableContent === "string"
        ? comparableContent
        : proposal.section === "goalAlignedCTA"
          ? comparableContent.goalAlignedCTA
          : comparableContent.fullScript;
    const exactSource = target.includes(proposal.before)
      ? proposal.before
      : source !== proposal.before && target.includes(source)
        ? source
        : null;
    if (
      !exactSource ||
      exactSource.length / Math.max(target.length, 1) > MAX_REPLACEMENT_RATIO
    ) {
      return [];
    }
    return [{ ...proposal, before: exactSource }];
  });
  log.info("Anchored generated edit proposals to the current script snapshot", {
    userId,
    action: "anchor_edit_proposals_to_current_script",
    proposalCount: proposals.length,
    anchoredProposalCount: anchoredProposals.length,
    discardedProposalCount: proposals.length - anchoredProposals.length,
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
  const exactIndex = target.indexOf(proposal.before);
  const trimmedIndex = exactIndex >= 0 ? exactIndex : target.indexOf(source);
  const matchedSource = exactIndex >= 0 ? proposal.before : source;

  if (trimmedIndex < 0) {
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

  const replacementRatio = matchedSource.length / Math.max(target.length, 1);
  if (replacementRatio > MAX_REPLACEMENT_RATIO) {
    log.warn("Refused an edit proposal that covered most of the script", {
      userId,
      action: "apply_partial_script_edit_proposal",
      section: proposal.section,
      reason: "scope_too_broad",
      replacementRatio,
      sourceLength: matchedSource.length,
      targetLength: target.length,
    });
    return {
      applied: false,
      content: currentContent,
      reason: "scope_too_broad",
    };
  }

  const updatedTarget = `${target.slice(0, trimmedIndex)}${proposal.after}${target.slice(trimmedIndex + matchedSource.length)}`;
  const content = isMarkdown
    ? updatedTarget
    : proposal.section === "goalAlignedCTA"
      ? { ...currentContent, goalAlignedCTA: updatedTarget }
      : { ...currentContent, fullScript: updatedTarget };

  log.info("Applied a bounded edit proposal to part of the script", {
    userId,
    action: "apply_partial_script_edit_proposal",
    section: proposal.section,
    replacementRatio,
    sourceLength: matchedSource.length,
    replacementLength: proposal.after.length,
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
