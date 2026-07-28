import { describe, expect, it } from "vitest";

import {
  anchorEditProposalsToCurrentContent,
  applyEditProposalToContent,
  createSuggestionMarkup,
  locateProposalSourceText,
  materializeSuggestionsForGeneration,
  rejectEditProposalInContent,
  resolveEditProposalStatus,
} from "@/lib/script-editing/proposals";
import type { EditProposal } from "@/types/script-chat";

describe("independent script edit proposal lifecycle", () => {
  it("applies one local edit while preserving the script and sibling proposal", () => {
    const originalScript = [
      "# Opening",
      "The original hook stays concise.",
      "",
      "## Evidence",
      "This paragraph needs a source-backed detail.",
      "",
      "## Conclusion",
      "The original conclusion remains untouched.",
    ].join("\n");
    const proposals: EditProposal[] = [
      {
        section: "markdown",
        before: "This paragraph needs a source-backed detail.",
        after: "This paragraph now includes the source-backed detail.",
        description: "Ground the evidence section in the uploaded file.",
      },
      {
        section: "markdown",
        before: "The original conclusion remains untouched.",
        after: "The conclusion now ends with a stronger call to action.",
        description: "Strengthen the closing line.",
      },
    ];
    const locator = { messageId: "message-1", proposalIndex: 0 };
    const highlightedScript = originalScript.replace(
      proposals[0].before,
      createSuggestionMarkup(proposals[0], locator, "test-user"),
    );

    expect(materializeSuggestionsForGeneration(
      highlightedScript,
      "test-user",
    )).toBe(originalScript);

    const applied = applyEditProposalToContent(
      highlightedScript,
      proposals[0],
      "test-user",
      locator,
    );
    expect(applied.applied).toBe(true);
    expect(applied.content).toContain(
      "This paragraph now includes the source-backed detail.",
    );
    expect(applied.content).toContain(
      "The original conclusion remains untouched.",
    );
    expect(applied.content).toContain("The original hook stays concise.");

    const accepted = resolveEditProposalStatus(
      proposals,
      0,
      "accepted",
      "test-user",
    );
    expect(accepted.proposals[0].status).toBe("accepted");
    expect(accepted.proposals[1].status ?? "pending").toBe("pending");
    expect(accepted.aggregateStatus).toBe("pending");

    const rejected = resolveEditProposalStatus(
      accepted.proposals,
      1,
      "rejected",
      "test-user",
    );
    expect(rejected.proposals[0].status).toBe("accepted");
    expect(rejected.proposals[1].status).toBe("rejected");
    expect(rejected.aggregateStatus).toBe("accepted");
  });

  it("anchors suggestions to the latest snapshot and restores rejected highlights", () => {
    const latestScript =
      "Current opening.\n\nThe freshly edited middle paragraph.\n\nCurrent close.";
    const exactProposal: EditProposal = {
      section: "markdown",
      before: "The freshly edited middle paragraph.",
      after: "The grounded middle paragraph.",
      description: "Use the latest editor text.",
    };
    const staleProposal: EditProposal = {
      section: "markdown",
      before: "The old middle paragraph.",
      after: "The grounded middle paragraph.",
      description: "This proposal came from a stale snapshot.",
    };
    const whitespaceProposal: EditProposal = {
      section: "markdown",
      before: "  Current opening.  ",
      after: "A sharper current opening.",
      description: "Trim model-added whitespace around the exact source.",
    };
    const anchored = anchorEditProposalsToCurrentContent(
      [exactProposal, staleProposal, whitespaceProposal],
      latestScript,
      "test-user",
    );
    expect(anchored).toEqual([
      exactProposal,
      { ...whitespaceProposal, before: "Current opening." },
    ]);

    const locator = { messageId: "message-2", proposalIndex: 0 };
    const highlighted = latestScript.replace(
      exactProposal.before,
      createSuggestionMarkup(exactProposal, locator, "test-user"),
    );
    const rejected = rejectEditProposalInContent(
      highlighted,
      exactProposal,
      "test-user",
      locator,
    );
    expect(rejected.content).toBe(latestScript);
  });

  it("refuses stale or whole-document proposals instead of overwriting the script", () => {
    const originalScript =
      "Opening paragraph.\n\nMiddle paragraph.\n\nClosing paragraph.";
    const staleProposal: EditProposal = {
      section: "markdown",
      before: "Text that is not in the script.",
      after: "Replacement text.",
      description: "A stale suggestion.",
    };
    const wholeDocumentProposal: EditProposal = {
      section: "markdown",
      before: originalScript,
      after: "A complete replacement.",
      description: "An unsafe whole-document replacement.",
    };

    const staleResult = applyEditProposalToContent(
      originalScript,
      staleProposal,
      "test-user",
    );
    const broadResult = applyEditProposalToContent(
      originalScript,
      wholeDocumentProposal,
      "test-user",
    );

    expect(staleResult).toMatchObject({
      applied: false,
      content: originalScript,
      reason: "source_not_found",
    });
    expect(broadResult).toMatchObject({
      applied: false,
      content: originalScript,
      reason: "scope_too_broad",
    });
  });

  it("matches rendered whitespace with regex and preserves surrounding content", () => {
    const originalScript = [
      "# Keep this title",
      "",
      "The middle sentence",
      "wraps onto another line.",
      "",
      "Keep this final paragraph exactly as written.",
    ].join("\n");
    const proposal: EditProposal = {
      section: "markdown",
      before: "The middle sentence wraps onto another line.",
      after: "The revised middle sentence remains localized.",
      description: "Revise only the middle sentence.",
    };

    const match = locateProposalSourceText(
      originalScript,
      proposal.before,
      "test-user",
    );
    expect(match).toMatchObject({
      strategy: "flexible_whitespace",
      text: "The middle sentence\nwraps onto another line.",
    });

    const result = applyEditProposalToContent(
      originalScript,
      proposal,
      "test-user",
    );
    expect(result.applied).toBe(true);
    expect(result.content).toBe([
      "# Keep this title",
      "",
      "The revised middle sentence remains localized.",
      "",
      "Keep this final paragraph exactly as written.",
    ].join("\n"));
  });

  it("decomposes broad rewrites into non-overlapping suggestions", () => {
    const originalScript =
      "Opening paragraph.\n\nMiddle paragraph.\n\nClosing paragraph.";
    const documentProposal: EditProposal = {
      section: "fullScript",
      scope: "document",
      before: originalScript,
      after:
        "Condensed opening and context.\n\nFocused conclusion and CTA.",
      description: "Condense the complete script to two paragraphs.",
    };
    const openingProposal: EditProposal = {
      section: "Opening",
      scope: "paragraph",
      before: "Opening paragraph.",
      after: "Condensed opening and context.",
      description: "Condense the opening.",
    };
    const closingProposal: EditProposal = {
      section: "Closing",
      scope: "paragraph",
      before: "Closing paragraph.",
      after: "Focused conclusion and CTA.",
      description: "Strengthen the close.",
    };
    const overlappingProposal: EditProposal = {
      section: "Opening",
      scope: "sentence",
      before: "Opening paragraph.",
      after: "A duplicate opening replacement.",
      description: "This range overlaps the first suggestion.",
    };

    expect(
      anchorEditProposalsToCurrentContent(
        [
          documentProposal,
          openingProposal,
          overlappingProposal,
          closingProposal,
        ],
        originalScript,
        "test-user",
      ),
    ).toEqual([openingProposal, closingProposal]);
  });
});
