'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import RichEditor from './RichEditor';
import ImageUploader from './ImageUploader';
import TranslationTabs, { TranslationLocale } from './TranslationTabs';
import { slugify } from '@/lib/slug';

type LocaleStrings = Record<TranslationLocale, string>;
const EMPTY_LOCALE: LocaleStrings = { fr: '', es: '', ar: '' };

type Props = {
  mode: 'create' | 'edit';
  postId?: number;
  initial?: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featuredImage: string | null;
    authorName: string;
    date: string;
    translations?: {
      title: LocaleStrings;
      excerpt: LocaleStrings;
      content: LocaleStrings;
    };
  };
};

export default function PostForm({ mode, postId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '');
  const [content, setContent] = useState(initial?.content || '');
  const [featuredImage, setFeaturedImage] = useState<string | null>(initial?.featuredImage || null);
  const [authorName, setAuthorName] = useState(initial?.authorName || 'Myklens Team');
  const [date, setDate] = useState(initial?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [titleI18n, setTitleI18n] = useState<LocaleStrings>(initial?.translations?.title || EMPTY_LOCALE);
  const [excerptI18n, setExcerptI18n] = useState<LocaleStrings>(initial?.translations?.excerpt || EMPTY_LOCALE);
  const [contentI18n, setContentI18n] = useState<LocaleStrings>(initial?.translations?.content || EMPTY_LOCALE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function setLocale<L extends LocaleStrings>(setter: (v: L) => void, current: L) {
    return (locale: TranslationLocale, value: string) =>
      setter({ ...current, [locale]: value } as L);
  }

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const url = mode === 'create' ? '/api/admin/posts' : `/api/admin/posts/${postId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, slug, excerpt, content, featuredImage, authorName, date,
          titleFr: titleI18n.fr, titleEs: titleI18n.es, titleAr: titleI18n.ar,
          excerptFr: excerptI18n.fr, excerptEs: excerptI18n.es, excerptAr: excerptI18n.ar,
          contentFr: contentI18n.fr, contentEs: contentI18n.es, contentAr: contentI18n.ar,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Save failed');
        return;
      }
      router.push('/admin/posts');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/posts" className="inline-flex items-center gap-2 text-slate-600 font-medium hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold shadow hover:opacity-90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {busy ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 px-4 py-3">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Slug *</label>
            <input
              required
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 font-mono text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">URL: /news/{slug || '...'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Author</label>
              <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" />
            </div>
          </div>
        </div>
        <div>
          <ImageUploader value={featuredImage} onChange={setFeaturedImage} label="Featured image" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Excerpt</h3>
        <RichEditor value={excerpt} onChange={setExcerpt} minHeight={120} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Content</h3>
        <RichEditor value={content} onChange={setContent} minHeight={500} />
      </div>

      <TranslationTabs title="Translations (Post)">
        {(locale, isRtl) => (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Title ({locale})</label>
              <input
                value={titleI18n[locale]}
                onChange={(e) => setLocale(setTitleI18n, titleI18n)(locale, e.target.value)}
                placeholder="Leave empty to fall back to English"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                dir={isRtl ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Excerpt ({locale})</label>
              <RichEditor
                key={`excerpt-${locale}`}
                value={excerptI18n[locale]}
                onChange={(v) => setLocale(setExcerptI18n, excerptI18n)(locale, v)}
                minHeight={120}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Content ({locale})</label>
              <RichEditor
                key={`content-${locale}`}
                value={contentI18n[locale]}
                onChange={(v) => setLocale(setContentI18n, contentI18n)(locale, v)}
                minHeight={400}
              />
            </div>
          </>
        )}
      </TranslationTabs>
    </form>
  );
}
