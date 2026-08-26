import { BlogList } from "../../../components/customer/blog-list";
import { PageHeading } from "../../../components/ui/page-heading";
export default function BlogPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <PageHeading
        eyebrow="مجله BestWash"
        title="راهنما و دانستنی‌ها"
        description="مطالب کوتاه و کاربردی درباره مراقبت از خودرو و رزرو هوشمند."
      />
      <div className="mt-6">
        <BlogList />
      </div>
    </div>
  );
}
