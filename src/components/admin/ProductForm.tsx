'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RichEditor from './RichEditor';
import MultiImageUploader, { ImageItem } from './MultiImageUploader';
import ImageUploader from './ImageUploader';
import TranslationTabs, { TranslationLocale } from './TranslationTabs';
import { slugify } from '@/lib/slug';
import { Save, ArrowLeft, Plus, Trash2, Layers, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { LOCALE_LABEL } from './admin-labels';

type Category = { id: number; name: string };

type LocaleStrings = Record<TranslationLocale, string>;

export type SkuItem = {
  id?: number;
  tempId?: string; // 唯一临时 id 用于添加/删除
  name: string;
  nameFr?: string;
  nameEs?: string;
  nameAr?: string;
  image: string;
  images?: ImageItem[];
  price?: string;
  size?: string;
};

type Props = {
  mode: 'create' | 'edit';
  productId?: number;
  initial?: {
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    specs?: string;
    specsPdf?: string;
    formula?: string;
    formulaPdf?: string;
    featured?: boolean;
    images: ImageItem[];
    categoryIds: number[];
    skus?: SkuItem[];
    translations?: {
      name: LocaleStrings;
      shortDescription: LocaleStrings;
      description: LocaleStrings;
      specs?: LocaleStrings;
      formula?: LocaleStrings;
    };
  };
  categories: Category[];
};

const EMPTY_LOCALE: LocaleStrings = { fr: '', es: '', ar: '' };

export default function ProductForm({ mode, productId, initial, categories }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [specs, setSpecs] = useState(initial?.specs || '');
  const [specsPdf, setSpecsPdf] = useState(initial?.specsPdf || '');
  const [formula, setFormula] = useState(initial?.formula || '');
  const [formulaPdf, setFormulaPdf] = useState(initial?.formulaPdf || '');
  const [featured, setFeatured] = useState(!!initial?.featured);
  const [images, setImages] = useState<ImageItem[]>(initial?.images || []);
  const [categoryIds, setCategoryIds] = useState<number[]>(initial?.categoryIds || []);
  const [skus, setSkus] = useState<SkuItem[]>(
    initial?.skus?.map((s) => ({ ...s, tempId: s.id?.toString() || Math.random().toString() })) || []
  );
  const [nameI18n, setNameI18n] = useState<LocaleStrings>(initial?.translations?.name || EMPTY_LOCALE);
  const [shortDescI18n, setShortDescI18n] = useState<LocaleStrings>(initial?.translations?.shortDescription || EMPTY_LOCALE);
  const [descI18n, setDescI18n] = useState<LocaleStrings>(initial?.translations?.description || EMPTY_LOCALE);
  const [specsI18n, setSpecsI18n] = useState<LocaleStrings>((initial?.translations as any)?.specs || EMPTY_LOCALE);
  const [formulaI18n, setFormulaI18n] = useState<LocaleStrings>((initial?.translations as any)?.formula || EMPTY_LOCALE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function setLocale<L extends LocaleStrings>(setter: (v: L) => void, current: L) {
    return (locale: TranslationLocale, value: string) =>
      setter({ ...current, [locale]: value } as L);
  }

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function toggleCategory(id: number) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addSku() {
    setSkus((prev) => [
      ...prev,
      {
        tempId: Math.random().toString(),
        name: '',
        nameFr: '',
        nameEs: '',
        nameAr: '',
        image: '',
        images: [],
        price: '',
        size: '',
      },
    ]);
  }

  function removeSku(tempId: string) {
    setSkus((prev) => prev.filter((s) => s.tempId !== tempId));
  }

  function updateSku(tempId: string, key: keyof SkuItem, val: any) {
    setSkus((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [key]: val } : s))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const url = mode === 'create' ? '/api/admin/products' : `/api/admin/products/${productId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          shortDescription,
          description,
          specs,
          specsPdf,
          formula,
          formulaPdf,
          images,
          categoryIds,
          featured,
          skus: skus.map((s) => ({
            name: s.name,
            nameFr: s.nameFr || '',
            nameEs: s.nameEs || '',
            nameAr: s.nameAr || '',
            image: s.images?.length ? s.images[0].src : (s.image || ''),
            images: s.images?.map((img: any) => img.src) || [],
            price: s.price || '',
            size: s.size || '',
          })),
          nameFr: nameI18n.fr, nameEs: nameI18n.es, nameAr: nameI18n.ar,
          shortDescriptionFr: shortDescI18n.fr,
          shortDescriptionEs: shortDescI18n.es,
          shortDescriptionAr: shortDescI18n.ar,
          descriptionFr: descI18n.fr,
          descriptionEs: descI18n.es,
          descriptionAr: descI18n.ar,
          specsFr: specsI18n.fr,
          specsEs: specsI18n.es,
          specsAr: specsI18n.ar,
          formulaFr: formulaI18n.fr,
          formulaEs: formulaI18n.es,
          formulaAr: formulaI18n.ar,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || '产品保存失败');
        return;
      }
      router.push('/admin/products');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/products" className="inline-flex items-center gap-2 text-slate-600 font-medium hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> 返回
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold shadow hover:opacity-90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {busy ? '保存中...' : mode === 'create' ? '创建产品' : '更新产品'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-xl border border-red-200 px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">产品名称 *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">产品别名 *</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 font-mono text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">用于产品链接：/product/{slug || '...'}</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">产品类目</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = categoryIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-brand-primary'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
            {categories.length === 0 && (
              <span className="text-sm text-slate-400">暂无产品类目。</span>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 rounded text-brand-primary border-slate-300 focus:ring-brand-primary/20"
            />
            <div>
              <span className="text-sm font-bold text-slate-700 block">推荐产品</span>
              <span className="text-xs text-slate-500 block">勾选后该产品会显示在首页热门推荐区域</span>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">产品图片</h3>
        <MultiImageUploader value={images} onChange={setImages} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700">多 SKU 规格与变体管理</h3>
            <p className="text-xs text-slate-500 mt-1">
              在这里可以为该产品添加多种不同的规格变体。每个变体有它对应的**主图**、**各语言下的规格名称**、价格和尺寸。
            </p>
          </div>
          <button
            type="button"
            onClick={addSku}
            className="inline-flex items-center gap-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary px-3.5 py-1.5 rounded-lg text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" /> 添加变体 SKU
          </button>
        </div>

        {skus.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
            目前没有任何规格变体。点击右上角“添加变体 SKU”按钮新增。
          </div>
        ) : (
          <div className="space-y-6">
            {skus.map((sku, index) => (
              <div
                key={sku.tempId}
                className="relative border border-slate-200 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50 transition space-y-6"
              >
                {/* 变体详情删除按钮 */}
                <button
                  type="button"
                  onClick={() => removeSku(sku.tempId!)}
                  className="absolute top-4 right-4 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition z-10"
                  title="删除该规格变体"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                {/* 变体多张图片画廊上传 */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <span className="text-xs text-slate-600 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-brand-primary" /> 变体图片画廊 (支持上传多张并拖拽排序) *
                  </span>
                  <MultiImageUploader
                    value={sku.images || []}
                    onChange={(imgList) => updateSku(sku.tempId!, 'images', imgList)}
                  />
                </div>

                {/* 变体详情填写 */}
                <div className="space-y-4 relative pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">变体名称 (英文 / 默认) *</label>
                      <input
                        type="text"
                        required
                        placeholder="例如: 100g Box"
                        value={sku.name}
                        onChange={(e) => updateSku(sku.tempId!, 'name', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">变体名称 (法语)</label>
                      <input
                        type="text"
                        placeholder="例如: Boîte de 100g"
                        value={sku.nameFr || ''}
                        onChange={(e) => updateSku(sku.tempId!, 'nameFr', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">变体名称 (西班牙语)</label>
                      <input
                        type="text"
                        placeholder="例如: Caja de 100g"
                        value={sku.nameEs || ''}
                        onChange={(e) => updateSku(sku.tempId!, 'nameEs', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">变体名称 (阿拉伯语)</label>
                      <input
                        type="text"
                        placeholder="例如: علبة 100 جرام"
                        dir="rtl"
                        value={sku.nameAr || ''}
                        onChange={(e) => updateSku(sku.tempId!, 'nameAr', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">显示价格（可选）</label>
                      <input
                        type="text"
                        placeholder="例如: $12.99"
                        value={sku.price || ''}
                        onChange={(e) => updateSku(sku.tempId!, 'price', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">尺寸/容量（可选）</label>
                      <input
                        type="text"
                        placeholder="例如: 100g / 500ml"
                        value={sku.size || ''}
                        onChange={(e) => updateSku(sku.tempId!, 'size', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-brand-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">简短描述</h3>
        <RichEditor value={shortDescription} onChange={setShortDescription} minHeight={150} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">完整描述</h3>
        <RichEditor value={description} onChange={setDescription} minHeight={400} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">规格与包装（英文 / 默认）</h3>
        <RichEditor value={specs} onChange={setSpecs} minHeight={300} />
        
        {/* PDF Spec 附件上传区 */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">规格与包装（PDF 附件 - 可选）</label>
          <div className="flex items-center gap-3">
            <input type="url" value={specsPdf} onChange={(event) => setSpecsPdf(event.target.value)} placeholder="PDF 链接" className="min-w-64 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-primary" />

            {specsPdf && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href={specsPdf} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-brand-primary truncate max-w-xs">
                  {specsPdf.split('/').pop()}
                </a>
                <button
                  type="button"
                  onClick={() => setSpecsPdf('')}
                  className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">配方与 MSDS（英文 / 默认）</h3>
        <RichEditor value={formula} onChange={setFormula} minHeight={300} />

        {/* PDF Formula 附件上传区 */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">配方与 MSDS / COA（PDF 附件 - 可选）</label>
          <div className="flex items-center gap-3">
            <input type="url" value={formulaPdf} onChange={(event) => setFormulaPdf(event.target.value)} placeholder="PDF 链接" className="min-w-64 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-primary" />

            {formulaPdf && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                <a href={formulaPdf} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-brand-primary truncate max-w-xs">
                  {formulaPdf.split('/').pop()}
                </a>
                <button
                  type="button"
                  onClick={() => setFormulaPdf('')}
                  className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <TranslationTabs title="产品多语言翻译">
        {(locale, isRtl) => (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">产品名称（{LOCALE_LABEL[locale]}）</label>
              <input
                type="text"
                value={nameI18n[locale]}
                onChange={(e) => setLocale(setNameI18n, nameI18n)(locale, e.target.value)}
                placeholder="留空时使用英文默认内容"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                dir={isRtl ? 'rtl' : 'ltr'}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">简短描述（{LOCALE_LABEL[locale]}）</label>
              <RichEditor
                key={`short-${locale}`}
                value={shortDescI18n[locale]}
                onChange={(v) => setLocale(setShortDescI18n, shortDescI18n)(locale, v)}
                minHeight={120}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">完整描述（{LOCALE_LABEL[locale]}）</label>
              <RichEditor
                key={`desc-${locale}`}
                value={descI18n[locale]}
                onChange={(v) => setLocale(setDescI18n, descI18n)(locale, v)}
                minHeight={300}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">规格与包装（{LOCALE_LABEL[locale]}）</label>
              <RichEditor
                key={`specs-${locale}`}
                value={specsI18n[locale]}
                onChange={(v) => setLocale(setSpecsI18n, specsI18n)(locale, v)}
                minHeight={200}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">配方与 MSDS（{LOCALE_LABEL[locale]}）</label>
              <RichEditor
                key={`formula-${locale}`}
                value={formulaI18n[locale]}
                onChange={(v) => setLocale(setFormulaI18n, formulaI18n)(locale, v)}
                minHeight={200}
              />
            </div>
          </>
        )}
      </TranslationTabs>
    </form>
  );
}
