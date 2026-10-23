"""Create a lightweight report summary from local research JSON files."""
from datetime import datetime, timezone
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[2]

def main() -> None:
    files = sorted((ROOT / "reports").glob("research-*.json"))
    counts = []
    for file in files[-7:]:
        try:
            data = json.loads(file.read_text(encoding="utf-8"))
            counts.append((file.name, len(data.get("items", []))))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"Skipping {file}: {exc}")
    lines = ["# Tuff activity summary", "", f"Generated: {datetime.now(timezone.utc).isoformat()}", "", "## Research items by run", ""]
    lines.extend(f"- {name}: {count} items" for name, count in counts)
    out = ROOT / "reports" / "daily-summary.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out}")
if __name__ == "__main__": main()
