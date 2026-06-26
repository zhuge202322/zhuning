'use client';

import { useRef, useState } from 'react';
import { Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';

export type ImageItem = { src: string; alt?: string };

type Props = {
  value: ImageItem[];
  onChange: (next: ImageItem[]) => void;
  label?: string;
};

export default function MultiImageUploader({ value, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function uploadFiles(files: FileList) {
    setBusy(true);
    const next = [...value];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        if (!res.ok) continue;
        const { url } = await res.json();
        next.push({ src: url, alt: '' });
      }
      onChange(next);
    } finally {
      setBusy(false);
    }
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      {label && <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {value.map((img, i) => (
          <div key={i} className="relative group bg-slate-50 rounded-xl overflow-hidden border border-slate-200 aspect-square">
            <img src={img.src} alt={img.alt || ''} className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button type="button" onClick={() => move(i, -1)} className="w-7 h-7 bg-white/90 rounded-md flex items-center justify-center" title="Move left"><ChevronLeft className="w-4 h-4" /></button>
              <button type="button" onClick={() => move(i, 1)} className="w-7 h-7 bg-white/90 rounded-md flex items-center justify-center" title="Move right"><ChevronRight className="w-4 h-4" /></button>
              <button type="button" onClick={() => remove(i)} className="w-7 h-7 bg-rose-600 text-white rounded-md flex items-center justify-center" title="Remove"><X className="w-4 h-4" /></button>
            </div>
            {i === 0 && <span className="absolute top-2 left-2 bg-brand-primary text-white text-xs font-bold px-2 py-0.5 rounded">Main</span>}
          </div>
        ))}

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="aspect-square border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:border-brand-primary hover:text-brand-primary text-sm font-medium gap-2 disabled:opacity-50"
        >
          <Upload className="w-6 h-6" />
          {busy ? 'Uploading...' : 'Add Images'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length) uploadFiles(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
