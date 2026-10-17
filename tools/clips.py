"""Adds Spotify's 30-second clip link (`preview:`) to every song in contents/ that has a `spotify:` link but no clip yet.

Run it from the repository folder after adding a song:  python3 tools/clips.py
"""
import re
import urllib.request

FILES = {'contents/playlist.yml': '    ', 'contents/concerts.yml': '    ', 'contents/intro.yml': '  '}
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'


def clip(track_id):
    request = urllib.request.Request(f'https://open.spotify.com/embed/track/{track_id}', headers={'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9'})
    html = urllib.request.urlopen(request, timeout=30).read().decode('utf-8', 'replace')
    found = re.search(r'https://p\.scdn\.co/mp3-preview/[A-Za-z0-9]+', html)
    return found.group(0) if found else None


for path, indent in FILES.items():
    lines = open(path, encoding='utf-8').read().split('\n')
    out = []
    for i, line in enumerate(lines):
        out.append(line)
        song = re.match(rf'^{indent}spotify: "?https://open\.spotify\.com/track/([A-Za-z0-9]+)', line)
        has_clip = i + 1 < len(lines) and lines[i + 1].startswith(f'{indent}preview:')
        if song and not has_clip:
            link = clip(song.group(1))
            print(f'{path}: {song.group(1)} -> {link or "no clip found"}')
            if link:
                out.append(f'{indent}preview: "{link}"')
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
