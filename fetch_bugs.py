#!/usr/bin/env python3
"""
Fetch open bug reports from Supabase into local bugs/ directory.

Usage:
    python3 fetch_bugs.py              # fetch all open bugs
    python3 fetch_bugs.py --mark-read  # also mark fetched bugs as in_progress

Each bug becomes a markdown file in bugs/ with description + screenshot path.
Start a Claude Code session and say "fix the bugs" to dispatch agents for each.
"""

import json
import os
import sys
import urllib.request
import urllib.error

# Read credentials from portal .env
PORTAL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "portal")
ENV_PATH = os.path.join(PORTAL_DIR, ".env")

def load_env():
    env = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    return env

_env = load_env()
SUPABASE_URL = _env.get("REACT_APP_SUPABASE_URL", "")
SUPABASE_KEY = _env.get("REACT_APP_SUPABASE_ANON_KEY", "")
BUGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bugs")


def fetch_bugs(status="open"):
    """Fetch bug reports from Supabase REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found in portal/.env")
        return []
    url = (
        f"{SUPABASE_URL}/rest/v1/bug_reports"
        f"?status=eq.{status}&order=created_at.asc"
    )
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"Error fetching bugs: {e.code} {e.read().decode()}")
        return []


def update_status(bug_id, status):
    """Update a bug report's status."""
    url = f"{SUPABASE_URL}/rest/v1/bug_reports?id=eq.{bug_id}"
    data = json.dumps({"status": status}).encode()
    req = urllib.request.Request(url, data=data, method="PATCH", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        print(f"Error updating bug {bug_id}: {e.code}")


def download_screenshot(screenshot_url, bug_id):
    """Download screenshot to bugs/screenshots/ and return local path."""
    if not screenshot_url:
        return None
    screenshots_dir = os.path.join(BUGS_DIR, "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)

    ext = screenshot_url.rsplit(".", 1)[-1] if "." in screenshot_url.split("/")[-1] else "png"
    local_path = os.path.join(screenshots_dir, f"{bug_id}.{ext}")

    if os.path.exists(local_path):
        return local_path

    try:
        urllib.request.urlretrieve(screenshot_url, local_path)
        return local_path
    except Exception as e:
        print(f"Failed to download screenshot for {bug_id}: {e}")
        return None


def main():
    mark_read = "--mark-read" in sys.argv

    os.makedirs(BUGS_DIR, exist_ok=True)

    bugs = fetch_bugs("open")
    if not bugs:
        print("No open bug reports found.")
        return

    print(f"Found {len(bugs)} open bug report(s):\n")

    for bug in bugs:
        bug_id = bug["id"]
        short_id = bug_id[:8]
        filename = f"bug-{short_id}.md"
        filepath = os.path.join(BUGS_DIR, filename)

        # Download screenshot if present
        screenshot_path = download_screenshot(bug.get("screenshot_url"), short_id)

        # Write markdown file
        lines = [
            f"# Bug Report {short_id}",
            "",
            f"- **ID**: {bug_id}",
            f"- **Status**: {bug.get('status', 'open')}",
            f"- **Game**: {bug.get('game_id') or 'unknown'}",
            f"- **Reported**: {bug.get('created_at', 'unknown')}",
            f"- **Page URL**: {bug.get('page_url', '')}",
            "",
            "## Description",
            "",
            bug.get("description", "(no description)"),
            "",
        ]

        if screenshot_path:
            lines += [
                "## Screenshot",
                "",
                f"![screenshot]({screenshot_path})",
                "",
            ]

        if bug.get("screenshot_url"):
            lines += [f"Original URL: {bug['screenshot_url']}", ""]

        with open(filepath, "w") as f:
            f.write("\n".join(lines))

        game = bug.get('game_id') or '?'
        desc = bug.get('description', '')[:70]
        print(f"  [{game}] {filename}: {desc}")

        if mark_read:
            update_status(bug_id, "in_progress")

    print(f"\nBug reports saved to {BUGS_DIR}/")
    if mark_read:
        print("Marked all fetched bugs as in_progress.")


if __name__ == "__main__":
    main()
