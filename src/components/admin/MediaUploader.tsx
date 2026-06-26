'use client';

import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Film } from 'lucide-react';

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  kind?: 'image' | 'video';
};

export default function MediaUploader({ value, onChange, label, kind = 'image' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const [progressText, setProgressText] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setProgressText('Preparing...');
    try {
      const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB 一个切片，远远低于 10MB 的限制，100% 安全
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const uploadId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      let uploadedUrl = '';

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        setProgressText(`Uploading: ${Math.round((chunkIndex / totalChunks) * 100)}% (${chunkIndex + 1}/${totalChunks})`);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-filename': encodeURIComponent(file.name),
            'x-upload-id': uploadId,
            'x-chunk-index': chunkIndex.toString(),
            'x-chunk-total': totalChunks.toString(),
          },
          body: chunkBlob,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          alert(`Upload failed at chunk ${chunkIndex + 1}: ${errData.error || res.statusText || 'Unknown error'}`);
          return;
        }

        const data = await res.json();
        if (data.url) {
          uploadedUrl = data.url;
        }
      }

      setProgressText('Success!');
      if (uploadedUrl) {
        onChange(uploadedUrl);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Upload error: ${e.message || 'connection failed'}`);
    } finally {
      setBusy(false);
      setProgressText('');
    }
  }

  const isVideo = kind === 'video';

  return (
    <div>
      {label && <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>}
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
          {value ? (
            isVideo ? (
              <video src={value} className="w-full h-full object-cover" muted playsInline loop />
            ) : (
              <img src={value} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            isVideo ? (
              <Film className="w-8 h-8 text-slate-300" />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-300" />
            )
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {busy ? (progressText || 'Uploading...') : isVideo ? 'Upload Video' : 'Upload Image'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-2 text-rose-600 text-sm font-medium hover:underline"
            >
              <X className="w-4 h-4" /> Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={isVideo ? 'video/*' : 'image/*'}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
