"use client";

/* eslint-disable @next/next/no-img-element -- article media URLs are managed dynamically by administrators. */

import { ArrowLeft, BookOpen, Clock3, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBlogPosts, type BlogPostSummary } from "../../lib/api/account";
import { formatDate } from "../../lib/format";

export function BlogList() {
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);
  useEffect(() => {
    void getBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);
  if (!posts)
    return (
      <div className="flex min-h-52 items-center justify-center">
        <LoaderCircle className="animate-spin text-blue-600" />
      </div>
    );
  if (!posts.length)
    return (
      <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50 p-8 text-center text-[11px] text-slate-600">
        هنوز مطلبی منتشر نشده است.
      </div>
    );
  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <Link
          key={post.slug}
          href={`/blog/${post.slug}`}
          className="group overflow-hidden rounded-[26px] border border-[var(--bw-border)] bg-white shadow-[var(--bw-shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--bw-shadow-card)]"
        >
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50">
            {post.coverImageUrl ? (
              <img
                src={post.coverImageUrl}
                alt={post.coverImageAlt ?? post.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <BookOpen
                className="absolute inset-0 m-auto text-blue-200"
                size={48}
              />
            )}
            <span className="absolute right-3 top-3 rounded-full bg-slate-950/75 px-3 py-1.5 text-[9px] font-black text-white backdrop-blur">
              {post.category ?? "مجله BestWash"}
            </span>
          </div>
          <div className="p-5">
            <h2 className="line-clamp-2 text-[15px] font-black leading-7 text-slate-900">
              {post.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-[10px] leading-6 text-slate-500">
              {post.excerpt}
            </p>
            <div className="mt-5 flex items-center border-t border-slate-100 pt-4 text-[9px] text-slate-400">
              <span>{formatDate(post.publishedAt)}</span>
              <span className="mr-3 flex items-center gap-1">
                <Clock3 size={13} />
                {post.readingMinutes.toLocaleString("fa-IR")} دقیقه
              </span>
              <span className="mr-auto flex items-center gap-1 font-black text-blue-700">
                مطالعه مقاله
                <ArrowLeft size={15} />
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
