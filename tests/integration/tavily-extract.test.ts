import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { tavilyExtract } from "@/lib/integrations/tavily";

describe("Tavily script link extraction", () => {
  beforeEach(() => {
    process.env.WEB_SEARCH_API_KEY = "web-search-test-key";
  });

  afterEach(() => {
    delete process.env.WEB_SEARCH_API_KEY;
    vi.unstubAllGlobals();
  });

  it("uses WEB_SEARCH_API_KEY and maps raw link content", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              url: "https://example.com/apollo",
              raw_content: "Apollo goodwill and quarantine details.",
              failed: false,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const results = await tavilyExtract(
      ["https://example.com/apollo"],
      "test-user",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({
      Authorization: "Bearer web-search-test-key",
    });
    expect(results).toEqual([
      {
        url: "https://example.com/apollo",
        rawContent: "Apollo goodwill and quarantine details.",
        failed: false,
      },
    ]);
  });
});
