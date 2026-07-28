import { describe, expect, it } from "vitest";

import {
  applyEditProposalToContent,
  createSuggestionMarkup,
  isDocumentRewriteRequest,
  locateProposalSourceText,
  materializeSuggestionsForGeneration,
} from "@/lib/script-editing/proposals";
import { logger } from "@/lib/logger";
import type { EditProposal } from "@/types/script-chat";

const userId = "unit-test-user";
const log = logger.child({
  file: "tests/unit/script-edit-proposals.test.ts",
});

function createProposal(
  before: string,
  after: string,
  scope: EditProposal["scope"] = "sentence",
): EditProposal {
  log.debug("Creating a localized edit proposal fixture", {
    userId,
    action: "create_script_edit_proposal_fixture",
    sourceLength: before.length,
    replacementLength: after.length,
    scope,
  });
  return {
    section: "markdown",
    before,
    after,
    description: "A localized unit-test suggestion.",
    scope,
  };
}

describe("script edit proposal matching", () => {
  it("locates exact source text without interpreting regex characters", () => {
    const source = "Keep $5.00, (parentheses), and [brackets] unchanged.";
    const script = `Opening.\n\n${source}\n\nClosing.`;

    const match = locateProposalSourceText(script, source, userId);

    expect(match).toEqual({
      index: script.indexOf(source),
      length: source.length,
      text: source,
      strategy: "exact",
    });
  });

  it("matches whitespace differences while retaining the actual source range", () => {
    const script =
      "Opening.\n\nThis sentence wraps\nacross two lines.\n\nClosing.";

    const match = locateProposalSourceText(
      script,
      "This sentence wraps across two lines.",
      userId,
    );

    expect(match).toMatchObject({
      text: "This sentence wraps\nacross two lines.",
      strategy: "flexible_whitespace",
    });
  });

  it("returns null for a stale source that is absent from the current script", () => {
    const match = locateProposalSourceText(
      "The current script text.",
      "A stale version of the script.",
      userId,
    );

    expect(match).toBeNull();
  });
});

describe("localized script edit application", () => {
  it("replaces only the suggestion range and preserves both sides", () => {
    const script = [
      "# Original title",
      "",
      "Keep the opening exactly.",
      "",
      "Replace only this sentence.",
      "",
      "Keep the conclusion exactly.",
    ].join("\n");
    const proposal = createProposal(
      "Replace only this sentence.",
      "This sentence is now revised.",
    );

    const result = applyEditProposalToContent(
      script,
      proposal,
      userId,
    );

    expect(result.applied).toBe(true);
    expect(result.content).toBe([
      "# Original title",
      "",
      "Keep the opening exactly.",
      "",
      "This sentence is now revised.",
      "",
      "Keep the conclusion exactly.",
    ].join("\n"));
  });

  it("applies multiple suggestions independently without dropping prior content", () => {
    const original =
      "Opening stays.\n\nFirst target.\n\nSecond target.\n\nClosing stays.";
    const first = applyEditProposalToContent(
      original,
      createProposal("First target.", "First revision."),
      userId,
    );
    expect(first.applied).toBe(true);

    const second = applyEditProposalToContent(
      first.content,
      createProposal("Second target.", "Second revision."),
      userId,
    );

    expect(second.applied).toBe(true);
    expect(second.content).toBe(
      "Opening stays.\n\nFirst revision.\n\nSecond revision.\n\nClosing stays.",
    );
  });

  it("does not alter content when the suggestion is stale", () => {
    const script = "Opening.\n\nCurrent middle.\n\nClosing.";
    const result = applyEditProposalToContent(
      script,
      createProposal("Old middle.", "Revised middle."),
      userId,
    );

    expect(result).toMatchObject({
      applied: false,
      content: script,
      reason: "source_not_found",
    });
  });

  it("materializes legacy highlight markup back to its original source", () => {
    const script = "Opening.\n\nTarget sentence.\n\nClosing.";
    const proposal = createProposal(
      "Target sentence.",
      "Revised sentence.",
    );
    const markup = createSuggestionMarkup(
      proposal,
      { messageId: "message-1", proposalIndex: 0 },
      userId,
    );
    const legacyStoredScript = script.replace(proposal.before, markup);

    expect(
      materializeSuggestionsForGeneration(legacyStoredScript, userId),
    ).toBe(script);
  });

  it("rejects a single proposal that replaces the whole script", () => {
    const script =
      "Short opening.\n\nThin middle.\n\nAbrupt ending.";
    const expanded = [
      "A more developed opening establishes the premise.",
      "",
      "A detailed middle adds evidence, examples, and useful context.",
      "",
      "A stronger ending resolves the idea and gives the reader direction.",
    ].join("\n");
    const result = applyEditProposalToContent(
      script,
      createProposal(script, expanded, "document"),
      userId,
    );

    expect(result).toMatchObject({
      applied: false,
      content: script,
      reason: "scope_too_broad",
    });
  });

  it("allows a large section suggestion when it leaves another independent range", () => {
    const largeSection = [
      "## Opening",
      "A short premise.",
      "A supporting detail.",
      "A transition into the close.",
    ].join("\n");
    const closing = "## Closing\nKeep this closing independent.";
    const script = `${largeSection}\n\n${closing}`;
    const replacement = [
      "## Opening",
      "A much stronger premise with useful context.",
      "A concrete supporting example that develops the argument.",
      "A cleaner transition into the close.",
    ].join("\n");

    const result = applyEditProposalToContent(
      script,
      createProposal(largeSection, replacement, "section"),
      userId,
    );

    expect(result).toMatchObject({
      applied: true,
      content: `${replacement}\n\n${closing}`,
    });
  });
});

describe("document rewrite intent classification", () => {
  it.each([
    "Flesh out the entire script with more examples.",
    "Condense this script to 3 paragraphs.",
    "Reduce the draft to exactly 500 words.",
    "Expand the whole script and strengthen its argument.",
    "Make this script punchier and more focused.",
    "Change the tone throughout the draft.",
  ])("allows explicit script-level transformations: %s", (request) => {
    expect(isDocumentRewriteRequest(request, userId)).toBe(true);
  });

  it.each([
    "Rewrite the opening paragraph.",
    "Shorten the CTA.",
    "Expand the first section with one example.",
    "Make this sentence more concise.",
  ])("keeps targeted requests locally scoped: %s", (request) => {
    expect(isDocumentRewriteRequest(request, userId)).toBe(false);
  });
});
