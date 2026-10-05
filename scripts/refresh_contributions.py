#!/usr/bin/env python3
"""Save GitHub's public contribution calendar; preserve the last good snapshot.

Uses the public profile's calendar and tooltip counts, without an API token.
GitHub markup changes are treated as a failed refresh, never as zero activity.
"""
import json
import re
import urllib.request
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

USERNAME = "bran-dot-flake"
URL = f"https://github.com/users/{USERNAME}/contributions"
SNAPSHOT = Path(__file__).resolve().parents[1] / "contributions.js"
PREFIX = "window.PORTFOLIO_CONTRIBUTIONS = "


class CalendarParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.cells = []
        self.tips = {}
        self.tip_id = None
        self.tip_text = []
        self.heading = False
        self.heading_text = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "td" and "ContributionCalendar-day" in attrs.get("class", "").split():
            self.cells.append(attrs)
        if tag == "tool-tip":
            self.tip_id = attrs.get("for")
            self.tip_text = []
        if tag == "h2" and attrs.get("id") == "js-contribution-activity-description":
            self.heading = True

    def handle_data(self, text):
        if self.tip_id is not None:
            self.tip_text.append(text)
        if self.heading:
            self.heading_text.append(text)

    def handle_endtag(self, tag):
        if tag == "tool-tip" and self.tip_id is not None:
            self.tips[self.tip_id] = " ".join("".join(self.tip_text).split())
            self.tip_id = None
        if tag == "h2":
            self.heading = False


def parse_calendar(html, today=None):
    today = today or datetime.now(timezone.utc).date()
    parser = CalendarParser()
    parser.feed(html)
    if not 365 <= len(parser.cells) <= 367:
        raise ValueError("GitHub calendar is missing or incomplete")
    days = []
    for cell in parser.cells:
        day = date.fromisoformat(cell["data-date"])
        level = int(cell["data-level"])
        tip = parser.tips.get(cell.get("id"), "")
        match = re.match(r"^(No|[\d,]+) contributions? on .+\.$", tip)
        if not match or not 0 <= level <= 4:
            raise ValueError("Unrecognized GitHub contribution cell")
        count = 0 if match[1] == "No" else int(match[1].replace(",", ""))
        if not 0 <= count <= 1_000_000 or (level == 0) != (count == 0):
            raise ValueError("Invalid GitHub contribution count")
        days.append([day.isoformat(), count, level])
    days.sort(key=lambda item: item[0])
    dates = [date.fromisoformat(item[0]) for item in days]
    if any(b - a != timedelta(days=1) for a, b in zip(dates, dates[1:])):
        raise ValueError("GitHub calendar has duplicate or missing dates")
    if not today - timedelta(days=2) <= dates[-1] <= today + timedelta(days=1):
        raise ValueError("GitHub calendar is out of date")
    headline = " ".join("".join(parser.heading_text).split())
    match = re.fullmatch(r"([\d,]+) contributions? in the last year", headline)
    total = sum(item[1] for item in days)
    if not match or int(match[1].replace(",", "")) != total:
        raise ValueError("GitHub calendar total could not be verified")
    return {"username": USERNAME, "total": total, "days": days}


def refresh():
    try:
        request = urllib.request.Request(URL, headers={
            "User-Agent": "BrandonChaney-PortfolioCalendar/1.0",
            "Accept": "text/html",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError("Unexpected GitHub response size")
        data = parse_calendar(body.decode("utf-8"))
        data["updatedAt"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        source = PREFIX + json.dumps(data, separators=(",", ":")) + ";\n"
        temporary = SNAPSHOT.with_suffix(".tmp")
        temporary.write_text(source, encoding="utf-8")
        temporary.replace(SNAPSHOT)
        print(f"GitHub: refreshed {len(data['days'])} days, {data['total']} contributions")
        return True
    except Exception as error:
        print(f"GitHub: keeping the previous calendar ({type(error).__name__})")
        return False


if __name__ == "__main__":
    refresh()
