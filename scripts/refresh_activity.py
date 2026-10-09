#!/usr/bin/env python3
"""Save public activity and tagged writeups. Unavailable sources retain good data.

No personal access token is needed. GitHub Actions' optional GITHUB_TOKEN
raises GitHub's rate limit, and is only sent to api.github.com.
"""
import json
import html
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'scripts/portfolio_sources.json').read_text())
ACTIVITY = ROOT / 'activity.js'
NOTES = ROOT / 'field-notes.js'
PREFIX_ACTIVITY = 'window.PORTFOLIO_ACTIVITY = '
PREFIX_NOTES = 'window.PORTFOLIO_NOTES = '


def fetch_json(url):
    headers = {'User-Agent': 'BrandonChaney-PublicActivity/1.0', 'Accept': 'application/json'}
    if url.startswith('https://api.github.com/') and os.environ.get('GITHUB_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read(5_000_001)
        if len(raw) > 5_000_000:
            raise ValueError('Unexpected response size')
        return json.loads(raw)


def read_data(path, prefix, default):
    if not path.exists():
        return default
    text = path.read_text().strip()
    if not text.startswith(prefix) or not text.endswith(';'):
        raise ValueError('Invalid snapshot')
    return json.loads(text[len(prefix):-1])


def save(path, prefix, data):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(prefix + json.dumps(data, indent=2, ensure_ascii=False) + ';\n')
    temporary.replace(path)


def iso_date(value):
    if not isinstance(value, str):
        raise ValueError('Invalid activity date')
    date = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if date.tzinfo is None:
        raise ValueError('Activity date needs a timezone')
    return date.astimezone(timezone.utc).isoformat(timespec='seconds')


def readable(name):
    return re.sub(r'[-_]+', ' ', re.sub(r'[-_]Hack[-_]The[-_]Box[-_]Writeup$', '', name, flags=re.I)).strip()


def auto_note(repo):
    topics = set(repo.get('topics', []))
    if not topics.intersection({'hackthebox-sherlocks', 'hackthebox-machine', 'writeup'}):
        return None
    group = 'Digital forensics'
    if 'threat-hunting' in topics:
        group = 'Threat hunting'
    elif 'hackthebox-machine' in topics or topics.intersection({'pentesting', 'rce', 'sql-injection'}):
        group = 'Offensive security'
    elif topics.intersection({'tshark', 'wireshark', 'pcap', 'packet-analysis', 'network-forensics'}):
        group = 'Network analysis'
    labels = {'dfir': 'DFIR', 'tshark': 'TShark', 'wireshark': 'Wireshark', 'pcap': 'PCAP',
              'sysmon': 'Sysmon', 'splunk': 'Splunk', 'anydesk': 'AnyDesk', 'chrome': 'Chrome',
              'linux': 'Linux', 'windows': 'Windows', 'rce': 'RCE', 'cctv': 'CCTV', 'sql': 'SQL'}
    skip = {'hackthebox-sherlocks', 'hackthebox-machine', 'hack-the-box', 'writeup',
            'very-easy', 'easy', 'medium', 'hard', 'insane'}
    tools = [labels.get(topic, topic.replace('-', ' ').title()) for topic in repo.get('topics', []) if topic not in skip][:6]
    tools = tools or ['Hack The Box']
    title = readable(repo['name'])
    return {'id': 'note-' + repo['name'].lower().replace('_', '-'), 'title': title,
            'activityTitle': title, 'group': group, 'topics': tools,
            'category': 'HACK THE BOX / ' + ('SHERLOCK' if 'hackthebox-sherlocks' in topics else 'WRITEUP'),
            'image': {'Network analysis': 'assets/packets.svg', 'Offensive security': 'assets/connected.svg',
                      'Threat hunting': 'assets/threat-hunt.svg'}.get(group, 'assets/remote-access.svg'),
            'tags': tools[:2] + ['Hack The Box']}


def github_data(repositories):
    if not isinstance(repositories, list):
        raise ValueError('Unrecognized GitHub repositories')
    notes, items = [], []
    user = CONFIG['githubUser']
    for repo in repositories:
        if repo.get('private') or repo.get('fork') or repo.get('archived'):
            continue
        name = repo.get('name', '')
        if not re.fullmatch(r'[A-Za-z0-9_.-]+', name) or name in CONFIG['excludeRepositories']:
            continue
        if repo.get('owner', {}).get('login', '').casefold() != user.casefold():
            continue
        url = f'https://github.com/{user}/{name}'
        date = iso_date(repo['pushed_at'])
        metadata = CONFIG['notes'].get(name) or auto_note(repo)
        description = repo.get('description') or ''
        if metadata:
            notes.append({**metadata, 'url': url, 'description': description, 'updatedAt': date, 'repository': name})
        created = iso_date(repo['created_at'])
        age = (datetime.fromisoformat(date) - datetime.fromisoformat(created)).total_seconds()
        action = ('wrote up' if age < 86400 else 'updated notes on') if metadata else ('built' if age < 86400 else 'worked on')
        items.append({'id': 'github:' + name, 'source': 'github', 'action': action,
                      'title': metadata['activityTitle'] if metadata else readable(name),
                      'detail': description, 'url': url, 'date': date,
                      'workKey': (metadata['activityTitle'] if metadata else readable(name)).casefold()})
    return sorted(notes, key=lambda note: note['updatedAt'], reverse=True), items


def github_repositories():
    result = []
    for page in range(1, 11):
        batch = fetch_json(f"https://api.github.com/users/{CONFIG['githubUser']}/repos?per_page=100&sort=pushed&page={page}")
        if not isinstance(batch, list):
            raise ValueError('Unrecognized GitHub response')
        result.extend(batch)
        if len(batch) < 100:
            return result
    raise ValueError('Repository list incomplete; preserving snapshot')



def render_fallbacks(activity, notes):
    """Build the visible HTML too, so content works without JavaScript."""
    escape = lambda value: html.escape(str(value), quote=True)
    icon_map = {'Hack The Box': 'assets/htb.png', 'Wireshark': 'assets/tools/wireshark.jpg',
                'Wazuh': 'assets/tools/wazuh.png', 'Shuffle': 'assets/tools/shuffle.png', 'TheHive': 'assets/tools/thehive.svg'}
    cards = []
    for index, note in enumerate(notes.get('notes', [])):
        tags = []
        for tag in note['tags']:
            if tag in icon_map:
                tags.append(f'<span class="tool-tag"><span class="tool-icon" aria-hidden="true"><img src="{icon_map[tag]}" width="20" height="20" alt="" loading="lazy"></span>{escape(tag)}</span>')
            else:
                tags.append(f'<span>{escape(tag)}</span>')
        link_attrs = f'href="{escape(note["url"])}" target="_blank" rel="noopener noreferrer"'
        cards.append(f'<article class="work-card" id="{escape(note["id"])}" data-topic-group="{escape(note["group"])}" data-topics="{escape("|".join(note["topics"]))}"><a class="card-image" {link_attrs} aria-label="Read {escape(note["title"])} on GitHub (opens in a new tab)"><img src="{escape(note["image"])}" width="720" height="400" alt="" loading="lazy"><span class="image-label">FIELD NOTES / {index+1:02}</span></a><div class="card-body"><p class="card-category">{escape(note["category"])}</p><h2><a {link_attrs}>{escape(note["title"])}</a></h2><p>{escape(note["description"])}</p><div class="card-bottom"><div class="tags">{"".join(tags)}</div><a class="card-link" {link_attrs}>Read on GitHub</a></div></div></article>')
    path = ROOT / 'blogs.html'
    source = path.read_text()
    start = source.index('<div class="work-grid" data-field-notes>')
    end = source.index('<p class="collection-note">', start)
    path.write_text(source[:start] + '<div class="work-grid" data-field-notes>' + ''.join(cards) + '</div>' + source[end:])
    rows = []
    from zoneinfo import ZoneInfo
    for item in activity.get('items', [])[:3]:
        date = datetime.fromisoformat(item['date'].replace('Z', '+00:00')).astimezone(ZoneInfo('America/New_York'))
        stamp = date.strftime('%b ') + str(date.day)
        kind = (' Sherlock' if 'Sherlock' in item.get('detail', '') else ' machine') if item.get('source') == 'htb' else ''
        label = item['action'][:1].upper() + item['action'][1:] + ' ' + item['title'] + kind
        link_attrs = f'href="{escape(item["url"])}" target="_blank" rel="noopener noreferrer"'
        rows.append(f'<li class="recent-action"><a {link_attrs} title="{escape(label + " · " + item.get("detail", ""))}">{escape(label)}</a><time datetime="{escape(item["date"])}" title="{escape(date.strftime("%b %d, %Y %I:%M %p"))} ET">{stamp}</time></li>')
    path = ROOT / 'index.html'
    source = path.read_text()
    start = source.index('<ul class="recent-actions" data-recent-actions>')
    end = source.index('</ul>', start) + len('</ul>')
    source = source[:start] + '<ul class="recent-actions" data-recent-actions>' + ''.join(rows) + '</ul>' + source[end:]
    path.write_text(source)


def refresh():
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    activity = read_data(ACTIVITY, PREFIX_ACTIVITY, {'items': [], 'sourceCheckedAt': {}})
    notes = read_data(NOTES, PREFIX_NOTES, {'notes': []})
    items = activity.get('items', [])
    successful = False
    try:
        new_notes, new_items = github_data(github_repositories())
        # A successful catalog is authoritative: removed/private repos disappear.
        save(NOTES, PREFIX_NOTES, {'updatedAt': now, 'notes': new_notes})
        items = [item for item in items if item.get('source') != 'github'] + new_items
        activity.setdefault('sourceCheckedAt', {})['github'] = now
        successful = True
        print(f'github: refreshed {len(new_notes)} field notes')
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'github: kept saved activity ({type(error).__name__})')
    # Endpoint and ownDate/type fields are observed on the public profile.
    try:
        new_items = htb_items(fetch_json(f"https://labs.hackthebox.com/api/v5/user/profile/activity/{CONFIG['htbUserId']}"))
        items = [item for item in items if item.get('source') != 'htb'] + new_items
        activity.setdefault('sourceCheckedAt', {})['htb'] = now
        successful = True
        print(f'htb: refreshed {len(new_items)} public completions')
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'htb: kept saved activity ({type(error).__name__})')
    if successful:
        selected, seen = [], set()
        for item in sorted(items, key=lambda item: item['date'], reverse=True):
            key = item.get('workKey', item['id'])
            if key in seen:
                continue
            selected.append(item)
            seen.add(key)
        activity['items'] = selected[:30]
        activity['updatedAt'] = now
        save(ACTIVITY, PREFIX_ACTIVITY, activity)
        render_fallbacks(activity, read_data(NOTES, PREFIX_NOTES, notes))


def htb_items(response):
    if not isinstance(response, dict) or not isinstance(response.get('data'), list):
        raise ValueError('Unrecognized HTB public activity')
    items = []
    for event in response['data']:
        kind = event.get('type')
        # A user flag alone is a foothold, not a completed machine. Only root
        # owns and solved Sherlock records become completion messages.
        if kind not in {'sherlock', 'root'}:
            continue
        name = event.get('name')
        identifier = event.get('id')
        if not isinstance(name, str) or not name.strip() or type(identifier) is not int or identifier <= 0:
            raise ValueError('Invalid HTB completion')
        title = name.replace('_', ' ').strip()
        date = iso_date(event['ownDate'])
        # Link to the observed public profile, rather than guessing challenge URLs.
        items.append({'id': f'htb:{kind}:{identifier}', 'source': 'htb',
                      'action': 'completed', 'title': title,
                      'detail': 'Hack The Box Sherlock' if kind == 'sherlock' else 'Hack The Box machine · system owned',
                      'url': f"https://app.hackthebox.com/users/{CONFIG['htbUserId']}",
                      'date': date, 'workKey': title.casefold()})
    return items


if __name__ == '__main__':
    refresh()
