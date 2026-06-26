import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PostForm from '@/components/admin/PostForm';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pid = Number(id);
  if (Number.isNaN(pid)) notFound();

  const post = await prisma.post.findUnique({ where: { id: pid } });
  if (!post) notFound();

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-6">Edit Post</h2>
      <PostForm
        mode="edit"
        postId={post.id}
        initial={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          featuredImage: post.featuredImage,
          authorName: post.authorName,
          date: post.date.toISOString(),
          translations: {
            title:   { fr: (post as any).titleFr   || '', es: (post as any).titleEs   || '', ar: (post as any).titleAr   || '' },
            excerpt: { fr: (post as any).excerptFr || '', es: (post as any).excerptEs || '', ar: (post as any).excerptAr || '' },
            content: { fr: (post as any).contentFr || '', es: (post as any).contentEs || '', ar: (post as any).contentAr || '' },
          },
        }}
      />
    </div>
  );
}
