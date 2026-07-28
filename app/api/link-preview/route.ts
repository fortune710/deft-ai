import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { logger } from '@/lib/logger.server';

export const runtime = 'nodejs';

const log = logger.child({ file: 'app/api/link-preview/route.ts' });

function isPrivateAddress(address: string, userId: string) {
  const normalized = address.toLowerCase();
  const privateAddress = normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
    || /^127\./.test(normalized)
    || /^10\./.test(normalized)
    || /^192\.168\./.test(normalized)
    || /^169\.254\./.test(normalized)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized);
  log.debug('Checked link preview address safety', { userId, action: 'check_link_preview_address_safety', address, privateAddress });
  return privateAddress;
}

async function assertPublicUrl(value: string, userId: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Only public HTTP links are supported');
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) throw new Error('Local links are not supported');
  const addresses = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address, userId))) throw new Error('Private network links are not supported');
  log.info('Validated public link preview URL', { userId, action: 'validate_link_preview_url', hostname: url.hostname });
  return url;
}

function decodeHtml(value: string, userId: string) {
  const decoded = value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  log.debug('Decoded link preview metadata', { userId, action: 'decode_link_preview_metadata', valueLength: value.length });
  return decoded;
}

function readMeta(html: string, key: string, userId: string) {
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  let value = '';
  for (const tag of metaTags) {
    const name = tag.match(/(?:property|name)\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (name?.toLowerCase() !== key.toLowerCase()) continue;
    value = tag.match(/content\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '';
    if (value) break;
  }
  log.debug('Read link preview metadata field', { userId, action: 'read_link_preview_metadata_field', key, found: Boolean(value) });
  return decodeHtml(value, userId);
}

async function fetchPage(url: URL, userId: string, redirectCount = 0): Promise<{ html: string; finalUrl: URL }> {
  if (redirectCount > 3) throw new Error('Too many redirects');
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': 'DeftLinkPreview/1.0', Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) throw new Error('The link redirected without a destination');
    const nextUrl = await assertPublicUrl(new URL(location, url).toString(), userId);
    return fetchPage(nextUrl, userId, redirectCount + 1);
  }
  if (!response.ok) throw new Error(`The website returned ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error('The link is not an HTML page');
  const html = (await response.text()).slice(0, 1_000_000);
  log.info('Fetched link preview page', { userId, action: 'fetch_link_preview_page', statusCode: response.status, hostname: url.hostname, redirectCount });
  return { html, finalUrl: url };
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as { url?: string };
    const url = await assertPublicUrl(body.url ?? '', userId);
    const { html, finalUrl } = await fetchPage(url, userId);
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '';
    const title = readMeta(html, 'og:title', userId) || decodeHtml(titleTag, userId) || finalUrl.hostname;
    const description = readMeta(html, 'og:description', userId) || readMeta(html, 'description', userId);
    const rawImage = readMeta(html, 'og:image', userId);
    const image = rawImage ? new URL(rawImage, finalUrl).toString() : null;
    const siteName = readMeta(html, 'og:site_name', userId) || finalUrl.hostname;
    log.info('Created rich link preview', { userId, action: 'create_link_preview', hostname: finalUrl.hostname, hasImage: Boolean(image), statusCode: 200 });
    return NextResponse.json({ url: finalUrl.toString(), title, description, image, siteName });
  } catch (error) {
    log.warn('Unable to create rich link preview', { userId, action: 'create_link_preview', statusCode: 422, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to preview link' }, { status: 422 });
  }
}
