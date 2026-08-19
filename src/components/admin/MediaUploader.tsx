'use client';

import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Film, FolderOpen } from 'lucide-react';
import MediaPicker, { type MediaAsset } from './MediaPicker';
import { uploadMediaAsset } from './uploadMediaAsset';

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
  const [pickerOpen, setPickerOpen] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setProgressText('Uploading...');
    try {
      const asset = await uploadMediaAsset(file);
      onChange(asset.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed');
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
          <button type="button" disabled={busy} onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FolderOpen className="h-4 w-4" /> Choose from library</button>
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
        accept={isVideo ? 'video/mp4' : 'image/jpeg,image/png,image/webp,image/avif'}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
      />
      <MediaPicker open={pickerOpen} kind={kind} onClose={() => setPickerOpen(false)} onSelect={(asset: MediaAsset) => onChange(asset.url)} />
    </div>
  );
}
