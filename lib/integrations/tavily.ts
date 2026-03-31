import { tavily } from "@tavily/core";

const TAVILY_BASE_URL = "https://api.tavily.com";

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

function getApiKey(): string {
  const key = process.env.WEB_SEARCH_API_KEY;
  if (!key) {
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
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse> {
  const client = getClient();
  const response = await client.search(query, {
    searchDepth: options.searchDepth ?? "advanced",
    topic: options.topic ?? "news",
    timeRange: options.timeRange ?? "week",
    maxResults: options.maxResults ?? 5,
    includeAnswer: options.includeAnswer ?? false,
    //Dangerous but keeps the type-check hint away
    includeRawContent: (options.includeRawContent ?? false) as any,
    includeFavicon: options.includeFavicon ?? true,
  });
  return response as TavilySearchResponse;
}

async function createResearchTask(
  input: string,
  options: TavilyResearchOptions = {}
): Promise<TavilyResearchResult> {
  const apiKey = getApiKey();
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
    throw new Error(`Tavily research create failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TavilyResearchResult;
}

async function getResearchTaskStatus(
  requestId: string
): Promise<TavilyResearchResult> {
  const apiKey = getApiKey();
  const res = await fetch(`${TAVILY_BASE_URL}/research/${requestId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily research status failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TavilyResearchResult;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function tavilyResearch(
  input: string,
  options: TavilyResearchOptions = {}
): Promise<TavilyResearchResult> {
  const task = await createResearchTask(input, options);
  const maxPolls = options.maxPolls ?? 10;
  const pollIntervalMs = options.pollIntervalMs ?? 1500;

  for (let i = 0; i < maxPolls; i++) {
    const status = await getResearchTaskStatus(task.request_id);
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
    await sleep(pollIntervalMs);
  }

  return task;
}
