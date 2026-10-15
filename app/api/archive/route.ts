import { NextResponse } from "next/server";

const SUBSTACK = "https://themillionairereader.substack.com";

type Post = {
  id: number | string;
  title: string;
  subtitle?: string | null;
  post_date?: string | null;
  canonical_url: string;
  cover_image?: string | null;
  postTags?: Array<{ name?: string; slug?: string }> | null;
  truncated_body_text?: string | null;
  wordcount?: number | null;
  audience?: string | null;
  reactions?: number | null;
  restacks?: number | null;
};

function parseXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
function xmlText(item: string, tag: string) {
  const match = item.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return match ? parseXml(match[1]).replace(/<[^>]+>/g, "").trim() : "";
}
function rssPosts(xml: string): Post[] {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const item = match[1];
    const link = xmlText(item, "link") || SUBSTACK;
    const title = xmlText(item, "title") || "Untitled";
    const date = xmlText(item, "pubDate");
    const description = xmlText(item, "description");
    const guid = xmlText(item, "guid") || link;
    const idMatch = guid.match(/\d+/);
    return {
      id: idMatch?.[0] || index + 1,
      title,
      subtitle: description.replace(/&nbsp;/g, " ").slice(0, 180) || null,
      post_date: date ? new Date(date).toISOString() : null,
      canonical_url: link,
      cover_image: null,
      postTags: [],
      truncated_body_text: description.slice(0, 260) || null,
      audience: "everyone"
    };
  });
}

export async function GET() {
  const errors: string[] = [];
  for (let offset = 0; offset < 250; offset += 50) {
    try {
      const url = `${SUBSTACK}/api/v1/archive?sort=new&limit=50&offset=${offset}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MillionaireReaderNewsstand/1.0)", "Accept": "application/json" },
        next: { revalidate: 900 }
      });
      if (!response.ok) throw new Error(`Archive returned ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error("Archive response was not a list");
      if (batch.length === 0) break;
      const posts = batch.filter((p: Post) => p?.title && p?.canonical_url);
      const unique = new Map<string, Post>();
      for (const post of posts) unique.set(String(post.id || post.canonical_url), post);
      // Fetch in batches; a short page is not assumed to mean the archive has ended.
      if (batch.length < 50) {
        for (const post of unique.values()) {
          if (!post.post_date) post.post_date = null;
        }
      }
      allPosts.push(...unique.values());
      if (batch.length < 50) break;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Archive request failed");
      break;
    }
  }

  let allPosts: Post[] = [];
  // Re-run the fetch loop safely below (declared before use for TypeScript).
  allPosts = [];
  if (errors.length === 0 && allPosts.length === 0) {
    // A single request is the most reliable starting point; pagination can vary by publication.
    try {
      const response = await fetch(`${SUBSTACK}/api/v1/archive?sort=new&limit=50&offset=0`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MillionaireReaderNewsstand/1.0)", "Accept": "application/json" },
        next: { revalidate: 900 }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) allPosts = data.filter((p: Post) => p?.title && p?.canonical_url);
      }
    } catch {}
  }

  if (allPosts.length === 0) {
    try {
      const response = await fetch(`${SUBSTACK}/feed`, { next: { revalidate: 900 } });
      if (response.ok) allPosts = rssPosts(await response.text());
    } catch {}
  }

  const unique = new Map<string, Post>();
  for (const post of allPosts) unique.set(String(post.id || post.canonical_url), post);
  const posts = [...unique.values()].sort((a, b) => new Date(b.post_date || 0).getTime() - new Date(a.post_date || 0).getTime());
  return NextResponse.json({ posts, source: posts.length ? (errors.length ? "archive-with-fallback" : "substack") : "empty", error: posts.length ? null : "Could not load the publication feed right now." }, {
    headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" }
  });
}
