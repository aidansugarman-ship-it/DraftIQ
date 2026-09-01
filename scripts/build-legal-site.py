#!/usr/bin/env python3
"""
Generates the public legal site in /docs from /legal/*.md.

GitHub Pages serves /docs on the default branch, giving Apple the public
Privacy Policy URL it requires in App Store Connect. Run this after editing
the markdown so the hosted pages and the in-app text stay identical:

    python3 scripts/build-legal-site.py
"""
import html
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0B0F0E; --surface:#141917; --text:#F2F5F3; --muted:#9BA5A0;
  --green:#22C55E; --border:#232B28;
}
body{
  background:var(--bg); color:var(--text);
  font:16px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  padding:0 20px 80px; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:720px;margin:0 auto}
header{padding:48px 0 32px;border-bottom:1px solid var(--border);margin-bottom:36px}
.logo{
  display:inline-flex;align-items:center;gap:10px;
  font-weight:800;font-size:19px;letter-spacing:-.4px;color:var(--text);text-decoration:none;
}
.dot{width:11px;height:11px;border-radius:50%;background:var(--green);display:inline-block}
h1{font-size:34px;line-height:1.15;letter-spacing:-1px;margin:22px 0 6px;font-weight:800}
h2{font-size:19px;margin:38px 0 10px;font-weight:700;letter-spacing:-.3px}
p{margin:0 0 14px;color:#D7DEDA}
ul{margin:0 0 16px;padding-left:22px}
li{margin-bottom:7px;color:#D7DEDA}
strong{color:var(--text);font-weight:650}
a{color:var(--green)}
.updated{color:var(--muted);font-size:14px;margin-bottom:8px}
nav{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
nav a{
  display:inline-block;padding:7px 15px;border:1px solid var(--border);
  border-radius:999px;font-size:14px;text-decoration:none;color:var(--muted);
}
nav a:hover{border-color:var(--green);color:var(--green)}
nav a[aria-current]{border-color:var(--green);color:var(--green)}
footer{
  margin-top:56px;padding-top:22px;border-top:1px solid var(--border);
  color:var(--muted);font-size:14px;
}
@media(max-width:520px){h1{font-size:27px}body{padding:0 16px 60px}}
"""


def inline(text: str) -> str:
    """Escape HTML, then re-apply the small subset of markdown we use."""
    t = html.escape(text)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)',
               r'<a href="\2" rel="noopener">\1</a>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    return t


def md_to_html(md: str) -> tuple[str, str]:
    """Return (page_title, body_html)."""
    title, parts = '', []
    in_list = False

    def close_list():
        nonlocal in_list
        if in_list:
            parts.append('</ul>')
            in_list = False

    # Join hard-wrapped lines into paragraphs, preserving structural lines.
    buf: list[str] = []

    def flush():
        if buf:
            parts.append(f'<p>{inline(" ".join(buf))}</p>')
            buf.clear()

    for raw in md.split('\n'):
        line = raw.rstrip()
        s = line.strip()
        if not s:
            flush()
            close_list()
        elif s.startswith('## '):
            flush()
            close_list()
            parts.append(f'<h2>{inline(s[3:])}</h2>')
        elif s.startswith('# '):
            flush()
            close_list()
            title = s[2:]
            parts.append(f'<h1>{inline(title)}</h1>')
        elif s.startswith('- '):
            flush()
            if not in_list:
                parts.append('<ul>')
                in_list = True
            parts.append(f'<li>{inline(s[2:])}</li>')
        elif s.startswith('_') and s.endswith('_') and len(s) > 2:
            flush()
            close_list()
            parts.append(f'<p class="updated">{inline(s[1:-1])}</p>')
        else:
            close_list()
            buf.append(s)
    flush()
    close_list()
    return title, '\n'.join(parts)


def page(title: str, body: str, current: str) -> str:
    def nav_link(href, label, key):
        cur = ' aria-current="page"' if key == current else ''
        return f'<a href="{href}"{cur}>{label}</a>'

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(title)} for DraftIQ, a fantasy sports advisory app.">
<style>{CSS}</style>
</head>
<body>
<div class="wrap">
<header>
  <a class="logo" href="./"><span class="dot"></span>DraftIQ</a>
  <nav>
    {nav_link('./', 'Home', 'home')}
    {nav_link('./privacy.html', 'Privacy Policy', 'privacy')}
    {nav_link('./terms.html', 'Terms of Service', 'terms')}
  </nav>
</header>
<main>
{body}
</main>
<footer>
  DraftIQ is an independent advisory tool. It is not affiliated with Yahoo, ESPN,
  Sleeper, the NFL, NBA, MLB, or NHL.<br>
  Contact: <a href="mailto:support@draftiq.app">support@draftiq.app</a>
</footer>
</div>
</body>
</html>
"""


HOME_BODY = """<h1>DraftIQ</h1>
<p class="updated">Fantasy sports, with a sharp second opinion.</p>
<p>DraftIQ is an AI fantasy-sports advisor for NFL, NBA, MLB, and NHL. It connects
to your existing league <strong>read-only</strong> and gives you lineup, waiver,
trade, and draft advice. It never makes moves on your behalf.</p>
<h2>Legal</h2>
<ul>
<li><a href="./privacy.html">Privacy Policy</a></li>
<li><a href="./terms.html">Terms of Service</a></li>
</ul>
<h2>Support</h2>
<p>Questions, bug reports, or account deletion requests:
<a href="mailto:support@draftiq.app">support@draftiq.app</a></p>
"""


def main() -> None:
    os.makedirs(DOCS, exist_ok=True)

    for src, out, key in [
        ('legal/privacy-policy.md', 'privacy.html', 'privacy'),
        ('legal/terms-of-service.md', 'terms.html', 'terms'),
    ]:
        md = open(os.path.join(ROOT, src)).read()
        title, body = md_to_html(md)
        open(os.path.join(DOCS, out), 'w').write(page(title, body, key))
        print(f'built docs/{out}  <- {src}')

    open(os.path.join(DOCS, 'index.html'), 'w').write(
        page('DraftIQ', HOME_BODY, 'home'))
    print('built docs/index.html')

    # Stop Jekyll from reprocessing the folder on GitHub Pages.
    open(os.path.join(DOCS, '.nojekyll'), 'w').write('')
    print('built docs/.nojekyll')


if __name__ == '__main__':
    main()
