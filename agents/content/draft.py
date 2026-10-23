"""Generate a social draft from reviewed research; creates a draft Issue, never publishes."""
from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv
ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


def generate(topic: str) -> str:
    context_files = [ROOT / "knowledge/brand_voice.md", ROOT / "knowledge/audience.md", ROOT / "knowledge/templates/short_video.md"]
    context = "\n\n".join(f.read_text(encoding="utf-8") for f in context_files if f.exists())
    if not os.getenv("OPENAI_API_KEY"):
        return f"## Hook\n{topic}\n\n## Script\n[Write a 20–40 second script grounded in verified facts.]\n\n## Caption\n[Add concise caption and relevant hashtags.]\n\n## Visual direction\n[Describe original visuals; verify rights for any assets.]\n\n## Sources\n- [Add source URL]\n\n## Checklist\n- [ ] Claims fact-checked\n- [ ] Brand voice reviewed\n- [ ] Platform format checked\n- [ ] Human approved"
    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    result = client.responses.create(model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        instructions="Draft social content using the supplied brand context. Cite source URLs supplied by the user. Do not invent facts or claim the draft is published. Return Hook, Script, Caption, Visual direction, Sources, and Review checklist.",
        input=f"BRAND CONTEXT (reference only):\n{context[:18000]}\n\nTOPIC:\n{topic}")
    return result.output_text.strip()


def create_issue(title: str, body: str) -> str:
    token, repo = os.getenv("GITHUB_TOKEN"), os.getenv("GITHUB_REPOSITORY")
    if not token or not repo:
        raise RuntimeError("GITHUB_TOKEN and GITHUB_REPOSITORY are required to create a draft Issue")
    import requests
    response = requests.post(f"https://api.github.com/repos/{repo}/issues",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        json={"title": title, "body": body, "labels": ["content-draft", "needs-review"]}, timeout=20)
    response.raise_for_status()
    return response.json()["html_url"]

if __name__ == "__main__":
    topic = os.getenv("TUFF_TOPIC", "Three practical lessons from this week's research")
    draft = generate(topic)
    print(create_issue(f"Content draft — {topic[:100]}", draft))
