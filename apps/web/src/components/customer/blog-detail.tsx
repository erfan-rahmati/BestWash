"use client";

/* eslint-disable @next/next/no-img-element -- article media URLs are managed dynamically by administrators. */

import { ArrowRight, BookOpen, Clock3, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBlogPost, type BlogPostSummary } from "../../lib/api/account";
import { formatDate } from "../../lib/format";

type Post = BlogPostSummary & { content: string; seoTitle: string | null };
type Block = {
  id?: string;
  type: "paragraph" | "heading" | "image" | "table";
  content?: string;
  url?: string;
  alt?: string;
  rows?: string[][];
};

export function BlogDetail({ slug }: { slug: string }) {
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  useEffect(() => {
    void getBlogPost(slug)
      .then(setPost)
      .catch(() => setPost(null));
  }, [slug]);
  if (post === undefined)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (!post)
    return (
      <div className="rounded-[22px] bg-red-50 p-5 text-[11px] text-red-600">
        این مطلب پیدا نشد.
      </div>
    );
  const blocks = parseBlocks(post.content);
  return (
    <article className="overflow-hidden rounded-[28px] border border-[var(--bw-border)] bg-white shadow-[var(--bw-shadow-card)]">
      <div className="p-5 pb-4">
        <Link
          href="/blog"
          className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-slate-50 px-3 text-[10px] font-black text-slate-600"
        >
          <ArrowRight size={15} />
          بازگشت به مجله
        </Link>
        <div className="mt-6 flex items-center gap-2 text-[9px] font-bold text-blue-700">
          <BookOpen size={15} />
          {post.category ?? "مجله BestWash"}
        </div>
        <h1 className="mt-3 text-[22px] font-black leading-10 text-slate-900">
          {post.title}
        </h1>
        <p className="mt-3 text-[11px] leading-7 text-slate-500">
          {post.excerpt}
        </p>
        <div className="mt-4 flex items-center gap-3 text-[9px] text-slate-400">
          <span>{formatDate(post.publishedAt)}</span>
          <span className="flex items-center gap-1">
            <Clock3 size={13} />
            {post.readingMinutes.toLocaleString("fa-IR")} دقیقه مطالعه
          </span>
        </div>
      </div>
      {post.coverImageUrl ? (
        <div className="mx-5 overflow-hidden rounded-[22px] bg-slate-100">
          <img
            src={post.coverImageUrl}
            alt={post.coverImageAlt ?? post.title}
            className="max-h-[430px] w-full object-cover"
          />
        </div>
      ) : null}
      <div className="space-y-6 p-5 text-[12px] leading-8 text-slate-700">
        {blocks.map((block, index) => (
          <RenderBlock key={block.id ?? index} block={block} />
        ))}
      </div>
    </article>
  );
}

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "heading")
    return (
      <h2 className="border-r-4 border-blue-600 pr-3 text-[17px] font-black leading-9 text-slate-900">
        {block.content}
      </h2>
    );
  if (block.type === "image")
    return block.url ? (
      <figure className="overflow-hidden rounded-[22px] bg-slate-50">
        <img
          src={block.url}
          alt={block.alt ?? "تصویر مقاله"}
          className="max-h-[440px] w-full object-cover"
        />
        {block.alt ? (
          <figcaption className="p-3 text-center text-[9px] text-slate-400">
            {block.alt}
          </figcaption>
        ) : null}
      </figure>
    ) : null;
  if (block.type === "table")
    return (
      <div className="overflow-x-auto rounded-[20px] border border-slate-200">
        <table className="w-full min-w-[480px] text-right text-[10px]">
          <tbody>
            {(block.rows ?? []).map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  rowIndex === 0
                    ? "bg-blue-50 font-black text-blue-900"
                    : "border-t border-slate-100"
                }
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return <p className="whitespace-pre-line leading-8">{block.content}</p>;
}

function parseBlocks(content: string): Block[] {
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => item && typeof item === "object" && "type" in item)
    )
      return parsed as Block[];
  } catch {
    /* مقاله‌های قدیمی متن ساده هستند. */
  }
  return [{ type: "paragraph", content }];
}
