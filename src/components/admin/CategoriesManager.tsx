'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2, X } from 'lucide-react';
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
};

export default function CategoriesManager({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createCat(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, slug: newSlug || slugify(newName), imageUrl: newImage }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Create failed');
        return;
      }
      setAdding(false);
      setNewName(''); setNewSlug(''); setNewImage(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">All Categories ({initial.length})</h3>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> New Category
            </button>
          )}
        </div>

        {adding && (
          <form onSubmit={createCat} className="px-6 py-4 border-b border-slate-100 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <ImageUploader value={newImage} onChange={setNewImage} label="Category image" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
              <input
                required
                value={newName}
                onChange={(e) => { setNewName(e.target.value); if (!newSlug) setNewSlug(slugify(e.target.value)); }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Slug</label>
              <input
                required
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 font-mono text-sm"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50">
                <Save className="w-4 h-4" /> {busy ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => { setAdding(false); setNewName(''); setNewSlug(''); setNewImage(null); }} className="inline-flex items-center gap-2 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-100">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {initial.map((c) => (
            <CategoryRow key={c.id} cat={c} />
          ))}
          {initial.length === 0 && (
            <div className="px-6 py-8 text-center text-slate-400">No categories yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ cat }: { cat: Cat }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [nameFr, setNameFr] = useState(cat.nameFr);
  const [nameEs, setNameEs] = useState(cat.nameEs);
  const [nameAr, setNameAr] = useState(cat.nameAr);
  const [slug, setSlug] = useState(cat.slug);
  const [imageUrl, setImageUrl] = useState<string | null>(cat.imageUrl);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, imageUrl, nameFr, nameEs, nameAr }),
      });
      if (!res.ok) {
        alert('Save failed');
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete category "${cat.name}"? Products will be unlinked.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Delete failed'); return; }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="px-6 py-4 bg-amber-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ImageUploader value={imageUrl} onChange={setImageUrl} label="Category image" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary font-mono" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Name (FR) 🇫🇷</label>
          <input value={nameFr} onChange={(e) => setNameFr(e.target.value)} placeholder="— falls back to English" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Name (ES) 🇪🇸</label>
          <input value={nameEs} onChange={(e) => setNameEs(e.target.value)} placeholder="— falls back to English" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-500 mb-1">Name (AR) 🇸🇦</label>
          <input value={nameAr} dir="rtl" onChange={(e) => setNameAr(e.target.value)} placeholder="— falls back to English" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-primary" />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {busy ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setName(cat.name); setSlug(cat.slug); setImageUrl(cat.imageUrl); setNameFr(cat.nameFr); setNameEs(cat.nameEs); setNameAr(cat.nameAr); }} className="inline-flex items-center gap-2 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 shrink-0">
        {cat.imageUrl && <img src={cat.imageUrl} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800">{cat.name}</div>
        <div className="text-xs text-slate-500 font-mono">{cat.slug}</div>
      </div>
      <div className="text-xs font-bold text-slate-500 px-2 py-1 rounded-full bg-slate-100">
        {cat.productCount} products
      </div>
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-brand-primary font-bold text-sm hover:underline">Edit</button>
        <button onClick={remove} disabled={busy} className="inline-flex items-center text-rose-600 font-bold text-sm hover:underline disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
        </button>
      </div>
    </div>
  );
}
