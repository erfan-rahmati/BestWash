import { BlogDetail } from "../../../../components/customer/blog-detail";
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="px-5 pb-6 pt-6">
      <BlogDetail slug={slug} />
    </div>
  );
}
