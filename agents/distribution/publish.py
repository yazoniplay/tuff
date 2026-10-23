"""Approval-gated distribution entry point. External publishing is intentionally disabled by default."""
from __future__ import annotations
import os, sys


def main() -> int:
    issue_number = os.getenv("ISSUE_NUMBER", "")
    issue_title = os.getenv("ISSUE_TITLE", "Untitled")
    issue_body = os.getenv("ISSUE_BODY", "")
    labels = {value.strip().lower() for value in os.getenv("ISSUE_LABELS", "").split(",") if value.strip()}
    if not issue_number.isdigit():
        print("Refusing: ISSUE_NUMBER must be numeric."); return 2
    if "approved" not in labels or "content-draft" not in labels:
        print("Refusing: issue must have both approved and content-draft labels."); return 2
    if "published" in labels:
        print("Refusing: issue is already marked published."); return 2
    if not issue_body.strip():
        print("Refusing: draft body is empty."); return 2
    if os.getenv("PUBLISHING_ENABLED", "false").lower() != "true":
        print(f"DRY RUN ONLY — Issue #{issue_number}: {issue_title}")
        print("Approval validated. No external platform API was called.")
        return 0
    print("Publishing is enabled but no platform adapter is installed. Refusing to claim success.", file=sys.stderr)
    return 3

if __name__ == "__main__":
    raise SystemExit(main())
