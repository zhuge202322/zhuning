'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useRef } from 'react';
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Link as LinkIcon, Image as ImageIcon,
  Undo2, Redo2, Code,
} from 'lucide-react';
import { uploadMediaAsset } from './uploadMediaAsset';

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
};

export default function RichEditor({ value, onChange, minHeight = 300 }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none px-4 py-3',
        style: `min-height: ${minHeight}px;`,
      },
    },
  });

  if (!editor) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white p-4 text-slate-400 text-sm">
        编辑器加载中...
      </div>
    );
  }

  async function uploadAndInsert(file: File) {
    try {
      const asset = await uploadMediaAsset(file);
      editor?.chain().focus().setImage({ src: asset.url, alt: asset.alt }).run();
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败');
    }
  }

  function pickImage() {
    fileInputRef.current?.click();
  }

  function setLink() {
    const previous = editor?.getAttributes('link').href;
      const url = window.prompt('请输入链接地址', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  const Btn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition ${
        active ? 'bg-brand-primary text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-slate-200 bg-slate-50">
        <Btn title="粗体" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><Bold className="w-4 h-4" /></Btn>
        <Btn title="斜体" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="w-4 h-4" /></Btn>
        <Btn title="删除线" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="w-4 h-4" /></Btn>
        <Btn title="代码" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}><Code className="w-4 h-4" /></Btn>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <Btn title="一级标题" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}><Heading1 className="w-4 h-4" /></Btn>
        <Btn title="二级标题" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="w-4 h-4" /></Btn>
        <Btn title="三级标题" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="w-4 h-4" /></Btn>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <Btn title="无序列表" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="w-4 h-4" /></Btn>
        <Btn title="有序列表" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="w-4 h-4" /></Btn>
        <Btn title="引用" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="w-4 h-4" /></Btn>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <Btn title="链接" onClick={setLink} active={editor.isActive('link')}><LinkIcon className="w-4 h-4" /></Btn>
        <Btn title="图片" onClick={pickImage}><ImageIcon className="w-4 h-4" /></Btn>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <Btn title="撤销" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></Btn>
        <Btn title="重做" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></Btn>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadAndInsert(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
