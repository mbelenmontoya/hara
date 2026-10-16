#!/usr/bin/env python3
"""ig-network helper: decides which professionals to audit and records results.

Usage (from the repo root):
  python3 .claude/skills/ig-network/scripts/network.py plan [--all]
  python3 .claude/skills/ig-network/scripts/network.py record '<json>'
  python3 .claude/skills/ig-network/scripts/network.py report

`plan` reads active professionals from Supabase (read-only) and returns only the
ones not audited yet, or whose instagram changed in the DB. `--all` returns everyone.

The log is keyed by professional_id, never by handle, because the audit can find
that a handle changed.
"""
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

ENV_FILE = Path(".env.local")
SNAPSHOT = Path("scripts/instagram-network.professionals.json")
LOG = Path("scripts/instagram-network.log.json")
REPORT_DIR = Path("scripts/logs")

DB_TIMEOUT_S = 20
# Instagram usernames: letters, digits, periods and underscores, max 30 chars.
HANDLE_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")
STATUSES = {"valid", "invalid", "renamed_or_uncertain"}


def load_json(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def normalize(raw):
    """Strip @, whitespace and instagram.com URL prefixes. Returns (handle, format_ok)."""
    h = (raw or "").strip()
    h = re.sub(r"^(https?://)?(www\.)?instagram\.com/", "", h, flags=re.I)
    h = h.lstrip("@").strip("/")
    return h, bool(HANDLE_RE.match(h))


def read_env():
    if not ENV_FILE.exists():
        sys.exit(f"ERROR: no existe {ENV_FILE}. Hace falta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.")
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip("\"'")
    missing = [k for k in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not env.get(k)]
    if missing:
        sys.exit(f"ERROR: faltan en {ENV_FILE}: {missing}")
    return env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"]


def fetch_professionals():
    """Read-only SELECT of active professionals with a non-empty instagram. Refreshes the local snapshot."""
    url, key = read_env()
    headers = {"apikey": key}
    if key.startswith("eyJ"):  # legacy JWT keys also need the Authorization header
        headers["Authorization"] = f"Bearer {key}"
    query = urllib.parse.urlencode({"select": "id,full_name,instagram", "status": "eq.active", "order": "full_name"})
    req = urllib.request.Request(f"{url}/rest/v1/professionals?{query}", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=DB_TIMEOUT_S) as resp:
            rows = json.load(resp)
    except urllib.error.HTTPError as e:
        sys.exit(f"ERROR: Supabase respondió {e.code}. Revisá las claves de {ENV_FILE}.")
    except urllib.error.URLError as e:
        sys.exit(f"ERROR: no se pudo conectar a Supabase ({e.reason}).")
    pros = [{"professional_id": r["id"], "name": r["full_name"], "instagram": r["instagram"].strip()}
            for r in rows if (r.get("instagram") or "").strip()]
    save_json(SNAPSHOT, {"snapshot_date": date.today().isoformat(),
                         "source": "Supabase public.professionals, status = active, instagram no vacío",
                         "professionals": pros})
    return pros


def backfill_instagram_db():
    """Entries audited before instagram_db existed get it from the snapshot that audit used."""
    data = load_json(LOG, None)
    old = {p["professional_id"]: p["instagram"] for p in load_json(SNAPSHOT, {"professionals": []})["professionals"]}
    if not data or not old:
        return
    changed = False
    for pid, entry in data["professionals"].items():
        if entry.get("instagram_db") is None and pid in old:
            entry["instagram_db"] = old[pid]
            changed = True
    if changed:
        save_json(LOG, data)


def plan(audit_all):
    backfill_instagram_db()  # must run before fetch_professionals overwrites the snapshot
    pros = fetch_professionals()
    log = load_json(LOG, {"professionals": {}})["professionals"]
    due, reasons = [], {"new": 0, "instagram_changed": 0, "all": 0}
    for p in pros:
        entry = log.get(p["professional_id"])
        if audit_all:
            reason = "all"
        elif entry is None:
            reason = "new"
        elif entry.get("instagram_db") not in (None, p["instagram"]):
            reason = "instagram_changed"
        else:
            continue
        reasons[reason] += 1
        handle, ok = normalize(p["instagram"])
        due.append({
            "professional_id": p["professional_id"],
            "name": p["name"],
            "instagram_raw": p["instagram"],
            "handle": handle,
            "format_ok": ok,
            "variants": [] if ok else variants(handle),
            "reason": reason,
        })
    summary = {k: v for k, v in reasons.items() if v}
    print(json.dumps({"total_db": len(pros), "due": len(due), "reasons": summary,
                      "already_audited": len(pros) - len(due), "items": due}, ensure_ascii=False, indent=2))


def variants(handle):
    """Candidate usernames to try for a malformed handle. Results are never 'valid', only uncertain."""
    if "/" in handle:
        return []
    out = []
    for sep in (".", "_", ""):
        v = re.sub(r"[^A-Za-z0-9._]", sep, handle)
        if HANDLE_RE.match(v) and v not in out:
            out.append(v)
    return out


def record(payload):
    r = json.loads(payload)
    missing = {"professional_id", "status", "handle_checked"} - r.keys()
    if missing:
        sys.exit(f"ERROR: faltan campos: {sorted(missing)}")
    if r["status"] not in STATUSES:
        sys.exit(f"ERROR: status inválido '{r['status']}'. Usar uno de {sorted(STATUSES)}")
    candidates = r.get("candidates", [])
    if not isinstance(candidates, list) or not all(isinstance(c, dict) and c.get("username") for c in candidates):
        sys.exit("ERROR: candidates tiene que ser una lista de objetos con 'username'")
    snapshot = load_json(SNAPSHOT, {"professionals": []})["professionals"]
    instagram_db = next((p["instagram"] for p in snapshot if p["professional_id"] == r["professional_id"]), None)
    data = load_json(LOG, {"professionals": {}})
    entry = data["professionals"].setdefault(r["professional_id"], {
        "last_profile_check": None, "last_content_check": None,
        "last_shared_at": None, "last_followed_at": None,
    })
    entry.update({
        "last_profile_check": datetime.now().isoformat(timespec="seconds"),
        "status": r["status"],
        # The DB value at audit time; plan re-audits the professional if it changes.
        "instagram_db": instagram_db,
        "handle_checked": r["handle_checked"],
        "resolved_url": r.get("resolved_url"),
        "hara_follows": r.get("hara_follows"),
        # True only when Instagram shows "Follow Back"; unknown (None) when Hara already follows them.
        "follows_hara": r.get("follows_hara"),
        "is_private": r.get("is_private"),
        "evidence": r.get("evidence", ""),
        # Possible new accounts found by name search; only the user can confirm them.
        "candidates": r.get("candidates", []),
    })
    save_json(LOG, data)
    print(f"OK {r['professional_id']} -> {r['status']}")


def report():
    snap = load_json(SNAPSHOT, {"professionals": []})
    log = load_json(LOG, {"professionals": {}})["professionals"]
    rows = []
    for p in snap["professionals"]:
        e = log.get(p["professional_id"], {})
        follows = {True: "sí", False: "no"}.get(e.get("hara_follows"), "?")
        follows_back = {True: "sí", False: "no"}.get(e.get("follows_hara"), "?")
        candidates = "; ".join(f"@{c['username']} ({c.get('evidence', '')})" for c in e.get("candidates", []))
        rows.append((e.get("status", "sin revisar"), p["name"], p["instagram"],
                     e.get("resolved_url") or "", follows, follows_back, (e.get("last_profile_check") or "")[:10],
                     e.get("evidence", ""), candidates))
    order = {"invalid": 0, "renamed_or_uncertain": 1, "sin revisar": 2, "valid": 3}
    rows.sort(key=lambda r: (order.get(r[0], 9), r[1].lower()))
    counts = {}
    for r in rows:
        counts[r[0]] = counts.get(r[0], 0) + 1
    lines = [f"# ig-network audit {date.today().isoformat()}", "",
             " · ".join(f"{k}: {v}" for k, v in sorted(counts.items())), "",
             "| Estado | Profesional | Instagram en DB | URL resuelta | Hara sigue | Sigue a Hara | Revisado | Evidencia | Candidatos |",
             "|---|---|---|---|---|---|---|---|---|"]
    lines += ["| " + " | ".join(str(c).replace("|", "/") for c in r) + " |" for r in rows]
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORT_DIR / f"network-audit-{date.today().isoformat()}.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    print(f"\nReporte guardado en {out}")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in {"plan", "record", "report"}:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    if cmd == "plan":
        plan("--all" in sys.argv)
    elif cmd == "record":
        record(sys.argv[2] if len(sys.argv) > 2 else sys.stdin.read())
    else:
        report()
