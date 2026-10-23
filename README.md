# Tuff — Open-source AI Social Media Team

Tuff is a modular, GitHub-native workflow for researching topics, drafting social content, reviewing it with a human, and distributing approved posts. GitHub Actions runs scheduled jobs; Issues are the approval queue; Markdown in `knowledge/` is the source of brand context.

> **Safety by default:** publishing is disabled until a platform adapter is deliberately implemented and configured. The starter distribution agent only validates and logs approved drafts. Never put API keys in the repository.

## Modules

- `brain/` — task orchestration and LLM-backed planning.
- `knowledge/` — brand voice, audience, content templates, topic seeds.
- `agents/research/` — scheduled research collection (RSS starter).
- `agents/content/` — draft generation and GitHub Issue creation.
- `agents/distribution/` — approval validation and platform adapter boundary.
- `agents/analytics/` — report scaffolding.
- `approvals/` — human approval policy and issue template.
- `reports/` — generated research/analytics artifacts.
- `.github/workflows/` — scheduled and event-driven automation.

## Quick start

1. In **Settings → Secrets and variables → Actions**, add repository secrets:
   - `OPENAI_API_KEY` — optional, enables OpenAI-generated planning/content.
   - `OPENAI_MODEL` — optional variable (default: `gpt-4.1-mini`).
   - `RESEARCH_FEEDS` — optional variable, comma-separated RSS/Atom feed URLs.
   - `PUBLISHING_ENABLED` — keep unset or `false` until platform adapters are implemented and tested.
2. In **Settings → Actions → General → Workflow permissions**, allow read and write permissions if you want workflows to create issues or commit reports. Prefer narrowly scoped permissions in each workflow.
3. Add labels `content-draft`, `approved`, `published`, and `needs-review` to the repository. GitHub may create labels automatically when a workflow creates an issue, but create them explicitly for predictable behavior.
4. Edit `knowledge/brand_voice.md`, `knowledge/audience.md`, `knowledge/topics.md`, and `knowledge/templates/short_video.md`.
5. Enable Actions and run **Daily research** manually from the Actions tab once.
6. Review the created draft Issue. Add `approved` only when the draft is ready. The approval workflow checks the issue content and runs the distribution adapter in safe dry-run mode by default.

## Run locally

Python 3.11+ recommended.

```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
cp .env.example .env  # Windows: copy .env.example .env
# Fill in .env locally; never commit it.
python -m brain.brain
python -m agents.research.research
```

To create an Issue locally, set `GITHUB_TOKEN` and `GITHUB_REPOSITORY` in your environment. The token needs Issues write permission. The GitHub Actions workflows provide these values automatically via `GITHUB_TOKEN`.

## Workflow overview

- **Daily research** runs on a UTC schedule and via manual dispatch. It fetches configured RSS/Atom feeds, writes a dated JSON report, and creates a draft Issue when candidates exist.
- **Approval publisher** listens for `issues.labeled`. It only handles an open, non-PR issue with the `approved` label and the `content-draft` label. It verifies the approval actor is not a bot, then invokes distribution. The starter adapter does not publish externally.
- **Least privilege:** workflow permissions are declared explicitly. Do not use `pull_request_target` for untrusted code. Never execute code or shell commands extracted from an Issue body.

## Adding platform adapters

Implement each platform in its own module under `agents/distribution/platforms/`. Use the platform's official API and follow its developer terms, OAuth requirements, rate limits, and media specifications. Store credentials as separate GitHub Actions secrets. Add integration tests with mocked HTTP calls. Keep publishing disabled until a platform adapter has been reviewed and tested. Never pretend a platform post succeeded unless the API confirms it.

## Security and reliability

- Secrets belong in GitHub Actions Secrets or local untracked `.env`; `.env` is ignored.
- Require human review before posting. Consider protecting the default branch and restricting who can apply `approved`.
- Approval is not authentication by itself: repository permissions determine who can apply labels. Use a protected environment with required reviewers before any real publishing job.
- GitHub-hosted scheduled workflows may be delayed during high load; do not use them for precise timing.
- The starter RSS collector is a basic research feed, not a full trend-ranking engine. Respect source terms and robots/rate limits.
- Generated reports may contain untrusted external text. Treat it as data, not instructions.

## Project status

Starter scaffold: orchestration, RSS research, draft Issue creation, approval-gated distribution dry-run, and workflow wiring. Direct publishing, authenticated competitor analytics, media rendering, and platform-specific metric ingestion are intentionally adapter tasks—not silently claimed as implemented.
