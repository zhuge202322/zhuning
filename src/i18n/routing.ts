import { defineRouting } from 'next-intl/routing';

export const LOCALES = ['en', 'fr', 'es', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇺🇸',
  fr: '🇫🇷',
  es: '🇪🇸',
  ar: '🇸🇦',
};

export const RTL_LOCALES: Locale[] = ['ar'];

export const isRtl = (locale: string) => RTL_LOCALES.includes(locale as Locale);

export const routing = defineRouting({
  locales: LOCALES as readonly string[] as string[],
  defaultLocale: 'en',
  localePrefix: 'always',
});
