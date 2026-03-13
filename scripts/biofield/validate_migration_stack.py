#!/usr/bin/env python3
"""Static validation for the drafted Selene × Biofield migration stack.

This script is intentionally conservative. It does not apply SQL; it checks that the
expected migration files exist, appear in the correct order, include required objects,
and do not contain obvious destructive statements that would violate the current
non-breaking rollout strategy.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"

EXPECTED_FILES = [
    "20260308173000_selene_compat_bootstrap.sql",
    "20260308180000_biofield_foundation.sql",
    "20260308183000_biofield_storage_and_helpers.sql",
    "20260308190000_biofield_rls.sql",
]

REQUIRED_PATTERNS = {
    "20260308173000_selene_compat_bootstrap.sql": [
        r"create\s+extension\s+if\s+not\s+exists\s+pgcrypto",
        r"create\s+table\s+if\s+not\s+exists\s+public\.users",
        r"create\s+table\s+if\s+not\s+exists\s+public\.user_profiles",
        r"create\s+table\s+if\s+not\s+exists\s+public\.readings",
        r"create\s+table\s+if\s+not\s+exists\s+public\.progression_logs",
    ],
    "20260308180000_biofield_foundation.sql": [
        r"create\s+table\s+if\s+not\s+exists\s+public\.biofield_sessions",
        r"create\s+table\s+if\s+not\s+exists\s+public\.biofield_snapshots",
        r"create\s+table\s+if\s+not\s+exists\s+public\.biofield_timeline_points",
        r"create\s+table\s+if\s+not\s+exists\s+public\.biofield_baselines",
        r"create\s+table\s+if\s+not\s+exists\s+public\.biofield_artifacts",
        r"create\s+or\s+replace\s+view\s+public\.biofield_session_summary",
    ],
    "20260308183000_biofield_storage_and_helpers.sql": [
        r"create\s+or\s+replace\s+function\s+public\.set_current_timestamp_updated_at",
        r"insert\s+into\s+storage\.buckets",
        r"biofield-captures",
        r"biofield-reports",
        r"create\s+or\s+replace\s+view\s+public\.biofield_snapshot_detail",
        r"create\s+or\s+replace\s+view\s+public\.biofield_reading_history",
    ],
    "20260308190000_biofield_rls.sql": [
        r"alter\s+table\s+public\.user_profiles\s+enable\s+row\s+level\s+security",
        r"alter\s+table\s+public\.readings\s+enable\s+row\s+level\s+security",
        r"alter\s+table\s+public\.biofield_sessions\s+enable\s+row\s+level\s+security",
        r"create\s+policy\s+\"Biofield sessions select own\"",
        r"create\s+policy\s+\"Biofield artifacts select own\"",
        r"create\s+policy\s+\"Biofield captures select own\"",
        r"create\s+policy\s+\"Biofield reports select own\"",
    ],
}

FORBIDDEN_PATTERNS = [
    r"drop\s+table(?!\s+if\s+exists\s+set_)",
    r"truncate\s+table",
    r"alter\s+table\s+.+\s+drop\s+column",
    r"delete\s+from\s+public\.(?!biofield_baselines)",
]


@dataclass
class FileCheck:
    file: str
    exists: bool
    required_matches: list[str]
    missing_required: list[str]
    forbidden_hits: list[str]
    begins_transaction: bool
    ends_transaction: bool

    @property
    def ok(self) -> bool:
        return (
            self.exists
            and not self.missing_required
            and not self.forbidden_hits
            and self.begins_transaction
            and self.ends_transaction
        )


def normalize_sql(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def validate_file(file_name: str) -> FileCheck:
    path = MIGRATIONS_DIR / file_name
    if not path.exists():
        return FileCheck(
            file=file_name,
            exists=False,
            required_matches=[],
            missing_required=REQUIRED_PATTERNS.get(file_name, []),
            forbidden_hits=[],
            begins_transaction=False,
            ends_transaction=False,
        )

    raw = path.read_text(encoding="utf-8")
    normalized = normalize_sql(raw)

    required = REQUIRED_PATTERNS.get(file_name, [])
    matched = [pattern for pattern in required if re.search(pattern, normalized, flags=re.IGNORECASE)]
    missing = [pattern for pattern in required if pattern not in matched]
    forbidden = [pattern for pattern in FORBIDDEN_PATTERNS if re.search(pattern, normalized, flags=re.IGNORECASE)]

    return FileCheck(
        file=file_name,
        exists=True,
        required_matches=matched,
        missing_required=missing,
        forbidden_hits=forbidden,
        begins_transaction=normalized.startswith("--") and " begin; " in f" {normalized} ",
        ends_transaction=normalized.endswith("commit;") or normalized.endswith("commit; --"),
    )


def render_markdown(results: Iterable[FileCheck]) -> str:
    lines = [
        "# Biofield Migration Static Validation Report",
        "",
        f"Generated from: `{MIGRATIONS_DIR}`",
        "",
    ]

    overall_ok = True
    for result in results:
        overall_ok = overall_ok and result.ok
        status = "PASS" if result.ok else "FAIL"
        lines.extend([
            f"## {result.file} — {status}",
            "",
            f"- exists: `{result.exists}`",
            f"- begins transaction: `{result.begins_transaction}`",
            f"- ends transaction: `{result.ends_transaction}`",
            f"- required pattern matches: `{len(result.required_matches)}`",
            f"- missing required patterns: `{len(result.missing_required)}`",
            f"- forbidden pattern hits: `{len(result.forbidden_hits)}`",
            "",
        ])
        if result.missing_required:
            lines.append("### Missing required patterns")
            lines.extend([f"- `{item}`" for item in result.missing_required])
            lines.append("")
        if result.forbidden_hits:
            lines.append("### Forbidden pattern hits")
            lines.extend([f"- `{item}`" for item in result.forbidden_hits])
            lines.append("")

    lines.extend([
        "## Overall",
        "",
        f"- status: `{'PASS' if overall_ok else 'FAIL'}`",
        f"- files checked: `{len(list(results))}`",
        "",
        "This report is static only; it does not replace safe-environment migration testing.",
    ])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    parser.add_argument("--markdown", type=Path, help="Write a markdown report to this path")
    args = parser.parse_args()

    existing_files = sorted(p.name for p in MIGRATIONS_DIR.glob("*.sql"))
    ordering_ok = existing_files[: len(EXPECTED_FILES)] == EXPECTED_FILES
    results = [validate_file(file_name) for file_name in EXPECTED_FILES]
    overall_ok = ordering_ok and all(result.ok for result in results)

    payload = {
        "ordering_ok": ordering_ok,
        "expected_files": EXPECTED_FILES,
        "existing_files": existing_files,
        "results": [asdict(result) | {"ok": result.ok} for result in results],
        "ok": overall_ok,
    }

    if args.markdown:
        report = render_markdown(results)
        report += f"\n\n- migration ordering ok: `{ordering_ok}`\n"
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text(report, encoding="utf-8")

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"migration_ordering={'PASS' if ordering_ok else 'FAIL'}")
        for result in results:
            print(f"{result.file}={'PASS' if result.ok else 'FAIL'}")
        print(f"overall={'PASS' if overall_ok else 'FAIL'}")

    return 0 if overall_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
