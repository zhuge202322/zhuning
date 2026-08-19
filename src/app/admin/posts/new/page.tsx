import PostForm from '@/components/admin/PostForm';

export default function NewPostPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">新建文章</h2>
      <PostForm mode="create" />
    </div>
  );
}
