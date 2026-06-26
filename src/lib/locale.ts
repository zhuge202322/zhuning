/**
 * Server-side helper to read the current locale.
 * In components that already receive `params.locale`, prefer passing it explicitly.
 * This helper is for deeply nested utilities that don't want to thread locale through props.
 */
import { getLocale } from 'next-intl/server';
import type { Locale } from './cms';

export async function getCurrentLocale(): Promise<Locale> {
  try {
    const l = await getLocale();
    if (l === 'fr' || l === 'es' || l === 'ar') return l;
    return 'en';
  } catch {
    return 'en';
  }
}
