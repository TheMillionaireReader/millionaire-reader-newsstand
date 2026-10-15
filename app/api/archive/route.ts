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

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}
function parseXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}
function xmlText(item: string, tag: string) {
  const match = item.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return match ? decodeEntities(parseXml(match[1]).replace(/<[^>]+>/g, "").trim()) : "";
}
function rssPosts(xml: string): Post[] {
  const matches = Array.from(xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi));
  return matches.map((match, index) => {
    const item = match[1];
    const link = xmlText(item, "link") || SUBSTACK;
    const title = xmlText(item, "title") || "Untitled";
    const date = xmlText(item, "pubDate");
    const description = xmlText(item, "description");
    const guid = xmlText(item, "guid") || link;
    const idMatch = guid.match(/\d+/);
    let isoDate: string | null = null;
    if (date) {
      const parsed = new Date(date);
      if (!Number.isNaN(parsed.getTime())) isoDate = parsed.toISOString();
    }
    return {
      id: idMatch?.[0] || index + 1,
      title,
      subtitle: description.slice(0, 180) || null,
      post_date: isoDate,
      canonical_url: link,
      cover_image: null,
      postTags: [],
      truncated_body_text: description.slice(0, 260) || null,
      audience: "everyone"
    };
  });
}

export async function GET() {
  const allPosts: Post[] = [];
  let archiveFailed = false;

  for (let offset = 0; offset < 250; offset += 50) {
    try {
      const response = await fetch(
        `${SUBSTACK}/api/v1/archive?sort=new&limit=50&offset=${offset}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; MillionaireReaderNewsstand/1.0)",
            Accept: "application/json"
          },
          next: { revalidate: 900 }
        }
      );
      if (!response.ok) throw new Error(`Archive returned ${response.status}`);
      const batch: unknown = await response.json();
      if (!Array.isArray(batch)) throw new Error("Archive response was not a list");
      if (batch.length === 0) break;
      allPosts.push(...batch.filter((post: Post) => post?.title && post?.canonical_url));
      if (batch.length < 50) break;
    } catch {
      archiveFailed = true;
      break;
    }
  }

  if (archiveFailed || allPosts.length === 0) {
    try {
      const response = await fetch(`${SUBSTACK}/feed`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MillionaireReaderNewsstand/1.0)" },
        next: { revalidate: 900 }
      });
      if (response.ok) {
        const rss = rssPosts(await response.text());
        if (rss.length) allPosts.push(...rss);
      }
    } catch {
      // Keep any posts already fetched; the UI has a confirmed-article fallback.
    }
  }

  const unique = new Map<string, Post>();
  for (const post of allPosts) unique.set(String(post.id || post.canonical_url), post);
  const posts = [...unique.values()].sort(
    (a, b) => new Date(b.post_date || 0).getTime() - new Date(a.post_date || 0).getTime()
  );

  return NextResponse.json(
    {
      posts,
      source: posts.length ? (archiveFailed ? "archive-with-rss-fallback" : "substack") : "empty",
      error: posts.length ? null : "Could not load the publication feed right now."
    },
    { headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" } }
  );
}
