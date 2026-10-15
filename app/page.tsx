"use client";

import { useEffect, useMemo, useState } from "react";

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

const initialPost: Post = {
  id: "220564628",
  title: "What Steve Jobs Actually Read",
  subtitle: "The three books behind the way he thought.",
  post_date: "2026-10-15T16:57:18.479Z",
  canonical_url: "https://themillionairereader.substack.com/p/what-steve-jobs-actually-read",
  cover_image: null,
  postTags: [],
  truncated_body_text: "Steve Jobs built products. He also built a way of seeing.",
  audience: "everyone"
};
const filters = ["All issues", "Mindset", "Books & Ideas", "Culture"];

function formatDate(date?: string | null) {
  if (!date) return "New issue";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "New issue" : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function category(post: Post) {
  const tags = (post.postTags || []).map((tag) => (tag.name || "").toLowerCase()).join(" ");
  if (/book|read|author|literature/.test(tags + " " + post.title.toLowerCase())) return "Books & Ideas";
  if (/culture|artist|music|design|film/.test(tags + " " + post.title.toLowerCase())) return "Culture";
  return "Mindset";
}
function coverStyle(index: number) {
  return `cover-${index % 8}`;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([initialPost]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All issues");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Post | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/archive")
      .then((response) => {
        if (!response.ok) throw new Error("Feed unavailable");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.posts) && data.posts.length) setPosts(data.posts);
        else setFeedError(true);
      })
      .catch(() => { if (!cancelled) setFeedError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => posts.filter((post) => {
    const matchesFilter = activeFilter === "All issues" || category(post) === activeFilter;
    const haystack = `${post.title} ${post.subtitle || ""} ${(post.postTags || []).map((tag) => tag.name || "").join(" ")}`.toLowerCase();
    return matchesFilter && haystack.includes(search.toLowerCase().trim());
  }), [posts, activeFilter, search]);

  const shelves = useMemo(() => {
    const result: Post[][] = [];
    for (let i = 0; i < filtered.length; i += 5) result.push(filtered.slice(i, i + 5));
    return result;
  }, [filtered]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [selected]);

  return (
    <main className="site-shell">
      <div className="topline">
        <span>Ideas worth keeping</span>
        <span>Independent reading · Est. 2026</span>
        <a href="https://themillionairereader.substack.com" target="_blank" rel="noreferrer">Read on Substack ↗</a>
      </div>

      <header className="masthead">
        <div className="masthead-side">A field guide<br />to better thinking</div>
        <a href="#" className="brand" aria-label="The Millionaire Reader home">
          <div className="brand-mark" aria-hidden="true"><span>ℳ</span></div>
          <h1>The Millionaire Reader</h1>
          <p>The Millionaire Mind for the Millionaire Reader</p>
        </a>
        <div className="masthead-side">Building the<br />millionaire mind</div>
      </header>

      <nav className="navline" aria-label="Main navigation">
        <div className="navlinks">
          <a href="#newsstand">The Newsstand</a>
          <a href="#about">Our philosophy</a>
          <a href="https://themillionairereader.substack.com/subscribe" target="_blank" rel="noreferrer">Subscribe ↗</a>
        </div>
        <label className="searchbox">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Search issues" placeholder="Search the shelves…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </nav>

      <section className="hero">
        <div>
          <p className="kicker">A personal library in public</p>
          <h2>Good ideas.<br /><em>Better questions.</em></h2>
          <p className="hero-copy">A curated shelf of books, people, and ideas that help you think a little bigger. Browse an issue, find a thread, follow it somewhere new.</p>
        </div>
        <div className="hero-stamp">Read slowly<br />Think deeply<br />Live deliberately</div>
      </section>

      <section id="newsstand">
        <div className="section-heading">
          <h3>The Newsstand</h3>
          <span>{loading ? "Refreshing archive…" : `${filtered.length} ${filtered.length === 1 ? "issue" : "issues"} on the shelf`}</span>
        </div>
        <div className="filterbar" role="group" aria-label="Filter issues">
          {filters.map((filter) => <button key={filter} className={`filter-chip ${activeFilter === filter ? "active" : ""}`} onClick={() => setActiveFilter(filter)}>{filter}</button>)}
        </div>

        {feedError && <p className="loading-note">Showing the latest confirmed issue. The live archive will appear here when Substack responds.</p>}
        {loading && <p className="loading-note">Checking the latest issues from Substack…</p>}

        {filtered.length ? shelves.map((shelf, shelfIndex) => (
          <div className="shelf" key={shelfIndex}>
            <div className="shelf-row">
              {shelf.map((post, index) => {
                const globalIndex = shelfIndex * 5 + index;
                return (
                  <article className="mag-wrap" key={String(post.id)} style={{ animationDelay: `${index * 65}ms` }}>
                    <button className="mag-button" onClick={() => setSelected(post)} aria-label={`Preview ${post.title}`} style={{ transform: `rotate(${[-1.5, 1, -0.7, 1.4, -1][index % 5]}deg)` }}>
                      <div className={`mag-cover ${coverStyle(globalIndex)}`}>
                        <div className="cover-art" />
                        <span className="cover-index">The Millionaire Reader · No. {String(posts.length - globalIndex).padStart(2, "0")}</span>
                        <span className="cover-title">{post.title}</span>
                        <span className="cover-subtitle">{post.subtitle || "A note on building the millionaire mind."}</span>
                        <span className="cover-footer">Read · Reflect · Repeat</span>
                      </div>
                    </button>
                    <div className="mag-meta">
                      <div className="mag-date">{formatDate(post.post_date)}</div>
                      <h4 className="mag-title">{post.title}</h4>
                      {post.subtitle && <p className="mag-subtitle">{post.subtitle}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="shelf-rail" />
          </div>
        )) : <div className="empty-state"><strong>No issues on this shelf.</strong>Try another search or choose “All issues.”</div>}
      </section>

      <section className="about-strip" id="about">
        <h3>A mind is built<br />one idea at a time.</h3>
        <p>The Millionaire Reader is about more than money. It’s about the books, habits, and ways of seeing that help a person build a richer inner life — and put that thinking to work. This Newsstand is the browsing room; the full essays and subscription live on Substack.</p>
      </section>

      <footer className="footer">
        <span>© {new Date().getFullYear()} The Millionaire Reader</span>
        <span className="footer-links"><a href="https://themillionairereader.substack.com" target="_blank" rel="noreferrer">Substack</a><a href="https://themillionairereader.substack.com/subscribe" target="_blank" rel="noreferrer">Subscribe</a></span>
        <span>Made for curious minds.</span>
      </footer>

      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className="article-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" aria-label="Close preview" onClick={() => setSelected(null)}>×</button>
          <p className="modal-kicker">The Millionaire Reader · {formatDate(selected.post_date)}</p>
          <h2 id="modal-title">{selected.title}</h2>
          {selected.subtitle && <p className="modal-subtitle">{selected.subtitle}</p>}
          <div className="modal-rule" />
          <p className="modal-excerpt">{selected.truncated_body_text || "An issue from The Millionaire Reader. Open the original on Substack to read the full essay."}</p>
          <div className="modal-actions">
            <a className="button-primary" href={selected.canonical_url} target="_blank" rel="noreferrer">Read the full issue ↗</a>
            <button className="button-secondary" onClick={() => setSelected(null)}>Back to the shelves</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
