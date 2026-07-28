import { tavily } from "@tavily/core";
import { logger } from "@/lib/logger.server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const TAVILY_BASE_URL = "https://api.tavily.com";
const log = logger.child({ module: "Tavily" });

export interface TavilySearchResult {
  title: string;
  url: string;
  content?: string;
  score?: number;
  publishedDate?: string;
  favicon?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
  responseTime?: number;
  requestId?: string;
}

export interface TavilyResearchSource {
  title: string;
  url: string;
  favicon?: string;
}

export interface TavilyResearchResult {
  request_id: string;
  status: "pending" | "completed" | "failed" | string;
  content?: string | Record<string, unknown>;
  sources?: TavilyResearchSource[];
  response_time?: number;
}

export interface TavilySearchOptions {
  searchDepth?: "basic" | "advanced";
  topic?: "general" | "news" | "finance";
  timeRange?: "day" | "week" | "month" | "year" | "d" | "w" | "m" | "y";
  maxResults?: number;
  includeAnswer?: boolean | "basic" | "advanced";
  includeRawContent?: boolean | "markdown" | "text";
  includeFavicon?: boolean;
}

export interface TavilyResearchOptions {
  model?: "mini" | "pro" | "auto";
  citationFormat?: "numbered" | "mla" | "apa" | "chicago";
  outputSchema?: Record<string, unknown>;
  maxPolls?: number;
  pollIntervalMs?: number;
}

export interface TavilyExtractResult {
  url: string;
  rawContent?: string;
  failed?: boolean;
}

function getOptionalTavilyApiKey(userId: string) {
  const key = process.env.WEB_SEARCH_API_KEY?.trim() || null;
  log.debug("Resolved optional Tavily extraction configuration", {
    userId,
    action: "resolve_tavily_extraction_configuration",
    configured: Boolean(key),
  });
  return key;
}

function isPrivateLinkAddress(address: string, userId: string) {
  const normalized = address.toLowerCase();
  const isPrivate =
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    /^127\./.test(normalized) ||
    /^10\./.test(normalized) ||
    /^192\.168\./.test(normalized) ||
    /^169\.254\./.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
  log.debug("Checked direct link extraction address safety", {
    userId,
    action: "check_direct_link_extraction_address",
    address,
    isPrivate,
  });
  return isPrivate;
}

async function assertPublicExtractionUrl(value: string, userId: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Only public HTTP links can be extracted");
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("Local links cannot be extracted");
  }
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some((entry) => isPrivateLinkAddress(entry.address, userId))
  ) {
    throw new Error("Private network links cannot be extracted");
  }
  log.info("Validated public URL for direct link extraction", {
    userId,
    action: "validate_direct_link_extraction_url",
    hostname: url.hostname,
  });
  return url;
}

function extractReadablePageText(html: string, userId: string, url: string) {
  const primaryContent =
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ||
    html;
  const text = primaryContent
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<\/(p|div|section|article|main|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim()
    .slice(0, 100_000);
  log.info("Extracted readable text from public page", {
    userId,
    action: "extract_readable_public_page_text",
    url,
    contentLength: text.length,
    statusCode: 200,
  });
  return text;
}

async function fetchPublicPageText(
  inputUrl: string,
  userId: string,
  redirectCount = 0,
): Promise<{ url: string; rawContent: string }> {
  if (redirectCount > 3) throw new Error("Too many link redirects");
  const url = await assertPublicExtractionUrl(inputUrl, userId);
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": "DeftLinkReader/1.0",
      Accept: "text/html,text/plain,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Link redirect is missing a destination");
    return fetchPublicPageText(
      new URL(location, url).toString(),
      userId,
      redirectCount + 1,
    );
  }
  if (!response.ok) {
    throw new Error(`The linked website returned ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  const body = (await response.text()).slice(0, 1_000_000);
  const rawContent = contentType.includes("html")
    ? extractReadablePageText(body, userId, url.toString())
    : body.trim().slice(0, 100_000);
  if (rawContent.length < 80) {
    throw new Error("The linked page did not contain enough readable text");
  }
  log.info("Read public link with direct extraction fallback", {
    userId,
    action: "read_public_link_directly",
    url: url.toString(),
    contentType,
    contentLength: rawContent.length,
    redirectCount,
    statusCode: response.status,
  });
  return { url: url.toString(), rawContent };
}

async function extractLinksDirectly(
  urls: string[],
  userId: string,
): Promise<TavilyExtractResult[]> {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        return await fetchPublicPageText(url, userId);
      } catch (error) {
        log.warn("Unable to read public link with direct fallback", {
          userId,
          action: "read_public_link_directly",
          url,
          error: error instanceof Error ? error.message : String(error),
        });
        return { url, failed: true };
      }
    }),
  );
  log.info("Completed direct fallback extraction for script links", {
    userId,
    action: "extract_script_source_links_directly",
    sourceCount: urls.length,
    successCount: results.filter(
      (result) => !("failed" in result) || !result.failed,
    ).length,
  });
  return results;
}

export async function tavilyExtract(
  urls: string[],
  userId: string,
): Promise<TavilyExtractResult[]> {
  log.info("Reading submitted script source links", {
    userId,
    action: "extract_script_source_links",
    sourceCount: urls.length,
  });
  const apiKey = getOptionalTavilyApiKey(userId);
  if (!apiKey) {
    log.warn("Tavily is not configured; using safe direct link extraction", {
      userId,
      action: "fallback_from_tavily_link_extraction",
      sourceCount: urls.length,
    });
    return extractLinksDirectly(urls, userId);
  }
  const response = await fetch(`${TAVILY_BASE_URL}/extract`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls,
      extract_depth: "advanced",
      format: "markdown",
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    log.warn("Tavily extraction failed; using safe direct extraction", {
      userId,
      action: "fallback_from_tavily_link_extraction",
      statusCode: response.status,
      error: error.slice(0, 500),
    });
    return extractLinksDirectly(urls, userId);
  }
  const body = (await response.json()) as {
    results?: Array<{
      url: string;
      raw_content?: string;
      failed?: boolean;
    }>;
  };
  const results = (body.results ?? []).map((item) => ({
    url: item.url,
    rawContent: item.raw_content,
    failed: item.failed,
  }));
  log.info("Read submitted script source links", {
    userId,
    action: "extract_script_source_links",
    sourceCount: results.length,
    statusCode: 200,
  });
  return results;
}

function getApiKey(): string {
  const key = process.env.WEB_SEARCH_API_KEY;
  if (!key) {
    log.error("WEB_SEARCH_API_KEY is missing in environment variables");
    throw new Error("WEB_SEARCH_API_KEY is required for Tavily");
  }
  return key;
}

function getClient() {
  const apiKey = getApiKey();
  return tavily({ apiKey });
}

export async function tavilySearch(
  query: string,
  options: TavilySearchOptions = {},
): Promise<TavilySearchResponse> {
  const client = getClient();
  log.info(`Executing search for query: ${query}`, { options });

  try {
    const response = await client.search(query, {
      searchDepth: options.searchDepth ?? "advanced",
      topic: options.topic ?? "news",
      timeRange: options.timeRange ?? "week",
      maxResults: options.maxResults ?? 5,
      includeAnswer: options.includeAnswer ?? false,
      includeRawContent: (options.includeRawContent ?? false) as any,
      includeFavicon: options.includeFavicon ?? true,
    });

    log.info(`Search completed for: ${query}`, {
      resultCount: response.results?.length,
      responseTime: response.responseTime,
    });

    return response as TavilySearchResponse;
  } catch (error) {
    log.error(`Search failed for: ${query}`, error);
    throw error;
  }
}

async function createResearchTask(
  input: string,
  options: TavilyResearchOptions = {},
): Promise<TavilyResearchResult> {
  const apiKey = getApiKey();
  log.info(`Creating research task for: ${input.substring(0, 50)}...`, {
    options,
  });

  const res = await fetch(`${TAVILY_BASE_URL}/research`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      model: options.model ?? "mini",
      stream: false,
      citation_format: options.citationFormat ?? "numbered",
      output_schema: options.outputSchema,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    log.error(`Failed to create research task: ${res.status}`, {
      response: text,
    });
    throw new Error(`Tavily research create failed: ${res.status} ${text}`);
  }

  const result = (await res.json()) as TavilyResearchResult;
  log.info(`Research task created successfully`, {
    requestId: result.request_id,
  });
  return result;
}

async function getResearchTaskStatus(
  requestId: string,
): Promise<TavilyResearchResult> {
  const apiKey = getApiKey();
  const res = await fetch(`${TAVILY_BASE_URL}/research/${requestId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    log.error(`Failed to get research task status: ${res.status}`, {
      requestId,
    });
    throw new Error(`Tavily research status failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TavilyResearchResult;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tavilyResearch(
  input: string,
  options: TavilyResearchOptions = {},
): Promise<TavilyResearchResult> {
  const task = await createResearchTask(input, options);
  const maxPolls = options.maxPolls ?? 15; // Increased slightly
  const pollIntervalMs = options.pollIntervalMs ?? 2000; // Increased interval

  log.info(`Starting poll for research task: ${task.request_id}`);

  for (let i = 0; i < maxPolls; i++) {
    const status = await getResearchTaskStatus(task.request_id);
    log.info(`Poll ${i + 1}/${maxPolls}: Status is ${status.status}`, {
      requestId: task.request_id,
    });

    if (status.status === "completed") {
      log.info(`Research task completed`, { requestId: task.request_id });
      return status;
    }

    if (status.status === "failed") {
      log.error(`Research task failed according to Tavily`, {
        requestId: task.request_id,
      });
      return status;
    }

    await sleep(pollIntervalMs);
  }

  log.warn(`Research task timed out after ${maxPolls} polls`, {
    requestId: task.request_id,
  });
  return task;
}
