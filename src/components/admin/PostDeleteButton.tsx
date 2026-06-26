'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PostDeleteButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(`Delete post "${title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) { alert('Delete failed'); return; }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={onClick} disabled={busy} className="text-rose-600 font-bold hover:underline disabled:opacity-50">
      {busy ? 'Deleting...' : 'Delete'}
    </button>
  );
}
