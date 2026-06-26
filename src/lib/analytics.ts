import crypto from 'node:crypto';

const IP_SECRET = process.env.ANALYTICS_IP_SECRET || 'myklens-ip-salt-change-me';

/**
 * Detect traffic source from referrer + URL params.
 * - fbclid present  -> facebook_ads
 * - gclid present   -> google_ads
 * - utm_source=...  -> normalized from utm_source
 * - referrer host   -> google / facebook / bing / other
 * - none            -> direct
 */
export function detectSource(opts: {
  url: string;
  referrer?: string;
  utm: { source: string; medium: string; campaign: string };
}): string {
  const u = (() => {
    try { return new URL(opts.url); } catch { return null; }
  })();
  const params = u?.searchParams;

  if (params?.has('fbclid')) return 'facebook_ads';
  if (params?.has('gclid')) return 'google_ads';

  const us = (opts.utm.source || '').toLowerCase();
  if (us) {
    if (us.includes('facebook') || us === 'fb') {
      return opts.utm.medium?.toLowerCase().includes('cpc') ? 'facebook_ads' : 'facebook';
    }
    if (us.includes('google')) {
      return opts.utm.medium?.toLowerCase().includes('cpc') ? 'google_ads' : 'google';
    }
    if (us.includes('bing')) return 'bing';
    if (us.includes('instagram') || us === 'ig') return 'instagram';
    if (us.includes('youtube') || us === 'yt') return 'youtube';
    if (us.includes('tiktok')) return 'tiktok';
    return us;
  }

  const ref = opts.referrer || '';
  if (ref) {
    try {
      const host = new URL(ref).hostname.toLowerCase();
      if (/(^|\.)google\./.test(host)) return 'google';
      if (/(^|\.)bing\./.test(host)) return 'bing';
      if (/(^|\.)yahoo\./.test(host)) return 'yahoo';
      if (/(^|\.)duckduckgo\./.test(host)) return 'duckduckgo';
      if (/(^|\.)(facebook|fb)\./.test(host)) return 'facebook';
      if (/(^|\.)instagram\./.test(host)) return 'instagram';
      if (/(^|\.)youtube\./.test(host)) return 'youtube';
      if (/(^|\.)tiktok\./.test(host)) return 'tiktok';
      if (/(^|\.)t\.co/.test(host) || /(^|\.)twitter\./.test(host) || /(^|\.)x\.com/.test(host)) return 'twitter';
      return 'referral';
    } catch {
      // ignore
    }
  }
  return 'direct';
}

const BOT_PATTERNS = /(bot|crawl|spider|slurp|baiduspider|bingpreview|facebookexternal|whatsapp|preview|monitor|http-?client|axios|curl|wget|node-fetch|headless)/i;

export function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.test(userAgent);
}

export function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return 'tablet';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua)) return 'mobile';
  return 'desktop';
}

export function hashIp(ip: string): string {
  if (!ip) return '';
  return crypto.createHash('sha256').update(ip + IP_SECRET).digest('hex').slice(0, 32);
}

export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return headers.get('x-real-ip') || '';
}
