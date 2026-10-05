#!/usr/bin/env python3
"""Refresh public LetsDefend, HTB, and KC7 stats without credentials or packages.

Failed or unrecognized responses leave that platform's last good snapshot intact.
"""
import json
import re
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "stats.js"
PREFIX = "window.PORTFOLIO_STATS = "
KC7_URL = "https://kc7cyber.com/profile/281dc195"
HTB_BASE = "https://labs.hackthebox.com/api/v4/profile/progress"
LETSDEFEND_ALERTS_URL = "https://app-backend.letsdefend.io/accounts/api_retrieve/get_user_alert_type_success_rate/"
LETSDEFEND_COMPLETED_PATHS = 2  # Manual value; not exposed by the public profile.


def count(value):
    if type(value) is not int or not 0 <= value <= 1_000_000:
        raise ValueError("Missing or invalid completion count")
    return value


def fetch(url, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "User-Agent": "BrandonChaney-PortfolioStats/1.0",
        "Accept": "application/json,text/html",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ValueError("Unexpected response size")
        return body.decode("utf-8")


def letsdefend_metrics(alert_json):
    response = json.loads(alert_json)
    if not isinstance(response, dict) or not isinstance(response.get("data"), dict):
        raise ValueError("Unrecognized LetsDefend public profile response")
    data = response["data"]
    if response.get("success") is not True or data.get("status") != "ok":
        raise ValueError("LetsDefend public profile request did not succeed")
    categories = data.get("alert_type_list")
    counts = data.get("alert_type_count_list")
    if (not isinstance(categories, list) or not isinstance(counts, list)
            or not categories or len(categories) != len(counts)
            or any(not isinstance(name, str) or not name.strip() for name in categories)
            or len({name.strip().casefold() for name in categories}) != len(categories)):
        raise ValueError("Unrecognized LetsDefend alert categories")
    investigations = count(sum(count(value) for value in counts))
    return [investigations, count(LETSDEFEND_COMPLETED_PATHS)]


def htb_metrics(machine_json, sherlock_json):
    machines = json.loads(machine_json)["profile"]["machine_owns"]["solved"]
    sherlocks = json.loads(sherlock_json)["profile"]["challenge_owns"]["solved"]
    return [count(machines), count(sherlocks)]


class Node:
    def __init__(self, tag="", attrs=()):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []

    def text(self):
        return " ".join(child.text() if isinstance(child, Node) else child
                        for child in self.children).strip()

    def find(self, class_name):
        result = []
        if class_name in self.attrs.get("class", "").split():
            result.append(self)
        for child in self.children:
            if isinstance(child, Node):
                result.extend(child.find(class_name))
        return result


class ProfileParser(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def course_id(name):
    name = " ".join(name.upper().split())
    kql = re.match(r"^KQL\s*(101|201|301)\b", name)
    if kql:
        return "KQL " + kql[1]
    analyst = re.fullmatch(r"SECURITY ANALYST\s*(III|II|I|[123])", name)
    if analyst:
        level = {"I": "1", "II": "2", "III": "3"}.get(analyst[1], analyst[1])
        return "SECURITY ANALYST " + level
    return None


def kc7_metrics(html):
    parser = ProfileParser()
    parser.feed(html)
    root = parser.root
    # Use the headline Games value, not the different "Games played" metric.
    games = []
    for stat in root.find("p-st"):
        labels, values = stat.find("p-st-lbl"), stat.find("p-st-val")
        if len(labels) == len(values) == 1 and labels[0].text() == "Games":
            raw = values[0].text().replace(",", "")
            if raw.isdigit():
                games.append(count(int(raw)))
    if len(games) != 1:
        raise ValueError("KC7 Games summary is missing or ambiguous")

    # Only earned badges count; partially completed career-path cards do not.
    badges = root.find("p-bdg")
    if not badges:
        raise ValueError("KC7 earned badges are unavailable")
    earned = set()
    for badge in badges:
        for title in badge.find("p-bdg-pop-title"):
            identifier = course_id(title.text())
            if identifier:
                earned.add(identifier)
    if not earned:
        raise ValueError("KC7 course badges could not be recognized")

    # Subtract a course from Games only when it also appears as a game/module.
    # Future Security Analyst path badges count as courses without subtracting
    # them a second time if the path itself is absent from the games list.
    game_courses = set()
    rows = root.find("p-sb-row")
    if len(rows) != games[0]:
        raise ValueError("KC7 games list is incomplete; preserving saved counts")
    for row in rows:
        names = row.find("p-sb-col-name-text")
        if len(names) != 1:
            raise ValueError("Unrecognized KC7 games list")
        identifier = course_id(names[0].text())
        if identifier:
            game_courses.add(identifier)
    cases = games[0] - len(earned & game_courses)
    return [count(cases), count(len(earned))]


def read_snapshot():
    source = SNAPSHOT.read_text(encoding="utf-8").strip()
    if not source.startswith(PREFIX) or not source.endswith(";"):
        raise ValueError("Invalid saved stats format")
    data = json.loads(source[len(PREFIX):-1])
    if not isinstance(data, dict):
        raise ValueError("Invalid saved stats object")
    return data


def refresh():
    data = read_snapshot()
    updated = datetime.now(timezone.utc).isoformat(timespec="seconds")
    loaders = {
        "letsdefend": lambda: letsdefend_metrics(
            fetch(LETSDEFEND_ALERTS_URL, {"username": "bchaney"})),
        "htb": lambda: htb_metrics(
            fetch(f"{HTB_BASE}/machines/3476736"),
            fetch(f"{HTB_BASE}/sherlocks/3476736")),
        "kc7": lambda: kc7_metrics(fetch(KC7_URL)),
    }
    for platform, loader in loaders.items():
        try:
            metrics = loader()
            data[platform] = {"metrics": metrics, "updatedAt": updated}
            print(f"{platform}: refreshed {metrics}")
        except (OSError, ValueError, KeyError, TypeError) as error:
            # Do not print remote HTML, URLs, or response bodies into CI logs.
            print(f"{platform}: kept saved stats ({type(error).__name__})")
    source = PREFIX + json.dumps(data, indent=2, sort_keys=True) + ";\n"
    temporary = SNAPSHOT.with_suffix(".tmp")
    temporary.write_text(source, encoding="utf-8")
    temporary.replace(SNAPSHOT)


if __name__ == "__main__":
    refresh()
