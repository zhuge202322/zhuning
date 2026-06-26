'use client';

import { useState } from 'react';
import { Languages } from 'lucide-react';

export type TranslationLocale = 'fr' | 'es' | 'ar';

const LOCALE_META: Record<TranslationLocale, { label: string; flag: string }> = {
  fr: { label: 'Français', flag: '🇫🇷' },
  es: { label: 'Español',  flag: '🇪🇸' },
  ar: { label: 'العربية',  flag: '🇸🇦' },
};

export default function TranslationTabs({
  title = 'Translations',
  children,
}: {
  title?: string;
  children: (locale: TranslationLocale, isRtl: boolean) => React.ReactNode;
}) {
  const [active, setActive] = useState<TranslationLocale>('fr');
  const isRtl = active === 'ar';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Languages className="w-4 h-4 text-brand-primary" /> {title}
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(Object.keys(LOCALE_META) as TranslationLocale[]).map((l) => {
            const isActive = l === active;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setActive(l)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  isActive ? 'bg-white text-brand-primary shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{LOCALE_META[l].flag}</span>
                <span>{LOCALE_META[l].label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div dir={isRtl ? 'rtl' : 'ltr'} className="space-y-4">
        {children(active, isRtl)}
      </div>
    </div>
  );
}
