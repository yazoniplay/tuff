"""Collect recent entries from configured RSS/Atom feeds and create a review draft."""
from __future__ import annotations
import json, os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import feedparser
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


def collect(limit_per_feed: int = 8) -> list[dict]:
    raw = os.getenv("RESEARCH_FEEDS", "https://blog.youtube/feeds/posts/default,https://github.blog/feed/")
    urls = [item.strip() for item in raw.split(",") if item.strip()]
    items = []
    for url in urls:
        if urlparse(url).scheme != "https":
            print(f"Skipping non-HTTPS feed: {url}")
            continue
        try:
            feed = feedparser.parse(url)
            if getattr(feed, "bozo", False):
                print(f"Feed warning for {url}: {getattr(feed, 'bozo_exception', 'invalid feed')}")
            for entry in feed.entries[:limit_per_feed]:
                items.append({"source": feed.feed.get("title", url), "url": entry.get("link", ""),
                              "title": entry.get("title", "Untitled"),
                              "summary": entry.get("summary", "")[:1200],
                              "published": entry.get("published", "")})
        except Exception as exc:
            print(f"Unable to read feed {url}: {exc}")
    # Stable de-duplication by URL.
    seen, unique = set(), []
    for item in items:
        key = item["url"] or item["title"]
        if key not in seen:
            seen.add(key); unique.append(item)
    return unique


def create_draft_issue(items: list[dict]) -> None:
    token, repo = os.getenv("GITHUB_TOKEN"), os.getenv("GITHUB_REPOSITORY")
    if not token or not repo:
        print("GITHUB_TOKEN/GITHUB_REPOSITORY not set; research saved locally only.")
        return
    if not items:
        print("No research candidates found; no Issue created.")
        return
    import requests
    lines = ["## Research candidates", "", "Review these source links and create a content draft only after checking relevance.", ""]
    for item in items[:20]:
        lines += [f"### {item['title']}", f"- Source: {item['source']}", f"- Link: {item['url']}",
                  f"- Published: {item['published'] or 'Unknown'}", "", item['summary'], ""]
    lines += ["---", "This is research, not an approved post. Do not add `approved` until a separate content draft has been reviewed."]
    response = requests.post(f"https://api.github.com/repos/{repo}/issues",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
        json={"title": f"Research digest — {datetime.now(timezone.utc).date()}", "body": "\n".join(lines), "labels": ["needs-review"]}, timeout=20)
    response.raise_for_status()
    print(f"Created research Issue: {response.json().get('html_url')}")


def main() -> None:
    items = collect()
    out = ROOT / "reports" / f"research-{datetime.now(timezone.utc).date()}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"generated_at": datetime.now(timezone.utc).isoformat(), "items": items}, indent=2), encoding="utf-8")
    print(f"Saved {len(items)} research items to {out}")
    create_draft_issue(items)

if __name__ == "__main__":
    main()
