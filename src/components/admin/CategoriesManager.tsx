'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, Save, Trash2, X } from 'lucide-react';
import ImageUploader from './ImageUploader';
import { slugify } from '@/lib/slug';

type Cat = {
  id: number;
  name: string;
  nameFr: string;
  nameEs: string;
  nameAr: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
  parentId: number | null;
  depth: number;
  pathLabel: string;
  childCount: number;
};

function parentOptions(categories: Cat[], cat?: Cat) {
  if (!cat) return categories.filter((item) => item.depth < 3);
  const descendants = new Set(categories.filter((item) => item.pathLabel.startsWith(`${cat.pathLabel} / `)).map((item) => item.id));
  const subtreeDepth = Math.max(0, ...categories.filter((item) => item.id === cat.id || descendants.has(item.id)).map((item) => item.depth - cat.depth));
  return categories.filter((item) => item.id !== cat.id && !descendants.has(item.id) && item.depth + 1 + subtreeDepth <= 3);
}

export default function CategoriesManager({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function resetCreate() {
    setAdding(false);
    setNewName('');
    setNewSlug('');
    setNewImage(null);
    setNewParentId(null);
  }

  async function createCat(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, slug: newSlug || slugify(newName), imageUrl: newImage, parentId: newParentId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || '分类创建失败');
        return;
      }
      resetCreate();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-bold text-slate-800">全部分类（{initial.length}）</h3>
            <p className="mt-1 text-xs text-slate-500">支持顶级分类和最多三级子分类。</p>
          </div>
          {!adding && (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              <Plus className="h-4 w-4" /> 新建分类
            </button>
          )}
        </div>

        {adding && (
          <form onSubmit={createCat} className="grid grid-cols-1 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 md:grid-cols-2">
            <div className="md:col-span-2"><ImageUploader value={newImage} onChange={setNewImage} label="分类图片" /></div>
            <Field label="分类名称"><input required value={newName} onChange={(event) => { setNewName(event.target.value); if (!newSlug) setNewSlug(slugify(event.target.value)); }} className="admin-input" /></Field>
            <Field label="分类别名"><input required value={newSlug} onChange={(event) => setNewSlug(event.target.value)} className="admin-input font-mono" /></Field>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-slate-700">父分类</label>
              <select value={newParentId ?? ''} onChange={(event) => setNewParentId(event.target.value ? Number(event.target.value) : null)} className="admin-input">
                <option value="">无（创建顶级分类）</option>
                {parentOptions(initial).map((item) => <option key={item.id} value={item.id}>{'　'.repeat(item.depth)}{item.pathLabel}</option>)}
              </select>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{busy ? '保存中...' : '保存'}</button>
              <button type="button" onClick={resetCreate} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" />取消</button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {initial.map((category) => <CategoryRow key={category.id} cat={category} categories={initial} />)}
          {initial.length === 0 && <div className="px-6 py-8 text-center text-slate-400">暂无产品分类。</div>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>{children}</div>;
}

function CategoryRow({ cat, categories }: { cat: Cat; categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [nameFr, setNameFr] = useState(cat.nameFr);
  const [nameEs, setNameEs] = useState(cat.nameEs);
  const [nameAr, setNameAr] = useState(cat.nameAr);
  const [slug, setSlug] = useState(cat.slug);
  const [imageUrl, setImageUrl] = useState<string | null>(cat.imageUrl);
  const [parentId, setParentId] = useState<number | null>(cat.parentId);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, imageUrl, nameFr, nameEs, nameAr, parentId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || '保存失败');
        return;
      }
      setEditing(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm(`确定删除分类“${cat.name}”吗？`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error || '删除失败');
        return;
      }
      router.refresh();
    } finally { setBusy(false); }
  }

  if (editing) {
    return (
      <div className="grid grid-cols-1 gap-4 bg-amber-50/50 px-6 py-4 md:grid-cols-2" style={{ paddingLeft: `${24 + cat.depth * 24}px` }}>
        <div className="md:col-span-2"><ImageUploader value={imageUrl} onChange={setImageUrl} label="分类图片" /></div>
        <Field label="分类名称"><input value={name} onChange={(event) => setName(event.target.value)} className="admin-input" /></Field>
        <Field label="分类别名"><input value={slug} onChange={(event) => setSlug(event.target.value)} className="admin-input font-mono" /></Field>
        <Field label="名称（法语）"><input value={nameFr} onChange={(event) => setNameFr(event.target.value)} className="admin-input" /></Field>
        <Field label="名称（西班牙语）"><input value={nameEs} onChange={(event) => setNameEs(event.target.value)} className="admin-input" /></Field>
        <Field label="名称（阿拉伯语）"><input value={nameAr} dir="rtl" onChange={(event) => setNameAr(event.target.value)} className="admin-input" /></Field>
        <Field label="父分类">
          <select value={parentId ?? ''} onChange={(event) => setParentId(event.target.value ? Number(event.target.value) : null)} className="admin-input">
            <option value="">无（顶级分类）</option>
            {parentOptions(categories, cat).map((item) => <option key={item.id} value={item.id}>{'　'.repeat(item.depth)}{item.pathLabel}</option>)}
          </select>
        </Field>
        <div className="flex gap-2 md:col-span-2">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{busy ? '保存中...' : '保存'}</button>
          <button onClick={() => setEditing(false)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" />取消</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4" style={{ paddingLeft: `${24 + cat.depth * 28}px` }}>
      {cat.depth > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">{cat.imageUrl && <img src={cat.imageUrl} alt="" className="h-full w-full object-cover" />}</div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-slate-800">{cat.name}</div>
        <div className="truncate text-xs text-slate-500">{cat.pathLabel}</div>
        <div className="font-mono text-xs text-slate-400">{cat.slug}</div>
      </div>
      <div className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{cat.productCount} 个产品 · {cat.childCount} 个子分类</div>
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-sm font-bold text-brand-primary hover:underline">编辑</button>
        <button onClick={remove} disabled={busy || cat.childCount > 0} title={cat.childCount > 0 ? '请先删除或移动子分类' : '删除分类'} className="inline-flex items-center text-sm font-bold text-rose-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="mr-1 h-3.5 w-3.5" />删除</button>
      </div>
    </div>
  );
}
