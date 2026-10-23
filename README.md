# Tuff — AI Social Media Team

Tuff is an open-source, modular social media workflow with a web dashboard, Gemini-powered content generation, scheduled research, GitHub Issue approvals, and extensible distribution adapters.

**Website:** enable GitHub Pages from **Settings → Pages**, deploy from the `main` branch and `/ (root)`. The dashboard is a static site and uses the public GitHub API to display Issues. It never asks for your Gemini key in the browser.

## Architecture

- `index.html`, `styles.css`, `app.js` — responsive GitHub Pages dashboard.
- `brain/` — Gemini orchestration.
- `knowledge/` — brand voice, audience, topic seeds, templates.
- `agents/research/` — scheduled RSS/Atom research.
- `agents/content/` — Gemini-generated draft content.
- `agents/distribution/` — approval validation and platform adapter boundary.
- `agents/analytics/` — report scaffolding.
- `.github/workflows/` — scheduled research, Gemini draft generation, and approval workflows.

## Configure Gemini

1. Open **Settings → Secrets and variables → Actions → Secrets**.
2. Add `GEMINI_API_KEY` using an API key from Google AI Studio.
3. Optionally add repository variable `GEMINI_MODEL` (default: `gemini-3.5-flash-lite`).
4. Never put the Gemini key in `app.js`, HTML, GitHub Pages, Issues, or a committed `.env`. The browser must not call Gemini directly because visitors could extract the key.
5. Add variable `RESEARCH_FEEDS` as comma-separated HTTPS RSS/Atom feed URLs.

## Run locally

Python 3.11+ recommended.

```bash
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
python -m brain.brain
python -m agents.research.research
```

Local `.env` may contain `GEMINI_API_KEY`, but never commit it. GitHub Actions reads the key from repository secrets.

## Human approval

Generated drafts are created as GitHub Issues with `content-draft` and `needs-review` labels. A reviewer verifies facts, source links, rights, and platform fit, then applies `approved`. Publishing stays in dry-run mode until a real platform adapter and protected GitHub Environment are configured. Restrict who can apply the approval label.

## Website controls

The dashboard can show repository Issues and link to GitHub's new-Issue form. A static GitHub Pages site cannot securely store credentials or invoke privileged GitHub workflows on behalf of arbitrary visitors. To enable authenticated “Generate with Gemini” buttons directly in the website, add a trusted backend (for example, a small API deployed on Render) that keeps the Gemini key server-side and authenticates users. Do not solve this by exposing API keys in frontend JavaScript.

## Status and limitations

The RSS collector is a starter, not a universal trends API. Live posting and real platform analytics require individual official API integrations and appropriate account permissions. The included approval publisher defaults to dry-run and does not claim to post externally.
